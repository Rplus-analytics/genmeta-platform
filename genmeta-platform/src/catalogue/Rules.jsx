import { useMemo } from 'react';
import { BY_KEY, upstreamOf } from './model.js';
import { transformType } from './lineageHelpers.js';
import EstateTiles from './EstateTiles.jsx';

/* Most common table alias used in an edge's expressions (CO, OI, C, O …). */
function aliasOf(edge) {
  const counts = {};
  for (const m of edge.map || []) {
    const mt = /^([A-Za-z]\w*)\./.exec(m[2] || '');
    if (mt) counts[mt[1]] = (counts[mt[1]] || 0) + 1;
  }
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
}

/* Plain-English account of how one target column was produced. */
function plainEnglish(col, incoming) {
  const hits = [];
  for (const e of incoming) for (const m of e.map || []) if (m[1] === col) hits.push({ e, m });
  if (!hits.length) return '—';
  return hits.map(({ e, m }) => {
    const type = transformType(m[2], m[0], col);
    const from = `${e.s}.${m[0]}`;
    if (type === 'identity') return `carried through unchanged from ${from}`;
    if (type === 'conditional derivation') return `conditional derivation of ${col} as ${m[2]}`;
    if (type === 'aggregation') return `aggregated as ${m[2]}`;
    if (type === 'date derivation') return `date part derived as ${m[2]}`;
    if (type === 'cleansing') return `cleansed as ${m[2]}`;
    return `calculated as ${m[2]}`;
  }).join('; ');
}

export default function Rules({ assetKey }) {
  const a = BY_KEY[assetKey];

  const model = useMemo(() => {
    const incoming = upstreamOf(assetKey);
    const aliases = new Map(incoming.map((e) => [e.s, aliasOf(e) || e.s.split('.').pop()]));
    // joins: base source + LEFT JOINs for the rest, keyed on a shared *_ID column
    const joins = [];
    if (incoming.length > 1) {
      const base = incoming[0];
      const baseCols = new Set((base.map || []).flatMap((m) => [m[0], m[1]]));
      const idOf = (cols) => [...cols].find((c) => /_?ID$/i.test(c));
      for (const e of incoming.slice(1)) {
        const otherCols = new Set((e.map || []).flatMap((m) => [m[0], m[1]]));
        // prefer a key shared by both tables, else fall back to the base's key column
        const shared = [...baseCols].find((c) => otherCols.has(c) && /_?ID$/i.test(c)) || idOf(baseCols) || idOf(otherCols);
        const key = shared || 'key';
        joins.push(`LEFT JOIN ${e.s} on ${aliases.get(base.s)}.${key} = ${aliases.get(e.s)}.${key}`);
      }
    }
    // grain: aggregation → group keys (the *_ID passthroughs); else the primary key / a row
    const anyAgg = incoming.some((e) => (e.map || []).some((m) => transformType(m[2], m[0], m[1]) === 'aggregation'));
    const grain = a.pk && a.pk.length ? a.pk.join(', ') : anyAgg ? 'one row per group key' : `one row per ${a.name.toLowerCase()}`;
    // filters aren't recorded as WHERE clauses in this data
    const filters = [];
    const cols = a.columns.map((c) => {
      const hits = incoming.flatMap((e) => (e.map || []).filter((m) => m[1] === c.name).map((m) => ({ e, m })));
      const types = [...new Set(hits.map(({ m }) => transformType(m[2], m[0], c.name)))];
      const inGrain = (a.pk || []).includes(c.name);
      return { name: c.name, english: plainEnglish(c.name, incoming), transforms: types.join(', ') || '—', inGrain };
    });
    return { incoming, joins, grain, filters, cols, anyLogic: incoming.some((e) => (e.map || []).length) };
  }, [assetKey]);

  const m = model;
  return (
    <div className="e2e">
      <EstateTiles />
      <div className="card pad-lg ml-card">
        <h3 className="sec-h">What shaped {a.key}</h3>
        {m.anyLogic ? (
          <p className="e2e-synopsis">{m.joins.length} join(s), {m.filters.length} filter condition(s), grain {m.grain} · from the view's own SQL, read from the warehouse.</p>
        ) : (
          <p className="e2e-synopsis muted">no transformation logic is recorded for this asset — it is a source, or its logic lives outside the connected platforms.</p>
        )}

        {m.anyLogic && (
          <>
            <div className="e2e-hop-wrap">
              <table className="tbl ru-table">
                <thead><tr><th>Column</th><th>In plain English</th><th>Transformations</th><th>Filtered by</th><th>In the grain</th></tr></thead>
                <tbody>
                  {m.cols.map((c) => (
                    <tr key={c.name} className="static">
                      <td><code className="mono">{c.name}</code></td>
                      <td className="ru-english">{c.english}</td>
                      <td className="ru-tf">{c.transforms}</td>
                      <td className="ru-filter">—</td>
                      <td className="ru-grain">{c.inGrain ? 'yes' : 'no'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <h4 className="e2e-hops-h">Joins, filters and grain</h4>
            <ul className="ru-list">
              {m.joins.length ? m.joins.map((j) => <li key={j}><code className="mono">{j}</code></li>) : <li className="da-none">no joins recorded</li>}
              <li>{m.filters.length ? m.filters.join('; ') : <span className="da-none">no filter conditions recorded (WHERE clauses are not captured in this dataset)</span>}</li>
              <li>GROUP BY grain: <b>{m.grain}</b></li>
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
