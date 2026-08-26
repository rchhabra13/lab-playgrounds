# llm-finetune-lab

Open-source, plug-and-play framework for finetuning an open LLM on real business domains — one domain per git branch, each with a verified dataset, an honest eval, and real (not cherry-picked) results.

Base model: **Qwen3-8B-Instruct**, LoRA/QLoRA via [Unsloth](https://github.com/unslothai/unsloth), trained on free-tier Google Colab.

## What this is

A working, reproducible pipeline you can clone and run: data prep → dedup → decontamination → held-out split → **baseline eval** → LoRA finetune → **identical eval** → diff report.

It's also meant to be readable. Every stage is a real script, not a black box, and `docs/ARCHITECTURE.md` maps each one to how production teams (GitHub Copilot and others) actually do it — while being explicit about what's scaled down here for free-tier compute, and why.

## What this is not

- **Not full RLHF.** SFT only, with hooks for a later DPO pass. Production increasingly does the same for cost reasons, but don't read this as PPO-grade alignment.
- **Not SWE-bench.** Code evals are HumanEval+/MBPP+ pass@1 — real and execution-verified, but narrower than agentic repo-level benchmarks.
- **Not a hosted service.** `src/serve/` is real vLLM multi-adapter serving code, but it needs a CUDA GPU host and is not part of the automated results.
- **Not claiming perplexity is capability.** Three domains have no objective public benchmark; their primary number is held-out perplexity, and each README says plainly what that does and doesn't show.

## Domains

Each branch pairs a verified public dataset with an eval appropriate to that domain's actual task.

| Domain | Branch | Dataset (license) | Primary eval |
|---|---|---|---|
| Code | `domain/code` | glaive-code-assistant-v3 (Apache-2.0) | HumanEval+ / MBPP+ pass@1 |
| Finance | `domain/finance` | Finance-Instruct-500k (Apache-2.0) | held-out perplexity |
| Healthcare | `domain/healthcare` | medical-o1-reasoning-SFT (Apache-2.0) | MedQA-USMLE accuracy |
| Legal | `domain/legal` | CUAD clause classification (CC-BY-4.0) | clause-label accuracy |
| Customer Support | `domain/customer_support` | Bitext support (CDLA-Sharing-1.0) | held-out perplexity |
| Marketing | `domain/marketing` | marketing-instruct-13k (Apache-2.0) | held-out perplexity |

Every domain also runs an **MMLU regression check** — a finetune that gains domain skill while degrading general ability is a real failure mode, and `report.py` flags it.

See `docs/RESULTS.md` for the cross-domain table.

## Repo layout

```
main                          # shared framework, no domain data
├── configs/base.yaml          # base model, LoRA hyperparams, dedup/decontam thresholds
├── src/
│   ├── data/                  # download, dedup, decontaminate + holdout, chat formatting
│   ├── eval/                  # code / MCQ / held-out evals, single-model-load runner, report
│   ├── serve/                 # vLLM + LoRA adapter serving (needs a GPU host)
│   └── monitor/               # accept/reject logging → DPO pairs
├── notebooks/quickstart_colab.ipynb
└── docs/

domain/<name>                 # adds only:
domains/<name>/
├── README.md                  # dataset, license, task, eval, honest limitations
├── data_config.yaml           # dataset + chat mapping + which evals to run
├── lora_config.yaml
└── results/                   # dedup/decontam stats, baseline vs finetuned, report.md
```

## Quickstart

```bash
git clone https://github.com/rchhabra13/lab-playgrounds.git
cd lab-playgrounds/llm-finetune-lab
git checkout domain/code
pip install -r requirements.txt
make data DOMAIN=code
```

That runs download → dedup → decontaminate → holdout split locally, no GPU needed. Then open `notebooks/quickstart_colab.ipynb` in Google Colab (Runtime → Change runtime type → GPU) and run it top to bottom: it trains the adapter, evals baseline and finetuned with the same harness, and writes `domains/code/results/`.

## Adding a domain

See `docs/ADDING_A_DOMAIN.md`. Verify the dataset's real field names before writing config — that step has already caught a config-only dataset and an all-`None` column in this repo.

## License

MIT (this framework). Each domain dataset carries its own license, noted per domain.
