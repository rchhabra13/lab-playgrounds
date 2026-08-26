'use client';
import { useEffect, useRef, useState } from 'react';
import { parseRuns, type RunRecord } from './run-records';
import { demos } from './catalog';
import type { Draft, RunEvent, Source, Status } from './types';

function initialDraft(prompt: string): Draft {
  return {
    prompt,
    system: 'You are a helpful, concise assistant.',
    temperature: 0.7,
    maxTokens: 256,
    events: [],
    error: '',
    stream: '',
    history: [],
  };
}
export function useWorkspace() {
  const [runs, setRuns] = useState<RunRecord[]>([]);
  const [historyReady, setHistoryReady] = useState(false);
  const [storageError, setStorageError] = useState('');
  useEffect(() => {
    try {
      setRuns(parseRuns(localStorage.getItem('inference-lab.vllm.runs.v1')));
      setHistoryReady(true);
    } catch {
      setStorageError(
        'Saved history could not be read. New runs remain available in this session.',
      );
    }
  }, []);
  useEffect(() => {
    if (!historyReady) return;
    try {
      localStorage.setItem('inference-lab.vllm.runs.v1', JSON.stringify(runs));
      setStorageError('');
    } catch {
      setStorageError(
        'Browser storage is full or unavailable. Export runs to keep them.',
      );
    }
  }, [runs, historyReady]);
  const [selected, setSelected] = useState('chat');
  const [drafts, setDrafts] = useState<Record<string, Draft>>(() =>
    Object.fromEntries(demos.map((d) => [d.id, initialDraft(d.prompt)])),
  );
  const draft = drafts[selected];
  const [status, setStatus] = useState<Status>({
    ready: false,
    owned: false,
    model: null,
    state: 'checking',
    logs: [],
    command: '',
  });
  const [controller, setController] = useState(true),
    [busy, setBusy] = useState(false),
    [serverBusy, setServerBusy] = useState(false),
    [serverError, setServerError] = useState('');
  const [source, setSource] = useState<Source>({ code: '', command: '' });
  const abort = useRef<AbortController | null>(null),
    polling = useRef(false);
  const runLock = useRef(false);
  function update(patch: Partial<Draft>) {
    setDrafts((prev) => ({
      ...prev,
      [selected]: { ...prev[selected], ...patch },
    }));
  }
  async function refresh() {
    if (polling.current) return;
    polling.current = true;
    try {
      const r = await fetch('/lab-api/status');
      if (!r.ok) throw Error();
      setStatus((await r.json()) as Status);
      setController(true);
    } catch {
      setController(false);
    } finally {
      polling.current = false;
    }
  }
  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 3500);
    return () => {
      clearInterval(t);
      abort.current?.abort();
    };
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    setSource({ code: '', command: '' });
    fetch('/lab-api/source/' + selected, { signal: controller.signal })
      .then((r) => {
        if (!r.ok) throw Error();
        return r.json() as Promise<Source>;
      })
      .then(setSource)
      .catch((e) => {
        if (e.name !== 'AbortError')
          setSource({
            code: 'Start the local controller to inspect the runnable script.',
            command: '',
          });
      });
    return () => controller.abort();
  }, [selected]);
  function choose(id: string) {
    if (!runLock.current && demos.some((d) => d.id === id)) setSelected(id);
  }
  async function serverAction(action: 'start' | 'stop') {
    setServerBusy(true);
    setServerError('');
    try {
      const r = await fetch('/lab-api/server/' + action, { method: 'POST' });
      const data = (await r.json()) as Status & { detail?: string };
      if (!r.ok) throw Error(data.detail || 'Server control failed');
      setStatus(data);
    } catch (e) {
      setServerError(e instanceof Error ? e.message : String(e));
    } finally {
      setServerBusy(false);
    }
  }
  async function run() {
    if (runLock.current) return;
    runLock.current = true;
    setBusy(true);
    update({ events: [], error: '', stream: '' });
    abort.current = new AbortController();
    let answer = '';
    let failed = false;
    const recorded: RunEvent[] = [];
    const started = new Date().toISOString();
    let runError = '';
    let cancelled = false;
    // Capture the experiment ID and settings for this run, independent of navigation.
    const id = selected;
    const change = (fn: (d: Draft) => Draft) =>
      setDrafts((prev) => ({ ...prev, [id]: fn(prev[id]) }));
    try {
      const r = await fetch('/lab-api/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          demo: id,
          prompt: draft.prompt,
          system: draft.system,
          temperature: draft.temperature,
          max_tokens: draft.maxTokens,
          messages: id === 'chat' ? draft.history : [],
        }),
        signal: abort.current.signal,
      });
      if (!r.ok) {
        const data = (await r.json()) as { detail: unknown };
        throw Error(
          typeof data.detail === 'string'
            ? data.detail
            : JSON.stringify(data.detail),
        );
      }
      if (!r.body) throw Error('No response stream');
      const reader = r.body.getReader(),
        decoder = new TextDecoder();
      let buffer = '';
      const consume = (line: string) => {
        if (!line.trim()) return;
        const event: RunEvent = JSON.parse(line);
        if (event.type !== 'delta') recorded.push(event);
        if (event.type === 'error') runError = event.text || 'Script failed';
        if (event.type === 'result') answer = event.text || '';
        if (
          event.type === 'error' ||
          (event.type === 'exit' && event.code !== 0)
        )
          failed = true;
        change((d) => ({
          ...d,
          events: [...d.events, event],
          stream:
            event.type === 'delta' ? d.stream + (event.text || '') : d.stream,
          error:
            event.type === 'error'
              ? event.text || 'Script failed'
              : event.type === 'exit' && event.code !== 0
                ? d.error ||
                  `Script exited with code ${event.code}. Inspect the run log.`
                : d.error,
        }));
      };
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        lines.forEach(consume);
      }
      buffer += decoder.decode();
      if (buffer.trim()) consume(buffer);
      if (!recorded.some((e) => e.type === 'exit'))
        throw Error(
          'The connection ended before script completion was confirmed.',
        );
      if (id === 'chat' && answer && !failed)
        change((d) => ({
          ...d,
          history: [
            ...d.history,
            { role: 'user', content: draft.prompt },
            { role: 'assistant', content: answer },
          ],
        }));
    } catch (e) {
      failed = true;
      cancelled = e instanceof Error && e.name === 'AbortError';
      runError = e instanceof Error ? e.message : String(e);
      change((d) => ({
        ...d,
        error:
          e instanceof Error && e.name === 'AbortError'
            ? 'Run cancelled. The script has been asked to stop.'
            : e instanceof Error
              ? e.message
              : String(e),
      }));
    } finally {
      setRuns((previous) =>
        [
          {
            id: crypto.randomUUID(),
            demo: id,
            started,
            model:
              id === 'offline'
                ? 'mlx-community/Qwen2.5-3B-Instruct-4bit'
                : status.model,
            environment:
              id === 'offline'
                ? 'Local Mac · direct engine'
                : 'Local Mac · http://127.0.0.1:8000',
            outcome: (cancelled
              ? 'cancelled'
              : failed
                ? 'failed'
                : 'completed') as RunRecord['outcome'],
            inputs: {
              prompt: draft.prompt,
              system: draft.system,
              temperature: draft.temperature,
              maxTokens: draft.maxTokens,
              history: draft.history,
            },
            events: recorded,
            error: runError,
          },
          ...previous,
        ].slice(0, 50),
      );
      setBusy(false);
      runLock.current = false;
      abort.current = null;
      refresh();
    }
  }
  const valid =
    !!draft.prompt.trim() &&
    Number.isFinite(draft.temperature) &&
    draft.temperature >= 0 &&
    draft.temperature <= 2 &&
    Number.isInteger(draft.maxTokens) &&
    draft.maxTokens >= 16 &&
    draft.maxTokens <= 1024;
  const runnable =
    controller &&
    !busy &&
    !serverBusy &&
    valid &&
    (selected === 'offline' ? status.state === 'offline' : status.ready);
  function restore(record: RunRecord) {
    if (runLock.current || !demos.some((d) => d.id === record.demo)) return;
    setDrafts((prev) => ({
      ...prev,
      [record.demo]: {
        ...initialDraft(record.inputs.prompt),
        ...record.inputs,
      },
    }));
    setSelected(record.demo);
  }
  return {
    runs,
    storageError,
    restore,
    selected,
    choose,
    draft,
    update,
    status,
    controller,
    busy,
    serverBusy,
    serverError,
    source,
    serverAction,
    run,
    runnable,
    cancel: () => abort.current?.abort(),
    reset: () => update({ events: [], error: '', stream: '', history: [] }),
  };
}
export type Workspace = ReturnType<typeof useWorkspace>;
