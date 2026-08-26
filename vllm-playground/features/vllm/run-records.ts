import type { Draft, RunEvent } from './types';
export type RunRecord = {
  id: string;
  demo: string;
  started: string;
  model: string | null;
  environment: string;
  outcome: 'completed' | 'failed' | 'cancelled';
  inputs: Pick<
    Draft,
    'prompt' | 'system' | 'temperature' | 'maxTokens' | 'history'
  >;
  events: RunEvent[];
  error: string;
};
export function parseRuns(raw: string | null): RunRecord[] {
  if (!raw) return [];
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed)) throw Error('Invalid history');
  return parsed
    .filter(
      (r): r is RunRecord =>
        !!r &&
        typeof r === 'object' &&
        typeof r.id === 'string' &&
        typeof r.demo === 'string' &&
        typeof r.started === 'string' &&
        !!r.inputs &&
        typeof r.inputs.prompt === 'string' &&
        typeof r.inputs.system === 'string' &&
        typeof r.inputs.temperature === 'number' &&
        typeof r.inputs.maxTokens === 'number' &&
        Array.isArray(r.inputs.history) &&
        Array.isArray(r.events) &&
        r.events.every(
          (e: unknown) =>
            !!e &&
            typeof e === 'object' &&
            'type' in e &&
            typeof e.type === 'string',
        ),
    )
    .slice(0, 50);
}
