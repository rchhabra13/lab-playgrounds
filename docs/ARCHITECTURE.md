# Architecture

End-to-end pipeline, stage by stage. Each section says what production teams actually do, then what this repo does, and why the gap exists.

## 1. Data collection

**Production**: teams like GitHub curate and deduplicate corpora at the scale of millions of repos (Copilot's custom completion model trained on a curated, deduped corpus of ~10M repos across 600+ languages — [source](https://github.blog/ai-and-ml/github-copilot/the-road-to-better-completions-building-a-faster-smarter-github-copilot-with-a-new-custom-model/)).

**This repo**: pulls one public, permissively-licensed instruction dataset per domain from the Hugging Face Hub (`src/data/download.py`). Scoped to one dataset, not a multi-source crawl — that's the honest tradeoff for a repo one person can run on Colab.

## 2. Deduplication (`src/data/dedup.py`)

Two passes, matching how production pipelines actually do it:

1. **Exact dedup** — SHA-256 hash of normalized text. Fast, catches byte-identical duplicates.
2. **Near-duplicate dedup** — MinHash LSH, Jaccard threshold 0.7 (the commonly-used cutoff in LLM data pipelines). Catches paraphrases and near-copies exact hashing misses.

For code specifically, dedup runs at the **repository/example level**, not line level — line-level dedup can silently break structure (imports separated from usage, etc).

## 3. Decontamination (`src/data/decontaminate.py`)

Strips training examples that overlap with the eval sets we score against (HumanEval, MBPP) using n-gram overlap. Skipping this step is the single most common way finetuning results get quietly inflated — a model that's seen the eval answers during training will look better than it is. This is checked and logged before training, not after.

## 4. Training (`notebooks/quickstart_colab.ipynb`)

**Production**: base/mid-training on a large corpus, then supervised finetuning, then RL (GitHub's custom model uses RL across quality/relevance/helpfulness reward dimensions with explicit anti-reward-hacking guardrails).

**This repo**: LoRA/QLoRA supervised finetuning only, via Unsloth, on free-tier Colab (T4/A100). No RL stage yet — see `src/monitor/log_feedback.py` for how accept/reject signal gets collected so a DPO pass (the standard lighter-weight replacement for full RLHF/PPO in production today) can be added later without re-architecting anything.

## 5. Evaluation (`src/eval/`)

Execution-based, not LLM-judge: HumanEval+ and MBPP+ (via [EvalPlus](https://github.com/evalplus/evalplus)), pass@1. Run once on the base model (baseline) and once on the finetuned model, same harness, same seed — the diff is the actual result, not a cherry-picked example.

We do **not** run SWE-bench here. SWE-bench requires multi-file repo context, tool calls, and a debug loop — it evaluates agent behavior, not a finetuned adapter in isolation, and doesn't fit a single-GPU Colab session. Documented here so nobody mistakes HumanEval+/MBPP+ pass@1 for "SWE-bench-level" capability — it isn't, and no repo doing occasional LoRA runs on free Colab should claim it is.

## 6. Serving (`src/serve/vllm_server.py`)

One base model in VRAM, LoRA adapters loaded per-request (`vllm --enable-lora`), not one deployment per finetune — this is how vLLM's multi-adapter serving is designed to be used and is the standard production pattern. Requires a CUDA GPU host; does not run on Colab or on this repo's default (Mac, no CUDA) dev machine. Real code, deliberately not executed as part of this repo's automated results.

## 7. Rollout (not automated here, documented for completeness)

Production rollout is canary → shadow traffic → A/B on real usage → automatic rollback on regression (latency percentiles, accept rate, refusal rate). A single-person repo running occasional finetunes has no traffic to canary against — this section exists so the repo is honest about the gap between "I finetuned a model and it scored better on an eval" and "this is safely running in front of real users."

## 8. Feedback loop (`src/monitor/log_feedback.py`)

Logs accept/reject signal to JSONL. This is the seed for a future preference dataset (DPO) — not wired to a live retraining loop, since there's no production traffic here to generate that signal at volume.
