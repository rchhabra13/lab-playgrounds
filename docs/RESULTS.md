# Results

Filled in as each domain branch completes a real Colab run. Numbers land here only after `domains/<name>/results/{baseline,finetuned}.json` exist from an actual run — no estimated or placeholder values.

## Data prep (verified locally, no GPU)

| Domain | Downloaded | Exact dupes | Near dupes | Contaminated | Train | Held out |
|---|---|---|---|---|---|---|
| code | — | — | — | — | — | — |
| finance | — | — | — | — | — | — |
| healthcare | — | — | — | — | — | — |
| legal | — | — | — | — | — | — |
| customer_support | — | — | — | — | — | — |
| marketing | — | — | — | — | — | — |

## Finetuning (requires a Colab run)

| Domain | Primary eval | Baseline | Finetuned | Change | MMLU (regression) |
|---|---|---|---|---|---|
| code | HumanEval+/MBPP+ pass@1 | pending | pending | — | pending |
| finance | held-out perplexity | pending | pending | — | pending |
| healthcare | MedQA accuracy | pending | pending | — | pending |
| legal | clause-label accuracy | pending | pending | — | pending |
| customer_support | held-out perplexity | pending | pending | — | pending |
| marketing | held-out perplexity | pending | pending | — | pending |

Read the MMLU column alongside the primary eval: a domain gain that comes with an MMLU drop is the model trading general ability for domain fit, not a clean win.
