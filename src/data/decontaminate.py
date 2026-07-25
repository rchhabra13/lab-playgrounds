import argparse
import json
import os
import random
import re

from datasets import load_dataset
from tqdm import tqdm

from src.common import load_yaml

NGRAM_SIZE = 13

# Eval sets we score against. A domain decontaminates against whichever of these
# its own evals use (declared as `decontaminate_against` in data_config.yaml) —
# training on the answers to your own benchmark is the classic way finetuning
# results get quietly inflated.
BENCHMARK_LOADERS = {
    "openai_humaneval": lambda: [
        ex["prompt"] + ex["canonical_solution"]
        for ex in load_dataset("openai/openai_humaneval", split="test")
    ],
    "mbpp": lambda: [
        ex["text"] + ex["code"]
        for ex in load_dataset("google-research-datasets/mbpp", split="test")
    ],
    "medqa": lambda: [
        ex["question"] + " " + ex["answer"]
        for ex in load_dataset("GBaker/MedQA-USMLE-4-options", split="test")
    ],
    "mmlu": lambda: [
        ex["question"] + " " + " ".join(ex["choices"])
        for ex in load_dataset("cais/mmlu", "all", split="test")
    ],
}


def ngrams(text, n=NGRAM_SIZE):
    tokens = re.findall(r"\w+", text.lower())
    return set(tuple(tokens[i : i + n]) for i in range(max(0, len(tokens) - n + 1)))


def record_text(record, fields):
    return "\n".join(str(record.get(f, "")) for f in fields)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--config", required=True, help="path to domain data_config.yaml")
    parser.add_argument("--base-config", default="configs/base.yaml")
    args = parser.parse_args()

    cfg = load_yaml(args.config)
    base_cfg = load_yaml(args.base_config)
    decon_cfg = base_cfg["decontamination"]
    fields = cfg["text_fields"]
    benchmarks = cfg.get("decontaminate_against", decon_cfg["benchmarks_to_strip"])

    domain_dir = os.path.dirname(args.config)
    in_path = os.path.join(domain_dir, "data", "processed", "deduped.jsonl")
    with open(in_path) as f:
        records = [json.loads(line) for line in f]

    benchmark_ngrams = set()
    for bench in benchmarks:
        for text in BENCHMARK_LOADERS[bench]():
            benchmark_ngrams |= ngrams(text)

    kept, removed = [], []
    for r in tqdm(records, desc="decontaminating"):
        rec_ngrams = ngrams(record_text(r, fields))
        if not rec_ngrams:
            kept.append(r)
            continue
        overlap = len(rec_ngrams & benchmark_ngrams) / len(rec_ngrams)
        (removed if overlap >= decon_cfg["ngram_overlap_threshold"] else kept).append(r)

    # Hold out a slice before training so there's an unseen split to score against.
    holdout_size = min(cfg.get("holdout_size", 0), max(0, len(kept) - 1))
    rng = random.Random(base_cfg["training"]["seed"])
    rng.shuffle(kept)
    heldout, train = kept[:holdout_size], kept[holdout_size:]

    out_dir = os.path.join(domain_dir, "data", "processed")
    with open(os.path.join(out_dir, "train.jsonl"), "w") as f:
        for r in train:
            f.write(json.dumps(r) + "\n")
    with open(os.path.join(out_dir, "heldout.jsonl"), "w") as f:
        for r in heldout:
            f.write(json.dumps(r) + "\n")

    stats = {
        "input_count": len(records),
        "contaminated_removed": len(removed),
        "train_count": len(train),
        "heldout_count": len(heldout),
        "benchmarks_checked": benchmarks,
    }
    stats_path = os.path.join(domain_dir, "results", "decontamination_stats.json")
    os.makedirs(os.path.dirname(stats_path), exist_ok=True)
    with open(stats_path, "w") as f:
        json.dump(stats, f, indent=2)

    print(json.dumps(stats, indent=2))


if __name__ == "__main__":
    main()
