/* ------------------------------------------------------------------
   Catalogue model. The data is the dev environment's dummy estate
   (dev.genmeta.rplusanalytics.co.uk /api/gm: assets, facets, tiles,
   lineage-graph, lineage, glossary), copied into catalogue-data.json.
   Swap loadCatalogue() for API calls when wiring to the backend.
   ------------------------------------------------------------------ */
import {
  Table2, Layers, FileText, Webhook, BarChart3, LayoutDashboard, Radio,
} from 'lucide-react';
import RAW from '../catalogue-data.json';

for (const e of RAW.edges) {
  if (!e.map.length) e.map = (RAW.colLineage[e.t] || []).filter((r) => r[0] === e.s).map((r) => [r[1], r[2], r[3]]);
}
export const DATA = RAW;
export const ASSETS = RAW.assets.map((a) => ({
  ...a,
  domain: a.domain || 'Unassigned',
  columns: (RAW.columns[a.id] || []).map(([name, type, nullable, cls], i) => ({ name, type, nullable, cls, n: i + 1 })),
}));
export const BY_KEY = Object.fromEntries(ASSETS.map((a) => [a.key, a]));
export const BY_ID = Object.fromEntries(ASSETS.map((a) => [String(a.id), a]));

/* ---------- AI-assisted overlay ----------
   Edges a person accepted from the Methods & limits proposals. Kept in memory
   and mirrored to localStorage so they survive a refresh, and folded into the
   graph / End to end lineage (drawn as inferred, but flagged ai + acceptedBy). */
const OVERLAY_KEY = 'lineage.acceptedEdges';
let ACCEPTED = [];
try { ACCEPTED = JSON.parse(localStorage.getItem(OVERLAY_KEY) || '[]'); } catch { ACCEPTED = []; }
const saveOverlay = () => { try { localStorage.setItem(OVERLAY_KEY, JSON.stringify(ACCEPTED)); } catch { /* ignore */ } };

export const acceptedEdges = () => ACCEPTED;
export const allEdges = () => (ACCEPTED.length ? RAW.edges.concat(ACCEPTED) : RAW.edges);
export function addAcceptedEdge(edge) {
  ACCEPTED = [...ACCEPTED.filter((e) => !(e.s === edge.s && e.t === edge.t)), edge];
  saveOverlay();
}
export function removeAcceptedEdge(s, t) {
  ACCEPTED = ACCEPTED.filter((e) => !(e.s === s && e.t === t));
  saveOverlay();
}

/* Source systems, shown as small vendor marks */
export const SOURCE_META = {
  Rplus_DWH: { ini: 'SF', vendor: 'Snowflake' },
  'Rplus Amazon S3': { ini: 'S3', vendor: 'Amazon S3' },
  'Rplus Petstore API (Petstore API)': { ini: 'PA', vendor: 'Petstore API' },
  'Rplus API (Rest API)': { ini: 'API', vendor: 'REST API' },
  'Rplus Reports (Power BI)': { ini: 'PB', vendor: 'Power BI' },
  'Rplus Streaming (Confluent)': { ini: 'CF', vendor: 'Confluent' },
};
export const srcMeta = (s) => SOURCE_META[s] || { ini: (s || '?').slice(0, 2).toUpperCase(), vendor: s };

export const KIND_ICON = { table: Table2, view: Layers, file: FileText, api: Webhook, report: BarChart3, dashboard: LayoutDashboard, topic: Radio };
export const kindLabel = (k) => (k === 'api' ? 'API endpoint' : k[0].toUpperCase() + k.slice(1));

/* Filters, in the dev order and with the dev names */
export const FACETS = [
  /* the stacked dropdowns at the top of the filter panel */
  { key: 'source', label: 'Source system', get: (a) => [a.source], drop: true },
  { key: 'db', label: 'Database', get: (a) => [a.db], drop: true },
  { key: 'schema', label: 'Schema', get: (a) => [a.schema], drop: true },
  { key: 'kind', label: 'Asset type', get: (a) => [a.kind], drop: true },
  /* everything else, as expandable checkbox groups underneath */
  { key: 'domain', label: 'Domain', get: (a) => [a.domain] },
  { key: 'owner', label: 'Owner', get: (a) => [a.owner] },
  { key: 'sensitivity', label: 'Sensitivity', get: (a) => [a.sensitivity] },
  { key: 'quality', label: 'Quality', get: (a) => [a.quality] },
  { key: 'layer', label: 'Layer', get: (a) => (a.layer ? [a.layer] : []) },
  { key: 'usage', label: 'Usage pattern', get: (a) => [a.usage] },
  { key: 'tags', label: 'Tags', get: (a) => a.tags },
];

