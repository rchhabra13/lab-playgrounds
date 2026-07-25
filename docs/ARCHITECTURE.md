# Architecture

End-to-end pipeline, stage by stage. Each section says what production teams do, then what this repo does, and why the gap exists.

## 1. Data collection (`src/data/download.py`)

**Production**: teams curate and deduplicate corpora at enormous scale — GitHub's custom Copilot completion model trained on a curated, deduped corpus of ~10M repos across 600+ languages ([source](https://github.blog/ai-and-ml/github-copilot/the-road-to-better-completions-building-a-faster-smarter-github-copilot-with-a-new-custom-model/)).

**This repo**: one public, permissively-licensed instruction dataset per domain, pulled from the Hugging Face Hub and capped via `max_examples`. Scoped to one dataset rather than a multi-source crawl — the honest tradeoff for something one person can run on Colab.

## 2. Deduplication (`src/data/dedup.py`)

Two passes, matching how production pipelines do it:

1. **Exact dedup** — SHA-256 over normalized text. Fast, catches byte-identical duplicates.
2. **Near-duplicate dedup** — MinHash LSH, Jaccard threshold 0.7 (the common cutoff in LLM data pipelines). Catches paraphrases and near-copies exact hashing misses.

Dedup runs at the **example level**, not the line level — line-level dedup silently breaks structure (imports separated from the code that uses them, a clause separated from its label).

## 3. Decontamination + held-out split (`src/data/decontaminate.py`)

Strips training examples overlapping the benchmarks that domain is scored against (13-gram overlap ≥ 0.8), then holds out an unseen slice before training.

Each domain declares `decontaminate_against` for the evals it actually runs — code strips HumanEval/MBPP, healthcare strips MedQA, everyone strips MMLU since every domain runs the MMLU regression check.

Skipping this is the single most common way finetuning results get quietly inflated: a model that saw the eval answers in training scores better without being better. It runs before training and its stats are committed, not asserted after the fact.

## 4. Training (`notebooks/quickstart_colab.ipynb`)

**Production**: large-corpus mid-training → supervised finetuning → RL. GitHub's custom model uses RL across quality/relevance/helpfulness reward dimensions with explicit anti-reward-hacking guardrails.

**This repo**: LoRA/QLoRA supervised finetuning only, via Unsloth on free-tier Colab. No RL stage — `src/monitor/log_feedback.py` collects the accept/reject signal a DPO pass would need (DPO being the standard lighter-weight replacement for full RLHF/PPO in production today), so it can be added later without re-architecting.

Prompt shape is built by `src/data/chat_format.py` from each domain's `chat:` config block. Training and held-out eval both call it, deliberately — if they formatted text differently, held-out loss would be measured on a prompt shape the model never saw.

## 5. Evaluation (`src/eval/`)

Every domain runs a **baseline eval on the untouched base model first**, then the identical harness on the finetuned model. The diff is the result.

| Eval | Script | What it measures |
|---|---|---|
| HumanEval+ / MBPP+ | `run_eval.py` | pass@1, real test execution (code only) |
| MedQA, MMLU | `run_mcq_eval.py` | multiple-choice accuracy vs. real external benchmarks |
| Held-out perplexity / label accuracy | `run_holdout_eval.py` | fit + accuracy on unseen examples from the domain's own distribution |

`run_all.py` loads the model once and runs whatever the domain declares under `evals:` — on Colab, loading an 8B model per eval would eat the session.

Two deliberate honesty constraints:

- **Perplexity is not capability.** Finetuning on a distribution nearly always lowers perplexity on that same distribution. It confirms training took effect; it does not show the model got smarter. Domains with no objective benchmark (finance, support, marketing) have perplexity as their primary number, and that limitation is stated in each domain README rather than dressed up.
- **Every domain runs MMLU** as a regression check. A finetune that gains domain skill while degrading general ability is a real and common failure; `report.py` flags any metric that moved the wrong way with ⚠️.

We do **not** run SWE-bench. It needs multi-file repo context, tool calls, and a debug loop — it measures agent behavior, not an adapter in isolation, and doesn't fit a single Colab session. Stated here so nobody reads HumanEval+ pass@1 as a SWE-bench-grade claim.

### Verification status

What has actually been executed, and what hasn't:

| Component | Status |
|---|---|
| Data pipeline (download/dedup/decontaminate/holdout) | Run for all six domains; stats committed |
| `chat_format.build_messages` | Verified against the real Qwen3 tokenizer and every domain's data |
| `run_holdout_eval.py` | Executed end-to-end on CPU (perplexity + label accuracy paths) |
| `run_mcq_eval.py` | Executed end-to-end on CPU against real MMLU |
| `run_all.py` | Executed end-to-end (single model load, multi-eval dispatch) |
| `report.py` | Executed against real result files |
| `run_eval.py` (EvalPlus) | evalplus CLI, output filename, and result schema verified against evalplus 0.3.1; pass@1 math verified. Full generation loop needs a GPU |
| Training (Unsloth LoRA) | **Not executed** — requires CUDA |
| `serve/vllm_server.py` | **Not executed** — requires a CUDA GPU host |

Three bugs were found and fixed by actually running this rather than reading it: `apply_chat_template(tokenize=True)` returning a `BatchEncoding` on transformers 5.x (which silently skipped every held-out example), EvalPlus not storing the `pass@1` it prints, and a whitespace-only system field injecting empty system turns into training data.

## 6. Serving (`src/serve/vllm_server.py`)

One base model in VRAM with LoRA adapters loaded per-request (`vllm serve --enable-lora`), not one deployment per finetune — the standard production pattern and what vLLM's multi-adapter support is built for. Needs a CUDA GPU host; does not run on Colab. Real code, deliberately outside this repo's automated results.

## 7. Rollout (documented, not automated)

Production rollout is canary → shadow traffic → A/B on real usage → automatic rollback on regression (latency percentiles, accept rate, refusal rate). A repo running occasional finetunes has no traffic to canary against. This section exists so the gap between "scored better on an eval" and "safely serving real users" stays visible.

## 8. Feedback loop (`src/monitor/log_feedback.py`)

Logs accept/reject signal to JSONL and pairs it into DPO preference tuples. Not wired to a live retraining loop — there's no production traffic here to generate that signal at volume.
