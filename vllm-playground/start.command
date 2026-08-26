#!/bin/zsh
cd "${0:A:h}"
PYTHON="${VLLM_PYTHON:-$HOME/.venv-vllm-metal/bin/python}"
if [[ ! -x "$PYTHON" ]]; then
  echo 'Set VLLM_PYTHON to the Python executable in your vLLM Metal environment.'
  exit 1
fi
exec "$PYTHON" backend/launch.py
