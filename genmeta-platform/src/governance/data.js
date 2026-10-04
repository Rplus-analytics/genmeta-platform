/* Governance — static snapshot of the old UI's Governance section (Governance overview,
   Policies, DPIA, Access), captured 3 Oct 2026 from genmeta.rplusanalytics.co.uk.
   Every figure here is what the old screens showed; swap for the /api/gm/* calls when wired. */

export const BASE = '/app/governance';
export const ORG = { controller: 'HMRC', contact: 'Data Protection Officer' };

/* ------------------------------------------------------------------ estate */
export const SYSTEMS = ['Rplus_DWH', 'Rplus Streaming (Confluent)', 'Rplus Amazon S3', 'Rplus Reports (Power BI)', 'Rplus API (Rest API)', 'SQL Server'];

export const ASSET_NAMES = [
  'API.GET_customers', 'API.GET_customers_customerId', 'API.GET_orders', 'API.POST_orders',
  'BI.Customer 360 Dashboard', 'BI.Customer Churn Analysis', 'BI.Order Revenue Report', 'BI.Supplier Performance',
  'INT.CUSTOMER', 'INT.LINEITEM', 'INT.NATION', 'INT.ORDERS', 'INT.PART', 'INT.SUPPLIER', 'PRL.ORDER_MASTER',
  'S3_CLN.CUSTOMER', 'S3_CLN.ORDERS', 'S3_ENR.CUSTOMER_ORDERS', 'S3_ENR.CUSTOMER_SUMMARY', 'S3_RAW.CUSTOMER', 'S3_RAW.ORDERS',
  'SQL_CLN.CUSTOMER', 'SQL_CLN.ORDERS', 'SQL_ENR.CUSTOMER_ORDERS', 'SQL_ENR.CUSTOMER_SUMMARY', 'SQL_SRC.CUSTOMER', 'SQL_SRC.ORDERS',
  'SRC.CUSTOMER', 'SRC.LINEITEM', 'SRC.NATION', 'SRC.ORDERS', 'SRC.PART', 'SRC.SUPPLIER',
  'STG.CUSTOMER_ORDER', 'STG.CUSTOMER_ORDER_LIVE_RPLUS', 'STG.ORDER_ITEM_SUMMARY', 'STREAMING.customer-value',
];

export const systemOf = (a) => {
  if (a.startsWith('API.')) return 'Rplus API (Rest API)';
  if (a.startsWith('BI.')) return 'Rplus Reports (Power BI)';
  if (a.startsWith('S3_')) return 'Rplus Amazon S3';
  if (a.startsWith('SQL_')) return 'SQL Server';
  if (a.startsWith('STREAMING.')) return 'Rplus Streaming (Confluent)';
  return 'Rplus_DWH';
};

/* option lists used by the policy applicability form */
export const APPLY_OPTIONS = {
  classifications: ['COMMERCIAL', 'FINANCIAL', 'PII'],
  sensitivity: ['Confidential', 'Internal', 'Restricted'],
  domains: ['Customer', 'Orders', 'Product', 'Reference', 'Supplier'],
  layers: ['Cleansed', 'Curated', 'Raw', 'Staging'],
  systems: ['Rplus API (Rest API)', 'Rplus Amazon S3', 'Rplus Reports (Power BI)', 'Rplus Streaming (Confluent)', 'Rplus_DWH', 'SQL Server'],
  tax_regimes: ['Income Tax Self Assessment', 'PAYE', 'National Insurance contributions', 'VAT', 'Corporation Tax', 'Capital Gains Tax', 'Inheritance Tax', 'Customs and excise duties'],
  processes: ['Customer registration and identity', 'Order to cash', 'Customer value analytics', 'Supplier management', 'Compliance risk assessment'],
  org_units: ['Customer Services Group', 'Customer Compliance Group', 'Chief Digital and Information Officer Group', 'Data and Analytics', 'Finance'],
  assets: ASSET_NAMES,
};
export const APPLY_LABELS = { classifications: 'Classifications', sensitivity: 'Sensitivity', domains: 'Domains', layers: 'Layers', systems: 'Systems', tax_regimes: 'Tax regimes', processes: 'Processes', org_units: 'Org units', assets: 'Assets' };

/* ------------------------------------------------------------------ governance overview */
export const OVERVIEW_TILES = [
  { l: 'Audit integrity', v: 'Verified', s: '128 entries · 0 broken links · SHA-256 chain' },
  { l: 'Sensitive coverage', v: '97%', s: '81 columns identified across 36 assets' },
  { l: 'Classification', v: '97%', s: '36 of 37 assets carry a sensitivity classification' },
  { l: 'Constitution', v: '3 tiers', s: 'Tier 0 immutable · Tier 2 gated by eval + human review' },
  { l: 'Sources governed', v: 6, s: SYSTEMS.join(' · ') },
  { l: 'Compliance posture', v: 'Partial', s: '6 passing · 2 warnings · 0 critical' },
];

export const CONTROLS = [
  { id: 'audit-log', name: 'Tamper-evident audit log', domain: 'Audit & Compliance', tier: 0, status: 'Passing', evidence: 'sha-256 hash-chain · 128 entries · 0 broken links', api: '/api/gm/audit/verify' },
  { id: 'worm', name: 'Immutable / WORM audit storage', domain: 'Audit & Compliance', tier: 0, status: 'Warning', evidence: 'in-memory (no external anchor) — no external anchor yet', api: '/api/gm/audit/verify' },
  { id: 'metadata-only', name: 'Metadata-only access (no row reads)', domain: 'Privacy', tier: 0, status: 'Passing', evidence: 'Connectors read schema/manifests and aggregate counts only', api: '/api/gm/sources/health' },
  { id: 'redaction', name: 'Input & output redaction on LLM calls', domain: 'Privacy', tier: 0, status: 'Passing', evidence: 'Prompts and completions redacted (email, card, NINO, numbers)', api: '/api/gm/ai/redaction' },
  { id: 'residency', name: 'UK / EU data residency', domain: 'Privacy', tier: 0, status: 'Warning', evidence: 'Region pinning declared (uk/eu) — not independently verified', api: '/api/gm/residency' },
  { id: 'rbac', name: 'RBAC deny-by-default', domain: 'Security', tier: 1, status: 'Passing', evidence: 'Group → role → clearance; modules gated, admin features restricted', api: '/api/gm/access/roles' },
  { id: 'classification', name: 'Sensitive-data classification', domain: 'Compliance', tier: 1, status: 'Passing', evidence: '36 of 37 assets carry a classification across 6 sources', api: '/api/gm/tiles/stats' },
  { id: 'dpia', name: 'DPIA / ROPA register', domain: 'Privacy', tier: 1, status: 'Not connected', evidence: 'No DPIA/ROPA evidence source connected in this prototype', api: null },
  { id: 'self-training', name: 'Self-training gate (eval + human review)', domain: 'Governance', tier: 2, status: 'Passing', evidence: 'Critic gate: no model/prompt change ships without evaluation and review', api: '/api/gm/ai/evaluation' },
];
export const TIER_LABEL = { 0: 'Tier 0 — immutable', 1: 'Tier 1 — operational', 2: 'Tier 2 — gated' };

export const TIERS = [
  { n: 0, name: 'Non-negotiable', state: 'immutable', d: 'Hard-coded safety and data-protection bounds no self-training loop may alter: metadata-only access, redaction, residency, tamper-evident audit.' },
  { n: 1, name: 'Operational', state: 'immutable', d: 'Helpfulness, honesty and least-privilege principles guiding day-to-day agent behaviour.' },
  { n: 2, name: 'Self-training gate', state: 'gated', d: 'Every proposed model or prompt change passes evaluation, red-team and human review before deployment.' },
];

export const EXPORTS = [['JSONLD', 'jsonld'], ['TURTLE', 'turtle'], ['OKF', 'okf']];

/* ------------------------------------------------------------------ audit trail (128 records) */
const GDPR = {
  retention: 'GDPR: A retention requirement applies to every asset holding personal data — no active retention requirement applies',
  steward: 'GDPR: Every asset holding personal data has a named steward — no steward assigned',
  ropa: 'GDPR: Every asset holding personal data appears in a record of processing — not in any accepted record of processing',
};
const RAISE_ASSETS = ['PRL.ORDER_MASTER', 'STG.CUSTOMER_ORDER', 'STG.CUSTOMER_ORDER_LIVE_RPLUS', 'API.GET_customers', 'API.GET_customers_customerId', 'S3_ENR.CUSTOMER_ORDERS', 'BI.Customer 360 Dashboard'];
export const AUDIT_CATEGORIES = ['AI evaluation', 'Data and metadata access', 'Data products', 'Data quality', 'Metadata changes', 'Model governance', 'Ownership and access', 'Policy actions', 'Other'];

function buildAudit() {
  const rows = [];
  const push = (min, sec, who, role, action, category, asset, what) => rows.push({ seq: rows.length + 1, ts: new Date(Date.UTC(2026, 9, 3, 9, 0, min * 60 + sec)), who, role, action, category, asset, what });
  push(21, 4, 'metadata-harvester', 'service', 'metadata.version', 'Metadata changes', 'estate', 'v12 → v13 (scheduled): 37 assets, 2 columns added');
  push(22, 30, 'residency-monitor', 'platform-ops', 'residency.check', 'Other', 'estate', 'residency-monitor checked 13 locations against “United Kingdom only”: 4 outside the policy');
  push(24, 10, 'scheduler', 'platform-ops', 'audit.verify', 'Other', 'estate', 'scheduler verified the audit chain: 3 record(s), 0 broken link(s)');
  [45, 60, 75, 90, 105].forEach((m) => {
    let s = 0;
    RAISE_ASSETS.forEach((a) => ['retention', 'steward', 'ropa'].forEach((k) => {
      push(m - 16, 45 + s++, 'ownership', 'service', 'ownership.quality.raise', 'Ownership and access', a, `scheduler: raised quality issue “${GDPR[k]}” → no steward`);
    }));
    push(m - 15, 6, 'ownership', 'service', 'ownership.quality.raise', 'Ownership and access', 'INT.CUSTOMER', `scheduler: raised quality issue “${GDPR.retention}” → Priya`);
    push(m - 15, 8, 'scheduler', '', 'gdpr.monitor', 'Policy actions', 'personal data', 'scheduler ran the personal-data handling rules: 150 checks, 82 failing, 22 issue(s) raised');
    push(m - 15, 30, 'scheduler', 'platform-ops', 'rbac.reconcile', 'Other', 'estate', 'scheduler reconciled 0 scope(s) across 6 platform(s): 0 checked, 0 missing in the platform, 0 not checkable');
    push(m - 14, 50, 'scheduler', 'platform-ops', 'amm.enforce', 'Other', 'estate', '25 control action(s) applied and 25 prepared for approval across 37 asset(s)');
  });
  return rows.reverse();
}
export const AUDIT = buildAudit();
/* write a new record to the hash-chained audit log (newest first); every page reading AUDIT sees it on its next render */
const auditListeners = new Set();
export function writeAudit(who, role, action, category, asset, what) {
  AUDIT.unshift({ seq: AUDIT.length + 1, ts: new Date(), who, role, action, category, asset, what });
  auditListeners.forEach((l) => l());
}
export const onAudit = (cb) => { auditListeners.add(cb); return () => auditListeners.delete(cb); };
export const fmtTs = (d) => d.toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London' });

