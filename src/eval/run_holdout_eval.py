"""
Held-out eval: perplexity on the completion tokens of unseen domain examples,
plus exact-match label accuracy when the domain's task has a discrete label.

Perplexity is computed over the assistant turn only — prompt tokens are masked
out, since scoring them would dilute the number with tokens both models see
identically.

What perplexity does and doesn't tell you: it measures how well the model fits
this domain's output distribution. Finetuning on that same distribution almost
always improves it, so treat a drop as confirmation training took effect, not as
proof the model got more capable. For capability, read the benchmark rows
(run_mcq_eval.py / run_eval.py) alongside it.
"""

import argparse
import json
import math
import os
import re

import torch
from tqdm import tqdm

from src.common import load_yaml
from src.data.chat_format import build_messages
from src.eval.common import load_model, write_result


def normalize(text):
    return re.sub(r"\s+", " ", text).strip().lower().rstrip(".")


def completion_loss(model, tokenizer, messages, max_seq_length):
    # Render to text first, then tokenize. apply_chat_template(tokenize=True) returns
    # a BatchEncoding on transformers 5.x and a plain list on 4.x — len() on the
    # former is the key count, which silently skips every example. Going through
    # text keeps this correct on both.
    prompt_text = tokenizer.apply_chat_template(
        messages[:-1], add_generation_prompt=True, tokenize=False
    )
    full_text = tokenizer.apply_chat_template(messages, tokenize=False)
    prompt_ids = tokenizer(prompt_text, add_special_tokens=False)["input_ids"]
    full_ids = tokenizer(full_text, add_special_tokens=False)["input_ids"][:max_seq_length]
    if len(full_ids) <= len(prompt_ids):
        return None

    input_ids = torch.tensor([full_ids], device=model.device)
    labels = input_ids.clone()
    labels[0, : len(prompt_ids)] = -100

    with torch.no_grad():
        loss = model(input_ids=input_ids, labels=labels).loss

    n_tokens = len(full_ids) - len(prompt_ids)
    return loss.item() * n_tokens, n_tokens


def evaluate(model, tokenizer, config_path, out, adapter_path=None, limit=None, base_config="configs/base.yaml"):
    cfg = load_yaml(config_path)
    chat_cfg = cfg["chat"]
    max_seq_length = load_yaml(base_config)["max_seq_length"]

    heldout_path = os.path.join(os.path.dirname(config_path), "data", "processed", "heldout.jsonl")
    with open(heldout_path) as f:
        records = [json.loads(line) for line in f]
    if limit:
        records = records[:limit]

    total_loss, total_tokens, skipped = 0.0, 0, 0
    for record in tqdm(records, desc="perplexity"):
        result = completion_loss(model, tokenizer, build_messages(record, chat_cfg), max_seq_length)
        if result is None:
            skipped += 1
            continue
        loss_sum, n_tokens = result
        total_loss += loss_sum
        total_tokens += n_tokens

    if total_tokens == 0:
        raise SystemExit("no scorable held-out examples — check the chat: block in data_config.yaml")

    write_result(
        out,
        key="heldout",
        metric="perplexity",
        value=math.exp(total_loss / total_tokens),
        higher_is_better=False,
        examples_scored=len(records) - skipped,
        examples_skipped=skipped,
        adapter_path=adapter_path,
    )

    label_field = chat_cfg.get("label_field")
    if not label_field:
        return

    correct = 0
    for record in tqdm(records, desc="label accuracy"):
        messages = build_messages(record, chat_cfg)
        prompt = tokenizer.apply_chat_template(messages[:-1], add_generation_prompt=True, tokenize=False)
        inputs = tokenizer(prompt, return_tensors="pt", add_special_tokens=False).to(model.device)
        with torch.no_grad():
            out_ids = model.generate(**inputs, max_new_tokens=24, do_sample=False)
        prediction = tokenizer.decode(
            out_ids[0][inputs["input_ids"].shape[1] :], skip_special_tokens=True
        )
        if normalize(prediction) == normalize(str(record[label_field])):
            correct += 1

    write_result(
        out,
        key="heldout_label",
        metric="exact_match_accuracy",
        value=correct / len(records),
        higher_is_better=True,
        examples_scored=len(records),
        adapter_path=adapter_path,
    )


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--model-path", required=True)
    parser.add_argument("--adapter-path", default=None, help="omit for baseline eval")
    parser.add_argument("--config", required=True, help="domain data_config.yaml")
    parser.add_argument("--out", required=True)
    parser.add_argument("--limit", type=int, default=None)
    parser.add_argument("--base-config", default="configs/base.yaml")
    args = parser.parse_args()

    model, tokenizer = load_model(args.model_path, args.adapter_path)
    evaluate(model, tokenizer, args.config, args.out, args.adapter_path, args.limit, args.base_config)


if __name__ == "__main__":
    main()
