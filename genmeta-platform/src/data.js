/* ------------------------------------------------------------------
   Sample estate data. Figures match the Data Estate view
   (public/estate/index.html → SOURCES) so every screen tells one story.
   Replace with the GenMeta API (FastAPI → /api/estate) when wiring up.
   ------------------------------------------------------------------ */

export const SOURCES = [
  { id: 'snowflake', name: 'Rplus_DWH', vendor: 'Snowflake', ini: 'SF', kind: 'Cloud data warehouse — tables, views and declared keys',
    type: 'Warehouse', dbs: 6, tables: 412, fields: 6120, pb: 1.12, changes: 14, cov: 0.86, domain: 'Finance',
    connection: 'Agentless', cloud: 'Multi-cloud', owners: ['PK', 'Raghav'], tags: ['Orders', 'Customer', 'FINANCIAL'],
    status: 'healthy', schemas: 4, lineage: 119, alerts: 33, lastScan: '17 min ago' },
  { id: 'databricks', name: 'Rplus Lakehouse', vendor: 'Databricks', ini: 'DB', kind: 'Lakehouse — Delta tables, notebooks and job lineage',
    type: 'Lakehouse', dbs: 5, tables: 286, fields: 4210, pb: 0.74, changes: 9, cov: 0.79, domain: 'Events',
    connection: 'API', cloud: 'Cloud (Azure)', owners: ['Raghav'], tags: ['Events', 'Customer'],
    status: 'healthy', schemas: 5, lineage: 84, alerts: 12, lastScan: '17 min ago' },
  { id: 'sqlserver', name: 'Casework DB', vendor: 'SQL Server', ini: 'MS', kind: 'Operational casework database — normalised OLTP schema',
    type: 'Database', dbs: 4, tables: 224, fields: 3180, pb: 0.21, changes: 6, cov: 0.71, domain: 'Casework',
    connection: 'Agent', cloud: 'On-premise', owners: ['Rajesh'], tags: ['Casework', 'PERSONAL'],
    status: 'warning', schemas: 3, lineage: 61, alerts: 9, lastScan: '42 min ago' },
  { id: 's3', name: 'Rplus Amazon S3', vendor: 'Amazon S3', ini: 'S3', kind: 'Object storage data lake — manifest-backed pipeline stages',
    type: 'Object store', dbs: 3, tables: 198, fields: 2640, pb: 0.28, changes: 5, cov: 0.58, domain: 'Documents',
    connection: 'API', cloud: 'Cloud (AWS)', owners: ['Rajesh', 'PK'], tags: ['Customer', 'Orders', 'FINANCIAL'],
    status: 'healthy', schemas: 3, lineage: 29, alerts: 21, lastScan: '17 min ago' },
  { id: 'oracle', name: 'Legacy Ledger', vendor: 'Oracle', ini: 'OR', kind: 'Legacy ledger database — general ledger and payments',
    type: 'Database', dbs: 2, tables: 118, fields: 2150, pb: 0.05, changes: 2, cov: 0.44, domain: 'Ledger',
    connection: 'Agent', cloud: 'On-premise', owners: ['Madhavi'], tags: ['Ledger', 'FINANCIAL'],
    status: 'healthy', schemas: 2, lineage: 22, alerts: 6, lastScan: '17 min ago' },
  { id: 'confluent', name: 'Rplus Streaming', vendor: 'Confluent', ini: 'CF', kind: 'Streaming platform — topic schemas from the Schema Registry',
    type: 'Streaming', dbs: 2, tables: 46, fields: 642, pb: 0.012, changes: 1, cov: 0.63, domain: 'Streams',
    connection: 'API', cloud: 'Cloud (SaaS)', owners: ['Rajesh'], tags: ['Customer', 'FINANCIAL'],
    status: 'healthy', schemas: 1, lineage: 14, alerts: 4, lastScan: '17 min ago' },
];

const sum = (k) => SOURCES.reduce((t, s) => t + s[k], 0);

export const TOTALS = {
  systems: SOURCES.length,
  databases: sum('dbs'),
  tables: sum('tables'),
  fields: sum('fields'),
  pb: sum('pb'),
  changes: sum('changes'),
  coverage: SOURCES.reduce((t, s) => t + s.cov * s.tables, 0) / sum('tables'),
};

