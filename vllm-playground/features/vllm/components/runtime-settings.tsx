'use client';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import type { Workspace } from '../use-workspace';
type Config = {
  model: string;
  max_model_len: number;
  max_num_seqs: number;
  memory_fraction: number;
};
export function RuntimeSettings({ lab }: { lab: Workspace }) {
  const [config, setConfig] = useState<Config | null>(null),
    [message, setMessage] = useState(''),
    [saving, setSaving] = useState(false);
  useEffect(() => {
    fetch('/lab-api/configuration')
      .then(async (r) => {
        if (!r.ok) throw Error();
        const d = (await r.json()) as { settings: Config };
        setConfig(d.settings);
      })
      .catch(() =>
        setMessage(
          'Restart the lab controller to enable runtime configuration.',
        ),
      );
  }, []);
  async function save() {
    setSaving(true);
    try {
      const r = await fetch('/lab-api/configuration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      const data = (await r.json()) as { detail?: unknown };
      if (!r.ok)
        throw Error(
          typeof data.detail === 'string'
            ? data.detail
            : JSON.stringify(data.detail),
        );
      setMessage('Startup settings saved. Used on the next server start.');
    } catch (e) {
      setMessage(String(e));
    } finally {
      setSaving(false);
    }
  }
  return (
    <section className="panel runtime-command">
      <div className="panel-head">Startup settings</div>
      <div className="panel-body">
        {config && (
          <>
            <label className="field" htmlFor="runtime-model">
              Model repository
            </label>
            <input
              id="runtime-model"
              className="lab-number"
              value={config.model}
              onChange={(e) => setConfig({ ...config, model: e.target.value })}
            />
            <div className="controls">
              {(
                [
                  {
                    key: 'max_model_len',
                    label: 'Context limit',
                    min: 512,
                    max: 32768,
                    step: 512,
                  },
                  {
                    key: 'max_num_seqs',
                    label: 'Concurrent sequences',
                    min: 1,
                    max: 16,
                    step: 1,
                  },
                  {
                    key: 'memory_fraction',
                    label: 'Metal memory fraction',
                    min: 0.1,
                    max: 0.8,
                    step: 0.05,
                  },
                ] as const
              ).map((f) => (
                <div key={f.key}>
                  <label className="field" htmlFor={f.key}>
                    {f.label}
                  </label>
                  <input
                    id={f.key}
                    className="lab-number"
                    type="number"
                    min={f.min}
                    max={f.max}
                    step={f.step}
                    value={config[f.key]}
                    onChange={(e) =>
                      setConfig({ ...config, [f.key]: Number(e.target.value) })
                    }
                  />
                </div>
              ))}
            </div>
            <Button
              className="secondary-btn"
              disabled={saving || lab.busy || lab.status.owned}
              onClick={save}
            >
              Save startup settings
            </Button>
            <p className="hint">
              Applies to the next lab-started server. External servers are
              unchanged. Model compatibility and memory requirements depend on
              the selected checkpoint.
            </p>
          </>
        )}
        {message && (
          <p role="status" className="hint">
            {message}
          </p>
        )}
      </div>
    </section>
  );
}
export function RuntimeEvidence() {
  const [snapshot, setSnapshot] = useState<unknown>(null),
    [loading, setLoading] = useState(false),
    [error, setError] = useState('');
  async function load() {
    setLoading(true);
    setError('');
    try {
      const r = await fetch('/lab-api/evidence');
      if (!r.ok)
        throw Error('Restart the controller to enable evidence collection.');
      setSnapshot(await r.json());
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }
  return (
    <section className="panel runtime-command">
      <div className="panel-head">
        <span>Environment & exposed metrics</span>
        <Button className="quiet-btn" disabled={loading} onClick={load}>
          {loading ? 'Collecting…' : 'Refresh evidence'}
        </Button>
      </div>
      <div className="panel-body">
        <p className="hint">
          Server responses and controller package versions are labeled
          separately. Missing metrics remain null; no GPU or cache values are
          inferred.
        </p>
        {error && <p role="alert">{error}</p>}
        <details>
          <summary>Raw evidence</summary>
          <pre>
            {snapshot
              ? JSON.stringify(snapshot, null, 2)
              : 'Refresh evidence to collect a snapshot.'}
          </pre>
        </details>
      </div>
    </section>
  );
}
