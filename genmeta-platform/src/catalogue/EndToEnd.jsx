import { useMemo } from 'react';
import { Share2, Sparkles, Boxes, ListChecks } from 'lucide-react';
import { DATA, BY_KEY, srcMeta } from './model.js';

/* ------------------------------------------------------------------
   "End to end" — the selected asset's lineage read as a single story:
   summary tiles, a one-line synopsis, five pipeline-stage columns and
   a row-per-hop table that says how each hop is known.

   The data (catalogue-data.json / RAW.edges) records, per hop:
     s, t            source / target asset keys
     rel             relationship (always "derived_from" today)
     ev              evidence, e.g. "executed_pipeline_manifest" or null
     tf              the transformation / the "why" (text), or null
     map             column mappings: [srcCol, tgtCol, method]
   There is no explicit "method" or "confidence" field, so both are
   derived below from ev + the per-column methods. See the notes on
   hopMethod / hopConfidence.
   ------------------------------------------------------------------ */

/* Five pipeline stages, in display order. */
export const STAGES = [
  ['source', 'Source'],
  ['ingestion', 'Ingestion'],
  ['transformation', 'Transformation'],
  ['storage', 'Storage'],
  ['consumption', 'Consumption'],
];

/* Assign an asset to one pipeline stage from its metadata (schema / layer /
   kind / source). This is the one place to change the stage rules. */
export function stageOfAsset(a) {
  const schema = (a.schema || '').toUpperCase();
  const layer = a.layer || '';
  const kind = a.kind;
  const src = a.source || '';
  // Consumption: BI reports, dashboards, APIs and data products
  if (kind === 'report' || kind === 'dashboard' || kind === 'api') return 'consumption';
  if (schema === 'BI' || schema === 'API' || schema.endsWith('_API')) return 'consumption';
  // Ingestion: streams, topics and pipeline ingest steps
  if (kind === 'topic' || schema === 'STREAMING' || /stream|confluent|kafka/i.test(src)) return 'ingestion';
  // Source: raw layers and source-system schemas (SRC, *_RAW)
  if (layer === 'Raw' || schema === 'SRC' || schema.endsWith('_RAW')) return 'source';
  // Transformation: staging models and views that carry logic
  if (schema === 'STG' || layer === 'Staging' || (kind === 'view' && schema !== 'INT')) return 'transformation';
  // Storage: cleansed / curated / enriched tables (S3_CLN, S3_ENR, INT …)
  if (schema.endsWith('_CLN') || schema.endsWith('_ENR') || schema === 'INT' ||
      ['Cleansed', 'Curated', 'Enriched'].includes(layer)) return 'storage';
  return 'storage';
}

/* How a hop's lineage is known. Derived, because the data has no single
   method field: a recorded manifest is the strongest signal; failing that,
   column mappings that carry real query logic mean the lineage was parsed;
   plain name-for-name mappings are inferred from schema overlap. */
export function hopMethod(e) {
  if (e.ev) return 'ingested';
  // A mapping carries real query logic when its method is an expression rather
  // than a bare column name: parentheses (function calls), CASE/JOIN keywords,
  // comparison operators, an alias-qualified ref (C.COL) or a multi-word phrase.
  // Matching on whole tokens avoids false hits like "COUNT" inside "ACCOUNT".
  const hasLogic = (e.map || []).some((m) => {
    const x = m[2] || '';
    return /[()<>=]/.test(x) || /\s/.test(x) || /^[A-Za-z]\w*\./.test(x) || /\b(CASE|WHEN|JOIN|GROUP|AS)\b/i.test(x);
  });
  return hasLogic ? 'parsed' : 'inferred';
}

export const METHOD_META = {
  ingested: { label: 'Direct metadata ingestion', cls: 'is-ingested' },
  parsed: { label: 'Parsed from query logic', cls: 'is-parsed' },
  observed: { label: 'Observed at runtime', cls: 'is-observed' },
  inferred: { label: 'Inferred from schema', cls: 'is-inferred' },
};

/* No confidence field exists; derive it from how the hop is known. */
export const CONFIDENCE = { ingested: 1, parsed: 0.85, observed: 0.75, inferred: 0.6 };
export const hopConfidence = (e) => CONFIDENCE[hopMethod(e)];

