# Adding a new domain

Everything domain-specific lives in its own folder, `domains/<name>/`. The shared framework (`src/`, `configs/`, the notebook) is the same for every domain and never holds domain data or configs.

## 1. Folder

```bash
mkdir -p domains/<name>
```

## 2. Pick a dataset — and verify it before writing any config

Public and permissively licensed. Check the real field names rather than assuming them:

```python
from datasets import load_dataset
ds = load_dataset("<repo_id>", split="train[:2]")
print(ds.column_names)
print(ds[0])
```

Two things this catches that guessing does not: config-only datasets (`load_dataset(name, "en", ...)`), and columns that exist but are empty — one dataset in this repo has an `original_completion` column that is entirely `None`.

## 3. Write `domains/<name>/data_config.yaml`

```yaml
dataset_name: org/dataset
dataset_config: null        # e.g. "en" when the dataset requires one
dataset_split: train
max_examples: 20000         # cap so a full cycle fits a Colab session
holdout_size: 500           # unseen slice reserved before training

text_fields: [field_a, field_b]   # fields hashed for dedup/decontamination

decontaminate_against: [mmlu]     # every benchmark under evals: that has a loader

chat:                              # how a record becomes chat messages
  system_field: null               # optional column holding a system prompt
  system_prompt: null              # or a fixed system prompt for every example
  input_field: field_a             # OR input_template below
  input_template: null             # "Classify:\n{field_a}\n\nType:" — use for non-instruction data
  output_fields: [field_b]         # joined with a blank line when multiple
  label_field: null                # set for discrete labels to add exact-match accuracy

evals:
  - {type: holdout}
  - {type: mcq, benchmark: mmlu, limit: 500}
```

Eval types: `holdout` (perplexity, plus label accuracy when `label_field` is set), `mcq` (`medqa` or `mmlu`), `code` (`humaneval` or `mbpp`).

## 4. Verify the prompt shape before spending GPU time

```bash
make data DOMAIN=<name>
python3 -c "
import json, yaml
from src.data.chat_format import build_messages
cfg = yaml.safe_load(open('domains/<name>/data_config.yaml'))['chat']
rec = json.loads(open('domains/<name>/data/processed/train.jsonl').readline())
for m in build_messages(rec, cfg): print(m['role'], ':', m['content'][:300], '\n')
"
```

Check dedup/decontamination stats in `domains/<name>/results/` look sane too. A near-duplicate rate near 100%, or decontamination removing most of the set, means something is wrong with the config — cheaper to find here than after training.

## 5. Notebook

Open `notebooks/quickstart_colab.ipynb` and set `DOMAIN = "<name>"` in the first code cell. Nothing else needs editing — evals and prompt shape are config-driven.

## 6. Write `domains/<name>/README.md`

Dataset (with license), training task, eval and what it does *not* prove, and honest known limitations. If the domain has no objective benchmark, say so plainly instead of leaning on perplexity as if it were capability.

## 7. Run it, then commit results

Run the notebook in Colab, then commit `domains/<name>/results/`, add a row to `docs/RESULTS.md`, and update the status table in the root `README.md`.

Keep domain work inside `domains/<name>/`. Changes to `src/` or `configs/` affect every domain, so rerun at least one other domain's data prep after touching them.
