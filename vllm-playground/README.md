# vLLM Playground (Inference Lab)

You've heard that vLLM is the engine a lot of teams use to serve open models, and that it does clever things like continuous batching and prefix caching. Reading about it only gets you so far. This lab lets you start a real vLLM server on your own Mac, send it requests with one click, and see exactly what went over the wire and what came back.

It's three small pieces working together. vLLM itself runs the model on port 8000. A tiny Python controller on port 8787 starts and stops that server and runs the demo scripts. A web page on port 3000 gives you buttons, a chat box, and panels that show the request, the response, the timing, and the token counts.

## What you can try

The model is `mlx-community/Qwen2.5-3B-Instruct-4bit`, a small 4-bit Qwen that fits comfortably on an Apple Silicon laptop. The server calls it `local-qwen`. Each demo is a short, readable Python script adapted from the official vLLM examples, and each one comes with a note on what it does and does not prove.

| Demo | What happens |
|---|---|
| Chat | A normal conversation. Your app resends the whole history every turn, because the server keeps the weights loaded but not your chat. |
| Streaming | The answer arrives piece by piece. You see time to first text next to total time. |
| Text completion | A raw prompt with no chat roles, so you can see how an instruction-tuned model behaves without its chat template. |
| Compare sampling | One prompt at temperatures 0, 0.7 and 1.2, sent at the same time. |
| Concurrent prompts | Up to four prompts sent together, so vLLM can schedule them as it likes. |
| Structured output | The model must return JSON with a title, a summary and tags, and the script checks it. |
| Tool calling | The model asks for a Celsius to Fahrenheit conversion, Python does the math, and the model explains the result. |
| Context length | The same question with 1, 8 and 24 copies of a paragraph, so you can watch input size grow. |
| Repeated prefix | Three requests that share a prefix, a starting point for looking at prefix caching. |
| Offline script | Loads the model inside Python with `LLM(...)` and no server at all. |

The page is careful about claims. A faster third request in the prefix demo does not by itself prove a cache hit, and the page says so and points you at the server's `/metrics` output instead.

## Running it

You need an Apple Silicon Mac, Node 22.13 or newer, and a Python environment that has vLLM with its Metal backend installed, plus `fastapi`, `uvicorn` and `httpx` for the controller. The controller reports the versions of `vllm`, `vllm-metal`, `mlx` and `mlx-lm` it finds, which is a handy way to check your setup.

Install the web dependencies once:

```bash
npm install
```

Then point the launcher at your vLLM Python and start everything:

```bash
VLLM_PYTHON=~/.venv-vllm-metal/bin/python ./start.command
```

Open http://127.0.0.1:3000 and press start on the runtime panel. The first start downloads the model, so give it a minute. `Ctrl+C` in the terminal stops the web page, the controller, and the model server together. Run this from a regular macOS Terminal, because Metal is not available inside some sandboxed shells and the controller will refuse to start the server if it can't see it.

You can change the context length (512 to 32768 tokens), the number of sequences served at once (1 to 16), and how much GPU memory vLLM may use (10% to 80%) from the settings panel. These are saved to `work/runtime.json`, which is not committed.

If you'd rather skip the web page, any demo runs from the command line while the server is up:

```bash
python examples/run_demo.py --demo stream --prompt 'Explain KV caching.'
```

## Safety

The controller only listens on `127.0.0.1` and rejects requests from any page other than this lab, so a random website can't start or stop your model. It also only runs the fixed demo scripts in `examples/`. It never executes code sent from the browser.
