import { useState } from 'react';
import { CornerDownLeft } from 'lucide-react';
import { BY_KEY } from './model.js';
import { traceColumn, qualityStatus, qualityScore } from './lineageHelpers.js';
import EstateTiles from './EstateTiles.jsx';

export default function RootCause({ assetKey }) {
  const a = BY_KEY[assetKey];
  const [input, setInput] = useState('');
  const [col, setCol] = useState('');
  const follow = () => setCol(input.trim().toUpperCase());

  const trace = col ? traceColumn(assetKey, col) : null;

  let rows = [];
  let firstFailing = null;
  let statusA = qualityStatus(a);
  if (trace) {
    rows.push({ hop: 0, element: `${a.key}.${col}`, asset: a, arrived: '—' });
    for (const s of trace.steps) {
      const up = BY_KEY[s.fromA];
      rows.push({ hop: s.hop, element: `${s.fromA}.${s.fromCol}`, asset: up, arrived: `${s.type}${s.inferred ? ' (inferred)' : ''}` });
      if (!firstFailing && up && qualityStatus(up) === 'failing') firstFailing = { asset: up, hop: s.hop };
    }
  }

  return (
    <div className="e2e">
      <EstateTiles />
      <div className="card pad-lg ml-card">
        <h3 className="sec-h">Where did it go wrong?</h3>
        <div className="tc-form">
          <label className="search sm">
            <input list="rc-cols" value={input} onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && follow()}
              placeholder={`Column in ${a.key} — e.g. EMAIL_ADDRESS`} aria-label="Column to diagnose" />
            <datalist id="rc-cols">{a.columns.map((c) => <option key={c.name} value={c.name} />)}</datalist>
          </label>
          <button className="btn primary sm" onClick={follow}><CornerDownLeft size={14} />Follow it</button>
        </div>

        {!trace && <p className="ml-empty">Name a column that is failing its quality rules.</p>}

        {trace && (
          <div className="tc-result">
            <p className="e2e-synopsis">
              <span className={`ml-sev ${statusA === 'healthy' ? 'low' : statusA === 'warning' ? 'medium' : 'high'}`}>{statusA}</span>{' '}
              {firstFailing
                ? `${a.key}.${col} is ${statusA}. The first upstream asset failing its quality rules is ${firstFailing.asset.key} (${firstFailing.hop} hop(s) back) — so the problem is likely inherited from there rather than introduced here.`
                : `${a.key}.${col} is ${statusA}, and nothing upstream of it is failing its quality rules — so the cause is here, in the logic that produced it, rather than inherited. That logic is: it traces back ${trace.maxHop} hop(s) to ${trace.root ? `${trace.root.fromA}.${trace.root.fromCol}` : 'its source'}, changed by ${trace.types.join(', ')}.`}
            </p>

            <div className="e2e-hop-wrap">
              <table className="tbl rc-table">
                <thead><tr><th className="num">Hops back</th><th>Element</th><th>Layer</th><th>Quality</th><th>Failing</th><th>Arrived by</th></tr></thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.element + r.hop} className="static">
                      <td className="num">{r.hop}</td>
                      <td><code className="mono">{r.element}</code></td>
                      <td>{r.asset?.layer || '—'}</td>
                      <td><span className={`ml-sev ${qualityStatus(r.asset) === 'healthy' ? 'low' : qualityStatus(r.asset) === 'warning' ? 'medium' : 'high'}`}>{qualityStatus(r.asset)}</span> {qualityScore(r.asset)}</td>
                      <td className="rc-failing">—</td>
                      <td className="tc-what">{r.arrived}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {rows.length <= 1 && <p className="tbl-empty">No upstream hops recorded for this column.</p>}
            </div>
            <p className="ml-foot">quality is measured per asset, not per column, so this names the asset where the problem starts rather than proving which column caused it.</p>
          </div>
        )}
      </div>
    </div>
  );
}
