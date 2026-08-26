'use client';
import { RuntimeSettings, RuntimeEvidence } from './runtime-settings';
import { Button } from '@/components/ui/button';
import { Play, Square, Server } from 'lucide-react';
import type { Workspace } from '../use-workspace';
import { ServerFlags } from './flag-reference';
import { CommandBlock } from '@/components/lab/command-block';
export function RuntimePanel({ lab }: { lab: Workspace }) {
  const { status, controller, busy, serverBusy } = lab;
  const label = !controller
    ? 'Controller offline'
    : status.ready
      ? 'Ready'
      : status.state === 'starting'
        ? 'Starting…'
        : status.state === 'checking'
          ? 'Connecting…'
          : 'Offline';
  return (
    <>
      <div className="heading">
        <div>
          <div className="eyebrow">vLLM / RUNTIME</div>
          <h1>Model runtime</h1>
          <p>Manage the local server that powers your experiments.</p>
        </div>
      </div>
      <section className="panel runtime-overview">
        <div className="runtime-title">
          <span className="engine-symbol">
            <Server size={22} />
          </span>
          <div>
            <h2>Qwen2.5 · 3B · 4-bit</h2>
            <p>
              {status.model
                ? `Connected as ${status.model}`
                : 'Default model · vLLM Metal'}
            </p>
          </div>
          <span className="badge">
            <span className={'dot ' + status.state} />
            {label}
          </span>
        </div>
        <div className="runtime-facts">
          <div>
            <span>Endpoint</span>
            <strong>127.0.0.1:8000</strong>
          </div>
          <div>
            <span>Ownership</span>
            <strong>
              {status.owned
                ? 'Inference Lab'
                : status.ready
                  ? 'External terminal'
                  : 'Not running'}
            </strong>
          </div>
          <div>
            <span>Metal access · controller</span>
            <strong>
              {status.metal_available === undefined
                ? 'Not reported'
                : status.metal_available
                  ? 'Available'
                  : 'Unavailable'}
            </strong>
          </div>
        </div>
        <div className="runtime-actions">
          <Button
            className="primary-btn"
            disabled={
              !controller || serverBusy || busy || status.state !== 'offline'
            }
            onClick={() => lab.serverAction('start')}
          >
            <Play size={14} />
            Start server
          </Button>
          <Button
            className="secondary-btn"
            disabled={!status.owned || serverBusy || busy}
            onClick={() => lab.serverAction('stop')}
          >
            <Square size={13} />
            Stop server
          </Button>
          <span className="hint">
            {status.ready && !status.owned
              ? 'Stop this external server in its original terminal.'
              : busy
                ? 'Finish or cancel the experiment before changing the server.'
                : 'The model stays loaded between experiments.'}
          </span>
        </div>
        {lab.serverError && (
          <div className="error-box" role="alert">
            {lab.serverError}
          </div>
        )}
      </section>
      <RuntimeSettings lab={lab} />
      <RuntimeEvidence />
      <section className="panel runtime-command">
        <div className="panel-head">
          <span>Startup command</span>
          <span className="subtle">Used by Start server</span>
        </div>
        <div className="panel-body">
          <CommandBlock
            title="Server startup"
            command={status.command}
            onRun={() => lab.serverAction('start')}
            runLabel="Run server"
            runDisabled={
              !controller || serverBusy || busy || status.state !== 'offline'
            }
            busy={serverBusy}
          />

          {status.ready && !status.owned && (
            <p className="hint">
              This is the lab’s configured command. The external server’s actual
              launch flags are unknown.
            </p>
          )}
          <details>
            <summary>Explain the command and flags</summary>
            <p className="command-explanation">
              vllm serve loads the model and starts the API server.
              VLLM_METAL_MEMORY_FRACTION=0.35 sets its Metal memory budget to
              35%.
            </p>
            <ServerFlags />
          </details>
        </div>
      </section>
      <section className="panel inspector">
        <div className="panel-head">
          <span>Server log</span>
          <span className="subtle">Updates automatically</span>
        </div>
        <pre>
          {status.logs.join('\n') ||
            (status.ready && !status.owned
              ? 'Logs for this server are in its original terminal.'
              : 'Server startup and shutdown messages will appear here.')}
        </pre>
      </section>
    </>
  );
}
