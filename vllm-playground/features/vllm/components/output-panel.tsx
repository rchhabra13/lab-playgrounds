'use client';
import { useState } from 'react';
import { Activity, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Workspace } from '../use-workspace';
export function OutputPanel({ lab }: { lab: Workspace }) {
  const { draft, busy } = lab;
  const results = draft.events.filter(
    (e) => e.type === 'result' || e.type === 'tool',
  );
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(
        results
          .map((e) => e.text || JSON.stringify(e.result, null, 2))
          .join('\n\n'),
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      lab.update({
        error: 'Clipboard unavailable. Select and copy the output text.',
      });
    }
  }
  return (
    <section className="panel output-panel">
      <div className="panel-head">
        <span>
          Output {busy && <span className="busy"> · Generating</span>}
        </span>
        <Button className="quiet-btn" disabled={!results.length} onClick={copy}>
          <Copy size={14} />
          {copied ? 'Copied' : 'Copy'}
        </Button>
      </div>
      <div className="result-area" aria-live="polite">
        {draft.error && (
          <div className="error-box" role="alert">
            {draft.error}
          </div>
        )}
        {results.map((r, i) => (
          <article
            key={i}
            className={
              'result-card ' + (r.type === 'tool' ? 'tool-result' : '')
            }
          >
            <div className="result-label">
              {r.type === 'tool'
                ? '2 · Python executes ' + String(r.name)
                : r.label}
            </div>
            <div className="response-text">
              {r.type === 'tool'
                ? JSON.stringify(
                    { arguments: r.arguments, result: r.result },
                    null,
                    2,
                  )
                : r.text ||
                  'Tool call returned. Open Inspect for the arguments.'}
            </div>
            {r.type === 'result' && (
              <div className="stats">
                <span>{r.seconds?.toFixed(2)}s elapsed</span>
                {typeof r.tokens === 'number' && (
                  <span>{r.tokens} output tokens</span>
                )}
                {typeof r.first_seconds === 'number' && (
                  <span>{r.first_seconds.toFixed(2)}s to first text</span>
                )}
                {r.finish_reason === 'length' && (
                  <span>Output limit reached</span>
                )}
              </div>
            )}
          </article>
        ))}
        {draft.stream && !results.length && (
          <article className="result-card">
            <div className="result-label">
              {busy ? 'Live output' : 'Partial output'}
            </div>
            <div className="response-text">
              {draft.stream}
              {busy && <span className="busy"> ▍</span>}
            </div>
          </article>
        )}
        {!results.length && !draft.stream && !draft.error && (
          <div className="empty">
            <span className="empty-mark">
              <Activity size={24} className={busy ? 'busy' : ''} />
            </span>
            <strong>
              {busy
                ? 'Waiting for the model'
                : 'Your next experiment starts here'}
            </strong>
            <p>
              {busy
                ? 'Open Inspect to follow the script output.'
                : 'Run the prompt to see a real response, timing, and token usage.'}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
