"""
Multiple-choice accuracy against real external benchmarks.

Scored by comparing the model's next-token logits for "A"/"B"/"C"/"D" after an
"Answer:" prompt — one forward pass per question, no free-form output to parse.
Deterministic and far faster than generating.

Two roles:
  medqa — a domain benchmark (healthcare capability)
  mmlu  — the general-capability regression check every domain runs, to catch a
          finetune that buys domain skill by degrading everything else
"""

import argparse
import random
import string

import torch
from tqdm import tqdm

from src.common import load_yaml
from src.eval.common import load_model, write_result

PROMPT = (
    "The following is a multiple choice question. "
    "Answer with the letter of the correct option only.\n\n"
    "Question: {question}\n{options}\nAnswer:"
)


def load_medqa():
    from datasets import load_dataset

    rows = []
    for ex in load_dataset("GBaker/MedQA-USMLE-4-options", split="test"):
        letters = sorted(ex["options"].keys())
        rows.append(
            {
                "question": ex["question"],
                "choices": [ex["options"][k] for k in letters],
                "answer_idx": letters.index(ex["answer_idx"]),
            }
        )
    return rows


def load_mmlu():
    from datasets import load_dataset

    return [
        {"question": ex["question"], "choices": list(ex["choices"]), "answer_idx": ex["answer"]}
        for ex in load_dataset("cais/mmlu", "all", split="test")
    ]


BENCHMARKS = {"medqa": load_medqa, "mmlu": load_mmlu}


def letter_token_ids(tokenizer, n_choices):
    """Candidate token ids per option letter. Both the bare and leading-space forms
    are scored, since which one a tokenizer emits after 'Answer:' varies by model."""
    ids = []
    for letter in string.ascii_uppercase[:n_choices]:
        candidates = []
        for variant in (" " + letter, letter):
            encoded = tokenizer.encode(variant, add_special_tokens=False)
            if encoded:
                candidates.append(encoded[0])
        ids.append(candidates)
    return ids


def evaluate(model, tokenizer, benchmark, out, adapter_path=None, limit=500, seed=3407):
    rows = BENCHMARKS[benchmark]()
    if limit and limit < len(rows):
        rows = random.Random(seed).sample(rows, limit)

    correct = 0
    for row in tqdm(rows, desc=benchmark):
        options = "\n".join(
            f"{letter}. {choice}" for letter, choice in zip(string.ascii_uppercase, row["choices"])
        )
        messages = [{"role": "user", "content": PROMPT.format(question=row["question"], options=options)}]
        prompt = tokenizer.apply_chat_template(messages, add_generation_prompt=True, tokenize=False)
        inputs = tokenizer(prompt, return_tensors="pt").to(model.device)

        with torch.no_grad():
            logits = model(**inputs).logits[0, -1]

        scores = [
            max(logits[token_id].item() for token_id in candidates)
            for candidates in letter_token_ids(tokenizer, len(row["choices"]))
        ]
        if max(range(len(scores)), key=scores.__getitem__) == row["answer_idx"]:
            correct += 1

    write_result(
        out,
        key=benchmark,
        metric="accuracy",
        value=correct / len(rows),
        higher_is_better=True,
        examples_scored=len(rows),
        adapter_path=adapter_path,
    )


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--model-path", required=True)
    parser.add_argument("--adapter-path", default=None, help="omit for baseline eval")
    parser.add_argument("--benchmark", choices=sorted(BENCHMARKS), required=True)
    parser.add_argument("--out", required=True)
    parser.add_argument("--limit", type=int, default=500, help="0 for the full set")
    parser.add_argument("--base-config", default="configs/base.yaml")
    args = parser.parse_args()

    seed = load_yaml(args.base_config)["training"]["seed"]
    model, tokenizer = load_model(args.model_path, args.adapter_path)
    evaluate(model, tokenizer, args.benchmark, args.out, args.adapter_path, args.limit, seed)


if __name__ == "__main__":
    main()
