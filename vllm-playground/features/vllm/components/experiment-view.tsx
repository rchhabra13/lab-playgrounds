'use client';
import { DemoGuide } from './demo-guide';
import { Presets } from './presets';
import { DemoCommand } from './demo-command';
import { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Play,
  Square,
  RotateCcw,
  ArrowUpRight,
  ArrowRight,
} from 'lucide-react';
import { demos, sourceUrl } from '../catalog';
import type { Workspace } from '../use-workspace';
import { OutputPanel } from './output-panel';
import { Inspector } from './inspector';
export function ExperimentView({
  lab,
  onRuntime,
}: {
  lab: Workspace;
  onRuntime: () => void;
}) {
  const [tab, setTab] = useState('run');
  const { selected, draft, busy, status } = lab;
  const demo = demos.find((d) => d.id === selected)!;
  return (
    <>
      <div className="heading">
        <div>
          <div className="eyebrow">vLLM / EXPERIMENT</div>
          <h1>{demo.title}</h1>
          <p>{demo.description}</p>
        </div>
        <a
          className="source-link"
          href={sourceUrl(selected)}
          target="_blank"
          rel="noreferrer"
        >
          Documentation <ArrowUpRight size={14} />
        </a>
      </div>
      <Tabs value={tab} onValueChange={(v) => setTab(String(v))}>
        <div className="workbench-tabs">
          <TabsList variant="line">
            <TabsTrigger value="run">Workbench</TabsTrigger>
            <TabsTrigger value="inspect">Inspect</TabsTrigger>
          </TabsList>
          <span className="subtle">
            {selected === 'offline'
              ? 'Direct Python engine'
              : 'Python → local API'}
          </span>
        </div>
        <TabsContent value="run">
          <DemoGuide id={selected} />
          {((!status.ready && selected !== 'offline') ||
            (selected === 'offline' && status.state !== 'offline')) && (
            <div className="connection-banner">
              <span>
                {selected === 'offline'
                  ? 'Stop the server before loading a separate offline engine.'
                  : status.state === 'starting'
                    ? 'The model is loading. You can prepare your prompt now.'
                    : 'Connect a model to run this experiment.'}
              </span>
              <button onClick={onRuntime}>
                Open runtime <ArrowRight size={14} />
              </button>
            </div>
          )}
          <div className="work-grid">
            <section className="panel">
              <div className="panel-head">
                <span>Input</span>
                <span className="subtle">
                  {selected === 'chat'
                    ? `${draft.history.length / 2} turns in context`
                    : 'Editable prompt'}
                </span>
              </div>
              <div className="panel-body">
                <label className="field" htmlFor="prompt">
                  {selected === 'batch'
                    ? 'Prompts · one per line'
                    : selected === 'chat' && draft.history.length
                      ? 'Next message'
                      : 'Prompt'}
                </label>
                <Textarea
                  id="prompt"
                  className="lab-textarea"
                  rows={6}
                  value={draft.prompt}
                  disabled={busy}
                  onChange={(e) => lab.update({ prompt: e.target.value })}
                />
                {selected === 'batch' && (
                  <p className="hint">Up to four prompts run concurrently.</p>
                )}
                <div className="controls">
                  <div>
                    <label className="field" htmlFor="temperature">
                      Temperature
                    </label>
                    {selected === 'sampling' ? (
                      <div className="fixed-setting">0.0 / 0.7 / 1.2</div>
                    ) : (
                      <input
                        id="temperature"
                        className="lab-number"
                        type="number"
                        min="0"
                        max="2"
                        step="0.1"
                        disabled={busy}
                        value={draft.temperature}
                        onChange={(e) =>
                          lab.update({ temperature: Number(e.target.value) })
                        }
                      />
                    )}
                  </div>
                  <div>
                    <label className="field" htmlFor="tokens">
                      Max output tokens
                    </label>
                    <input
                      id="tokens"
                      className="lab-number"
                      type="number"
                      min="16"
                      max="1024"
                      step="16"
                      disabled={busy}
                      value={draft.maxTokens}
                      onChange={(e) =>
                        lab.update({ maxTokens: Number(e.target.value) })
                      }
                    />
                  </div>
                </div>
                {!['completion', 'offline'].includes(selected) && (
                  <details className="system-settings">
                    <summary>System instructions</summary>
                    <label className="sr-only" htmlFor="system">
                      System instructions
                    </label>
                    <Textarea
                      id="system"
                      className="lab-textarea"
                      rows={3}
                      value={draft.system}
                      disabled={busy}
                      onChange={(e) => lab.update({ system: e.target.value })}
                    />
                  </details>
                )}
                <div className="run-row">
                  <Button
                    className="primary-btn"
                    disabled={!lab.runnable}
                    onClick={lab.run}
                  >
                    <Play size={14} />
                    {busy ? 'Running…' : 'Run experiment'}
                  </Button>
                  {busy ? (
                    <Button className="secondary-btn" onClick={lab.cancel}>
                      <Square size={13} />
                      Cancel
                    </Button>
                  ) : (
                    <Button className="quiet-btn" onClick={lab.reset}>
                      <RotateCcw size={13} />
                      Reset
                    </Button>
                  )}
                </div>
              </div>
            </section>
            <OutputPanel lab={lab} />
          </div>
          <Presets lab={lab} />
          <DemoCommand lab={lab} compact />

          <p className="session-note">
            Inputs and results stay with each experiment during this session.
          </p>
        </TabsContent>
        <TabsContent value="inspect">
          <Inspector lab={lab} onRun={() => setTab('run')} />
        </TabsContent>
      </Tabs>
    </>
  );
}
