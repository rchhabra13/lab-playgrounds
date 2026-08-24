import type { Engine } from '@/lib/lab/engines';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowUpRight } from 'lucide-react';

export function ReferenceModule({
  module,
  onBack,
}: {
  module: Engine;
  onBack: () => void;
}) {
  const guide = module.guide!;
  return (
    <>
      <div className="heading">
        <div>
          <div className="eyebrow">{module.group}</div>
          <h1>{module.name}</h1>
          <p>{guide.overview}</p>
        </div>
        <span className="badge">Reference · not connected</span>
      </div>

      <section className="panel">
        <div className="panel-head">Official documentation</div>
        <div className="panel-body reference-docs-body">
          <div className="reference-links">
            {guide.docs.map((doc) => (
              <a
                key={doc.url}
                className="source-link"
                href={doc.url}
                target="_blank"
                rel="noreferrer"
              >
                {doc.label} <ArrowUpRight size={14} />
              </a>
            ))}
          </div>
          <Button className="secondary-btn" onClick={onBack}>
            <ArrowLeft size={14} />
            Back to dashboard
          </Button>
        </div>
      </section>
    </>
  );
}
