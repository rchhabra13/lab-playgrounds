"""
Accept/reject feedback logging — the seed for a future DPO preference dataset.

Call log_feedback() wherever completions are surfaced to a user (a serving layer,
a CLI, an IDE extension). Not wired to any live retraining loop here; there's no
production traffic in this repo to generate that signal at volume yet. Each line
is one JSON record: prompt, the completion shown, and whether it was accepted.
"""

import json
import os
from datetime import datetime, timezone


def log_feedback(domain: str, prompt: str, completion: str, accepted: bool, log_dir="domains"):
    path = os.path.join(log_dir, domain, "results", "feedback.jsonl")
    os.makedirs(os.path.dirname(path), exist_ok=True)
    record = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "prompt": prompt,
        "completion": completion,
        "accepted": accepted,
    }
    with open(path, "a") as f:
        f.write(json.dumps(record) + "\n")


def to_dpo_pairs(domain: str, log_dir="domains"):
    """
    Group logged completions by prompt; pair one accepted completion against one
    rejected completion for the same prompt. Returns a list of
    {"prompt", "chosen", "rejected"} dicts ready for a DPO trainer. Prompts with
    only accepted or only rejected completions are skipped — no pair to form.
    """
    path = os.path.join(log_dir, domain, "results", "feedback.jsonl")
    by_prompt = {}
    with open(path) as f:
        for line in f:
            r = json.loads(line)
            by_prompt.setdefault(r["prompt"], {"accepted": [], "rejected": []})
            (by_prompt[r["prompt"]]["accepted"] if r["accepted"] else by_prompt[r["prompt"]]["rejected"]).append(
                r["completion"]
            )

    pairs = []
    for prompt, buckets in by_prompt.items():
        for chosen in buckets["accepted"]:
            for rejected in buckets["rejected"]:
                pairs.append({"prompt": prompt, "chosen": chosen, "rejected": rejected})
    return pairs