export const sizeTxt = (pb) => (pb < 0.1 ? `${Math.round(pb * 1000)} TB` : `${pb.toFixed(2)} PB`);
export const fmt = (n) => n.toLocaleString('en-GB');

/* Standards alignment — shared by the Data estate (Dashboard) and Governance pages
   so the two screens can never drift apart. [label, coverage 0–1]. */
export const STANDARDS = [
  ['GDS Service Standard', 0.92],
  ['NCSC CAF', 0.88],
  ['Technology Code of Practice', 0.95],
  ['UK GDPR', 0.9],
  ['ISO 27001', 0.94],
];

/* 14-day trend lines for the KPI sparklines */
export const TRENDS = {
  systems: [4, 4, 4, 5, 5, 5, 5, 5, 5, 6, 6, 6, 6, 6],
  tables: [1102, 1118, 1131, 1140, 1162, 1170, 1188, 1201, 1214, 1236, 1249, 1260, 1271, 1284],
  fields: [16320, 16510, 16740, 16900, 17120, 17400, 17610, 17840, 18010, 18230, 18460, 18620, 18810, 18942],
  size: [2.12, 2.14, 2.16, 2.19, 2.21, 2.22, 2.25, 2.27, 2.29, 2.31, 2.34, 2.36, 2.39, 2.41],
};

export const CHANGES = [
  { t: '4 min ago', who: 'Schema agent', what: 'added 3 fields to', target: 'finance.gl_journal_lines', src: 'Snowflake', kind: 'add' },
  { t: '12 min ago', who: 'Classification agent', what: 'tagged PERSONAL on', target: 'casework.claimant_address', src: 'SQL Server', kind: 'tag' },
  { t: '26 min ago', who: 'Lineage agent', what: 'mapped 14 new edges from', target: 'events.web_sessions', src: 'Databricks', kind: 'lineage' },
  { t: '41 min ago', who: 'Quality agent', what: 'flagged schema drift in', target: 's3://rplus-raw/orders/', src: 'Amazon S3', kind: 'alert' },
  { t: '1 hr ago', who: 'Catalog agent', what: 'wrote descriptions for 22 tables in', target: 'ledger.payments', src: 'Oracle', kind: 'describe' },
  { t: '2 hr ago', who: 'Madhavi G', what: 'approved glossary term', target: 'Customer Lifetime Value', src: 'Glossary', kind: 'approve' },
];

const TABLE_NAMES = {
  snowflake: ['gl_journal_lines', 'customer_dim', 'orders_fact', 'invoice_header', 'payment_terms', 'cost_centre_dim', 'budget_plan'],
  databricks: ['web_sessions', 'click_events', 'feature_store_v2', 'model_scores', 'campaign_touch'],
  sqlserver: ['claimant', 'claimant_address', 'case_event', 'case_note', 'appointment'],
  s3: ['raw_orders_manifest', 'documents_index', 'scanned_forms', 'pipeline_stage_log'],
  oracle: ['payments', 'ledger_balance', 'supplier_master', 'vat_return'],
  confluent: ['customer.updated.v3', 'order.placed.v2', 'payment.settled.v1'],
};
const CLASS = ['Public', 'Internal', 'Personal', 'Financial', 'Sensitive'];
export const CATALOGUE = SOURCES.flatMap((s, i) =>
  TABLE_NAMES[s.id].map((t, j) => {
    const seed = (i + 1) * 31 + j * 17;
    return {
      id: `${s.id}.${t}`, name: t, source: s.vendor, sourceId: s.id, schema: s.domain.toLowerCase(),
      fields: 8 + (seed % 46), rows: (seed * 91373) % 48000000 + 12000,
      classification: CLASS[(seed + j) % CLASS.length], described: (seed % 10) / 10 < s.cov,
      owner: s.owners[j % s.owners.length], quality: 78 + (seed % 22), updated: `${1 + (seed % 23)}h ago`,
    };
  })
);

export const PRODUCTS = [
  { id: 'arc', name: 'ARC', tag: 'Priority 2' },
  { id: 'art', name: 'ART', tag: 'Priority 3' },
  { id: 'cloudiq', name: 'CloudIQ', tag: 'Priority 4' },
  { id: 'bidintel', name: 'BidIntel', tag: 'Priority 5' },
  { id: 'rio', name: 'RIO', tag: 'Priority 6' },
  { id: 'gtt', name: 'Gen Test Tool', tag: 'Priority 7' },
];
