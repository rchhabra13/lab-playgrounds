import argparse
import json
import os
import re

from datasets import load_dataset
from tqdm import tqdm

from src.common import load_yaml

NGRAM_SIZE = 13

BENCHMARK_LOADERS = {
    "openai_humaneval": lambda: [
        ex["prompt"] + ex["canonical_solution"]
        for ex in load_dataset("openai_humaneval", split="test")
    ],
    "mbpp": lambda: [
        ex["text"] + ex["code"] for ex in load_dataset("mbpp", split="test")
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
    decon_cfg = load_yaml(args.base_config)["decontamination"]
    fields = cfg["text_fields"]

    domain_dir = os.path.dirname(args.config)
    in_path = os.path.join(domain_dir, "data", "processed", "deduped.jsonl")
    with open(in_path) as f:
        records = [json.loads(line) for line in f]

    benchmark_ngrams = set()
    for bench in decon_cfg["benchmarks_to_strip"]:
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

    out_path = os.path.join(domain_dir, "data", "processed", "train.jsonl")
    with open(out_path, "w") as f:
        for r in kept:
            f.write(json.dumps(r) + "\n")

    stats = {
        "input_count": len(records),
        "contaminated_removed": len(removed),
        "output_count": len(kept),
        "benchmarks_checked": decon_cfg["benchmarks_to_strip"],
    }
    stats_path = os.path.join(domain_dir, "results", "decontamination_stats.json")
    with open(stats_path, "w") as f:
        json.dump(stats, f, indent=2)

    print(json.dumps(stats, indent=2))


if __name__ == "__main__":
    main()
