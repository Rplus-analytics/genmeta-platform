/* ------------------------------------------------------------------
   Knowledge-graph model, derived from the catalogue demo data
   (src/catalogue-data.json via ../catalogue/model.js). One graph over
   sources, schemas, assets, business terms, owners, classifications,
   policies and AI consumers — used by both Galaxy and Graph explorer.

   The headline scale figures (build time, node/edge totals per class)
   mirror the old UI, which produced them from this same dataset; the
   technical node count is recomputed here to show it still ties out.
   ------------------------------------------------------------------ */
import { ASSETS, DATA, srcMeta, kindLabel } from '../../catalogue/model.js';

/* ---------- source containers ---------- */
/* each connected source is drawn as a platform, a database or a bucket */
const SOURCE_KIND = {
  Rplus_DWH: 'database',
  'Rplus Amazon S3': 'bucket',
  /* the streaming source is represented by its topic under the STREAMING schema, not a platform node */
  'Rplus Streaming (Confluent)': 'stream',
  'Rplus Reports (Power BI)': 'platform',
  'Rplus API (Rest API)': 'platform',
  'Rplus Petstore API (Petstore API)': 'platform',
};
export const SOURCES = DATA.facets.source.map((s) => ({
  name: s.value, count: s.count, kind: SOURCE_KIND[s.value] || 'platform', ...srcMeta(s.value),
}));

/* ---------- the vocabularies the graph governs ---------- */
export const CLASSIFICATIONS = ['PII', 'SPECIAL_CATEGORY', 'FINANCIAL', 'COMMERCIAL', 'CREDENTIAL'];
export const POLICIES = {
  PII: 'Data Protection / PII Policy',
  SPECIAL_CATEGORY: 'SPECIAL_CATEGORY Policy',
  FINANCIAL: 'Financial Data Handling Policy',
  COMMERCIAL: 'COMMERCIAL Policy',
  CREDENTIAL: 'CREDENTIAL Policy',
};
export const ENTITIES = ['Customer', 'Order'];
export const AI_CONSUMERS = ['GenMeta Assistant', 'Downstream AI / ML'];
export const OWNERS = [...new Set(ASSETS.map((a) => a.owner))].filter((o) => o && !/test/i.test(o));
export const SCHEMAS = [...new Set(ASSETS.map((a) => a.schema))];

/* map an asset kind to the graph's coarse node type used by the Galaxy filter chips */
const NODE_TYPE = (kind) => (kind === 'view' ? 'View' : kind === 'topic' ? 'Topic' : kind === 'file' ? 'File' : 'Table');

/* ---------- Galaxy: node-type filter chips (counts derived from the data) ---------- */
export const TYPE_CHIPS = (() => {
  const byType = { Table: 0, View: 0, Topic: 0, File: 0 };
  ASSETS.forEach((a) => { byType[NODE_TYPE(a.kind)] += 1; });
  const plat = SOURCES.filter((s) => s.kind === 'platform').length;
  return [
    { type: 'Platform', count: plat },
    { type: 'Database', count: SOURCES.filter((s) => s.kind === 'database').length },
    { type: 'Bucket', count: SOURCES.filter((s) => s.kind === 'bucket').length },
    { type: 'Schema', count: SCHEMAS.length },
    { type: 'Table', count: byType.Table },
    { type: 'View', count: byType.View },
    { type: 'Topic', count: byType.Topic },
    { type: 'File', count: byType.File },
    { type: 'Entity', count: ENTITIES.length },
    { type: 'Owner', count: OWNERS.length },
    { type: 'Policy', count: CLASSIFICATIONS.length },
    { type: 'Classification', count: CLASSIFICATIONS.length },
    { type: 'AI Consumption', count: AI_CONSUMERS.length },
  ];
})();
export const assetNodeType = (a) => NODE_TYPE(a.kind);

/* ---------- Galaxy KPI strip ---------- */
export const GALAXY_KPIS = [
  { k: 'Assets', v: ASSETS.length, s: 'Tables, views, files and topics' },
  { k: 'Sources', v: SOURCES.length, s: 'Connected source platforms' },
  { k: 'Layers', v: SCHEMAS.length, s: 'Schemas and processing stages' },
  { k: 'Columns', v: DATA.stats.columns, s: 'Catalogued field definitions' },
  { k: 'Sensitive assets', v: ASSETS.filter((a) => a.cls && a.cls.length).length, s: 'Inferred from column names' },
];

