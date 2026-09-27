import { useMemo, useState } from 'react';
import { allEdges, BY_KEY, srcMeta } from './model.js';
import { hopMethod, stageOfAsset } from './EndToEnd.jsx';
import { downstreamBFS } from './lineageHelpers.js';
import EstateTiles from './EstateTiles.jsx';

/* Downstream reach, optionally narrowed to what one column feeds. */
function reachedFrom(assetKey, col) {
  if (!col) return downstreamBFS(assetKey);
  const edges = allEdges();
  const seen = new Map();
  const seenCol = new Set();
  let frontier = [[assetKey, col, 0]];
  while (frontier.length) {
    const next = [];
    for (const [k, c, h] of frontier) {
      for (const e of edges) {
        if (e.s !== k) continue;
        for (const m of e.map || []) {
          if (m[0] !== c) continue;
          const id = `${e.t}|${m[1]}`;
          if (seenCol.has(id)) continue;
          seenCol.add(id);
          if (!seen.has(e.t)) seen.set(e.t, h + 1);
          next.push([e.t, m[1], h + 1]);
        }
      }
    }
    frontier = next;
  }
  return seen;
}

export default function Impact({ assetKey }) {
  const a = BY_KEY[assetKey];
  const [col, setCol] = useState('');

  const model = useMemo(() => {
    const reached = reachedFrom(assetKey, col.trim().toUpperCase());
    const keys = [...reached.keys()];
    const rows = keys.map((k) => ({ a: BY_KEY[k], hops: reached.get(k) }))
      .filter((r) => r.a).sort((x, y) => x.hops - y.hops || x.a.key.localeCompare(y.a.key));
    const set = new Set(keys);
    const anyInferred = allEdges().some((e) => (e.s === assetKey || set.has(e.s)) && set.has(e.t) && hopMethod(e) === 'inferred');
    const platforms = [...new Set(rows.map((r) => srcMeta(r.a.source).vendor))];
    const owners = [...new Set(rows.map((r) => r.a.owner).filter(Boolean))];
    let risk = 'low';
    if (rows.length > 5 || platforms.length > 1) risk = 'high';
    else if (anyInferred || rows.length >= 1) risk = 'medium';
    return { rows, anyInferred, platforms, owners, risk };
  }, [assetKey, col]);

  const m = model;
  const inferredHops = allEdges().filter((e) => hopMethod(e) === 'inferred' && m.rows.some((r) => r.a.key === e.t)).length;

  return (
    <div className="e2e">
      <EstateTiles />
      <div className="card pad-lg ml-card">
        <h3 className="sec-h">What breaks if {a.key} changes</h3>
        <label className="search sm ml-colinput">
          <input value={col} onChange={(e) => setCol(e.target.value)} placeholder="One column only (optional) — e.g. EMAIL" aria-label="One column only" />
        </label>
        <p className="e2e-synopsis">
          <span className={`ml-sev ${m.risk}`}>{m.risk}</span>{' '}
          changing {a.key} reaches {m.rows.length} asset(s) across {m.platforms.length} platform(s).{' '}
          {m.anyInferred
            ? `${inferredHops || 'some'} hop(s) in this picture are inferred, so the downstream list may be incomplete or include something that is not really connected`
            : 'every hop in this picture is stated, parsed or observed'}
        </p>
        <div className="e2e-hop-wrap">
          <table className="tbl im-table">
            <thead><tr><th>Reached</th><th className="num">Hops</th><th>Platform</th><th>Stage</th><th>Owner</th></tr></thead>
            <tbody>
              {m.rows.map((r) => (
                <tr key={r.a.key} className="static">
                  <td><code className="mono">{r.a.key}</code></td>
                  <td className="num">{r.hops}</td>
                  <td>{srcMeta(r.a.source).vendor}</td>
                  <td>{stageOfAsset(r.a)}</td>
                  <td>{r.a.owner || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {m.rows.length === 0 && <p className="tbl-empty">Nothing downstream is recorded.</p>}
        </div>
        <p className="ml-foot">
          {m.owners.length ? `People to tell: ${m.owners.join(', ')}.` : 'People to tell: nobody is recorded against the affected assets.'}
        </p>
      </div>
    </div>
  );
}
