'use client';
import { CommandBlock } from '@/components/lab/command-block';
import { buildDemoCommand } from '../commands';
import type { Workspace } from '../use-workspace';
export function demoSettings(lab: Workspace) {
  const { selected, draft, status } = lab;
  return {
    demo: selected,
    model:
      selected === 'offline'
        ? 'mlx-community/Qwen2.5-3B-Instruct-4bit'
        : status.model || 'local-qwen',
    prompt: draft.prompt,
    system: draft.system,
    temperature: draft.temperature,
    max_tokens: draft.maxTokens,
    messages: selected === 'chat' ? draft.history : [],
  };
}
export function DemoCommand({
  lab,
  compact = false,
  onRun,
}: {
  lab: Workspace;
  compact?: boolean;
  onRun?: () => void;
}) {
  const command = buildDemoCommand(lab.source.command, demoSettings(lab));
  return (
    <CommandBlock
      title="Next run · updates with your inputs"
      command={command}
      compact={compact}
      onRun={() => {
        void lab.run();
        onRun?.();
      }}
      runDisabled={!lab.runnable}
      busy={lab.busy}
      onCancel={lab.cancel}
    />
  );
}
