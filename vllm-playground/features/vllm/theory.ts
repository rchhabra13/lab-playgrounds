/** Documentation for the implemented workloads, not claims about all backends. */
export const theory: Record<
  string,
  { concept: string; usage: string; interpretation: string }
> = {
  context: {
    concept:
      'Prefill processes the input prompt before decoding generates new tokens. Increasing input length changes prompt processing work and the amount of attention state needed.',
    usage:
      'Run the same question with 1, 8, and 24 copies of the reference paragraph. Keep the output limit unchanged.',
    interpretation:
      'Inspect prompt_tokens in the response usage and compare elapsed times. This measurement includes generation and request overhead. Shared prefixes and existing cache state can affect the result.',
  },
  cache: {
    concept:
      'Automatic prefix caching can reuse attention state for a previously processed prompt prefix. Reuse depends on matching prefixes and retained cache blocks.',
    usage:
      'Run three sequential requests with identical context and a fixed question. This demo does not clear the cache or toggle prefix caching.',
    interpretation:
      'Compare response usage and duration. Faster later requests do not establish a cache hit. Correlate with exposed cache metrics; the stored environment snapshot is collected before the run.',
  },
  batch: {
    concept:
      'Requests have different prompt and output lengths. Continuous batching allows a serving engine to update the active work as sequences finish. Client concurrency and engine scheduling are separate concerns.',
    usage:
      'Enter up to four prompts, one per line. The script submits them concurrently to the same endpoint.',
    interpretation:
      'Inspect each response and its elapsed time. Results appear in completion order. This example does not compare against a sequential baseline or expose the scheduler’s internal batch composition.',
  },
  chat: {
    concept:
      'Chat requests contain messages with roles. The server formats these messages for the model; the client supplies the conversation history on each request.',
    usage:
      'Enter a message, run the example, then enter a follow-up. Reset clears the conversation for this experiment.',
    interpretation:
      'Inspect the messages sent to the API and the generated response. Growing history consumes input context. The response demonstrates request handling, not factual correctness.',
  },
  stream: {
    concept:
      'Streaming returns partial output before generation finishes. Time to first visible text and total elapsed time describe different parts of the client experience.',
    usage:
      'Run a prompt with enough output to observe the stream. Use Cancel to stop the active script.',
    interpretation:
      'Compare first-text time, elapsed time, and output-token usage. A network chunk can contain more than one token; chunk arrival intervals are not token-level latency measurements.',
  },
  completion: {
    concept:
      'Text completion continues a raw prompt. Unlike chat, this request does not send a role-based conversation.',
    usage:
      'Enter a text prefix and run the example. System instructions and chat history are not included.',
    interpretation:
      'Inspect the generated continuation and finish reason. An instruction-tuned checkpoint may behave differently without its chat template.',
  },
  sampling: {
    concept:
      'Temperature changes how token probabilities are used during generation. Lower values favor higher-probability choices; higher values permit more variation.',
    usage:
      'Run one prompt at temperatures 0, 0.7, and 1.2. The script sends three concurrent requests and overrides the temperature control.',
    interpretation:
      'Compare the content of the responses. One set of outputs does not establish a quality ranking, and timing differences are not an isolated temperature benchmark.',
  },
  json: {
    concept:
      'Structured output adds a schema constraint to generation. Schema validation checks the returned structure; it does not verify the truth of the generated content.',
    usage:
      'Provide text to summarize. The request requires title and summary strings plus a tags array, with no extra fields.',
    interpretation:
      'Inspect the returned JSON and validation message in the run log. The server must support the requested structured-output format.',
  },
  tools: {
    concept:
      'A tool call is a structured request from the model to an application. The application validates the arguments, executes the function, and returns its result to the model.',
    usage:
      'Ask for a Celsius-to-Fahrenheit conversion. This example explicitly selects the conversion function, executes it in Python, then requests a final response.',
    interpretation:
      'Inspect the arguments, calculated value, and final answer. This example demonstrates forced tool selection, not the model deciding whether a tool is needed.',
  },
  offline: {
    concept:
      'Offline inference initializes an engine inside a Python program. It does not require an HTTP model server, although loading an uncached model can require network access.',
    usage:
      'Stop the API server first, then run the script. This example loads the default Qwen2.5 3B checkpoint with LLM and calls generate with SamplingParams.',
    interpretation:
      'The elapsed time includes model initialization. Do not compare it directly with a request to an already-running server. Metal access is required by this local example.',
  },
};
