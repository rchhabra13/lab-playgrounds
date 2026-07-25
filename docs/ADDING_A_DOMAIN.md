# Adding a new domain

1. Branch off `main`:
   ```bash
   git checkout main
   git checkout -b domain/<name>
   ```
2. Create `domains/<name>/`:
   ```
   domains/<name>/
   ├── README.md          # copy domains/code/README.md, fill in your dataset/eval/limitations
   ├── data_config.yaml    # copy domains/code/data_config.yaml, change dataset + eval benchmark
   ├── lora_config.yaml    # copy domains/code/lora_config.yaml, only override what differs from configs/base.yaml
   └── results/            # empty until you run the pipeline
   ```
3. Pick a dataset that's public and permissively licensed. Say so in the domain README, with the license.
4. Pick an eval that's execution-based or otherwise objective if one exists for the domain (code has HumanEval+/MBPP+; not every domain will have an equivalent — say so if it doesn't, and use a held-out accuracy split instead).
5. Run `make data DOMAIN=<name>` locally — verify dedup/decontam stats look sane before spending Colab GPU time.
6. Duplicate `notebooks/quickstart_colab.ipynb`, point it at `domains/<name>/`, run it in Colab.
7. Commit `domains/<name>/results/{baseline,finetuned}.json` back to the branch.
8. Add a row to `docs/RESULTS.md` and update the domain status table in the root `README.md`.
9. Open a PR into `main` only for framework changes (new shared eval, bugfix in dedup, etc). Domain work stays on its branch — `main` never gains domain-specific data or configs.
