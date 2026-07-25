import argparse
import json
import os


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--domain", required=True)
    args = parser.parse_args()

    results_dir = os.path.join("domains", args.domain, "results")
    with open(os.path.join(results_dir, "baseline.json")) as f:
        baseline = json.load(f)
    with open(os.path.join(results_dir, "finetuned.json")) as f:
        finetuned = json.load(f)

    lines = [
        f"# {args.domain} — results",
        "",
        "| Eval | Baseline pass@1 | Finetuned pass@1 | Delta |",
        "|---|---|---|---|",
    ]
    for dataset in baseline:
        b = baseline[dataset]["pass_at_1"]
        ft = finetuned[dataset]["pass_at_1"]
        lines.append(f"| {dataset} | {b:.3f} | {ft:.3f} | {ft - b:+.3f} |")

    report = "\n".join(lines) + "\n"
    with open(os.path.join(results_dir, "report.md"), "w") as f:
        f.write(report)

    print(report)


if __name__ == "__main__":
    main()
