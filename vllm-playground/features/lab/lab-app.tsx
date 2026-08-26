'use client';
import { useState } from 'react';
import { engines } from '@/lib/lab/engines';
import { LabShell } from '@/components/lab/lab-shell';
import { Dashboard } from '@/components/lab/dashboard';
import { ReferenceModule } from '@/components/lab/reference-module';
import { PlannedModule } from '@/components/lab/planned-module';
import { useWorkspace } from '@/features/vllm/use-workspace';
import {
  VllmSidebar,
  VllmContent,
  type VllmView,
} from '@/features/vllm/vllm-module';

export function LabApp() {
  const lab = useWorkspace();
  const [moduleId, setModuleId] = useState('vllm');
  const [atHome, setAtHome] = useState(true);
  const [vllmView, setVllmView] = useState<VllmView>('experiment');
  const active = engines.find((e) => e.id === moduleId) || engines[0];
  const isVllm = active.status === 'live';

  function openModule(id: string) {
    if (lab.busy) return;
    setModuleId(id);
    setAtHome(false);
    setVllmView('experiment');
  }
  function goHome() {
    setAtHome(true);
  }

  const label = !lab.controller
    ? 'Controller offline'
    : lab.status.ready
      ? 'Model ready'
      : lab.status.state === 'starting'
        ? 'Loading model…'
        : lab.status.state === 'checking'
          ? 'Connecting…'
          : 'Server offline';

  const tail = atHome
    ? 'Dashboard'
    : !isVllm
      ? 'Reference module'
      : vllmView === 'runtime'
        ? 'Runtime'
        : vllmView === 'deploy'
          ? 'Deployment'
          : 'Workbench';
  const badgeText = atHome
    ? 'Home'
    : isVllm
      ? 'Local Mac'
      : 'Reference module';

  const sidebar = atHome ? null : isVllm ? (
    <VllmSidebar lab={lab} view={vllmView} setView={setVllmView} />
  ) : (
    <div className="planned-sidebar">
      This is a reference module. Read the summary and open the official
      documentation from the workspace.
    </div>
  );

  return (
    <LabShell
      module={active}
      onModule={openModule}
      onHome={goHome}
      atHome={atHome}
      tail={tail}
      badgeText={badgeText}
      navigation={sidebar}
      runtime={!atHome && isVllm && vllmView === 'runtime'}
      onRuntime={() => {
        setModuleId('vllm');
        setAtHome(false);
        setVllmView('runtime');
      }}
      statusLabel={label}
      statusState={lab.controller ? lab.status.state : 'offline'}
      model={lab.status.model || 'No model connected'}
      busy={lab.busy}
      onCancel={lab.cancel}
    >
      {atHome ? (
        <Dashboard onOpen={openModule} />
      ) : isVllm ? (
        <VllmContent lab={lab} view={vllmView} setView={setVllmView} />
      ) : active.guide ? (
        <ReferenceModule module={active} onBack={goHome} />
      ) : (
        <PlannedModule module={active} onBack={goHome} />
      )}
    </LabShell>
  );
}
