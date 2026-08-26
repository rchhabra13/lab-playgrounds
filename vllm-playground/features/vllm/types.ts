export type RunEvent = {
  type: string;
  text?: string;
  label?: string;
  seconds?: number;
  first_seconds?: number;
  tokens?: number;
  finish_reason?: string;
  code?: number;
  [key: string]: unknown;
};
export type Status = {
  ready: boolean;
  owned: boolean;
  model: string | null;
  state: string;
  logs: string[];
  command: string;
  metal_available?: boolean;
};
export type Message = { role: string; content: string };
export type Draft = {
  prompt: string;
  system: string;
  temperature: number;
  maxTokens: number;
  events: RunEvent[];
  error: string;
  stream: string;
  history: Message[];
};
export type Source = { code: string; command: string };