export const matchesFilters = (a, sel, skip) =>
  FACETS.every((f) => f.key === skip || !sel[f.key]?.length || f.get(a).some((v) => sel[f.key].includes(v)));

export const matchesText = (a, words) => {
  if (!words.length) return true;
  const hay = `${a.fqn} ${a.desc || ''} ${a.domain} ${a.owner} ${a.tags.join(' ')} ${a.terms.join(' ')} ${a.columns.map((c) => c.name).join(' ')}`.toLowerCase();
  return words.every((w) => hay.includes(w));
};

/* Counts for each option given everything else that is selected */
export function facetCounts(assets, sel, words) {
  const out = {};
  for (const f of FACETS) {
    const m = new Map();
    for (const a of assets) {
      if (!matchesText(a, words) || !matchesFilters(a, sel, f.key)) continue;
      for (const v of f.get(a)) m.set(v, (m.get(v) || 0) + 1);
    }
    const order = (RAW.facets[f.key === 'quality' ? 'quality_band' : f.key] || []).map((x) => x.value);
    const vals = new Set([...order, ...m.keys(), ...(sel[f.key] || [])]);
    out[f.key] = [...vals].map((v) => ({ v, n: m.get(v) || 0 }))
      .sort((x, y) => (y.n - x.n) || order.indexOf(x.v) - order.indexOf(y.v));
  }
  return out;
}

/* ---------- "Ask in plain English" ---------- */
const RULES = [
  [/\b(pii|personal)\b/, 'tags', 'PII'],
  [/\bfinancial\b/, 'tags', 'FINANCIAL'],
  [/\b(special category|special-category)\b/, 'tags', 'SPECIAL_CATEGORY'],
  [/\brestricted\b/, 'sensitivity', 'Restricted'],
  [/\bconfidential\b/, 'sensitivity', 'Confidential'],
  [/\bsensitive\b/, 'sensitivity', 'Restricted'],
  [/\blow[- ]quality\b/, 'quality', 'Low'],
  [/\bhigh[- ]quality\b/, 'quality', 'High'],
  [/\bmedium[- ]quality\b/, 'quality', 'Medium'],
  [/\braw\b/, 'layer', 'Raw'],
  [/\bcurated\b/, 'layer', 'Curated'],
  [/\bstaging\b/, 'layer', 'Staging'],
  [/\bcleansed\b/, 'layer', 'Cleansed'],
  [/\b(snowflake|dwh|warehouse)\b/, 'source', 'Rplus_DWH'],
  [/\b(s3|amazon)\b/, 'source', 'Rplus Amazon S3'],
  [/\bpower ?bi\b/, 'source', 'Rplus Reports (Power BI)'],
  [/\b(confluent|kafka|stream(ing)?)\b/, 'source', 'Rplus Streaming (Confluent)'],
  [/\bpetstore\b/, 'source', 'Rplus Petstore API (Petstore API)'],
  [/\breports?\b/, 'kind', 'report'],
  [/\bdashboards?\b/, 'kind', 'dashboard'],
  [/\b(apis?|endpoints?)\b/, 'kind', 'api'],
  [/\btables?\b/, 'kind', 'table'],
  [/\bviews?\b/, 'kind', 'view'],
  [/\bfiles?\b/, 'kind', 'file'],
  [/\btopics?\b/, 'kind', 'topic'],
  [/\brajesh\b/, 'owner', 'Rajesh'],
  [/\braghav\b/, 'owner', 'Raghav'],
  [/\bpk\b/, 'owner', 'PK'],
  [/\bmeera\b/, 'owner', 'Meera Shah (test user)'],
  [/\bconsumed\b/, 'usage', 'Consumed'],
  [/\bstandalone\b/, 'usage', 'Standalone'],
];
const TOPICS = [[/\bcustomers?\b/, 'Customer'], [/\borders?\b/, 'Orders'], [/\bsuppliers?\b/, 'Supplier'], [/\bproducts?\b/, 'Product']];
const STOP = new Set('show me with in the which what where who that does do own owns owned by about for find list all any data assets asset are is of a an to from and or has have containing contain give get my our there'.split(' '));

/* Turns a sentence into filter selections plus leftover search words.
   Topic words (customer, orders…) become a Domain filter when that still finds
   something, otherwise they are searched as text. */
