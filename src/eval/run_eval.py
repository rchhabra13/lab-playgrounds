import argparse
import json
import os
import subprocess
import sys

from evalplus.data import get_human_eval_plus, get_mbpp_plus

DATASET_LOADERS = {
    "humaneval": get_human_eval_plus,
    "mbpp": get_mbpp_plus,
}


def load_model(model_path, adapter_path=None):
    import torch
    from transformers import AutoModelForCausalLM, AutoTokenizer

    tokenizer = AutoTokenizer.from_pretrained(model_path)
    model = AutoModelForCausalLM.from_pretrained(model_path, torch_dtype=torch.bfloat16, device_map="auto")
    if adapter_path:
        from peft import PeftModel

        model = PeftModel.from_pretrained(model, adapter_path)
    model.eval()
    return model, tokenizer


def generate(model, tokenizer, prompt, max_new_tokens):
    inputs = tokenizer(prompt, return_tensors="pt").to(model.device)
    out = model.generate(**inputs, max_new_tokens=max_new_tokens, do_sample=False)
    return tokenizer.decode(out[0][inputs["input_ids"].shape[1] :], skip_special_tokens=True)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--model-path", required=True)
    parser.add_argument("--adapter-path", default=None, help="LoRA adapter dir; omit for baseline (base model) eval")
    parser.add_argument("--dataset", choices=["humaneval", "mbpp"], required=True)
    parser.add_argument("--out", required=True, help="results json path, e.g. domains/code/results/baseline.json")
    parser.add_argument("--max-new-tokens", type=int, default=512)
    args = parser.parse_args()

    model, tokenizer = load_model(args.model_path, args.adapter_path)
    problems = DATASET_LOADERS[args.dataset]()

    samples_path = args.out.replace(".json", f"_{args.dataset}_samples.jsonl")
    with open(samples_path, "w") as f:
        for task_id, problem in problems.items():
            completion = generate(model, tokenizer, problem["prompt"], args.max_new_tokens)
            f.write(json.dumps({"task_id": task_id, "solution": completion}) + "\n")

    result = subprocess.run(
        [sys.executable, "-m", "evalplus.evaluate", "--dataset", args.dataset, "--samples", samples_path],
        capture_output=True,
        text=True,
    )
    print(result.stdout)
    if result.returncode != 0:
        print(result.stderr, file=sys.stderr)
        sys.exit(result.returncode)

    # evalplus writes "<samples>_eval_results.json" next to the samples file.
    # Key names below match evalplus's schema as of the version pinned in the
    # Colab notebook's first cell — if evalplus changes its output schema, this
    # is the one place to adjust.
    eval_results_path = samples_path.replace(".jsonl", "_eval_results.json")
    with open(eval_results_path) as f:
        eval_results = json.load(f)
    pass_at_1 = eval_results["pass@1"]

    existing = {}
    if os.path.exists(args.out):
        with open(args.out) as f:
            existing = json.load(f)
    existing[args.dataset] = {
        "pass_at_1": pass_at_1,
        "model_path": args.model_path,
        "adapter_path": args.adapter_path,
    }
    with open(args.out, "w") as f:
        json.dump(existing, f, indent=2)

    print(json.dumps(existing[args.dataset], indent=2))


if __name__ == "__main__":
    main()