export const FRAMEWORKS = [
  ['UK GDPR', 'Article 5(2) accountability', 'Demonstrate compliance with the principles', 'every policy, ownership and access action recorded with who and when', '115 policy, ownership and access record(s)'],
  ['UK GDPR', 'Article 30 records of processing', 'Maintain a record of processing activities', 'records of processing and their acceptance are in the trail', '5 record(s) of processing action(s)'],
  ['UK GDPR', 'Article 32 security of processing', 'Ensure confidentiality and integrity', 'access grants, revocations and refusals recorded; the log itself is hash-chained', '0 access record(s), 0 refusal(s) or breach(es)'],
  ['UK GDPR', 'Article 33 breach notification', 'Establish the facts of an incident quickly', 'investigation timeline per asset or person', 'investigation timeline available for every asset and person'],
  ['DPA 2018', 'Part 3 logging', 'Log access to and changes of personal data', 'data-access records name the person and the asset', '0 data-access record(s) naming the person and asset'],
  ['ISO/IEC 27001:2022', 'A.8.15 logging', 'Produce, keep and review event logs', 'append-only chain with verification on demand', '128 record(s), chain verified'],
  ['ISO/IEC 27001:2022', 'A.5.28 collection of evidence', 'Identify, collect and preserve evidence', 'audit-ready export with the chain verification attached', 'audit-ready pack exports the records with the verification attached'],
  ['NCSC CAF', 'C1 security monitoring', 'Monitor for policy violations and unusual activity', 'violations and anomalies dashboards', '0 violation(s) and the anomaly dashboard'],
  ['HMRC internal control framework', 'To be mapped with HMRC', 'Departmental control set', 'the mapping is configurable — add HMRC\'s own controls here', 'awaiting HMRC\'s control set'],
];

export const INTEGRITY_POINTS = [
  'every record hashes its own fields and the previous hash',
  'appending is refused if the chain no longer verifies',
  'records are never updated or deleted by the application',
  'verification runs on demand and in the audit report',
];

/* ------------------------------------------------------------------ model governance */
/* Snapshot of the old UI's Model governance registry (dev site, read 3 Oct 2026): six models, eight versions.
   Each version carries its own lineage, workflow path and history, exactly as the old UI shows them. */
const CVB = 's3://genmeta-demo-115795545015-eu-west-2/_genmeta/ml/customer-value-band';
const FEAT5 = 'account_balance ← S3_ENR.CUSTOMER_ORDERS.CUSTOMER_ACCOUNT_BALANCE (standard scaled); orders_to_date ← S3_ENR.CUSTOMER_SUMMARY.ORDER_COUNT (count of prior orders, standard scaled); order_month ← S3_ENR.CUSTOMER_ORDERS.ORDER_DATE (month of order date, standard scaled); segment ← S3_ENR.CUSTOMER_ORDERS.CUSTOMER_SEGMENT (one-hot encoded); order_priority ← S3_ENR.CUSTOMER_ORDERS.ORDER_PRIORITY (one-hot encoded)';
const FEAT6 = `${FEAT5}; nation ← S3_CLN.CUSTOMER.NATION_ID (nation name, one-hot encoded; also the protected-group attribute for bias checks)`;
const cvbLineage = ({ v, objv, nation, run, metrics, smv, mlv, art }) => [
  { stage: 'Source data', items: [
    { b: 'S3_ENR.CUSTOMER_ORDERS', ok: true }, { b: 'S3_ENR.CUSTOMER_SUMMARY', ok: true }, ...(nation ? [{ b: 'S3_CLN.CUSTOMER', ok: true }] : []),
  ] },
  { stage: 'Training data', items: [{ b: `${CVB}/training/${v}/train.csv`, s: `object version ${objv}; 1500 training rows` }] },
  { stage: 'Feature engineering', items: [{ b: `${nation ? 6 : 5} features`, s: nation ? FEAT6 : FEAT5 }] },
  { stage: 'Model development', items: [{ b: `training run ${run}`, s: `GradientBoostingClassifier (scikit-learn); ${metrics}` }] },
  { stage: 'Model version', items: [{ b: `customer-value-band ${v}`, s: `SageMaker ${smv} (Rejected) · MLflow ${mlv} · artefact ${CVB}/model/${art}/model.tar.gz` }] },
  { stage: 'Deployment', items: [{ b: 'Daily batch scoring', s: `${CVB}/inference/` }] },
  { stage: 'Inference', items: [{ b: '5 scoring batch(es)', s: '2026-09-15, 2026-09-16, 2026-09-17, 2026-09-18, 2026-09-19' }] },
];
const extLineage = (consumer, consumerSub, sent, provider, name, host, out) => [
  { stage: 'Consumer', items: [{ b: consumer || '—', s: consumerSub }] },
  { stage: 'Data sent', items: [sent ? { b: sent } : { b: 'Not recorded', muted: true }] },
  { stage: 'External model', items: [{ b: `${provider} · ${name}`, s: host }] },
  { stage: 'Output', items: [out ? { b: out } : { b: 'Not recorded', muted: true }] },
];
const EXT_PATH = ['Registered', 'Validation', 'Approval', 'In production'];
const CHECKS = ['Drift and bias results reviewed', 'Performance still acceptable', 'Continued business need confirmed'];
const H = (at, who, what) => ({ at, who, what });

