export function ScriptFlags() {
  return (
    <dl className="command-definitions">
      <div>
        <dt>Python environment</dt>
        <dd>
          Uses the controller’s Python interpreter, from your vLLM Metal
          environment.
        </dd>
      </div>
      <div>
        <dt>-u</dt>
        <dd>
          Prints output immediately so logs and generated text appear live.
        </dd>
      </div>
      <div>
        <dt>--stdin</dt>
        <dd>
          Reads the settings below as JSON through standard input. Your prompt
          is data, not shell code.
        </dd>
      </div>
      <div>
        <dt>Memory fraction · 0.35</dt>
        <dd>
          Sets a 35% Metal memory budget when this script loads a model. API
          requests use the running server’s budget.
        </dd>
      </div>
    </dl>
  );
}
export function ServerFlags() {
  return (
    <dl className="command-definitions">
      <div>
        <dt>--served-model-name local-qwen</dt>
        <dd>The name API clients use to select this model.</dd>
      </div>
      <div>
        <dt>--host 127.0.0.1 · --port 8000</dt>
        <dd>Listens on this Mac at port 8000.</dd>
      </div>
      <div>
        <dt>--max-model-len 4096</dt>
        <dd>Caps each request’s combined input and output at 4096 tokens.</dd>
      </div>
      <div>
        <dt>--max-num-seqs 4</dt>
        <dd>Allows up to four sequences to be processed concurrently.</dd>
      </div>
      <div>
        <dt>--enable-auto-tool-choice</dt>
        <dd>
          Enables automatic tool selection for requests that ask for it. Our
          tool demo explicitly selects its tool.
        </dd>
      </div>
      <div>
        <dt>--tool-call-parser hermes</dt>
        <dd>
          Converts Hermes-formatted tool output into structured tool calls.
        </dd>
      </div>
    </dl>
  );
}
