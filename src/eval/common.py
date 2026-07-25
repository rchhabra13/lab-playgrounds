import json
import os


def load_model(model_path, adapter_path=None):
    import torch
    from transformers import AutoModelForCausalLM, AutoTokenizer

    tokenizer = AutoTokenizer.from_pretrained(model_path)
    model = AutoModelForCausalLM.from_pretrained(
        model_path, torch_dtype=torch.bfloat16, device_map="auto"
    )
    if adapter_path:
        from peft import PeftModel

        model = PeftModel.from_pretrained(model, adapter_path)
    model.eval()
    return model, tokenizer


def write_result(out_path, key, metric, value, higher_is_better, **extra):
    """
    Merge one metric into a results json. Every eval script writes through here so
    baseline.json and finetuned.json always share a schema report.py can render.
    """
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    results = {}
    if os.path.exists(out_path):
        with open(out_path) as f:
            results = json.load(f)

    results[key] = {
        "metric": metric,
        "value": value,
        "higher_is_better": higher_is_better,
        **extra,
    }
    with open(out_path, "w") as f:
        json.dump(results, f, indent=2)

    print(json.dumps({key: results[key]}, indent=2))