export const MODELS = [
  {
    id: 'customer-value-band', name: 'customer-value-band', provider: '', foundIn: ['MLflow', 'SageMaker'], hosted: true, risk: 'Medium risk', owner: 'Customer Analytics Lead',
    monitoring: 'breach', alerts: 6, purpose: 'Predicts whether an order will fall in the HIGH value band.', usedBy: 'Customer analytics — daily batch scoring',
    versionRows: [
      { v: 'v1', reg: ['SageMaker · Rejected', 'MLflow v1'], acc: '0.924', auc: '0.7902', f1: '0.1364', stage: 'Retired', review: '—',
        path: ['Registered', 'Retired'], note: 'Retired at registration — superseded; F1 for HIGH 0.14 is too weak for use.',
        lineage: cvbLineage({ v: 'v1', objv: 'oJENTl1YM3p7Iju5_Z_Jbq.ZYor9Otzi', nation: true, run: '4ba272ecdf', metrics: 'accuracy=0.924, roc_auc=0.7902, f1_high=0.1364', smv: 'v1', mlv: 'v1', art: 'v1' }),
        history: [
          H('19 Sept 2026, 13:19', 'genmeta', 'SageMaker approval set to Rejected; MLflow tag genmeta_stage = retired'),
          H('19 Sept 2026, 13:19', 'Admin', 'Registered → Retired — Superseded; F1 for HIGH 0.14 is too weak for use'),
          H('19 Sept 2026, 13:15', 'discovery', 'Found in sagemaker'),
        ] },
      { v: 'v2', reg: ['SageMaker · Rejected', 'MLflow v2'], acc: '0.742', auc: '0.7821', f1: '0.5714', stage: 'Rejected', review: '—',
        path: ['Registered', 'Validation', 'Rejected'], note: 'Rejected at validation — bias assessment failed: nation (a protected attribute) is a model input.',
        lineage: cvbLineage({ v: 'v2', objv: 'UDJoVDfwctd5fs5SDITATHsrioUxo3N2', nation: true, run: '85d5cea1c7', metrics: 'accuracy=0.742, roc_auc=0.7821, f1_high=0.5714', smv: 'v2', mlv: 'v2', art: 'v2' }),
        history: [
          H('19 Sept 2026, 13:20', 'genmeta', 'SageMaker approval set to Rejected; MLflow tag genmeta_stage = rejected'),
          H('19 Sept 2026, 13:20', 'Data Engineer (validator)', 'Validation → Rejected — Bias assessment failed: nation (a protected attribute) is a model input'),
          H('19 Sept 2026, 13:20', 'Data Engineer (validator)', 'Completed: Performance validated on held-out data'),
          H('19 Sept 2026, 13:20', 'Admin', 'Registered → Validation'),
          H('19 Sept 2026, 13:20', 'Admin', 'Completed: Intended use and limits stated'),
          H('19 Sept 2026, 13:20', 'Admin', 'Completed: Accountable owner named'),
          H('19 Sept 2026, 13:20', 'Admin', 'Completed: Model card completed'),
          H('19 Sept 2026, 13:15', 'discovery', 'Found in sagemaker'),
        ] },
      { v: 'v4', reg: ['SageMaker · Rejected', 'MLflow v3 · @production'], acc: '0.862', auc: '0.9343', f1: '0.8034', stage: 'Retired', review: '18 Mar 2027',
        path: ['Registered', 'Validation', 'Approval', 'In production', 'Deprecated', 'Retired'], note: 'Retired by the lifecycle scheduler on 23 Sept 2026 — sunset date reached.',
        lineage: cvbLineage({ v: 'v4', objv: 'rcAVV5dMjjCyyYVnNNUOHV0kI_5I5SxN', nation: false, run: 'c894e5f849', metrics: 'accuracy=0.862, roc_auc=0.9343, f1_high=0.8034', smv: 'v4', mlv: 'v3', art: 'v3' }),
        history: [
          H('23 Sept 2026, 08:21', 'genmeta', 'SageMaker approval set to Rejected; MLflow write-back failed: HTTP Error 400: BAD REQUEST'),
          H('23 Sept 2026, 08:21', 'lifecycle scheduler', 'Deprecated → Retired — Sunset date 2026-09-23 reached'),
          H('23 Sept 2026, 08:20', 'genmeta', 'MLflow write-back failed: HTTP Error 400: BAD REQUEST'),
          H('23 Sept 2026, 08:20', 'Admin', 'In production → Deprecated — test'),
          H('21 Sept 2026, 08:10', 'Admin', 'Reopened: Drift and bias results reviewed'),
          H('21 Sept 2026, 08:10', 'Admin', 'Reopened: Performance still acceptable'),
          H('21 Sept 2026, 08:07', 'Admin', 'Completed: Performance still acceptable'),
          H('21 Sept 2026, 08:07', 'Admin', 'Completed: Drift and bias results reviewed'),
          H('21 Sept 2026, 07:26', 'Admin', 'Reopened: Continued business need confirmed'),
          H('21 Sept 2026, 07:26', 'Admin', 'Reopened: Performance still acceptable'),
          H('21 Sept 2026, 07:26', 'Admin', 'Reopened: Drift and bias results reviewed'),
          H('21 Sept 2026, 07:26', 'Admin', 'Completed: Continued business need confirmed'),
          H('21 Sept 2026, 07:26', 'Admin', 'Completed: Performance still acceptable'),
          H('21 Sept 2026, 07:26', 'Admin', 'Completed: Drift and bias results reviewed'),
          H('21 Sept 2026, 07:26', 'Admin', 'Completed: Drift and bias results reviewed'),
          H('19 Sept 2026, 13:20', 'genmeta', 'SageMaker approval set to Approved; MLflow alias “production” set; MLflow tag genmeta_stage = approved'),
          H('19 Sept 2026, 13:20', 'Admin', 'Approval → In production — Accuracy 0.862, F1 0.803, AUC 0.934; nation excluded; DPIA screened'),
          H('19 Sept 2026, 13:20', 'Admin', 'Completed: Model risk sign-off'),
          H('19 Sept 2026, 13:20', 'Admin', 'Completed: UK GDPR Article 22 assessment'),
          H('19 Sept 2026, 13:20', 'Admin', 'Completed: DPIA screening completed'),
          H('19 Sept 2026, 13:20', 'Data Engineer (validator)', 'Validation → Approval'),
          H('19 Sept 2026, 13:20', 'Data Engineer (validator)', 'Completed: Independent validator (not the developer)'),
          H('19 Sept 2026, 13:20', 'Data Engineer (validator)', 'Completed: Explainability reviewed'),
          H('19 Sept 2026, 13:20', 'Data Engineer (validator)', 'Completed: Bias assessed across protected groups'),
          H('19 Sept 2026, 13:20', 'Data Engineer (validator)', 'Completed: Performance validated on held-out data'),
          H('19 Sept 2026, 13:20', 'Admin', 'Registered → Validation'),
          H('19 Sept 2026, 13:20', 'Admin', 'Completed: Intended use and limits stated'),
          H('19 Sept 2026, 13:20', 'Admin', 'Completed: Accountable owner named'),
          H('19 Sept 2026, 13:20', 'Admin', 'Completed: Model card completed'),
          H('19 Sept 2026, 13:15', 'discovery', 'Found in sagemaker'),
        ] },
    ],
  },
  {
    id: 'claude-sonnet-5', name: 'Claude Sonnet 5', provider: 'Anthropic', foundIn: ['External'], risk: 'Medium risk', owner: '', monitoring: 'not monitored', alerts: 0,
    purpose: 'Answers natural-language questions in Ask GenMeta', usedBy: 'GenMeta · Ask GenMeta',
    versionRows: [{ v: 'vclaude-sonnet-5', reg: ['External · Anthropic API (external service)'], acc: '—', auc: '—', f1: '—', stage: 'In production', review: '18 Mar 2027', path: EXT_PATH,
      note: 'Periodic review due 18 Mar 2027 (every 180 days). · signed off by governance-lead · you are governance-lead',
      lineage: extLineage('GenMeta · Ask GenMeta', 'Answers natural-language questions in Ask GenMeta', 'Catalogue metadata only — no row-level data; sensitive columns withheld by role', 'Anthropic', 'Claude Sonnet 5', 'Anthropic API (external service)', 'Written answers with cited catalogue assets'),
      history: [H('19 Sept 2026, 13:15', 'discovery', 'Found in External')] }],
  },
  {
    id: 'gpt-41-test', name: 'GPT-4.1 (test entry)', provider: 'OpenAI', foundIn: ['External'], risk: 'Low risk', owner: '', monitoring: 'not monitored', alerts: 0,
    purpose: 'Test of external model governance', usedBy: 'Test',
    versionRows: [{ v: 'v2025-04-14', reg: ['External · OpenAI API'], acc: '—', auc: '—', f1: '—', stage: 'Retired', review: '19 Sept 2027', path: [...EXT_PATH, 'Deprecated', 'Retired'],
      note: 'Retired on 19 Sept 2026 after deprecation (test).',
      lineage: extLineage('Test', 'Test of external model governance', 'None', 'OpenAI', 'GPT-4.1 (test entry)', 'OpenAI API', ''),
      history: [
        H('19 Sept 2026, 13:36', 'Admin', 'Deprecated → Retired — Test: retire after deprecation'),
        H('19 Sept 2026, 13:36', 'Admin', 'In production → Deprecated — Test: deprecation of an external AI model'),
        H('19 Sept 2026, 13:36', 'discovery', 'Found in External'),
      ] }],
  },
  {
    id: 'gemini-25-test', name: 'Gemini 2.5 Pro (test entry)', provider: 'Google', foundIn: ['External'], risk: 'Low risk', owner: '', monitoring: 'not monitored', alerts: 1,
    purpose: 'Test of external model deprecation', usedBy: 'Test',
    versionRows: [{ v: 'v2.5-pro', reg: ['External · Google Vertex AI'], acc: '—', auc: '—', f1: '—', stage: 'Retired', review: '19 Sept 2027', path: [...EXT_PATH, 'Deprecated', 'Retired'],
      note: 'Retired by the lifecycle scheduler on 19 Sept 2026 — sunset date reached; replaced by Claude Sonnet 5.',
      lineage: extLineage('Test', 'Test of external model deprecation', 'None', 'Google', 'Gemini 2.5 Pro (test entry)', 'Google Vertex AI', ''),
      history: [
        H('19 Sept 2026, 14:47', 'lifecycle scheduler', 'Deprecated → Retired — Sunset date 2026-09-19 reached'),
        H('19 Sept 2026, 14:47', 'Admin', 'In production → Deprecated — Test: provider model superseded'),
        H('19 Sept 2026, 14:47', 'discovery', 'Found in External'),
      ] }],
  },
  {
    id: 'a', name: 'a', provider: 'a', foundIn: ['External'], risk: 'High risk', owner: '', monitoring: 'not monitored', alerts: 0,
    purpose: 'a', usedBy: 'a',
    versionRows: [{ v: 'va', reg: ['External ·'], acc: '—', auc: '—', f1: '—', stage: 'Retired', review: '20 Dec 2026', path: [...EXT_PATH, 'Retired'],
      note: 'Retired on 21 Sept 2026.',
      lineage: extLineage('a', '', '', 'a', 'a', '', ''),
      history: [H('21 Sept 2026, 07:32', 'Admin', 'In production → Retired'), H('21 Sept 2026, 07:30', 'discovery', 'Found in External')] }],
  },
  {
    id: 'gpt-41', name: 'GPT-4.1', provider: 'OpenAI', foundIn: ['External'], risk: 'Medium risk', owner: '', monitoring: 'not monitored', alerts: 0,
    purpose: 'TEST_USE', usedBy: 'KARAN_TEAM',
    versionRows: [{ v: 'v1.1', reg: ['External · AMAZON WEB'], acc: '—', auc: '—', f1: '—', stage: 'In production', review: '1 Jan 2027', path: EXT_PATH,
      note: 'Periodic review due 1 Jan 2027 (every 180 days). · signed off by governance-lead · you are governance-lead',
      lineage: extLineage('KARAN_TEAM', 'TEST_USE', 'PERSONAL DATA', 'OpenAI', 'GPT-4.1', 'AMAZON WEB', ''),
      history: [H('3 Oct 2026, 14:07', 'discovery', 'Found in External')] }],
  },
].map((m) => ({ ...m, checks: CHECKS, versions: m.versionRows.length, stage: m.versionRows[m.versionRows.length - 1].stage }));

/* Alerts per model, as the old UI lists them (classifier drift alerts belong to AI evaluation). */
const AL = (model, v, sev, title, at, state, what, extra) => ({ id: `${model}-${at}-${title}`, model, v, sev, title, at, state, what, extra });
export const MODEL_ALERTS = [
  AL('customer-value-band', 'v4', 'warn', 'Model version retired at sunset', '23 Sept 2026, 08:22', 'open', 'v4 reached its sunset date 2026-09-23 and was retired; use v3 instead.', 'email sent'),
  AL('customer-value-band', 'v4', 'breach', 'Unequal treatment of nation = France', '19 Sept 2026, 13:15', 'ack', "Of orders that really were HIGH, the model scored 1% of France's correctly against 85% for Germany (gap 84%, p=0.0).", 'email sent · batch 2026-09-19'),
  AL('customer-value-band', 'v4', 'breach', 'Bias against nation = France', '19 Sept 2026, 13:15', 'open', 'France receives HIGH at 0% against 41% for Netherlands (disparate impact 0.0115, p=0.0).', 'email sent · batch 2026-09-19'),
  AL('customer-value-band', 'v4', 'breach', 'Data drift on account_balance', '19 Sept 2026, 13:15', 'open', 'The scoring batch of 2026-09-19 has drifted from the training data on account_balance (PSI 0.3385).', 'email sent · batch 2026-09-19'),
  AL('customer-value-band', 'v4', 'breach', 'Model drift in predictions', '19 Sept 2026, 13:15', 'open', 'Share predicted HIGH moved from 35% at training to 72% (prediction PSI 0.5948).', 'email sent · batch 2026-09-18'),
  AL('customer-value-band', 'v4', 'breach', 'Data drift on orders_to_date', '19 Sept 2026, 13:15', 'open', 'The scoring batch of 2026-09-18 has drifted from the training data on orders_to_date (PSI 0.4341).', 'email sent · batch 2026-09-18'),
  AL('gemini-25-test', 'v2.5-pro', 'warn', 'Model version retired at sunset', '19 Sept 2026, 14:47', 'open', 'v2.5-pro reached its sunset date 2026-09-19 and was retired; use Claude Sonnet 5 instead.', 'email sent'),
];
export const ALERT_RECIPIENTS = [['venkat.abburi@rplusanalytics.com', 'confirmed']];

/* Monitoring & guardrails for hosted models (only customer-value-band is hosted). */
export const MODEL_MONITORING = {
  'customer-value-band': {
    deployed: 'v4', baseline: 500, batches: [
      ['15 Sept 2026', 1000, 0.028, 'order_month', 0.002, 33, 0.91, 'UK', 0.95586, null, null, 'ok'],
      ['16 Sept 2026', 1000, 0.038, 'account_balance', 0.006, 38, 0.82, 'Netherlands', 0.65827, null, null, 'ok'],
      ['17 Sept 2026', 1000, 0.038, 'account_balance', 0.004, 38, 0.77, 'Netherlands', 0.13835, null, null, 'ok'],
      ['18 Sept 2026', 1000, 0.434, 'orders_to_date', 0.595, 72, 0.93, 'Netherlands', 0.72082, 2, 'UK · p 0.81876', 'breach'],
      ['19 Sept 2026', 1000, 0.339, 'account_balance', 0.018, 28, 0.01, 'France', 0, null, null, 'breach'],
    ],
    trainingHigh: 35,
    byNation: [['Germany', 37], ['UK', 36], ['Ireland', 32], ['France', 0]],
    guardrails: [
      ['Data drift (feature PSI)', 0.1, 0.25, 'above'],
      ['Model drift (prediction PSI)', 0.1, 0.2, 'above'],
      ['Bias — disparate impact ratio (lowest ÷ highest)', 0.85, 0.8, 'below'],
      ['Bias — positive-rate gap between groups', 0.1, 0.2, 'above'],
      ['Bias — equal opportunity gap (share of true HIGH orders each group is given)', 0.1, 0.2, 'above'],
    ],
    onBreach: 'alert_and_hold', email: 'warn', confidence: '0.05', minGroup: 100,
  },
};
export const DISCOVERY = [['SageMaker', '1 model(s), 3 version(s)'], ['MLflow', '1 model(s), 3 version(s)'], ['External AI', '5']];
export const RISK_TIERS = [
  ['High risk', 'Models that inform decisions about individuals or money.', 90, 2],
  ['Medium risk', 'Models that support, but do not make, decisions about individuals.', 180, 1],
  ['Low risk', 'Internal analytics with no effect on individuals.', 365, 1],
];