/* The selected asset's whole lineage: its ancestors, itself and its
   descendants (siblings that merely share a source are excluded). */
export function endToEnd(key) {
  const all = DATA.edges;
  const up = new Set(), down = new Set();
  const walkUp = (k) => { for (const e of all) if (e.t === k && !up.has(e.s)) { up.add(e.s); walkUp(e.s); } };
  const walkDown = (k) => { for (const e of all) if (e.s === k && !down.has(e.t)) { down.add(e.t); walkDown(e.t); } };
  walkUp(key); walkDown(key);
  const nodeKeys = new Set([key, ...up, ...down]);
  const edges = all.filter((e) => nodeKeys.has(e.s) && nodeKeys.has(e.t));
  return { key, nodeKeys: [...nodeKeys], edges, up, down };
}

/* Upstream distance of each node from the selected asset (0 = the asset
   itself). Used to order hops from the asset back towards its sources. */
function upstreamLevels(key, edges) {
  const lvl = { [key]: 0 };
  let frontier = [key];
  while (frontier.length) {
    const next = [];
    for (const k of frontier) for (const e of edges) if (e.t === k && lvl[e.s] == null) { lvl[e.s] = lvl[k] + 1; next.push(e.s); }
    frontier = next;
  }
  return lvl;
}
function downstreamLevels(key, edges) {
  const lvl = { [key]: 0 };
  let frontier = [key];
  while (frontier.length) {
    const next = [];
    for (const k of frontier) for (const e of edges) if (e.s === k && lvl[e.t] == null) { lvl[e.t] = lvl[k] + 1; next.push(e.t); }
    frontier = next;
  }
  return lvl;
}

const fmtConf = (c) => (Number.isInteger(c) ? String(c) : c.toFixed(2).replace(/0$/, ''));
const nameOf = (k) => (BY_KEY[k] ? BY_KEY[k].key : k);

function Tile({ badge, icon: Icon, value, label, caption, multi }) {
  return (
    <div className="e2e-tile">
      <span className={`e2e-badge ${badge}`}><Icon size={16} strokeWidth={2} /></span>
      <b className={multi ? 'is-multi' : ''}>{value}</b>
      <span className="e2e-tile-l">{label}</span>
      <small>{caption}</small>
    </div>
  );
}

