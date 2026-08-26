'use client';
import { Ship } from 'lucide-react';
import { ExperimentView } from './components/experiment-view';
import { RuntimePanel } from './components/runtime-panel';
import { Deployment } from './components/deployment';
import { demos, groups } from './catalog';
import type { useWorkspace } from './use-workspace';

type Lab = ReturnType<typeof useWorkspace>;
export type VllmView = 'experiment' | 'runtime' | 'deploy';

export function VllmSidebar({
  lab,
  view,
  setView,
}: {
  lab: Lab;
  view: VllmView;
  setView: (v: VllmView) => void;
}) {
  return (
    <nav aria-label="vLLM experiments">
      {groups.map((group) => (
        <div key={group.name}>
          <div className="section-label">{group.name}</div>
          <div className="nav-wrap">
            {group.ids.map((id) => {
              const d = demos.find((d) => d.id === id)!;
              return (
                <button
                  key={id}
                  disabled={lab.busy && id !== lab.selected}
                  className={
                    'nav-demo ' +
                    (view === 'experiment' && id === lab.selected
                      ? 'selected'
                      : '')
                  }
                  aria-current={
                    view === 'experiment' && id === lab.selected
                      ? 'page'
                      : undefined
                  }
                  onClick={() => {
                    lab.choose(id);
                    setView('experiment');
                  }}
                >
                  <d.icon size={17} />
                  {d.short}
                </button>
              );
            })}
          </div>
        </div>
      ))}
      <div className="section-label">Deployment</div>
      <div className="nav-wrap">
        <button
          className={'nav-demo ' + (view === 'deploy' ? 'selected' : '')}
          onClick={() => setView('deploy')}
        >
          <Ship size={17} />
          Local, Docker, Kubernetes
        </button>
      </div>
    </nav>
  );
}

export function VllmContent({
  lab,
  view,
  setView,
}: {
  lab: Lab;
  view: VllmView;
  setView: (v: VllmView) => void;
}) {
  return (
    <>
      {!lab.controller && (
        <div className="notice">
          The controller is unavailable. Run ./start.command in your project
          folder.
        </div>
      )}
      {view === 'deploy' ? (
        <Deployment />
      ) : view === 'runtime' ? (
        <RuntimePanel lab={lab} />
      ) : (
        <ExperimentView
          key={lab.selected}
          lab={lab}
          onRuntime={() => setView('runtime')}
        />
      )}
    </>
  );
}