/* ------------------------------------------------------------------ AI evaluation */
export const EVAL_METRICS = [
  ['Accuracy', '70.5%'], ['Precision', '38.0%'], ['Recall', '51.9%'], ['F1', '43.9%'], ['False-positive rate', '24.2%'], ['False-negative rate', '48.1%'],
];
export const EVAL_CONFUSION = { tp: 27, fn: 25, fp: 44, tn: 138 };
export const EVAL_CATEGORIES = [['PII', 40, 27, '55.6%', '37.5%'], ['FINANCIAL', 12, 30, '40.0%', '100.0%'], ['NONE', 182, 163, '84.7%', '75.8%']];
export const EVAL_BANDS = [['0.50–0.70', 30, '40.0%'], ['0.70–0.85', 39, '33.3%'], ['0.85–0.95', 0, '—'], ['0.95–1.00', 2, '100.0%']];
export const EVAL_THRESHOLDS = [
  ['0.5 (best F1)', '38.0%', '51.9%', '43.9%', '24.2%', '48.1%'], ['0.6', '38.0%', '51.9%', '43.9%', '24.2%', '48.1%'],
  ['0.7', '36.6%', '28.8%', '32.3%', '14.3%', '71.2%'], ['0.8', '100.0%', '3.9%', '7.4%', '0.0%', '96.2%'],
  ['0.9', '100.0%', '3.9%', '7.4%', '0.0%', '96.2%'], ['0.95', '100.0%', '3.9%', '7.4%', '0.0%', '96.2%'],
];
export const EVAL_RUNS = [['3 Oct 2026, 10:27', 'scheduler', 'b2df5aece0', '234 / 267', '38.0%', '51.9%', '43.9%', '0', 'ok']];
export const LABELS = ['PII', 'SPECIAL_CATEGORY', 'HMRC', 'FINANCIAL', 'CREDENTIAL', 'NONE'];
/* [column, asset, classifier says, confidence, current label] — where the classifier disagrees with the reviewed label */
const R = (c, a, p, conf, l) => ({ c, a, p, conf, l });
const N = (c, a) => R(c, a, 'NONE', null, 'PII');
const COM = (c, a) => R(c, a, 'COMMERCIAL', 0.75, 'NONE');
const FIN = (c, a) => R(c, a, 'FINANCIAL', 0.6, 'NONE');
const PER = (c, a) => R(c, a, 'PII', 0.7, 'NONE');
export const REVIEW_ROWS = [
  N('CUSTOMER_ID', 'INT.CUSTOMER'), COM('SEGMENT', 'INT.CUSTOMER'), FIN('EXTENDED_PRICE', 'INT.LINEITEM'), PER('NATION_NAME', 'INT.NATION'),
  N('CUSTOMER_ID', 'INT.ORDERS'), FIN('TOTAL_AMOUNT', 'INT.ORDERS'), PER('PART_NAME', 'INT.PART'), FIN('RETAIL_PRICE', 'INT.PART'), PER('SUPPLIER_NAME', 'INT.SUPPLIER'),
  N('CUSTOMER_ID', 'PRL.ORDER_MASTER'), COM('CUSTOMER_SEGMENT', 'PRL.ORDER_MASTER'), N('CUSTOMER_VALUE_CATEGORY', 'PRL.ORDER_MASTER'), PER('NATION_NAME', 'PRL.ORDER_MASTER'),
  FIN('ORDER_TOTAL_AMOUNT', 'PRL.ORDER_MASTER'), FIN('MAX_RETAIL_PRICE', 'PRL.ORDER_MASTER'), PER('SAMPLE_SUPPLIER_NAME', 'PRL.ORDER_MASTER'),
  N('CUSTOMER_ID', 'SRC.CUSTOMER'), COM('SEGMENT', 'SRC.CUSTOMER'), FIN('EXTENDED_PRICE', 'SRC.LINEITEM'), PER('NATION_NAME', 'SRC.NATION'),
  N('CUSTOMER_ID', 'SRC.ORDERS'), FIN('TOTAL_AMOUNT', 'SRC.ORDERS'), PER('PART_NAME', 'SRC.PART'), FIN('RETAIL_PRICE', 'SRC.PART'), PER('SUPPLIER_NAME', 'SRC.SUPPLIER'),
  N('CUSTOMER_ID', 'STG.CUSTOMER_ORDER'), COM('CUSTOMER_SEGMENT', 'STG.CUSTOMER_ORDER'), N('CUSTOMER_VALUE_CATEGORY', 'STG.CUSTOMER_ORDER'), PER('NATION_NAME', 'STG.CUSTOMER_ORDER'), FIN('ORDER_TOTAL_AMOUNT', 'STG.CUSTOMER_ORDER'),
  N('CUSTOMER_ID', 'STG.CUSTOMER_ORDER_LIVE_RPLUS'), COM('CUSTOMER_SEGMENT', 'STG.CUSTOMER_ORDER_LIVE_RPLUS'), N('CUSTOMER_VALUE_CATEGORY', 'STG.CUSTOMER_ORDER_LIVE_RPLUS'), PER('NATION_NAME', 'STG.CUSTOMER_ORDER_LIVE_RPLUS'), FIN('ORDER_TOTAL_AMOUNT', 'STG.CUSTOMER_ORDER_LIVE_RPLUS'),
  FIN('MAX_RETAIL_PRICE', 'STG.ORDER_ITEM_SUMMARY'), PER('SAMPLE_SUPPLIER_NAME', 'STG.ORDER_ITEM_SUMMARY'),
  N('CUSTOMER_ID', 'STREAMING.customer-value'), COM('SEGMENT', 'STREAMING.customer-value'),
  N('CUSTOMER_ID', 'S3_RAW.CUSTOMER'), COM('SEGMENT', 'S3_RAW.CUSTOMER'), N('CUSTOMER_ID', 'S3_RAW.ORDERS'), FIN('TOTAL_AMOUNT', 'S3_RAW.ORDERS'),
  N('CUSTOMER_ID', 'S3_CLN.CUSTOMER'), COM('SEGMENT', 'S3_CLN.CUSTOMER'), N('CUSTOMER_ID', 'S3_CLN.ORDERS'), FIN('TOTAL_AMOUNT', 'S3_CLN.ORDERS'),
  N('CUSTOMER_ID', 'S3_ENR.CUSTOMER_ORDERS'), FIN('TOTAL_AMOUNT', 'S3_ENR.CUSTOMER_ORDERS'), COM('CUSTOMER_SEGMENT', 'S3_ENR.CUSTOMER_ORDERS'),
  N('CUSTOMER_ID', 'S3_ENR.CUSTOMER_SUMMARY'), COM('SEGMENT', 'S3_ENR.CUSTOMER_SUMMARY'), FIN('TOTAL_ORDER_AMOUNT', 'S3_ENR.CUSTOMER_SUMMARY'),
  N('CUSTOMER_ID', 'BI.Customer 360 Dashboard'), COM('CUSTOMER_SEGMENT', 'BI.Customer 360 Dashboard'), FIN('TOTAL_AMOUNT', 'BI.Order Revenue Report'), PER('SUPPLIER_NAME', 'BI.Supplier Performance'),
  N('CUSTOMER_ID', 'BI.Customer Churn Analysis'), N('CHURN_RISK', 'BI.Customer Churn Analysis'), COM('segment', 'API.GET_customers'),
];
export const REVIEW_SOURCE = 'reviewed set · R+ build team (initial reviewed label set)';
export const DRIFT_NOTE = 'Now: prediction-mix PSI vs baseline 0 (warn 0.1, breach 0.25) · F1 change vs previous run 0 (alert below −0.05) · label coverage 87.6% (alert below 80.0%) · ok. Runs are recorded on every harvest that changes the estate, labels or rules; alerts go to AI model governance › Alerts.';

