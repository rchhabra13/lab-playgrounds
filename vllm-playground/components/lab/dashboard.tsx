import { engines, moduleGroups } from '@/lib/lab/engines';
import { ArrowRight } from 'lucide-react';

const statusLabel: Record<string, string> = {
  live: 'Live',
  reference: 'Reference',
};

export function Dashboard({ onOpen }: { onOpen: (id: string) => void }) {
  const live = engines.filter((e) => e.status === 'live').length;
  const reference = engines.filter((e) => e.status === 'reference').length;
  return (
    <div className="dashboard">
      <div className="heading">
        <div>
          <div className="eyebrow">Inference Lab</div>
          <h1>Platforms</h1>
          <p>
            One local engine runs on this Mac. The rest are reference modules: a
            short summary and links to the official documentation. Reference
            modules never install or start anything.
          </p>
        </div>
        <div className="dashboard-counts">
          <span className="badge">
            <span className="status-dot live" />
            {live} live
          </span>
          <span className="badge">
            <span className="status-dot reference" />
            {reference} reference
          </span>
        </div>
      </div>

      <section className="dashboard-arch">
        <div className="section-label">Architecture</div>
        <div className="arch-frame">
          <iframe
            src="/diagrams/stack.html"
            title="Inference Lab architecture"
            loading="lazy"
          />
        </div>
      </section>

      {moduleGroups.map((group) => (
        <section className="dashboard-group" key={group}>
          <div className="section-label">{group}</div>
          <div className="platform-grid">
            {engines
              .filter((e) => e.group === group)
              .map((engine) => (
                <button
                  key={engine.id}
                  className="platform-card"
                  onClick={() => onOpen(engine.id)}
                >
                  <div className="platform-card-top">
                    <span className="engine-symbol">{engine.name[0]}</span>
                    <span className={'status-tag ' + engine.status}>
                      <span className={'status-dot ' + engine.status} />
                      {statusLabel[engine.status]}
                    </span>
                  </div>
                  <strong>{engine.name}</strong>
                  <p>{engine.purpose}</p>
                  <span className="platform-open">
                    {engine.status === 'live' ? 'Open workbench' : 'Read module'}
                    <ArrowRight size={14} />
                  </span>
                </button>
              ))}
          </div>
        </section>
      ))}
    </div>
  );
}
