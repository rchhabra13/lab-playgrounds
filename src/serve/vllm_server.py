"""
OpenAI-compatible serving with hot-swappable LoRA adapters, one base model in VRAM.

Requires a CUDA GPU host (vLLM does not run on Colab or on Apple Silicon) and
`pip install vllm`. Not exercised by this repo's automated pipeline — provided
as the real production serving pattern, documented in docs/ARCHITECTURE.md.

Usage:
    python -m src.serve.vllm_server --base-model unsloth/Qwen3-8B-unsloth-bnb-4bit \
        --adapter code=domains/code/adapters/final \
        --adapter finance=domains/finance/adapters/final

Then call any loaded adapter by name as the "model" field in an OpenAI-style request:
    curl http://localhost:8000/v1/completions -d '{"model": "code", "prompt": "..."}'
"""

import argparse
import subprocess
import sys


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--base-model", required=True)
    parser.add_argument(
        "--adapter",
        action="append",
        default=[],
        metavar="NAME=PATH",
        help="repeatable: one LoRA adapter to load, e.g. --adapter code=domains/code/adapters/final",
    )
    parser.add_argument("--port", type=int, default=8000)
    parser.add_argument("--max-loras", type=int, default=4, help="max adapters resident in GPU memory at once")
    parser.add_argument("--max-lora-rank", type=int, default=16)
    args = parser.parse_args()

    if not args.adapter:
        sys.exit("pass at least one --adapter NAME=PATH")

    cmd = [
        "vllm",
        "serve",
        args.base_model,
        "--enable-lora",
        "--max-loras",
        str(args.max_loras),
        "--max-lora-rank",
        str(args.max_lora_rank),
        "--lora-modules",
        *args.adapter,
        "--port",
        str(args.port),
    ]
    print("launching:", " ".join(cmd))
    subprocess.run(cmd, check=True)


if __name__ == "__main__":
    main()