export function parseQuestion(q) {
  let t = ` ${q.toLowerCase()} `;
  const sel = {};
  const add = (k, v) => { sel[k] = [...new Set([...(sel[k] || []), v])]; };
  for (const [re, k, v] of RULES) if (re.test(t)) { add(k, v); t = t.replace(new RegExp(re.source, 'g'), ' '); }
  const topics = [];
  for (const [re, d] of TOPICS) if (re.test(t)) { topics.push(d); t = t.replace(new RegExp(re.source, 'g'), ' '); }
  const words = t.split(/[^a-z0-9_.-]+/).filter((w) => w && !STOP.has(w) && w.length > 1);
  for (const d of topics) {
    const trial = { ...sel, domain: [...(sel.domain || []), d] };
    if (ASSETS.some((a) => matchesFilters(a, trial) && matchesText(a, words))) sel.domain = trial.domain;
    else words.push(d.toLowerCase().replace(/s$/, ''));
  }
  return { sel, words };
}

export const EXAMPLES = [
  'show me customer tables with PII',
  'low quality raw data in snowflake',
  'which assets does Rajesh own',
  'power bi reports about orders',
  'api endpoints for customers',
];

/* ---------- tiles (dev figures, recomputed so filters stay honest) ---------- */
export function tiles(list) {
  const cnt = (f) => list.filter(f).length;
  const sources = new Set(list.map((a) => a.source)).size;
  const cols = list.reduce((t, a) => t + a.cols, 0);
  const sens = cnt((a) => a.sensitivity !== 'Internal');
  const low = cnt((a) => a.quality === 'Low');
  const linked = list.map((a) => termsFor(a).map((t) => t.name));
  const termed = linked.filter((x) => x.length).length;
  const termNames = new Set(linked.flat()).size;
  return [
    { k: 'Total assets', v: list.length, s: `${sources} source ${sources === 1 ? 'type' : 'types'}` },
    { k: 'Columns', v: cols, s: 'typed and profiled' },
    { k: 'Sensitive assets', v: sens, s: `${cnt((a) => a.sensitivity === 'Restricted')} restricted · ${cnt((a) => a.sensitivity === 'Confidential')} confidential` },
    { k: 'Low quality', v: low, s: `${cnt((a) => a.quality === 'High')} high · ${cnt((a) => a.quality === 'Medium')} medium` },
    { k: 'Linked to terms', v: termed, s: `${termNames} glossary terms` },
  ];
}

/* ---------- lineage ---------- */
export function lineageFor(key) {
  const base = RAW.focus[key];
  const edgesAll = allEdges();
  if (!base) {
    /* asset not in the precomputed focus map: build a one-hop neighbourhood */
    const hop = { [key]: 0 };
    for (const e of edgesAll) { if (e.s === key) hop[e.t] = 1; else if (e.t === key) hop[e.s] = -1; }
    const set = new Set(Object.keys(hop));
    return { nodes: Object.keys(hop).map((k) => ({ key: k, hop: hop[k] })), edges: edgesAll.filter((e) => set.has(e.s) && set.has(e.t)) };
  }
  const hops = { ...base };
  /* pull accepted overlay edges into the picture by hanging their new endpoint
     off whichever end is already on screen */
  let changed = true;
  while (changed) {
    changed = false;
    for (const e of ACCEPTED) {
      if (e.s in hops && !(e.t in hops)) { hops[e.t] = hops[e.s] + 1; changed = true; }
      else if (e.t in hops && !(e.s in hops)) { hops[e.s] = hops[e.t] - 1; changed = true; }
    }
  }
  const set = new Set(Object.keys(hops));
  return {
    nodes: Object.keys(hops).map((k) => ({ key: k, hop: hops[k] })),
    edges: edgesAll.filter((e) => set.has(e.s) && set.has(e.t)),
  };
}
export const upstreamOf = (key) => allEdges().filter((e) => e.t === key);
export const downstreamOf = (key) => allEdges().filter((e) => e.s === key);
export const columnLineage = (key) => RAW.colLineage[key] || [];
export const termsFor = (a) => RAW.terms.filter((t) => a.terms.includes(t.name) || t.assets.map((x) => x.toUpperCase()).includes(a.key));

/* Enrichment: how much of the metadata an owner would expect is filled in */
export function enrichment(a) {
  const checks = [
    ['Description', !!a.desc], ['Owner', !!a.owner], ['Steward', !!a.steward], ['Domain', a.domain !== 'Unassigned'],
    ['Glossary terms', a.terms.length > 0], ['Classification', a.cls.length > 0], ['Primary key', a.pk.length > 0 || a.kind === 'api' || a.kind === 'report' || a.kind === 'dashboard'],
  ];
  return { score: Math.round((checks.filter((c) => c[1]).length / checks.length) * 100), checks };
}

export const fmtBytes = (b) => (b == null ? '—' : b < 1024 ? `${b} B` : b < 1048576 ? `${(b / 1024).toFixed(1)} KB` : `${(b / 1048576).toFixed(1)} MB`);
export const pct = (x) => `${Math.round(x * 100)}%`;
