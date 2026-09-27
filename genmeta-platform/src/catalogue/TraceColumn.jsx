import { useState } from 'react';
import { CornerDownLeft } from 'lucide-react';
import { BY_KEY } from './model.js';
import { traceColumn, traceStage, TRACE_STAGES } from './lineageHelpers.js';
import EstateTiles from './EstateTiles.jsx';

export default function TraceColumn({ assetKey }) {
  const a = BY_KEY[assetKey];
  const [input, setInput] = useState('');
  const [col, setCol] = useState('');

  const trace = col ? traceColumn(assetKey, col) : null;
  const follow = () => setCol(input.trim().toUpperCase());

  // stage strip: element(s) touched at each stage
  const byStage = {};
  if (trace) {
    const add = (ak, c) => { const st = traceStage(BY_KEY[ak] || a); (byStage[st] ||= new Set()).add(`${ak}.${c}`); };
    add(assetKey, col);
    trace.steps.forEach((s) => { add(s.toA, s.toCol); add(s.fromA, s.fromCol); });
  }

  return (
    <div className="e2e">
      <EstateTiles />
      <div className="card pad-lg ml-card">
        <h3 className="sec-h">Follow one value</h3>
        <div className="tc-form">
          <label className="search sm">
            <input list="tc-cols" value={input} onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && follow()}
              placeholder={`Column in ${a.key} — e.g. EMAIL_ADDRESS`} aria-label="Column to trace" />
            <datalist id="tc-cols">{a.columns.map((c) => <option key={c.name} value={c.name} />)}</datalist>
          </label>
          <button className="btn primary sm" onClick={follow}><CornerDownLeft size={14} />Follow it</button>
        </div>

        {!trace && <p className="ml-empty">Name a column to trace it back through every hop.</p>}

        {trace && (
          <div className="tc-result">
            <h4 className="tc-title"><code className="mono">{a.key}.{col}</code></h4>
            {trace.steps.length ? (
              <>
                <p className="e2e-synopsis">
                  — {a.key}.{col} traces back {trace.maxHop} hop(s) to {trace.root ? `${trace.root.fromA}.${trace.root.fromCol}` : '—'}; changed on the way by {trace.types.join(', ')}{trace.exprs.length ? ` (${trace.exprs.slice(0, 3).join('; ')})` : ''}.
                </p>
                <p>
                  <span className={`e2e-pill ${trace.cardinality === 'one to one' ? 'is-ingested' : 'is-inferred'}`}>{trace.cardinality}</span>{' '}
                  <span className="tc-card-exp">{trace.cardinality === 'one to one'
                    ? 'the value is carried or derived row by row, so it can be followed one to one'
                    : 'the value is aggregated, so one output row comes from many inputs'}</span>
                </p>

                <div className="e2e-stages tc-stages">
                  {TRACE_STAGES.map((st) => {
                    const els = byStage[st] ? [...byStage[st]] : [];
                    return (
                      <div key={st} className={`e2e-stage ${els.length ? '' : 'empty'}`}>
                        <div className="e2e-stage-h">{st}</div>
                        {els.length ? <ul>{els.map((e) => <li key={e}><code>{e}</code></li>)}</ul> : <p className="e2e-nothing">not touched</p>}
                      </div>
                    );
                  })}
                </div>

                <h4 className="e2e-hops-h">Upstream, hop by hop</h4>
                <div className="e2e-hop-wrap">
                  <table className="tbl tc-table">
                    <thead><tr><th className="num">Hops</th><th>From</th><th>To</th><th>What happened</th><th>Expression</th><th>Known by</th></tr></thead>
                    <tbody>
                      {trace.steps.map((s) => (
                        <tr key={`${s.fromA}.${s.fromCol}>${s.toA}.${s.toCol}`} className="static">
                          <td className="num">{s.hop}</td>
                          <td><code className="mono">{s.fromA}.{s.fromCol}</code><div className="da-stage">{(BY_KEY[s.fromA]?.layer) || traceStage(BY_KEY[s.fromA] || a)}</div></td>
                          <td><code className="mono">{s.toA}.{s.toCol}</code></td>
                          <td className="tc-what">{s.type}{s.inferred ? ' (inferred)' : ''}</td>
                          <td className="tc-expr">{s.expr ? <code className="mono">{s.expr}</code> : '—'}</td>
                          <td className="tc-known">{s.methodLabel} ({s.conf})</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <p className="ml-empty">{a.key}.{col} has no recorded upstream — it originates here, or the column name was not found.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
