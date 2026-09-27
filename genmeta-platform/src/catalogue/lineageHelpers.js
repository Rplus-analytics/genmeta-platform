/* Shared derivations for the Lineage sub-tabs. Everything here is built on the
   existing model + EndToEnd helpers (allEdges, hopMethod, CONFIDENCE) — no
   duplicated lineage logic, just presentation-level shaping. */
import { allEdges, BY_KEY } from './model.js';
import { hopMethod, CONFIDENCE, METHOD_META } from './EndToEnd.jsx';

/* Five-stage strip used by Trace a column (source → serve). */
export function traceStage(a) {
  const s = (a.schema || '').toUpperCase(), l = a.layer || '', k = a.kind;
  if (k === 'report' || k === 'dashboard' || s === 'BI') return 'BI';
  if (k === 'api' || s === 'API' || s.endsWith('_API')) return 'SEMANTIC';
  if (l === 'Raw' || s === 'SRC' || s.endsWith('_RAW')) return 'SOURCE';
  if (s === 'STG' || l === 'Staging' || s.endsWith('_CLN') || l === 'Cleansed') return 'STAGING';
  return 'WAREHOUSE';
}
export const TRACE_STAGES = ['SOURCE', 'STAGING', 'WAREHOUSE', 'SEMANTIC', 'BI'];

/* Classify a mapping expression into a plain transform type. */
export function transformType(expr, srcCol, tgtCol) {
  const x = expr || '';
  if (!x || x === 'identity' || x === srcCol || x === tgtCol) return 'identity';
  if (/^[A-Za-z]\w*\.\w+$/.test(x)) return 'identity';            // alias.col passthrough
  if (/CASE\s+WHEN/i.test(x)) return 'conditional derivation';
  if (/\b(SUM|COUNT|AVG|MIN|MAX|GROUP)\b/i.test(x)) return 'aggregation';
  if (/\b(YEAR|MONTH|QUARTER|DATEDIFF|DATE)\b/i.test(x)) return 'date derivation';
  if (/\b(UPPER|LOWER|TRIM|INITCAP|COALESCE|CONCAT)\b/i.test(x)) return 'cleansing';
  if (/[-+*/]|ROUND/i.test(x)) return 'calculation';
  return 'calculation';
}

/* Per-asset quality (the data records quality per asset, not per column). */
export const qualityStatus = (a) => (a.quality === 'High' ? 'healthy' : a.quality === 'Medium' ? 'warning' : 'failing');
export const qualityScore = (a) => (a.trust != null ? (a.trust * 100).toFixed(1) : '—');

export const methodName = (e) => METHOD_META[hopMethod(e)].label;
export const methodConf = (e) => CONFIDENCE[hopMethod(e)];

/* Everything downstream of an asset, with shortest hop count (BFS). */
export function downstreamBFS(key) {
  const edges = allEdges();
  const seen = new Map();
  let frontier = [[key, 0]];
  while (frontier.length) {
    const next = [];
    for (const [k, h] of frontier) {
      for (const e of edges) {
        if (e.s === k && !seen.has(e.t) && e.t !== key) { seen.set(e.t, h + 1); next.push([e.t, h + 1]); }
      }
    }
    frontier = next;
  }
  return seen; // Map<key, hops>
}

/* Follow one column back through every hop. Returns ordered steps (nearest
   first) plus a small summary (root, transform types, cardinality). */
export function traceColumn(assetKey, col) {
  const edges = allEdges();
  const steps = [];
  const seen = new Set();
  const walk = (ak, c, depth) => {
    for (const e of edges) {
      if (e.t !== ak) continue;
      for (const m of e.map || []) {
        if (m[1] !== c) continue;
        const id = `${e.s}|${m[0]}>${ak}|${c}`;
        if (seen.has(id)) continue;
        seen.add(id);
        const meth = hopMethod(e);
        steps.push({
          hop: depth + 1, fromA: e.s, fromCol: m[0], toA: ak, toCol: c,
          expr: m[2] && m[2] !== m[0] ? m[2] : '', type: transformType(m[2], m[0], c),
          method: meth, methodLabel: METHOD_META[meth].label, conf: CONFIDENCE[meth], inferred: meth === 'inferred',
        });
        walk(e.s, m[0], depth + 1);
      }
    }
  };
  walk(assetKey, col, 0);
  steps.sort((a, b) => a.hop - b.hop);
  const maxHop = steps.reduce((m, s) => Math.max(m, s.hop), 0);
  const root = steps.find((s) => s.hop === maxHop);
  const types = [...new Set(steps.map((s) => s.type))];
  const exprs = [...new Set(steps.map((s) => s.expr).filter(Boolean))];
  const cardinality = steps.some((s) => s.type === 'aggregation') ? 'many to one' : 'one to one';
  return { steps, maxHop, root, types, exprs, cardinality, anyInferred: steps.some((s) => s.inferred) };
}

export const assetName = (k) => (BY_KEY[k] ? BY_KEY[k].key : k);