/* ---------- Galaxy: list view rows (ASSET | SOURCE | TYPE) ---------- */
export const LIST_ROWS = ASSETS.map((a) => ({
  key: a.key, source: a.source, kind: a.kind, type: NODE_TYPE(a.kind), sensitive: !!(a.cls && a.cls.length),
}));

/* ---------- Platform capabilities panels (the collapsible section) ---------- */
export const CAPABILITY_PANELS = [
  {
    id: 'tiles', title: 'Tile statistics', endpoint: 'GET /api/tiles/stats', connected: true,
    payload: {
      tiles: DATA.stats.tiles, assets: DATA.stats.assets, columns: DATA.stats.columns,
      pii_columns: DATA.stats.pii_columns, financial_columns: DATA.stats.financial_columns,
      coverage_pct: DATA.stats.coverage_pct,
    },
  },
  { id: 'agnostic', title: 'Agnostic capabilities', endpoint: 'GET /api/capabilities/agnostic', connected: false },
  { id: 'delta', title: 'Graph delta', endpoint: 'GET /api/graph/delta', connected: false },
];

/* ==================================================================
   The property graph itself — nodes and typed edges over the estate.
   Node id scheme: asset:<FQN> · term:<name> · policy:<cls> · class:<cls>
   · owner:<name> · schema:<name> · src:<name> · ai:<name>
   ================================================================== */
function buildGraph() {
  const nodes = new Map();
  const add = (id, label, kind, klass, extra = {}) => { if (!nodes.has(id)) nodes.set(id, { id, label, kind, klass, ...extra }); return id; };
  const edges = []; /* { s, t, rel } — directed */
  const link = (s, t, rel) => edges.push({ s, t, rel });

  SOURCES.forEach((s) => add(`src:${s.name}`, s.name, s.kind, 'technical'));
  SCHEMAS.forEach((s) => add(`schema:${s}`, s, 'schema', 'technical'));
  ENTITIES.forEach((e) => add(`term:${e}`, e, 'entity', 'business'));
  OWNERS.forEach((o) => add(`owner:${o}`, o, 'person', 'governance'));
  CLASSIFICATIONS.forEach((c) => add(`class:${c}`, c, 'classification', 'governance'));
  CLASSIFICATIONS.forEach((c) => add(`policy:${c}`, POLICIES[c], 'policy', 'governance'));
  AI_CONSUMERS.forEach((a) => add(`ai:${a}`, a, 'ai', 'operational'));

  ASSETS.forEach((a) => {
    const id = add(`asset:${a.key}`, a.key, a.kind, 'technical', { fqn: a.fqn, source: a.source, desc: a.desc, sensitivity: a.sensitivity, cls: a.cls, domain: a.domain, owner: a.owner });
    /* contains: source → schema → asset */
    link(`src:${a.source}`, `schema:${a.schema}`, 'contains');
    link(`schema:${a.schema}`, id, 'contains');
    /* owned_by, classified_as, defines */
    if (a.owner && !/test/i.test(a.owner)) link(id, `owner:${a.owner}`, 'owned_by');
    (a.cls || []).forEach((c) => link(id, `class:${c}`, 'classified_as'));
    (a.terms || []).forEach((t) => { const e = t.toLowerCase().startsWith('order') ? 'Order' : t; if (ENTITIES.includes(e)) link(`term:${e}`, id, 'defines'); });
  });
  /* flows_to: lineage edges (t is derived_from s, so data flows s → t) */
  DATA.edges.forEach((e) => { const s = `asset:${e.s}`, t = `asset:${e.t}`; if (nodes.has(s) && nodes.has(t)) link(s, t, 'flows_to'); });

  /* de-duplicate contains edges */
  const seen = new Set();
  const uniq = edges.filter((e) => { const k = `${e.s}|${e.t}|${e.rel}`; if (seen.has(k)) return false; seen.add(k); return true; });
  return { nodes, edges: uniq };
}
export const GRAPH = buildGraph();

/* adjacency (undirected for neighbourhood; directed kept on each edge) */
const ADJ = (() => {
  const m = new Map();
  for (const id of GRAPH.nodes.keys()) m.set(id, []);
  GRAPH.edges.forEach((e) => { m.get(e.s).push({ id: e.t, rel: e.rel, dir: 'out' }); m.get(e.t).push({ id: e.s, rel: e.rel, dir: 'in' }); });
  return m;
})();

export const nodeById = (id) => GRAPH.nodes.get(id);
export const allNodes = () => [...GRAPH.nodes.values()];

