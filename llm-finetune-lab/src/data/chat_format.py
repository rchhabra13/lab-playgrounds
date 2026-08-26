"""
Turns a raw dataset record into chat messages, driven by the `chat:` block in a
domain's data_config.yaml.

Both training (the Colab notebook) and held-out eval import this. Keep it that
way — if the two formatted text differently, held-out loss would be measured on
a prompt shape the model never saw, and the numbers would mean nothing.
"""


def build_messages(record, chat_cfg):
    messages = []

    system = chat_cfg.get("system_prompt")
    if not system and chat_cfg.get("system_field"):
        system = record.get(chat_cfg["system_field"])
    # Whitespace-only counts as absent: some datasets fill the system column with
    # "\n" rather than leaving it empty, and a blank system turn is worse than none.
    system = str(system).strip() if system else ""
    if system:
        messages.append({"role": "system", "content": system})

    template = chat_cfg.get("input_template")
    user = template.format(**record) if template else str(record[chat_cfg["input_field"]])
    messages.append({"role": "user", "content": user.strip()})

    parts = [str(record[f]).strip() for f in chat_cfg["output_fields"] if record.get(f)]
    messages.append({"role": "assistant", "content": "\n\n".join(parts)})

    return messages