/* ------------------------------------------------------------------ residency & sovereignty */
export const RESIDENCY_TILES = [
  { l: 'Residency policy', v: 'United Kingdom only', s: '7 allowed region(s)' },
  { l: 'Locations in the register', v: 13, s: '1 measured · 7 configured · 1 declared' },
  { l: 'Outside the policy', v: 4, s: '7 in the United Kingdom' },
  { l: 'Overrides recorded', v: 0, s: 'each with a reason and an author' },
];
export const RESIDENCY_PROFILES = {
  uk: { label: 'United Kingdom only', d: 'Data and metadata stay in UK regions. Anything else is a breach.', allowed: ['aws-eu-west-2', 'azure-uksouth', 'eu-west-2', 'europe-west2', 'uk-london-1', 'uksouth', 'ukwest'] },
  eu: { label: 'UK and the EU data boundary', d: 'Data and metadata stay in UK or EU regions. Transfers outside the boundary need a lawful basis and an override.', allowed: ['eu-west-2', 'eu-west-1', 'eu-central-1', 'uksouth', 'ukwest', 'westeurope', 'northeurope', 'europe-west2'] },
};
const NOTM = 'configuration (not measured: An error occurred (AccessDenied) when calling the GetBucketLocation operation)';
export const LOCATIONS = [
  ['GenMeta application', 'processing · Metadata only; no row-level data is stored.', 'AWS ECS Fargate', 'eu-west-2', 'United Kingdom', 'configuration (the task\'s region)', 'inside'],
  ['Authored documents (genmeta-demo-115795545015-eu-west-2)', 'metadata store · Glossary, policies, classifications, access records.', 'Amazon S3', 'eu-west-2', 'United Kingdom', NOTM, 'inside'],
  ['Object versions of genmeta-demo-115795545015-eu-west-2', 'backup · Backups live in the same bucket and therefore the same region.', 'Amazon S3', 'eu-west-2', 'United Kingdom', NOTM, 'inside'],
  ['Source credentials', 'secrets · Passwords and tokens for sources added from the screen.', 'AWS Secrets Manager', 'eu-west-2', 'United Kingdom', 'configuration', 'inside'],
  ['Application logs', 'logs · Request logs; no row-level data.', 'Amazon CloudWatch Logs', 'eu-west-2', 'United Kingdom', 'configuration', 'inside'],
  ['Generative steps (glossary drafting, extraction, Ask)', 'processing · Metadata only is sent, redacted before and after. Refused by the policy: the residency policy is “United Kingdom only” and the generative steps run on Anthropic API (api.anthropic.com). Switch the policy to the EU data boundary, record an override, or set GENMETA_LLM=off.', 'Anthropic API', 'outside the UK', 'outside the UK and EU', 'configuration (GENMETA_LLM)', 'disclosed'],
  ['Static assets at the edge', 'delivery · JavaScript and images only — no metadata or data is cached.', 'Amazon CloudFront', 'global edge', 'outside the UK and EU', 'declared', 'disclosed'],
  ['Rplus_DWH', 'source · 16 catalogued asset(s)', 'Snowflake', 'eu-west-2', 'United Kingdom', 'measured with CURRENT_REGION() (AWS_EU_WEST_2)', 'inside'],
  ['Rplus Amazon S3', 'source · 6 catalogued asset(s)', 'Amazon S3', 'eu-west-2', 'United Kingdom', NOTM, 'inside'],
  ['SQL Server', 'source · 6 catalogued asset(s)', 'external service', 'not stated', 'no region established', 'not stated', 'outside'],
  ['Rplus Reports (Power BI)', 'source · 4 catalogued asset(s)', 'Microsoft Power BI', 'not stated', 'no region established', 'tenant region not published to the catalogue', 'outside'],
  ['Rplus API (Rest API)', 'source · 4 catalogued asset(s)', 'external service', 'not stated', 'no region established', 'not stated', 'outside'],
  ['Rplus Streaming (Confluent)', 'source · 1 catalogued asset(s)', 'Confluent Cloud', 'not stated', 'no region established', 'not reported by the Schema Registry', 'outside'],
];
export const MOVEMENT = [
  ['Cross-region replication of the document store', 'off', 'measured with GetBucketReplication', 'within the policy'],
  ['Versioning (the backup of authored documents)', 'not established', 'could not be read: An error occurred (AccessDenied) when calling the GetBucketVersioning operation', 'needs a decision'],
  ['Copies of source data', 'none — GenMeta reads metadata and never copies rows', 'by design: connectors read structure only', 'within the policy'],
  ['Access from outside the United Kingdom', 'refused for classified data', 'the access rule “Classified data is not shown outside the UK” (3.16)', 'within the policy'],
  ['Generative processing', 'Anthropic API (api.anthropic.com)', 'configuration (GENMETA_LLM)', 'needs a decision'],
];
const OUTSIDE = 'SQL Server, Rplus Reports (Power BI), Rplus API (Rest API), Rplus Streaming (Confluent)';
export const OBLIGATIONS = [
  ['UK GDPR', 'Personal data processed lawfully, and kept no longer than necessary, within the agreed territory.', 'Personal-data map, lawful basis per activity and the retention rules (3.12); residency checks on every harvest.', 'evidenced', ''],
  ['Data Protection Act 2018', 'Accountability: records of processing, assessments and an auditable history.', 'ROPA and DPIA workflow (3.13) and the hash-chained audit trail (3.14).', 'evidenced', ''],
  ['EU GDPR (where EU data is in scope)', 'Transfers outside the boundary only on a lawful basis.', 'The residency register names every location; a transfer outside the profile is refused.', 'breach recorded', OUTSIDE],
  ['HMRC UK residency and sovereignty', 'HMRC data and metadata stored, processed and backed up in the United Kingdom.', 'This register, measured from the providers, checked against the policy on every harvest.', 'breach recorded', OUTSIDE],
  ['Sovereign operation', 'The Supplier can say who can reach the data, from where.', 'Access control and RBAC (3.16), including the rule that refuses classified data outside the UK.', 'evidenced', ''],
];
export const CANNOT_CONTROL = [
  ['Generative processing', 'Anthropic API (api.anthropic.com)', 'Processes outside the United Kingdom. Metadata only is sent, redacted before and after; it can be switched to AWS Bedrock in London or off entirely.', 'GENMETA_LLM=bedrock | api | off'],
  ['Static asset delivery', 'Amazon CloudFront edge locations', 'JavaScript, CSS and images are cached at edges worldwide. No metadata, no data and no credentials pass through the cache.', 'the distribution can be restricted to UK edges'],
  ['Where people sign in from', 'the user\'s own browser', 'A signed-in person can be anywhere. Classified data is refused outside the United Kingdom by the access rule, and the attempt is audited.', '3.16 access rules'],
  ['SaaS platforms in the estate', 'Snowflake, Confluent Cloud, Power BI, Databricks', 'Their region is set by the customer\'s own tenancy. GenMeta measures it where the platform publishes it and records it as declared where it does not.', 'the register names the method for each'],
  ['Regions that are declared rather than measured', '1 location(s)', 'A declared region is the operator\'s statement, not something GenMeta verified. Each one is marked as such in the register.', 'declare a region, or connect the platform so it can be measured'],
  ['Backups', 'object versioning in the same bucket', 'Backups of authored documents live in the same region as the store. There is no cross-region copy unless replication is switched on, which the register checks.', 'bucket replication configuration'],
  ['Locations with no region established', 'Generative steps (glossary drafting, extraction, Ask), Static assets at the edge, SQL Server, Rplus Reports (Power BI), Rplus API (Rest API)', 'GenMeta could neither measure nor read a region for these. They are reported rather than assumed compliant.', 'declare the region, or connect the platform'],
];

/* ------------------------------------------------------------------ policies */
export const POLICY_TYPES = ['policy', 'standard', 'control', 'obligation', 'retention'];
export const POLICY_TYPE_LABEL = { policy: 'Policies', standard: 'Standards', control: 'Controls', obligation: 'Regulatory obligations', retention: 'Retention requirements' };
const HMRC_REC = 'hmrc-records-and-information-collection-policy.html';
const HMRC_RET = 'records-management-and-retention-and-disposal-policy.html';
const ICO = 'ICO-principles-storage-limitation.pdf';
const P = (id, type, title, statement, regulation, owner, severity, source, extra = {}) => ({ id, type, title, statement, regulation, owner, severity, status: 'active', source, applies: {}, inherit: false, links: [], ...extra });
export const POLICY_ITEMS = [
  P('pol-hmrc-data-protection-and-records-policy', 'policy', 'HMRC data protection and records policy', 'Personal and taxpayer data is collected, used, kept and disposed of lawfully, securely and only as long as needed.', 'UK GDPR; DPA 2018; Public Records Act 1958', 'Data Protection Officer', 'medium', null),
  P('pol-periodic-policy-review', 'policy', 'Periodic Policy review', 'This Policy will be formally reviewed at least every 3 years by the Departmental Records Officer to ensure alignment with national or local guidelines, standards or best practice.', '', '', 'medium', [HMRC_RET, 1]),
  P('sta-data-documentation-standard', 'standard', 'Data documentation standard', 'Every data asset is described and stewarded.', '', 'Chief Data and Analytics Officer', 'medium', null, { links: [['implements', 'pol-hmrc-data-protection-and-records-policy']] }),
  P('sta-data-minimisation', 'standard', 'Data minimisation - adequate, relevant, limited', 'Personal information handled by an organisation must be adequate, relevant and limited to what is necessary for the purposes for which it is used.', 'Article 5 UK GDPR, principle (c)', '', 'medium', [ICO, 4]),
  P('con-assets-carry-a-business-description', 'control', 'Assets carry a business description', 'Each governed asset has a business description.', '', '', 'medium', null, { check: 'description_present', links: [['implements', 'sta-data-documentation-standard']] }),
  P('con-personal-data-has-a-retention-requirement', 'control', 'Personal data has a retention requirement', 'Every asset holding personal data is covered by a retention requirement.', '', '', 'high', null, { check: 'retention_defined', applies: { classifications: ['PII'] }, inherit: true, links: [['implements', 'pol-hmrc-data-protection-and-records-policy'], ['satisfies', 'ret-default-hmrc-record-retention-period']] }),
  P('con-sensitive-assets-meet-minimum-quality', 'control', 'Sensitive assets meet minimum quality', 'Assets with restricted data meet quality 60.', '', '', 'high', null, { check: 'quality_min · 60', applies: { sensitivity: ['Restricted'] }, links: [['implements', 'pol-hmrc-data-protection-and-records-policy']] }),
  P('obl-annual-review-of-retention-periods', 'obligation', 'Annual review of retention periods', 'Business areas must review the retention periods of their records annually, in line with their Retention and Disposal Schedule, to identify records that have reached the end of their retention period.', '', '', 'medium', [HMRC_REC, 1], { retention: '1 year · annual review cycle per Retention and Disposal Schedule · review or destroy' }),
  P('obl-appraisal-report-requirement', 'obligation', 'Appraisal Report requirement', 'Each business area must develop, maintain and publish a high-level Appraisal Report internally, signed off by the Departmental Records Officer, to identify records of ongoing administrative, legal or fiscal value.', '', '', 'medium', [HMRC_REC, 1]),
  P('obl-justification-required-for-extended-retention', 'obligation', 'Justification required for extended retention', 'Records may only be retained beyond the default HMRC retention period if their continued retention can be justified for statutory, regulatory, legal or security reasons or for their historic value, and such periods must be documented in the business area\'s Retention and Disposal Schedule.', '', '', 'medium', [HMRC_REC, 1]),
  P('obl-legal-hold-notification-duty', 'obligation', 'Legal hold notification duty', 'Employees must immediately notify the Departmental Records Officer if they have been notified of, or reasonably anticipate, a litigation, investigation or inquiry, as this may require records to be held beyond their normal retention period.', '', '', 'medium', [HMRC_REC, 1]),
  P('obl-personal-data-storage-limitation', 'obligation', 'Personal data storage limitation', 'Personal data processed by HMRC must not be retained for longer than is necessary for its lawful purpose, subject to exemptions such as archiving, research or statistical purposes.', 'Data Protection Act 2018 (UK GDPR)', '', 'medium', [HMRC_REC, 1]),
  P('obl-removal-of-publicly-named-individuals', 'obligation', 'Removal of publicly named individuals from GOV.UK and archives', 'Where legislation allows HMRC to publicly name individuals or companies (e.g. tax avoidance scheme promoters), HMRC has a duty to remove names from both the live GOV.UK site and the archives once the stipulated time period has elapsed.', '', '', 'medium', [HMRC_REC, 1]),
  P('obl-storage-limitation-for-personal-data', 'obligation', 'Storage limitation for personal data', 'Personal data processed by HMRC must not be retained for longer than is necessary for its lawful purpose.', 'UK GDPR; DPA 2018', '', 'medium', [HMRC_RET, 1], { links: [['supports', 'pol-hmrc-data-protection-and-records-policy']] }),
  P('obl-transfer-of-historic-records', 'obligation', 'Transfer of historic records to The National Archives', 'HMRC has a legal requirement to transfer records of historic interest to The National Archives within 20 years from the date the record was closed or last viewed/modified.', 'Public Records Act 1958', '', 'medium', [HMRC_REC, 1], { retention: '20 years · date the record was closed or last viewed/modified · review or destroy' }),
  P('ret-default-hmrc-record-retention-period', 'retention', 'Default HMRC record retention period', 'The default retention period for HMRC records is 6 years after the last entry in a record, plus the current accounting year, before first review or destruction.', '', '', 'medium', [HMRC_RET, 1], { retention: '6 years · last entry in a record (plus current accounting year) · review or destroy', applies: { classifications: ['PII', 'FINANCIAL'] }, inherit: false }),
  P('ret-maximum-retention-for-historic-records', 'retention', 'Maximum retention for records of historic value', 'Records identified as having historic value may be retained for a maximum of 20 years after the last entry, plus one additional calendar year for final review and transfer or disposal.', '', '', 'medium', [HMRC_REC, 1], { retention: '20 years · last entry in the record, plus 1 calendar year for final review and transfer/disposal · review or destroy' }),
  P('ret-storage-limitation-retention-policy', 'retention', 'Storage limitation - retention policy required', 'Organisations must not keep personal information longer than needed, must justify how long they hold it, and must have a retention policy including standard retention periods set out in their privacy information.', 'Article 5 UK GDPR, principle (e)', '', 'medium', [ICO, 7]),
];
export const DOCUMENTS = [
  { name: HMRC_REC, from: 'https://www.gov.uk/government/publications/hmrc-records-and-information-collection-policy', pages: 1, extracted: 9, added: '23 Sept 2026' },
  { name: HMRC_RET, from: 'https://www.gov.uk/government/publications/records-management-and-retention-and-disposal-policy', pages: 1, extracted: 4, added: '23 Sept 2026' },
  { name: ICO, from: 'upload', pages: 9, extracted: 2, added: '19 Sept 2026' },
];
export const EXTRACTED_PENDING = [
  { req: 'Records containing personal data must be destroyed securely at the end of their retention period.', type: 'obligation', src: [HMRC_RET, 1], retention: 'End of retention period · secure destruction' },
  { req: 'Each business area maintains a Retention and Disposal Schedule reviewed by the Departmental Records Officer.', type: 'control', src: [HMRC_REC, 1], retention: '' },
];
/* what "Scan document repository" finds the first time it runs (test data) */
export const REPO_SCAN = {
  doc: { name: 'hmrc-tax-records-retention-guidance.pdf', from: 'SharePoint › Records management › Guidance', pages: 6, extracted: 3, added: '4 Oct 2026' },
  rows: [
    { req: 'VAT records must be kept for at least 6 years from the end of the VAT period they relate to.', type: 'retention', src: ['hmrc-tax-records-retention-guidance.pdf', 2], retention: '6 years · end of the VAT period · review or destroy' },
    { req: 'PAYE and payroll records must be kept for 3 years from the end of the tax year they relate to.', type: 'retention', src: ['hmrc-tax-records-retention-guidance.pdf', 3], retention: '3 years · end of the tax year · destroy' },
    { req: 'Customer identity evidence collected at registration is kept only while the account is open, plus 1 year.', type: 'obligation', src: ['hmrc-tax-records-retention-guidance.pdf', 5], retention: 'Account closed + 1 year · keep after purpose fulfilled · destroy' },
  ],
};