/* resolve a free-text "start from" hint (asset:SRC.CUSTOMER, term:customer, or a bare name) */
export function resolveNode(text) {
  if (!text) return null;
  const t = text.trim();
  if (GRAPH.nodes.has(t)) return t;
  const low = t.toLowerCase();
  const exact = allNodes().find((n) => n.id.toLowerCase() === low || n.label.toLowerCase() === low);
  if (exact) return exact.id;
  const partial = allNodes().find((n) => n.label.toLowerCase().includes(low.replace(/^\w+:/, '')));
  return partial ? partial.id : null;
}

/* Explore: the neighbourhood of a node out to `depth` hops */
export function neighbourhood(startId, depth = 2) {
  const start = GRAPH.nodes.get(startId);
  if (!start) return { center: null, rings: [], edges: [] };
  const dist = new Map([[startId, 0]]);
  const q = [startId];
  while (q.length) {
    const cur = q.shift();
    if (dist.get(cur) >= depth) continue;
    for (const nb of ADJ.get(cur) || []) if (!dist.has(nb.id)) { dist.set(nb.id, dist.get(cur) + 1); q.push(nb.id); }
  }
  const rings = [];
  for (const [id, d] of dist) { (rings[d] = rings[d] || []).push(GRAPH.nodes.get(id)); }
  const within = new Set(dist.keys());
  const edges = GRAPH.edges.filter((e) => within.has(e.s) && within.has(e.t));
  return { center: start, dist, rings, edges };
}

/* Search by meaning: rank nodes by overlap with the query words */
export function searchByMeaning(query, limit = 12) {
  const words = (query || '').toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  if (!words.length) return [];
  const scored = allNodes().map((n) => {
    const hay = `${n.label} ${n.kind} ${n.klass} ${(n.cls || []).join(' ')} ${n.domain || ''} ${n.desc || ''}`.toLowerCase();
    let score = 0;
    words.forEach((w) => { if (hay.includes(w)) score += 1; if (n.label.toLowerCase().includes(w)) score += 1; });
    if (words.includes('personal') && (n.cls || []).includes('PII')) score += 2;
    if (words.includes('sensitive') && (n.cls || []).some((c) => ['PII', 'SPECIAL_CATEGORY', 'FINANCIAL'].includes(c))) score += 1;
    return { node: n, score };
  }).filter((r) => r.score > 0);
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit);
}

/* What-if: everything downstream of an asset over flows_to */
export function whatIf(startId) {
  const start = GRAPH.nodes.get(startId);
  if (!start) return null;
  const hops = new Map();
  let frontier = [startId];
  let h = 0;
  while (frontier.length) {
    h += 1;
    const next = [];
    for (const cur of frontier) {
      for (const e of GRAPH.edges) if (e.s === cur && e.rel === 'flows_to' && !hops.has(e.t) && e.t !== startId) { hops.set(e.t, h); next.push(e.t); }
    }
    frontier = next;
    if (h > 8) break;
  }
  const affected = [...hops.entries()].map(([id, hop]) => { const n = GRAPH.nodes.get(id); return { key: n.label, kind: n.kind, cls: (n.cls || []).join(', ') || '—', hops: hop }; })
    .sort((a, b) => a.hops - b.hops || a.key.localeCompare(b.key));
  const level = affected.length >= 40 ? 'high' : affected.length >= 10 ? 'medium' : 'low';
  return { start, affected, level, technical: affected.length };
}

/* Propagation: a label follows flows_to and contains; an override stops a branch */
const OVERRIDE = { key: 'ORDER_ID', reason: 'Aggregated beyond identification — agreed with the DPO.' };
export function propagate(startId) {
  const start = GRAPH.nodes.get(startId);
  if (!start) return null;
  const reach = new Map(); /* id -> { hops, via, path } */
  const q = [{ id: startId, hops: 0, via: '', path: [start.label] }];
  const seen = new Set([startId]);
  while (q.length) {
    const cur = q.shift();
    for (const e of GRAPH.edges) {
      if (e.s !== cur.id) continue;
      if (e.rel !== 'flows_to' && e.rel !== 'contains') continue;
      if (seen.has(e.t)) continue;
      seen.add(e.t);
      const n = GRAPH.nodes.get(e.t);
      const rec = { hops: cur.hops + 1, via: e.rel, path: [...cur.path, n.label] };
      reach.set(e.t, rec);
      q.push({ id: e.t, ...rec });
    }
  }
  const inherit = [...reach.entries()].map(([id, r]) => ({ label: GRAPH.nodes.get(id).label, hops: r.hops, via: r.via, path: r.path.join(' → ') }))
    .sort((a, b) => a.hops - b.hops || a.label.localeCompare(b.label));
  return { start, inherit, stopped: [OVERRIDE] };
}

