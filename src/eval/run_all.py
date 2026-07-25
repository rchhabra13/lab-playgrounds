"""
Runs every eval a domain declares in its data_config.yaml `evals:` block,
loading the model once and reusing it.

That single load is the point: on Colab an 8B model takes minutes to load, and
running the four evals as separate processes would pay that cost four times per
side (baseline and finetuned).

    python -m src.eval.run_all --config domains/code/data_config.yaml \
        --model-path <base> --out domains/code/results/baseline.json
    python -m src.eval.run_all --config domains/code/data_config.yaml \
        --model-path <base> --adapter-path <adapter> \
        --out domains/code/results/finetuned.json
"""

import argparse

from src.common import load_yaml
from src.eval import run_eval, run_holdout_eval, run_mcq_eval
from src.eval.common import load_model


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--config", required=True, help="domain data_config.yaml")
    parser.add_argument("--model-path", required=True)
    parser.add_argument("--adapter-path", default=None, help="omit for baseline eval")
    parser.add_argument("--out", required=True)
    parser.add_argument("--base-config", default="configs/base.yaml")
    args = parser.parse_args()

    cfg = load_yaml(args.config)
    seed = load_yaml(args.base_config)["training"]["seed"]
    evals = cfg.get("evals", [])
    if not evals:
        raise SystemExit(f"{args.config} declares no evals:")

    model, tokenizer = load_model(args.model_path, args.adapter_path)

    for spec in evals:
        kind = spec["type"]
        print(f"\n=== {kind} {spec.get('dataset') or spec.get('benchmark') or ''} ===")
        if kind == "code":
            run_eval.evaluate(
                model, tokenizer, spec["dataset"], args.out, args.adapter_path,
                spec.get("max_new_tokens", 512),
            )
        elif kind == "mcq":
            run_mcq_eval.evaluate(
                model, tokenizer, spec["benchmark"], args.out, args.adapter_path,
                spec.get("limit", 500), seed,
            )
        elif kind == "holdout":
            run_holdout_eval.evaluate(
                model, tokenizer, args.config, args.out, args.adapter_path,
                spec.get("limit"), args.base_config,
            )
        else:
            raise SystemExit(f"unknown eval type {kind!r} in {args.config}")


if __name__ == "__main__":
    main()
