import argparse
import os

from datasets import load_dataset

from src.common import load_yaml


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--config", required=True, help="path to domain data_config.yaml")
    args = parser.parse_args()

    cfg = load_yaml(args.config)
    ds = load_dataset(cfg["dataset_name"], split=cfg.get("dataset_split", "train"))

    domain_dir = os.path.dirname(args.config)
    out_dir = os.path.join(domain_dir, "data", "raw")
    os.makedirs(out_dir, exist_ok=True)
    out_path = os.path.join(out_dir, "raw.jsonl")
    ds.to_json(out_path)

    print(f"downloaded {len(ds)} examples from {cfg['dataset_name']} -> {out_path}")


if __name__ == "__main__":
    main()