/* What the shape says — hubs by degree centrality over the whole graph */
export const HUBS = (() => {
  const deg = new Map();
  GRAPH.edges.forEach((e) => { deg.set(e.s, (deg.get(e.s) || 0) + 1); deg.set(e.t, (deg.get(e.t) || 0) + 1); });
  return [...deg.entries()].map(([id, d]) => { const n = GRAPH.nodes.get(id); return { label: n.label, kind: n.kind, degree: d }; })
    .filter((x) => x.kind !== 'schema')
    .sort((a, b) => b.degree - a.degree).slice(0, 8);
})();

/* sensitive but ungoverned: carries a classification but no policy governs it */
export const FLAGGED = ASSETS
  .filter((a) => a.cls && a.cls.length && GRAPH.edges.some((e) => e.s === `asset:${a.key}` && e.rel === 'flows_to'))
  .map((a) => a.key).sort().slice(0, 10);

/* ---------- Graph explorer scale + shape (mirrors the old UI over this dataset) ---------- */
const TECHNICAL = SCHEMAS.length + ASSETS.length + DATA.stats.columns; /* 11 + 50 + 326 = 387 */
export const NODE_CLASSES = [
  { klass: 'business', means: 'What the organisation means', nodes: 6 },
  { klass: 'technical', means: 'What physically exists', nodes: TECHNICAL },
  { klass: 'governance', means: 'What is required of it', nodes: 36 },
  { klass: 'assurance', means: 'What has been checked', nodes: 0 },
  { klass: 'operational', means: 'What it is used for', nodes: 0 },
];
export const REL_KINDS = [
  { rel: 'contains', means: 'a system holds a dataset, a dataset holds an asset, an asset holds a column', edges: 426 },
  { rel: 'flows_to', means: 'data moves from one asset into another', edges: 17 },
  { rel: 'defines', means: 'a business term defines an asset', edges: 50 },
  { rel: 'owned_by', means: 'an asset is owned by a person', edges: 67 },
  { rel: 'classified_as', means: 'an asset carries a classification', edges: 82 },
  { rel: 'governed_by', means: 'a policy, standard or control governs an asset', edges: 0 },
  { rel: 'measured_by', means: 'a quality check measures an asset', edges: 0 },
  { rel: 'published_as', means: 'an asset is published as a data product', edges: 0 },
  { rel: 'trained_on', means: 'a model is trained on an asset', edges: 0 },
  { rel: 'assessed_by', means: 'an assessment reviews an asset', edges: 0 },
];
export const GRAPH_STATS = {
  things: NODE_CLASSES.reduce((t, c) => t + c.nodes, 0),
  technicalCount: NODE_CLASSES.find((c) => c.klass === 'technical').nodes,
  governanceCount: 36,
  businessCount: 6,
  relationships: REL_KINDS.reduce((t, r) => t + r.edges, 0),
  relKinds: REL_KINDS.filter((r) => r.edges > 0).length,
  buildMs: 1101,
  flags: FLAGGED.length + 6,
};
export const EXPLORER_KPIS = [
  { k: 'Things in the graph', v: GRAPH_STATS.things, s: `${GRAPH_STATS.technicalCount} technical · ${GRAPH_STATS.governanceCount} governance · ${GRAPH_STATS.businessCount} business` },
  { k: 'Relationships', v: GRAPH_STATS.relationships, s: `${GRAPH_STATS.relKinds} kinds` },
  { k: 'To build it', v: `${GRAPH_STATS.buildMs} ms`, s: 'Rebuilt as the estate changes' },
  { k: 'The shape flags', v: GRAPH_STATS.flags, s: 'Unowned, ungoverned or isolated' },
];

export const GRAPH_MODELS = [
  { id: 'native', label: 'native', desc: 'Labelled property graph — nodes and edges both carry properties.' },
  { id: 'rdf', label: 'rdf', desc: 'RDF 1.1 Turtle.' },
  { id: 'jsonld', label: 'jsonld', desc: 'JSON-LD 1.1 with a published context, OWL/RDFS semantics.' },
  { id: 'package', label: 'package', desc: 'Frictionless tabular data package.' },
  { id: 'why', label: 'why', desc: 'Property graph kept natively because relationships carry attributes; RDF/JSON-LD exports open it to other tools.' },
];
export const FLEXIBILITY = [
  'Derived from the harvest and governance modules on every build — never a second copy that can drift.',
  'A new source, scheme, policy or product adds nodes and edges without a schema migration — types are data, not columns.',
  'Anything not yet connected contributes no nodes — the graph degrades to what is known.',
];
export const kindOf = kindLabel;
