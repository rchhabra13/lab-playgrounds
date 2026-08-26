# lab-playgrounds

Say you want to understand how an LLM app works end to end. You'd want to see how a model gets taught a new domain, how it's served to users quickly, and how an agent built on top of it seems to remember you between chats. Each of those is its own rabbit hole, and reading about them only gets you so far.

This repo has one hands-on lab for each. Every lab lives in its own folder, runs on its own, and has its own README with setup steps.

| Lab | The question it answers | What you need |
|---|---|---|
| [`llm-finetune-lab/`](llm-finetune-lab/) | How do you teach an open model a new domain, and prove it helped? | Free Google Colab GPU |
| [`vllm-playground/`](vllm-playground/) | What actually happens when a server runs a model for you? | Apple Silicon Mac |
| [`ai-memory-playground/`](ai-memory-playground/) | How does an agent "remember" you when the model itself can't? | Any browser |

## llm-finetune-lab

This lab takes Qwen3-8B and finetunes it on real business data with LoRA, a cheap method that trains a small add-on instead of the whole model. It covers six domains: code, finance, healthcare, legal, customer support and marketing. The important part is the before and after. Every domain is scored with the same eval before training and again after, so the result is a real number rather than a hand-picked example. Each domain lives on its own `domain/*` branch with its dataset config and results, and the whole thing runs on a free Colab GPU.

## vllm-playground

vLLM is the engine many teams use to serve open models. This lab starts a real vLLM server on your Mac with a small 4-bit Qwen model and gives you a web page with one-click demos: chat, streaming, sampling at different temperatures, concurrent requests, JSON output, tool calling, and experiments with long context and repeated prefixes. For every demo you can see the exact request, the response, the timing and the token counts, along with a plain note on what the result does and doesn't prove.

## ai-memory-playground

A single web page that explains agent memory with one running example: you told the assistant on Monday you're vegetarian, so why does it suggest a steakhouse on Friday? It walks through the four kinds of memory, then lets you play with a simulated agent whose every memory step is visible, including what happens when a fact changes or the context window runs out.

## History

This repo started life as `llm-finetune-lab`, so its full commit history is here and the old GitHub URL redirects to this one.
