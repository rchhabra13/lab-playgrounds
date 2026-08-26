'use client';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import type { Workspace } from '../use-workspace';
import type { Draft } from '../types';
type Preset = {
  id: string;
  name: string;
  demo: string;
  inputs: Pick<Draft, 'prompt' | 'system' | 'temperature' | 'maxTokens'>;
};
export function Presets({ lab }: { lab: Workspace }) {
  const [items, setItems] = useState<Preset[]>([]),
    [name, setName] = useState(''),
    [message, setMessage] = useState('');
  useEffect(() => {
    try {
      const raw = JSON.parse(
        localStorage.getItem('inference-lab.presets') || '[]',
      );
      if (Array.isArray(raw))
        setItems(
          raw.filter(
            (p) =>
              p &&
              typeof p.id === 'string' &&
              typeof p.name === 'string' &&
              p.inputs &&
              typeof p.inputs.prompt === 'string' &&
              typeof p.inputs.system === 'string' &&
              typeof p.inputs.temperature === 'number' &&
              typeof p.inputs.maxTokens === 'number',
          ),
        );
    } catch {
      setMessage('Saved presets could not be read.');
    }
  }, []);
  function persist(next: Preset[]) {
    try {
      localStorage.setItem('inference-lab.presets', JSON.stringify(next));
      setItems(next);
      setMessage('Saved locally.');
    } catch {
      setMessage('Browser storage unavailable.');
    }
  }
  function save() {
    const d = lab.draft;
    persist([
      ...items,
      {
        id: crypto.randomUUID(),
        name: name.trim(),
        demo: lab.selected,
        inputs: {
          prompt: d.prompt,
          system: d.system,
          temperature: d.temperature,
          maxTokens: d.maxTokens,
        },
      },
    ]);
    setName('');
  }
  return (
    <details className="preset-panel">
      <summary>Saved configurations</summary>
      <div className="run-row">
        <input
          className="lab-number"
          aria-label="Configuration name"
          placeholder="Name this configuration"
          value={name}
          maxLength={80}
          onChange={(e) => setName(e.target.value)}
        />
        <Button
          className="secondary-btn"
          disabled={!name.trim() || lab.busy}
          onClick={save}
        >
          Save
        </Button>
      </div>
      {items
        .filter((p) => p.demo === lab.selected)
        .map((p) => (
          <div className="run-row" key={p.id}>
            <span className="field" style={{ flex: 1 }}>
              {p.name}
            </span>
            <Button
              className="quiet-btn"
              disabled={lab.busy}
              onClick={() =>
                lab.update({
                  ...p.inputs,
                  history: [],
                  events: [],
                  stream: '',
                  error: '',
                })
              }
            >
              Load
            </Button>
            <Button
              className="quiet-btn"
              disabled={lab.busy}
              onClick={() => persist(items.filter((i) => i.id !== p.id))}
            >
              Remove
            </Button>
          </div>
        ))}
      {message && (
        <p className="hint" role="status">
          {message}
        </p>
      )}
    </details>
  );
}
