"""
Execution-based code eval: HumanEval+ / MBPP+ pass@1 via EvalPlus.

Generates a completion per problem, then hands the samples to `evalplus.evaluate`,
which runs the real test suites. Code-domain only — other domains use
run_holdout_eval.py and run_mcq_eval.py.
"""

import argparse
import json
import subprocess
import sys

import torch
from tqdm import tqdm

from src.eval.common import load_model, write_result

PASS = "pass"  # evalplus.eval.PASS


def _loaders():
    from evalplus.data import get_human_eval_plus, get_mbpp_plus

    return {"humaneval": get_human_eval_plus, "mbpp": get_mbpp_plus}


def generate(model, tokenizer, prompt, max_new_tokens):
    inputs = tokenizer(prompt, return_tensors="pt").to(model.device)
    with torch.no_grad():
        out = model.generate(**inputs, max_new_tokens=max_new_tokens, do_sample=False)
    return tokenizer.decode(out[0][inputs["input_ids"].shape[1] :], skip_special_tokens=True)


def evaluate(model, tokenizer, dataset, out, adapter_path=None, max_new_tokens=512):
    problems = _loaders()[dataset]()

    samples_path = out.replace(".json", f"_{dataset}_samples.jsonl")
    with open(samples_path, "w") as f:
        for task_id, problem in tqdm(problems.items(), desc=dataset):
            completion = generate(model, tokenizer, problem["prompt"], max_new_tokens)
            f.write(json.dumps({"task_id": task_id, "solution": completion}) + "\n")

    result = subprocess.run(
        [sys.executable, "-m", "evalplus.evaluate", "--dataset", dataset, "--samples", samples_path],
        capture_output=True,
        text=True,
    )
    print(result.stdout)
    if result.returncode != 0:
        print(result.stderr, file=sys.stderr)
        raise SystemExit(result.returncode)

    # evalplus prints pass@1 but does NOT store it — the results file holds only
    # {date, hash, eval}, where eval[task_id] is a list of attempts carrying
    # base_status/plus_status. Verified against evalplus 0.3.1; we compute pass@1
    # from those statuses rather than parsing stdout.
    with open(samples_path.replace(".jsonl", "_eval_results.json")) as f:
        tasks = json.load(f)["eval"]

    for label, field in (("", "base_status"), ("_plus", "plus_status")):
        passed = sum(
            1 for attempts in tasks.values() if attempts and attempts[0][field] == PASS
        )
        write_result(
            out,
            key=dataset + label,
            metric="pass@1",
            value=passed / len(tasks),
            higher_is_better=True,
            tasks_scored=len(tasks),
            adapter_path=adapter_path,
        )


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--model-path", required=True)
    parser.add_argument("--adapter-path", default=None, help="omit for baseline eval")
    parser.add_argument("--dataset", choices=["humaneval", "mbpp"], required=True)
    parser.add_argument("--out", required=True)
    parser.add_argument("--max-new-tokens", type=int, default=512)
    args = parser.parse_args()

    model, tokenizer = load_model(args.model_path, args.adapter_path)
    evaluate(model, tokenizer, args.dataset, args.out, args.adapter_path, args.max_new_tokens)


if __name__ == "__main__":
    main()
