# Results

Numbers land here only after they've actually been produced — no estimated or placeholder values.

## Data prep — real, verified locally (no GPU)

Every domain below was downloaded and run through the full pipeline on 2026-07-25. Stats come from `domains/<name>/results/{dedup,decontamination}_stats.json`.

| Domain | Downloaded | Exact dupes | Near dupes | Removed | Contaminated | Train | Held out |
|---|---|---|---|---|---|---|---|
| code | 20,000 | 0 | 113 | 0.6% | 0 | 19,387 | 500 |
| finance | 20,000 | 0 | 640 | 3.2% | 0 | 18,860 | 500 |
| healthcare | 15,000 | 0 | 1 | 0.0% | 0 | 14,499 | 500 |
| legal | 13,000 | 869 | 2,253 | 24.0% | 0 | 9,378 | 500 |
| customer_support | 20,000 | 0 | 3,848 | 19.2% | 0 | 15,652 | 500 |
| marketing | 13,000 | 0 | 32 | 0.2% | 0 | 12,468 | 500 |

What's worth reading in that table:

- **Legal (24%) and customer support (19%) are heavily duplicated.** Both make sense: contract corpora repeat boilerplate clauses across filings, and the support dataset is template-generated, so many rows are the same intent with small variations. Training on those unremoved would over-weight the repeated patterns.
- **Legal is the only domain with exact duplicates** (869) — byte-identical clauses appearing in multiple contracts.
- **Zero contamination everywhere.** No training example overlapped HumanEval, MBPP, MedQA, or MMLU at the 13-gram / 0.8 threshold. That's the expected result for curated instruct datasets, and it's worth having measured rather than assumed — it means the benchmark numbers below, once they exist, aren't measuring memorization.

## Finetuning — pending

Requires a Colab GPU run per domain. Empty until real runs produce `baseline.json` and `finetuned.json`.

| Domain | Primary eval | Baseline | Finetuned | Change | MMLU (regression) |
|---|---|---|---|---|---|
| code | HumanEval+/MBPP+ pass@1 | pending | pending | — | pending |
| finance | held-out perplexity | pending | pending | — | pending |
| healthcare | MedQA accuracy | pending | pending | — | pending |
| legal | clause-label accuracy | pending | pending | — | pending |
| customer_support | held-out perplexity | pending | pending | — | pending |
| marketing | held-out perplexity | pending | pending | — | pending |

Read the MMLU column alongside the primary eval: a domain gain paired with an MMLU drop is the model trading general ability for domain fit, not a clean win. `report.py` flags any metric that moved the wrong way with ⚠️.

For the three perplexity-only domains (finance, support, marketing), see each domain README — perplexity shows the model fit the domain distribution, not that its answers got better.
