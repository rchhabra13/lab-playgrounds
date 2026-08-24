import type { Engine } from '@/lib/lab/engines';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
export function PlannedModule({
  module,
  onBack,
}: {
  module: Engine;
  onBack: () => void;
}) {
  return (
    <>
      <div className="heading">
        <div>
          <div className="eyebrow">{module.group}</div>
          <h1>{module.name}</h1>
          <p>{module.purpose}</p>
        </div>
        <span className="badge">Planned · not documented</span>
      </div>
      <div className="panel planned-note">
        <p className="hint">
          Documentation for this module has not been written yet. No tools are
          installed or started from this page.
        </p>
        <Button className="secondary-btn" onClick={onBack}>
          <ArrowLeft size={14} />
          Back to dashboard
        </Button>
      </div>
    </>
  );
}