/* ------------------------------------------------------------------ DPIA & GDPR */
export const PD_MAP = [
  ['PRL.ORDER_MASTER', 'Rplus_DWH', ['CUSTOMER_NAME', 'CUSTOMER_ACCOUNT_BALANCE', 'NATION_NAME', 'ORDER_TOTAL_AMOUNT', 'MAX_RETAIL_PRICE', 'SAMPLE_SUPPLIER_NAME'], [], 'PK', 'eu-west-2 (London)', 'Orders'],
  ['STG.CUSTOMER_ORDER', 'Rplus_DWH', ['CUSTOMER_NAME', 'CUSTOMER_ACCOUNT_BALANCE', 'NATION_NAME', 'ORDER_TOTAL_AMOUNT'], ['PRL.ORDER_MASTER'], 'Rajesh', 'eu-west-2 (London)', 'Customer'],
  ['STG.CUSTOMER_ORDER_LIVE_RPLUS', 'Rplus_DWH', ['CUSTOMER_NAME', 'CUSTOMER_ACCOUNT_BALANCE', 'NATION_NAME', 'ORDER_TOTAL_AMOUNT'], [], 'Rajesh', 'eu-west-2 (London)', 'Customer'],
  ['API.GET_customers', 'Rplus API (Rest API)', ['full_name', 'email', 'account_balance', 'nino', 'ethnicity'], [], 'Rajesh', 'not recorded', 'Customer'],
  ['API.GET_customers_customerId', 'Rplus API (Rest API)', ['full_name', 'email', 'account_balance'], [], 'Rajesh', 'not recorded', 'Customer'],
  ['S3_ENR.CUSTOMER_ORDERS', 'Rplus Amazon S3', ['TOTAL_AMOUNT', 'CUSTOMER_NAME', 'CUSTOMER_ACCOUNT_BALANCE'], [], 'Rajesh', 'eu-west-2 (London)', 'Customer'],
  ['BI.Customer 360 Dashboard', 'Rplus Reports (Power BI)', ['CUSTOMER_NAME', 'ACCOUNT_BALANCE'], [], 'Rajesh', 'not recorded', 'Customer'],
  ['INT.CUSTOMER', 'Rplus_DWH', ['CUSTOMER_NAME', 'ACCOUNT_BALANCE', 'NI_NUMBER', 'DISABILITY_FLAG'], ['STG.CUSTOMER_ORDER', 'STG.CUSTOMER_ORDER_LIVE_RPLUS'], 'Rajesh / Priya', 'eu-west-2 (London)', 'Customer'],
  ['INT.PART', 'Rplus_DWH', ['PART_NAME', 'RETAIL_PRICE'], ['STG.ORDER_ITEM_SUMMARY'], 'Raghav', 'eu-west-2 (London)', 'Product'],
  ['S3_CLN.CUSTOMER', 'Rplus Amazon S3', ['CUSTOMER_NAME', 'ACCOUNT_BALANCE'], ['S3_ENR.CUSTOMER_ORDERS', 'S3_ENR.CUSTOMER_SUMMARY'], 'Rajesh', 'eu-west-2 (London)', 'Customer'],
  ['S3_ENR.CUSTOMER_SUMMARY', 'Rplus Amazon S3', ['CUSTOMER_NAME', 'TOTAL_ORDER_AMOUNT'], [], 'Rajesh', 'eu-west-2 (London)', 'Customer'],
  ['S3_RAW.CUSTOMER', 'Rplus Amazon S3', ['CUSTOMER_NAME', 'ACCOUNT_BALANCE'], ['S3_CLN.CUSTOMER', 'S3_CLN.ORDERS'], 'Rajesh', 'eu-west-2 (London)', 'Customer'],
  ['SQL_CLN.CUSTOMER', 'SQL Server', ['full_name', 'email'], ['SQL_ENR.CUSTOMER_ORDERS', 'SQL_ENR.CUSTOMER_SUMMARY'], 'Rajesh', 'not recorded', 'Customer'],
  ['SQL_ENR.CUSTOMER_ORDERS', 'SQL Server', ['full_name', 'amount'], [], 'Rajesh', 'not recorded', 'Customer'],
  ['SQL_ENR.CUSTOMER_SUMMARY', 'SQL Server', ['full_name', 'total_amount'], [], 'Rajesh', 'not recorded', 'Customer'],
  ['SQL_SRC.CUSTOMER', 'SQL Server', ['full_name', 'email'], ['SQL_CLN.CUSTOMER'], 'Rajesh', 'not recorded', 'Customer'],
  ['SRC.CUSTOMER', 'Rplus_DWH', ['CUSTOMER_NAME', 'ACCOUNT_BALANCE', 'NI_NUMBER'], ['INT.CUSTOMER'], 'Rajesh / Priya', 'eu-west-2 (London)', 'Customer'],
  ['SRC.PART', 'Rplus_DWH', ['PART_NAME', 'RETAIL_PRICE'], ['INT.PART'], 'Raghav', 'eu-west-2 (London)', 'Product'],
  ['STG.ORDER_ITEM_SUMMARY', 'Rplus_DWH', ['MAX_RETAIL_PRICE', 'SAMPLE_SUPPLIER_NAME'], ['PRL.ORDER_MASTER'], 'PK', 'eu-west-2 (London)', 'Orders'],
  ['STREAMING.customer-value', 'Rplus Streaming (Confluent)', ['CUSTOMER_NAME', 'ACCOUNT_BALANCE'], [], 'Rajesh', 'not recorded', 'Customer'],
  ['BI.Supplier Performance', 'Rplus Reports (Power BI)', ['SUPPLIER_NAME'], [], 'Raghav', 'not recorded', 'Supplier'],
  ['INT.NATION', 'Rplus_DWH', ['NATION_NAME'], ['STG.CUSTOMER_ORDER', 'STG.CUSTOMER_ORDER_LIVE_RPLUS'], 'Raghav', 'eu-west-2 (London)', 'Reference'],
  ['INT.SUPPLIER', 'Rplus_DWH', ['SUPPLIER_NAME'], ['STG.ORDER_ITEM_SUMMARY'], 'Raghav', 'eu-west-2 (London)', 'Supplier'],
  ['SRC.NATION', 'Rplus_DWH', ['NATION_NAME'], ['INT.NATION'], 'Raghav', 'eu-west-2 (London)', 'Reference'],
  ['SRC.SUPPLIER', 'Rplus_DWH', ['SUPPLIER_NAME'], ['INT.SUPPLIER'], 'Raghav', 'eu-west-2 (London)', 'Supplier'],
].map(([asset, system, cols, shared, owner, region, domain]) => ({ asset, system, cols, shared, owner, region, domain, sensitivity: 'Restricted' }));
export const MONEY = /BALANCE|AMOUNT|PRICE|amount|balance/;
export const colClass = (c) => (/NI_NUMBER|nino/i.test(c) ? 'GOVERNMENT_ID' : /DISABILITY|HEALTH|ETHNIC|RELIGION/i.test(c) ? 'SPECIAL_CATEGORY' : MONEY.test(c) ? 'FINANCIAL' : 'PII');
export const colKind = (c) => (/NI_NUMBER|nino/i.test(c) ? 'National Insurance number (GOVERNMENT_ID)' : /DISABILITY/i.test(c) ? 'Disability / health (SPECIAL_CATEGORY, Article 9)' : /ETHNIC/i.test(c) ? 'Ethnic origin (SPECIAL_CATEGORY, Article 9)' : MONEY.test(c) ? 'Monetary amount' : c === 'email' ? 'Email address' : /NATION/.test(c) ? 'Nationality / country' : 'Person name');
/* columns found by the classifier in harvest v13 (3 Oct), after the records of processing were drafted */
export const NEW_COLS = ['NI_NUMBER', 'DISABILITY_FLAG', 'nino', 'ethnicity'];
export const DPIA_TILES = [
  { l: 'Assets holding personal data', v: 25, s: '56 personal data columns' },
  { l: 'Accepted records of processing', v: 0, s: '0 draft' },
  { l: 'Handling rules failing', v: 82, s: 'of 150 checks on personal data' },
  { l: 'Assessments required', v: 0, s: '0 activities screened' },
];
export const DOMAIN_SYSTEMS = (d) => [...new Set(PD_MAP.filter((r) => r.domain === d).map((r) => r.system))].sort().join(', ');
export const ROPA_DOMAINS = ['Orders', 'Customer', 'Product', 'Supplier', 'Reference'];
export const LAWFUL_BASES = [['public_task', 'Public task — Article 6(1)(e)'], ['legal_obligation', 'Legal obligation — Article 6(1)(c)'], ['contract', 'Contract — Article 6(1)(b)'], ['legitimate', 'Legitimate interests — Article 6(1)(f)'], ['consent', 'Consent — Article 6(1)(a)'], ['vital', 'Vital interests — Article 6(1)(d)']];
export const SPECIAL_CONDITIONS = [['spi', 'Substantial public interest — Article 9(2)(g)'], ['legal_claims', 'Legal claims — Article 9(2)(f)'], ['explicit_consent', 'Explicit consent — Article 9(2)(a)'], ['not_applicable', 'No special category data in this activity']];
export const SECURITY_DEFAULT = 'Access decided by the asset\'s owner and steward; sensitive columns masked without a grant; all access and changes recorded in the hash-chained audit log';

