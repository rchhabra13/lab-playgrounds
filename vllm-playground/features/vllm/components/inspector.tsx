'use client';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import type { Workspace } from '../use-workspace';
import { executionDescription } from '../catalog';
import { ScriptFlags } from './flag-reference';
import { DemoCommand, demoSettings } from './demo-command';
import { CommandBlock } from '@/components/lab/command-block';
import { buildDemoCommand } from '../commands';
export function Inspector({
  lab,
  onRun,
}: {
  lab: Workspace;
  onRun?: () => void;
}) {
  const { draft, selected, source } = lab;
  const execution = draft.events.find((e) => e.type === 'execution');
  const settings = demoSettings(lab);

  return (
    <section className="panel inspector">
      <Tabs defaultValue="command">
        <TabsList variant="line">
          <TabsTrigger value="command">Command</TabsTrigger>
          <TabsTrigger value="request">Request & response</TabsTrigger>
          <TabsTrigger value="code">Python</TabsTrigger>
          <TabsTrigger value="log">Run log</TabsTrigger>
          <TabsTrigger value="evidence">Environment & metrics</TabsTrigger>
          <TabsTrigger value="history">Conversation</TabsTrigger>
        </TabsList>
        <TabsContent value="command">
          <div className="panel-body">
            <DemoCommand lab={lab} onRun={onRun} />
            <p className="command-explanation">
              {executionDescription[selected]}
            </p>
            <ScriptFlags />
            <details>
              <summary>Settings sent through standard input</summary>
              <pre>{JSON.stringify(settings, null, 2)}</pre>
            </details>
            {execution && (
              <details open>
                <summary>Recorded execution · last run</summary>
                <CommandBlock
                  title="Recorded command"
                  command={buildDemoCommand(
                    String(execution.command),
                    execution.settings,
                  )}
                />
                <pre>{JSON.stringify(execution.settings, null, 2)}</pre>
              </details>
            )}
          </div>
        </TabsContent>
        <TabsContent value="request">
          <pre>
            {draft.events
              .filter((e) => ['request', 'result', 'tool'].includes(e.type))
              .map((e) => JSON.stringify(e, null, 2))
              .join('\n\n') ||
              'The exact API request and response appear here after a run.'}
          </pre>
        </TabsContent>
        <TabsContent value="code">
          <pre>
            {source.code ||
              'Script source appears when the controller connects.'}
          </pre>
        </TabsContent>
        <TabsContent value="log">
          <pre>
            {draft.events
              .filter((e) =>
                ['execution', 'log', 'error', 'done', 'exit'].includes(e.type),
              )
              .map((e) => e.text || JSON.stringify(e))
              .join('\n') || 'No script output yet.'}
          </pre>
        </TabsContent>
        <TabsContent value="evidence">
          <pre>
            {JSON.stringify(
              draft.events.find((e) => e.type === 'evidence')?.snapshot ||
                'Run an experiment with the updated controller to capture evidence.',
              null,
              2,
            )}
          </pre>
        </TabsContent>
        <TabsContent value="history">
          <pre>
            {draft.history.length
              ? JSON.stringify(draft.history, null, 2)
              : 'Chat turns stay here until you reset this experiment or reload the page.'}
          </pre>
        </TabsContent>
      </Tabs>
    </section>
  );
}