export default function EndToEnd({ assetKey }) {
  const a = BY_KEY[assetKey];
  const g = useMemo(() => endToEnd(assetKey), [assetKey]);

  const model = useMemo(() => {
    const edges = g.edges;
    const upLvl = upstreamLevels(assetKey, edges);
    const downLvl = downstreamLevels(assetKey, edges);
    const rows = edges
      .map((e) => ({ e, method: hopMethod(e), conf: hopConfidence(e) }))
      .sort((x, y) => {
        const lx = upLvl[x.e.t] != null ? upLvl[x.e.t] : 900 + (downLvl[x.e.s] || 0);
        const ly = upLvl[y.e.t] != null ? upLvl[y.e.t] : 900 + (downLvl[y.e.s] || 0);
        return lx - ly || x.e.s.localeCompare(y.e.s);
      });

    const totalMaps = edges.reduce((t, e) => t + (e.map ? e.map.length : 0), 0);
    const byMethod = { ingested: 0, parsed: 0, observed: 0, inferred: 0 };
    for (const e of edges) byMethod[hopMethod(e)] += 1;
    const inferredPct = edges.length ? Math.round((byMethod.inferred / edges.length) * 100) : 0;

    const derived = [...new Set(edges.map((e) => e.t))];
    const missingWhy = derived.filter((t) => !edges.some((e) => e.t === t && e.tf)).length;

    // stage buckets
    const stages = Object.fromEntries(STAGES.map(([k]) => [k, []]));
    for (const k of g.nodeKeys) { const s = BY_KEY[k] ? stageOfAsset(BY_KEY[k]) : 'storage'; stages[s].push(k); }
    for (const k of Object.keys(stages)) stages[k].sort();
    const filled = STAGES.filter(([k]) => stages[k].length).map(([, label]) => label);

    const platforms = [...new Set(g.nodeKeys.map((k) => (BY_KEY[k] ? srcMeta(BY_KEY[k].source).vendor : null)).filter(Boolean))];
    const lowest = edges.length ? Math.min(...edges.map((r) => hopConfidence(r))) : null;

    return { rows, totalMaps, byMethod, inferredPct, derived: derived.length, missingWhy, stages, filled, platforms, lowest };
  }, [g, assetKey]);

  const hasLineage = g.edges.length > 0;
  const methodSentence = model.byMethod.inferred === 0
    ? 'Every hop is stated, parsed or observed; none is inferred.'
    : `${model.byMethod.inferred} hop${model.byMethod.inferred === 1 ? ' is' : 's are'} inferred.`;

  return (
    <div className="e2e">
      <div className="e2e-tiles">
        <Tile badge="b-edges" icon={Share2} value={g.edges.length} label="Lineage edges"
          caption={`${model.totalMaps} column mapping${model.totalMaps === 1 ? '' : 's'}`} />
        <Tile badge="b-inferred" icon={Sparkles} value={`${model.inferredPct}%`} label="Inferred"
          caption="suggested, not proven" />
        <Tile badge="b-derived" icon={Boxes} value={model.derived} label="Derived assets"
          caption={`${model.missingWhy} still missing the why`} />
        <Tile badge="b-method" icon={ListChecks} multi
          value={`${model.byMethod.ingested} ingested · ${model.byMethod.parsed} parsed · ${model.byMethod.inferred} inferred`} label="By method"
          caption="every edge says how it was found" />
      </div>

      <div className="card pad-lg e2e-body">
        <h3 className="sec-h e2e-title">{a.name}, end to end</h3>
        {hasLineage ? (
          <p className="e2e-synopsis">
            <b>{(model.filled[0] || '—').toUpperCase()} → {(model.filled[model.filled.length - 1] || '—').toUpperCase()}</b>
            {' · '}{g.up.size} upstream, {g.down.size} downstream, across {model.platforms.length} platform{model.platforms.length === 1 ? '' : 's'}: {model.platforms.join(', ')}.
            {' '}{methodSentence}
            {' '}Weakest hop in this picture: {model.lowest != null ? fmtConf(model.lowest) : '—'}.
          </p>
        ) : (
          <p className="e2e-synopsis muted">No lineage recorded for this asset yet.</p>
        )}

        <div className="e2e-stages">
          {STAGES.map(([key, label], i) => {
            const list = model.stages[key];
            return (
              <div key={key} className={`e2e-stage ${list.length ? '' : 'empty'}`}>
                <div className="e2e-stage-h">{label}{i < STAGES.length - 1 && <span className="e2e-arrow">→</span>}</div>
                {list.length ? (
                  <ul>
                    {list.map((k) => (
                      <li key={k} className={k === assetKey ? 'self' : ''}><code>{nameOf(k)}</code></li>
                    ))}
                  </ul>
                ) : <p className="e2e-nothing">nothing recorded here</p>}
              </div>
            );
          })}
        </div>

        <h4 className="e2e-hops-h">Every hop, and how it is known</h4>
        {hasLineage ? (
          <div className="e2e-hop-wrap">
            <table className="tbl e2e-hops">
              <thead>
                <tr>
                  <th>From</th><th>To</th><th>How it is known</th>
                  <th className="num">Confidence</th><th>Evidence</th><th className="num">Columns</th>
                </tr>
              </thead>
              <tbody>
                {model.rows.map(({ e, method, conf }) => {
                  const mm = METHOD_META[method];
                  const evidence = e.tf
                    ? `declared by the ${e.tf} manifest${e.ev ? ` (${e.ev})` : ''}`
                    : e.ev ? e.ev.replace(/_/g, ' ')
                    : method === 'parsed' ? 'parsed from the recorded column mappings'
                    : 'inferred from matching column names';
                  return (
                    <tr key={e.s + '>' + e.t} className="static">
                      <td><code className="mono">{nameOf(e.s)}</code></td>
                      <td><code className="mono">{nameOf(e.t)}</code></td>
                      <td><span className={`e2e-pill ${mm.cls}`}>{mm.label}</span></td>
                      <td className="num">{fmtConf(conf)}</td>
                      <td className="e2e-evidence">{evidence}</td>
                      <td className="num">{e.map ? e.map.length : 0}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="tbl-empty">No lineage recorded for this asset yet.</p>
        )}
      </div>
    </div>
  );
}