/* the six personal-data handling rules — rule, requirement, assets failing */
const REGION_FAIL = ['API.GET_customers', 'API.GET_customers_customerId', 'BI.Customer 360 Dashboard', 'BI.Supplier Performance', 'SQL_CLN.CUSTOMER', 'SQL_ENR.CUSTOMER_ORDERS', 'SQL_ENR.CUSTOMER_SUMMARY', 'SQL_SRC.CUSTOMER', 'STREAMING.customer-value'];
const STEWARDED = ['INT.CUSTOMER', 'SRC.CUSTOMER'];
const ALL_PD = PD_MAP.map((r) => r.asset).sort();
export const HANDLING_RULES = [
  { key: 'retention', req: 'A retention requirement applies to every asset holding personal data', fail: ALL_PD, finding: () => 'no active retention requirement applies' },
  { key: 'ropa', req: 'Every asset holding personal data appears in a record of processing', fail: ALL_PD, finding: () => 'not in any accepted record of processing' },
  { key: 'steward', req: 'Every asset holding personal data has a named steward', fail: ALL_PD.filter((a) => !STEWARDED.includes(a)), finding: () => 'no steward assigned' },
  { key: 'residency', req: 'Personal data stays in the UK region', fail: REGION_FAIL, finding: (a) => `the region of ${systemOf(a)} is not recorded — confirm where this personal data is held` },
  { key: 'classified', req: 'Personal data columns carry a classification', fail: [], finding: () => '' },
  { key: 'access_expiry', req: 'Access to personal data expires (no open-ended grants)', fail: [], finding: () => '' },
];
export const ownerOf = (a) => (PD_MAP.find((r) => r.asset === a)?.owner || '').split(' / ')[0];
export const UNUSED = ['STG.CUSTOMER_ORDER_LIVE_RPLUS', 'API.GET_customers', 'API.GET_customers_customerId', 'S3_ENR.CUSTOMER_ORDERS', 'BI.Customer 360 Dashboard', 'S3_ENR.CUSTOMER_SUMMARY', 'SQL_ENR.CUSTOMER_ORDERS', 'SQL_ENR.CUSTOMER_SUMMARY', 'STREAMING.customer-value', 'BI.Supplier Performance'];
export const SCREEN_INDICATORS = ['Special category or criminal offence data', 'Large-scale processing of personal data', 'Systematic monitoring of individuals', 'Data about vulnerable people', 'Datasets combined or matched', 'New technology, including AI', 'Automated decision-making or profiling'];
export const ICO_TEMPLATE = {
  name: 'ICO standard DPIA', kind: 'standard', basis: 'UK GDPR Article 35; ICO DPIA guidance', version: 'v1', review: 365,
  intro: 'Follows the ICO\'s published DPIA template, with the processing described from GenMeta\'s own metadata.',
  stages: [['Completion', 'assessor'], ['DPO review', 'dpo'], ['Approval', 'governance-lead']],
  sections: [
    ['Identify the need for a DPIA', 'Explain what the project aims to achieve and what triggered the assessment.', ['What is the processing and why (longtext, required, pre-filled from summary)', 'Why a DPIA is needed (longtext, required, pre-filled from triggers)']],
    ['Describe the processing', 'Nature, scope, context and purposes — who the data is about, what is collected, how it flows and who receives it.', ['Nature of the processing (longtext, required, pre-filled from nature)', 'Scope: data, volumes and people (longtext, required, pre-filled from scope)', 'Context: systems, lineage and sharing (longtext, required, pre-filled from context)', 'Purposes and lawful basis (longtext, required, pre-filled from purposes)']],
    ['Consultation process', 'Who has been consulted: data subjects or their representatives, the DPO, processors, security and information assurance.', ['Who was consulted and what they said (longtext, required, pre-filled from consulted)']],
    ['Assess necessity and proportionality', 'Lawful basis, minimisation, quality, retention, rights, processors and transfers.', ['Lawful basis and necessity (longtext, required, pre-filled from lawful)', 'Data minimisation and quality (longtext, required, pre-filled from minimisation)', 'Retention and disposal (longtext, required, pre-filled from retention)', 'How individuals\' rights are supported (longtext, pre-filled from rights)']],
    ['Identify and assess risks', 'Each risk to individuals, with likelihood, severity and the overall rating.', ['Risks to individuals (risk_table, required)']],
    ['Identify measures to reduce risk', 'The measure against each risk, the effect on it and the residual rating.', ['Measures and residual risk (measure_table, required)']],
    ['Sign off and record outcomes', 'DPO advice, acceptance of residual risk, whether the ICO must be consulted, and the review date.', ['DPO advice (longtext, required)', 'Residual risk accepted by (text, required)', 'ICO consultation needed (choice)']],
  ],
};

/* ------------------------------------------------------------------ access */
export const PERMISSIONS = ['read_metadata', 'read_profile', 'read_sensitive', 'manage_metadata', 'approve_access', 'grant_access', 'manage_policy', 'manage_platform', 'audit_read'];
export const ROLES = [
  ['Governance Lead', 'governance-lead', 'L3', ['read_metadata', 'read_profile', 'read_sensitive', 'manage_metadata', 'approve_access', 'grant_access', 'manage_policy', 'audit_read']],
  ['Platform / Ops Engineer', 'platform-ops', 'L3', ['read_metadata', 'read_profile', 'manage_platform', 'audit_read']],
  ['Data Engineer', 'data-engineer', 'L2', ['read_metadata', 'read_profile', 'manage_metadata']],
  ['Data Product Owner', 'product-owner', 'L2', ['read_metadata', 'read_profile', 'approve_access']],
  ['Analyst / Business User', 'analyst', 'L1', ['read_metadata']],
  ['Data Protection Officer', 'dpo', 'L3', ['read_metadata', 'read_profile', 'read_sensitive', 'audit_read']],
  ['Auditor', 'auditor', 'L2', ['read_metadata', 'audit_read']],
].map(([name, key, clearance, may]) => ({ name, key, clearance, may }));
export const APPROVERS = ['Asset owner', 'Owner or steward', 'No approval (automatic)'];
export const ACCESS_POLICIES = [
  { s: 'Restricted', ap: 'Asset owner', days: 90, just: true, mask: true },
  { s: 'Confidential', ap: 'Owner or steward', days: 180, just: true, mask: true },
  { s: 'Internal', ap: 'Owner or steward', days: 365, just: false, mask: false },
  { s: 'Public', ap: 'No approval (automatic)', days: 365, just: false, mask: false },
];
export const SOD = [
  { a: 'request_access', b: 'approve_access', builtIn: true, kind: 'duty', why: 'The person who asks for access cannot be the person who approves it.', when: 'when a decision is made' },
  { a: 'platform-ops', b: 'governance-lead', builtIn: true, kind: 'role', why: 'Running the platform and setting the policy it enforces are separate duties.', when: 'when a role is assigned' },
  { a: 'auditor', b: 'governance-lead', builtIn: true, kind: 'role', why: 'Nobody audits the decisions they themselves may make.', when: 'when a role is assigned' },
  { a: 'manage_metadata', b: 'approve_access', builtIn: false, kind: 'duty', why: 'Changing what an asset claims to be and approving who may see it are separate duties.', when: 'when a role is assigned' },
];
export const ACCESS_RULES = [
  { n: 1, name: 'Special-category data needs L3 clearance', id: 'rule-special-category', when: 'classifications: SPECIAL_CATEGORY, HEALTH · min_clearance: L3', effect: 'deny' },
  { n: 2, name: 'Classified data is not shown outside the UK', id: 'rule-offshore', when: 'sensitivity: Restricted · locations_denied: non-uk', effect: 'deny' },
  { n: 3, name: 'Personal and financial detail is masked below L2', id: 'rule-pii-mask', when: 'classifications: PII, FINANCIAL · min_clearance: L2', effect: 'mask' },
  { n: 4, name: 'Restricted data needs a stated purpose', id: 'rule-purpose', when: 'sensitivity: Restricted · requires_purpose: true', effect: 'mask' },
];
export const DIRECTORY = [['GenMeta-Governance', 'governance-lead'], ['GenMeta-Ops', 'platform-ops'], ['GenMeta-Engineering', 'data-engineer'], ['GenMeta-ProductOwners', 'product-owner'], ['GenMeta-Analysts', 'analyst'], ['GenMeta-DPO', 'dpo'], ['GenMeta-Audit', 'auditor']];
export const PLATFORMS = [
  ['Rplus_DWH', 16, true, 'read with SHOW GRANTS ON each object'],
  ['Rplus Streaming (Confluent)', 1, false, 'topic ACLs need a cluster admin API key'],
  ['Rplus Amazon S3', 6, false, 'object-store access is governed by IAM policy, outside the catalogue\'s read scope'],
  ['Rplus Reports (Power BI)', 4, false, 'workspace membership needs the Power BI admin API'],
  ['Rplus API (Rest API)', 4, false, 'this platform does not publish its grants to the catalogue'],
  ['SQL Server', 6, false, 'this platform does not publish its grants to the catalogue'],
];
export const sensitivityOf = (a) => (PD_MAP.some((r) => r.asset === a) ? 'Restricted' : /LINEITEM|ORDERS|POST_orders|GET_orders|Churn|Revenue/.test(a) ? 'Confidential' : 'Internal');

