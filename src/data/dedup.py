import argparse
import hashlib
import json
import os

from datasketch import MinHash, MinHashLSH
from tqdm import tqdm

from src.common import load_yaml


def record_text(record, fields):
    return "\n".join(str(record.get(f, "")) for f in fields)


def normalize(text):
    return " ".join(text.split()).lower()


def minhash_for(text, num_perm):
    m = MinHash(num_perm=num_perm)
    for tok in set(text.split()):
        m.update(tok.encode("utf8"))
    return m


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--config", required=True, help="path to domain data_config.yaml")
    parser.add_argument("--base-config", default="configs/base.yaml")
    args = parser.parse_args()

    cfg = load_yaml(args.config)
    dedup_cfg = load_yaml(args.base_config)["dedup"]
    fields = cfg["text_fields"]

    domain_dir = os.path.dirname(args.config)
    raw_path = os.path.join(domain_dir, "data", "raw", "raw.jsonl")
    with open(raw_path) as f:
        records = [json.loads(line) for line in f]

    # pass 1: exact dedup via content hash
    seen_hashes = set()
    exact_deduped = []
    for r in records:
        h = hashlib.sha256(normalize(record_text(r, fields)).encode("utf8")).hexdigest()
        if h in seen_hashes:
            continue
        seen_hashes.add(h)
        exact_deduped.append(r)
    exact_removed = len(records) - len(exact_deduped)

    # pass 2: near-duplicate dedup via MinHash LSH
    lsh = MinHashLSH(threshold=dedup_cfg["minhash_threshold"], num_perm=dedup_cfg["minhash_num_perm"])
    kept = []
    for i, r in enumerate(tqdm(exact_deduped, desc="minhash dedup")):
        mh = minhash_for(normalize(record_text(r, fields)), dedup_cfg["minhash_num_perm"])
        if lsh.query(mh):
            continue
        lsh.insert(f"doc-{i}", mh)
        kept.append(r)
    near_dup_removed = len(exact_deduped) - len(kept)

    out_dir = os.path.join(domain_dir, "data", "processed")
    os.makedirs(out_dir, exist_ok=True)
    out_path = os.path.join(out_dir, "deduped.jsonl")
    with open(out_path, "w") as f:
        for r in kept:
            f.write(json.dumps(r) + "\n")

    stats = {
        "input_count": len(records),
        "exact_duplicates_removed": exact_removed,
        "near_duplicates_removed": near_dup_removed,
        "output_count": len(kept),
    }
    stats_path = os.path.join(domain_dir, "results", "dedup_stats.json")
    os.makedirs(os.path.dirname(stats_path), exist_ok=True)
    with open(stats_path, "w") as f:
        json.dump(stats, f, indent=2)

    print(json.dumps(stats, indent=2))


if __name__ == "__main__":
    main()
