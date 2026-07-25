# llm-finetune-lab

Open-source, plug-and-play framework for finetuning an open LLM on real business domains — one domain per git branch, each with real data, real evals, and real (not cherry-picked) results.

Base model: **Qwen3-8B-Instruct**, LoRA/QLoRA via [Unsloth](https://github.com/unslothai/unsloth), trained on free-tier Google Colab.

## What this is

- A working, reproducible pipeline you can clone and run yourself: data prep → dedup/decontam → LoRA finetune → execution-based eval → results.
- A learning resource. Every stage is a real script you can read, not a black box. `docs/ARCHITECTURE.md` explains how each stage maps to how production teams (GitHub Copilot, etc.) actually do it, and is explicit about what's scaled down here for free-tier compute and why.

## What this is not

- Not full RLHF at scale. We use SFT (+ optional DPO on accept/reject pairs later) — real production systems increasingly do the same for cost reasons, but don't expect PPO-grade alignment here.
- Not a SWE-bench-agent pipeline. Evals here are HumanEval+ / MBPP+ (execution-based, pass@1) — real and verifiable, but narrower than agentic repo-level benchmarks.
- Not a hosted service. `src/serve/` is real vLLM serving code but needs a CUDA GPU host to run — it will not run on this repo's Colab-only training path.

## Repo layout

```
llm-finetune-lab/            (main branch — shared framework, no domain data)
├── configs/base.yaml         # base model, quant, default LoRA hyperparams
├── src/
│   ├── data/                 # download, dedup (repo-level), decontaminate
│   ├── eval/                 # HumanEval+/MBPP+ execution eval, diff report
│   ├── serve/                # vLLM + LoRA adapter serving (needs GPU host)
│   └── monitor/              # accept/reject feedback logging (future DPO data)
├── notebooks/quickstart_colab.ipynb
└── docs/

domain/<name> branches       (e.g. domain/code) add:
domains/<name>/
├── README.md                 # dataset, eval, results, how to reproduce
├── data_config.yaml
├── lora_config.yaml
└── results/{baseline,finetuned}.json
```

## Domains

| Domain | Branch | Status |
|---|---|---|
| Code | `domain/code` | in progress |
| Finance | `domain/finance` | not started |
| Healthcare | `domain/healthcare` | not started |
| Customer Support | `domain/customer_support` | not started |
| Legal | `domain/legal` | not started |
| Marketing | `domain/marketing` | not started |

See `docs/RESULTS.md` for the cross-domain results table as domains complete.

## Quickstart

```bash
git clone <repo-url>
cd llm-finetune-lab
git checkout domain/code
pip install -r requirements.txt
make data          # download + dedup + decontaminate the domain dataset
```

Then open `notebooks/quickstart_colab.ipynb` in Google Colab (free T4 or Colab Pro A100), run it top to bottom. It installs its own training deps (Unsloth/PEFT/TRL — pinned to whatever CUDA/torch Colab provides that day), trains the LoRA adapter, runs baseline + finetuned eval, and writes `domains/<name>/results/*.json`. Commit those back to the branch.

## Adding a new domain

See `docs/ADDING_A_DOMAIN.md` — it's a checklist, not a rewrite of the framework.

## License

MIT.