/* ------------------------------------------------------------------ v2: leader patterns */
/* Purview-style improvement actions: points by control type (preventative 27 / 9, detective 3 / 1). */
export const ACTION_STATUSES = ['Not started', 'In progress', 'Implemented', 'Passed'];
export const IMPROVEMENT_ACTIONS = [
  { id: 'IA-01', title: 'Anchor the audit chain in write-once storage', control: 'worm', points: 27, type: 'Preventative · mandatory', owner: 'platform-ops', due: '31 Oct 2026', status: 'Not started', fw: ['ISO/IEC 27001:2022', 'UK GDPR'],
    why: 'The hash chain is verified but held in memory, so a platform operator could rebuild it. An external anchor makes tampering provable to an auditor.',
    steps: ['Turn on S3 Object Lock (compliance mode) for the audit bucket', 'Write each chain checkpoint to the locked bucket every 15 minutes', 'Re-run GET /api/audit/verify and confirm the anchor is reported'] },
  { id: 'IA-02', title: 'Measure the region of every source instead of declaring it', control: 'residency', points: 27, type: 'Preventative · mandatory', owner: 'platform-ops', due: '14 Nov 2026', status: 'In progress', fw: ['UK GDPR', 'HMRC residency'],
    why: 'Four sources (SQL Server, Power BI, Rest API, Confluent) have no region established, so residency is declared, not verified.',
    steps: ['Grant GetBucketLocation to the GenMeta role', 'Read the Power BI tenant region through the admin API', 'Declare the region for the Rest API and SQL Server, with evidence'] },
  { id: 'IA-03', title: 'Accept the five drafted records of processing', control: 'dpia', points: 27, type: 'Preventative · mandatory', owner: 'governance-lead', due: '17 Oct 2026', status: 'Not started', fw: ['UK GDPR', 'DPA 2018'],
    why: 'Article 30 needs a record of processing. GenMeta has drafted one per domain from the evidence; none is accepted yet.',
    steps: ['Open DPIA › Records of processing', 'Review each drafted record and confirm the lawful basis', 'Accept the record'] },
  { id: 'IA-04', title: 'Apply a retention requirement to the 25 personal-data assets', control: 'classification', points: 27, type: 'Preventative · mandatory', owner: 'Data Protection Officer', due: '31 Oct 2026', status: 'Not started', fw: ['UK GDPR', 'DPA 2018'],
    why: 'Storage limitation (Article 5(1)(e)) cannot be shown while no retention rule applies to personal data.',
    steps: ['Open Policies › Library and open “Default HMRC record retention period”', 'Set Applies to › Classifications to PII and FINANCIAL', 'Re-run the data-handling rules'] },
  { id: 'IA-05', title: 'Name a steward for 23 personal-data assets', control: 'classification', points: 9, type: 'Preventative · discretionary', owner: 'governance-lead', due: '31 Oct 2026', status: 'Not started', fw: ['DPA 2018'],
    why: 'Accountability needs a named person for each asset holding personal data. Only INT.CUSTOMER and SRC.CUSTOMER have one.',
    steps: ['Open Stewardship and filter to personal data', 'Assign a steward to each asset'] },
  { id: 'IA-06', title: 'Run generative steps in the UK, or record an override', control: 'residency', points: 27, type: 'Preventative · mandatory', owner: 'platform-ops', due: '24 Oct 2026', status: 'Not started', fw: ['HMRC residency', 'UK GDPR'],
    why: 'Glossary drafting, extraction and Ask call the Anthropic API outside the UK, which the “United Kingdom only” policy refuses.',
    steps: ['Set GENMETA_LLM=bedrock (AWS Bedrock, London)', 'Or record an override with a reason on Residency & sovereignty'] },
  { id: 'IA-07', title: 'Restrict static asset delivery to UK edge locations', control: 'residency', points: 3, type: 'Detective · mandatory', owner: 'platform-ops', due: '30 Nov 2026', status: 'Not started', fw: ['HMRC residency'],
    why: 'No data passes through the cache, but restricting CloudFront to UK edges removes the disclosure.',
    steps: ['Set the CloudFront price class to Europe and use geo-restriction for the UK'] },
  { id: 'IA-08', title: 'Hash-chain every audit record', control: 'audit-log', points: 27, type: 'Preventative · mandatory', owner: 'platform-ops', due: '—', status: 'Passed', fw: ['ISO/IEC 27001:2022', 'UK GDPR', 'NCSC CAF'], why: 'Done: each record carries the hash of the one before it.', steps: [] },
  { id: 'IA-09', title: 'Read metadata only — never rows', control: 'metadata-only', points: 27, type: 'Preventative · mandatory', owner: 'platform-ops', due: '—', status: 'Passed', fw: ['UK GDPR', 'HMRC residency'], why: 'Done: connectors read schema and manifests only.', steps: [] },
  { id: 'IA-10', title: 'Redact prompts and completions on LLM calls', control: 'redaction', points: 27, type: 'Preventative · mandatory', owner: 'platform-ops', due: '—', status: 'Passed', fw: ['UK GDPR'], why: 'Done: email, card, NINO and numbers are redacted before and after.', steps: [] },
  { id: 'IA-11', title: 'Deny by default through group → role → clearance', control: 'rbac', points: 27, type: 'Preventative · mandatory', owner: 'governance-lead', due: '—', status: 'Passed', fw: ['ISO/IEC 27001:2022', 'NCSC CAF'], why: 'Done: modules are gated and admin features restricted.', steps: [] },
  { id: 'IA-12', title: 'Classify sensitive columns on every harvest', control: 'classification', points: 9, type: 'Detective · mandatory', owner: 'data-engineer', due: '—', status: 'Passed', fw: ['UK GDPR', 'DPA 2018'], why: 'Done: 36 of 37 assets carry a classification.', steps: [] },
  { id: 'IA-13', title: 'Gate model and prompt changes on evaluation and review', control: 'self-training', points: 9, type: 'Preventative · discretionary', owner: 'governance-lead', due: '—', status: 'Passed', fw: ['ISO/IEC 27001:2022'], why: 'Done: the critic gate blocks unreviewed changes.', steps: [] },
];
export const CONTROL_TYPE = { 'audit-log': 'Detective', worm: 'Preventative', 'metadata-only': 'Preventative', redaction: 'Preventative', residency: 'Preventative', rbac: 'Preventative', classification: 'Detective', dpia: 'Preventative', 'self-training': 'Preventative' };
export const scoreOf = (actions) => {
  const total = actions.reduce((n, a) => n + a.points, 0);
  const got = actions.filter((a) => a.status === 'Passed').reduce((n, a) => n + a.points, 0);
  return { total, got, pct: total ? got / total : 0 };
};

/* Collibra-style lifecycle for library items */
export const LIFECYCLE = ['draft', 'in review', 'approved', 'active', 'retired'];
export const REVIEW_DUE = { policy: '19 Sept 2029', standard: '19 Sept 2027', control: '19 Mar 2027', obligation: '19 Sept 2027', retention: '19 Sept 2027' };
export const REG_GROUP = (i) => {
  const r = `${i.regulation} ${i.source ? i.source[0] : ''}`;
  if (/ICO|Article 5 UK GDPR/.test(r)) return 'UK GDPR — Article 5 principles (ICO)';
  if (/Public Records/.test(r)) return 'Public Records Act 1958';
  if (/GDPR|DPA/.test(r)) return 'UK GDPR & Data Protection Act 2018';
  if (/hmrc-records/.test(r)) return 'HMRC records and information collection policy';
  if (/records-management/.test(r)) return 'HMRC records management, retention and disposal policy';
  return 'Internal (no regulation named)';
};

/* ICO DPIA scales */
export const LIKELIHOOD = ['Remote', 'Possible', 'Probable'];
export const SEVERITY = ['Minimal', 'Significant', 'Severe'];
export const riskLevel = (l, s) => { const v = (LIKELIHOOD.indexOf(l) + 1) * (SEVERITY.indexOf(s) + 1); return v >= 6 ? 'High' : v >= 3 ? 'Medium' : 'Low'; };
export const EFFECTS = ['Eliminated', 'Reduced', 'Accepted'];
export const SUGGESTED_RISKS = {
  Customer: [
    ['Customer names and balances shown to people without a business need', 'Possible', 'Significant', 'Mask PII and FINANCIAL columns without a grant; 90-day expiring grants for Restricted data'],
    ['Personal data kept longer than necessary (no retention rule applies)', 'Probable', 'Significant', 'Apply the default HMRC retention requirement to all personal-data assets'],
    ['Customer data processed outside the UK by an unmeasured source', 'Possible', 'Severe', 'Measure or declare the region of SQL Server, Power BI, Rest API and Confluent'],
  ],
  Orders: [['Order values linked back to named customers in reports', 'Possible', 'Significant', 'Aggregate below customer level in PRL.ORDER_MASTER consumers']],
  Product: [['Product data mis-classified as personal data', 'Remote', 'Minimal', 'Correct labels in AI evaluation']],
  Supplier: [['Supplier contact names shared in Power BI without a record', 'Possible', 'Minimal', 'Name the report in the record of processing']],
  Reference: [['Nation names used to infer nationality of individuals', 'Remote', 'Significant', 'Treat NATION_NAME as reference data, not personal data']],
};

/* Entra-style access review campaigns */
export const REVIEW_ITEMS = [
  { id: 'r1', person: 'Priya Shah', role: 'analyst', asset: 'INT.CUSTOMER', sens: 'Restricted', granted: '12 Jul 2026', lastUsed: '2 Oct 2026', why: 'Customer value reporting' },
  { id: 'r2', person: 'Owen Hughes', role: 'data-engineer', asset: 'S3_RAW.CUSTOMER', sens: 'Restricted', granted: '3 Jun 2026', lastUsed: '11 Jul 2026', why: 'Pipeline rebuild' },
  { id: 'r3', person: 'Aisha Khan', role: 'product-owner', asset: 'BI.Customer 360 Dashboard', sens: 'Restricted', granted: '20 Aug 2026', lastUsed: '29 Sept 2026', why: 'Product review' },
  { id: 'r4', person: 'Emma Clarke', role: 'analyst', asset: 'STREAMING.customer-value', sens: 'Restricted', granted: '1 May 2026', lastUsed: 'never', why: 'Exploration' },
  { id: 'r5', person: 'Pradeep Kumar', role: 'data-engineer', asset: 'SQL_SRC.CUSTOMER', sens: 'Restricted', granted: '15 Apr 2026', lastUsed: '22 Jun 2026', why: 'Migration test' },
  { id: 'r6', person: 'Priya Shah', role: 'analyst', asset: 'PRL.ORDER_MASTER', sens: 'Restricted', granted: '12 Jul 2026', lastUsed: '1 Oct 2026', why: 'Order analytics' },
];
export const recommend = (r) => (r.lastUsed === 'never' || /Jun|May|Apr|Jul/.test(r.lastUsed) ? ['Revoke', `not used in 30 days (last: ${r.lastUsed})`] : ['Keep', `used recently (${r.lastUsed})`]);
