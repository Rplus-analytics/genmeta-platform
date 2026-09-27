import { DATA, ASSETS, allEdges } from './model.js';
import EstateTiles from './EstateTiles.jsx';

export default function Structures() {
  const files = ASSETS.filter((a) => a.kind === 'file');
  const streams = ASSETS.filter((a) => a.kind === 'topic' || a.schema === 'STREAMING');

  const contains = ASSETS.reduce((t, a) => t + a.columns.length, 0);
  const classified = ASSETS.reduce((t, a) => t + a.columns.filter((c) => c.cls).length, 0);
  const owned = ASSETS.filter((a) => a.owner).length;
  const defines = (DATA.terms || []).reduce((t, x) => t + (x.assets ? x.assets.length : 0), 0);
  const flows = allEdges().length;
  const rels = [
    ['contains', contains, 'the harvest of each system'],
    ['classified_as', classified, 'the classification module'],
    ['owned_by', owned, 'the governance module'],
    ['defines', defines, 'the business glossary'],
    ['flows_to', flows, 'lineage'],
  ];

  return (
    <div className="e2e">
      <EstateTiles />

      <div className="card pad-lg ml-card">
        <p className="e2e-synopsis">A data element is anything a value can live in: a column, a field inside a JSON document, a field in a message, a property on a graph node, or a sentence an AI produced. Each one is traced the same way — to what produced it.</p>
      </div>

      <div className="card pad-lg ml-card">
        <h3 className="sec-h">JSON and file structures</h3>
        <p className="ml-note">object-storage files are read from the pipeline manifest, which states each element and its type; nested records are flattened to dotted paths.</p>
        <div className="e2e-hop-wrap">
          <table className="tbl st-table">
            <thead><tr><th>Asset</th><th className="num">Elements</th><th>Nested</th><th>Example paths</th></tr></thead>
            <tbody>
              {files.map((a) => (
                <tr key={a.key} className="static">
                  <td><code className="mono">{a.key}</code></td>
                  <td className="num">{a.columns.length}</td>
                  <td>no</td>
                  <td className="st-paths">{a.columns.slice(0, 4).map((c) => <code key={c.name} className="mono">$.{c.name}</code>)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!files.length && <p className="tbl-empty">No object-storage files are recorded.</p>}
        </div>
      </div>

      <div className="card pad-lg ml-card">
        <h3 className="sec-h">Streams and messages</h3>
        <p className="ml-note">{streams.length} subject(s) read from the schema registry — what a consumer does with a message after reading it is not visible to the registry, so lineage stops at the topic unless a pipeline declares the rest.</p>
        <ul className="st-subjects">
          {streams.map((a) => (
            <li key={a.key}><code className="mono">{a.key}</code>: {a.columns.map((c) => c.name).join(', ') || 'no fields recorded'}</li>
          ))}
          {!streams.length && <li className="da-none">No streaming subjects are recorded.</li>}
        </ul>
      </div>

      <div className="card pad-lg ml-card">
        <h3 className="sec-h">Graph nodes and edges</h3>
        <p className="ml-note">every node and edge is rebuilt from the harvest and the governance modules on each cycle, so each one can say what produced it.</p>
        <div className="e2e-hop-wrap">
          <table className="tbl st-table">
            <thead><tr><th>Relationship</th><th className="num">Count</th><th>Derived from</th></tr></thead>
            <tbody>
              {rels.map(([rel, count, from]) => (
                <tr key={rel} className="static">
                  <td><code className="mono">{rel}</code></td>
                  <td className="num">{count}</td>
                  <td className="ml-detail">{from}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card pad-lg ml-card">
        <h3 className="sec-h">Text an AI produced</h3>
        <p className="ml-note">every piece of text the platform generates records the metadata it was built from, the prompt version and terminology pack in force, where it was processed, and the checks it passed — so a sentence in the catalogue can be traced to its inputs exactly as a column can.</p>
        <p className="ml-empty">No AI-produced text is recorded yet.</p>
        <p className="ml-foot">the model's internal reasoning is not recorded, and is not something the platform can claim to trace; what is recorded is the input, the version and the outcome.</p>
      </div>
    </div>
  );
}
