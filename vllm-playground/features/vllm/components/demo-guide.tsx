import { theory } from '../theory';
import { sourceUrl } from '../catalog';
export function DemoGuide({ id }: { id: string }) {
  const doc = theory[id];
  return (
    <section className="demo-guide" aria-label="Demo documentation">
      <div className="guide-intro">
        <h2>Overview</h2>
        <p>{doc.concept}</p>
      </div>
      <details>
        <summary>Usage and result interpretation</summary>
        <div className="guide-sections">
          <div>
            <h3>Prerequisites</h3>
            <p>
              {id === 'offline'
                ? 'Stop the API server and use a Python environment with vLLM Metal access.'
                : 'Start a compatible model server in Runtime and wait until it is ready.'}
            </p>
          </div>
          <div>
            <h3>Usage</h3>
            <p>{doc.usage}</p>
          </div>
          <div>
            <h3>Interpret the results</h3>
            <p>{doc.interpretation}</p>
          </div>
        </div>
        <a
          className="source-link"
          href={sourceUrl(id)}
          target="_blank"
          rel="noreferrer"
        >
          vLLM documentation ↗
        </a>
      </details>
    </section>
  );
}
