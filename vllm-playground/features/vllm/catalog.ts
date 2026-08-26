import {
  MessageSquare,
  Radio,
  AlignLeft,
  SlidersHorizontal,
  Layers,
  Braces,
  Wrench,
  Terminal,
} from 'lucide-react';
export const demos = [
  {
    id: 'context',
    title: 'Context length',
    short: 'Context length',
    icon: AlignLeft,
    description:
      'Compare the same question with increasing amounts of input text.',
    prompt: 'Summarize the paragraph in one sentence.',
    lesson:
      'This experiment repeats a paragraph 1, 8, and 24 times. Input-token usage is the actual measured size. Timing includes request handling and generation; this is not a pure prefill benchmark.',
    source: 'basic/online_serving/',
  },
  {
    id: 'cache',
    title: 'Repeated prefix',
    short: 'Prefix reuse',
    icon: Layers,
    description: 'Repeat a shared prefix and inspect timing and token usage.',
    prompt: 'Summarize the shared context briefly.',
    lesson:
      'Three sequential requests use an identical prefix and question. Existing cache state is not cleared. Faster responses alone do not prove cache hits; inspect exposed metrics and configuration.',
    source: 'features/automatic_prefix_caching/',
  },

  {
    id: 'chat',
    title: 'Chat playground',
    short: 'Chat',
    icon: MessageSquare,
    description:
      'A conversation with your local model. Adjust the instructions and keep the context.',
    prompt: 'Explain how vLLM serves a language model. Use a simple analogy.',
    lesson:
      'Your app sends the system instructions and conversation history with every turn. The model server keeps the weights loaded; your app manages the conversation.',
    source: 'basic/online_serving/',
  },
  {
    id: 'stream',
    title: 'Streaming response',
    short: 'Streaming',
    icon: Radio,
    description:
      'See generation unfold as the server sends small pieces of text.',
    prompt: 'Explain the journey of a prompt through vLLM in five short steps.',
    lesson:
      'Streaming delivers partial output over an open connection. Time to first text measures when the first visible content arrives; total time includes the whole response.',
    source: 'basic/online_serving/',
  },
  {
    id: 'completion',
    title: 'Text completion',
    short: 'Completion',
    icon: AlignLeft,
    description:
      'Give the model a starting point and let it continue the text.',
    prompt: 'Three practical uses for a local language model are:\n1.',
    lesson:
      'The completions endpoint takes a raw text prompt. Unlike chat, it does not apply the usual conversation roles. An instruction-tuned model may behave differently here.',
    source: 'basic/online_serving/',
  },
  {
    id: 'sampling',
    title: 'Compare sampling',
    short: 'Sampling',
    icon: SlidersHorizontal,
    description:
      'One prompt, three temperatures. Explore how randomness changes the answer.',
    prompt:
      'Invent one memorable name for a tiny robot that organizes books. Explain the name in one sentence.',
    lesson:
      'These three requests run concurrently at temperatures 0, 0.7, and 1.2. Higher temperature allows more varied token choices; a single comparison is illustrative, not a quality benchmark.',
    source: 'basic/offline_inference/',
  },
  {
    id: 'batch',
    title: 'Concurrent prompts',
    short: 'Batch requests',
    icon: Layers,
    description:
      'Run up to four prompts together and inspect each response as it finishes.',
    prompt:
      'Explain a token in one sentence.\nExplain a KV cache in one sentence.\nExplain continuous batching in one sentence.',
    lesson:
      'The client submits independent requests concurrently. vLLM decides how to schedule them. This demonstrates concurrent serving; it is not the file-based OpenAI Batch API.',
    source: 'basic/online_serving/',
  },
  {
    id: 'json',
    title: 'Structured output',
    short: 'Structured JSON',
    icon: Braces,
    description:
      'Generate a title, summary, and tags using an explicit JSON schema.',
    prompt:
      'Summarize this idea: a local dashboard for experimenting with language models on an Apple Silicon Mac.',
    lesson:
      'The request includes a JSON schema with three required fields: title, summary, and tags. The script validates the returned object. Backend support is required; an error is shown if unavailable.',
    source: 'features/structured_outputs/',
  },
  {
    id: 'tools',
    title: 'Tool calling',
    short: 'Tool calling',
    icon: Wrench,
    description:
      'Watch the model ask for a calculation, then use its result in an answer.',
    prompt:
      'Convert 23 degrees Celsius to Fahrenheit and explain the result briefly.',
    lesson:
      'This demo deliberately selects the temperature conversion tool. The model supplies arguments, Python calculates the result, and a second model request explains it. The model does not execute code itself.',
    source: 'tool_calling/',
  },
  {
    id: 'offline',
    title: 'Offline Python script',
    short: 'Offline inference',
    icon: Terminal,
    description:
      'Run a Python example that loads the model directly, without an API server.',
    prompt: 'The most useful thing about running a model locally is',
    lesson:
      'LLM(...) creates a separate engine and generate(...) runs inference. Stop the existing server first to avoid loading two models into memory. Timing here includes model initialization.',
    source: 'basic/offline_inference/',
  },
];

export const executionDescription: Record<string, string> = {
  context:
    'Sends three sequential requests with increasing input context and records token usage and duration.',
  cache:
    'Sends three sequential requests with the same prefix. No cache reset or cache-hit assumption is made.',
  chat: 'Sends the system instructions, conversation history, and your new message to /v1/chat/completions.',
  stream:
    'Sends a streaming chat request, then forwards each piece of generated text to the output panel.',
  completion:
    'Sends your raw prompt to /v1/completions. System instructions and conversation history are not used.',
  sampling:
    'Sends three concurrent chat requests at temperatures 0, 0.7, and 1.2. The temperature field is overridden for this comparison.',
  batch:
    'Splits your input into lines and sends one chat request per line, with up to four requests running concurrently.',
  json: 'Sends a chat request with a JSON schema, then validates the returned title, summary, and tags.',
  tools:
    'Requests a temperature-conversion tool call, calculates Fahrenheit in Python, then sends the result back to the model for a final answer.',
  offline:
    'Loads the model with LLM(...), calls generate(...) on your prompt, prints the output, and exits. System instructions and chat history are not used.',
};
export const groups = [
  { name: 'Context & cache', ids: ['context', 'cache'] },
  { name: 'Fundamentals', ids: ['chat', 'stream', 'completion'] },
  { name: 'Model behavior', ids: ['sampling', 'json', 'tools'] },
  { name: 'Execution', ids: ['batch', 'offline'] },
];
export function sourceUrl(id: string) {
  const paths: Record<string, string> = {
    cache: 'features/automatic_prefix_caching/',
    context: 'getting_started/quickstart/',
    chat: 'examples/basic/online_serving/',
    stream: 'examples/basic/online_serving/',
    completion: 'examples/basic/online_serving/',
    sampling: 'examples/basic/offline_inference/',
    batch: 'examples/basic/online_serving/',
    json: 'features/structured_outputs/',
    tools: 'features/tool_calling/',
    offline: 'examples/basic/offline_inference/',
  };
  return 'https://docs.vllm.ai/en/latest/' + paths[id];
}
export type Demo = (typeof demos)[number];
