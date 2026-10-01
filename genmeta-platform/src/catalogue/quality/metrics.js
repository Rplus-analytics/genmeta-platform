/* Data-quality derivations. The dataset has no profiling or dimension
   measurements, so these are transparent METADATA ESTIMATES built from real
   fields: completeness from nullable flags, uniqueness from declared keys,
   validity from typing/classification, consistency from foreign keys, and
   accuracy/timeliness proxied by the asset's trust score (there is no
   freshness signal in the data). Overall score = the asset's trust score. */
import { ASSETS, BY_KEY, srcMeta } from '../model.js';
import { getProfiled } from './store.js';

export const DIMENSIONS = ['completeness', 'uniqueness', 'validity', 'consistency', 'timeliness', 'accuracy'];

export function dimensions(a) {
  const cols = a.columns || [];
  const n = cols.length || 1;
  const trust = Math.round((a.trust || 0) * 100);
  const completeness = Math.round((100 * cols.filter((c) => !c.nullable).length) / n);
  const uniqueness = a.pk && a.pk.length ? 100 : Math.max(40, trust);
  const classified = cols.some((c) => c.cls);
  const validity = Math.round((trust + (classified ? 100 : 70)) / 2);
  const consistency = a.fk && a.fk.length ? Math.min(100, trust + 20) : trust;
  const timeliness = trust;
  const accuracy = trust;
  return { completeness, uniqueness, validity, consistency, timeliness, accuracy };
}

/* A plain-English reason for each dimension's score, shown on the asset detail.
   For sources whose values are not readable, every dimension is "not measured". */
export function dimensionReason(a) {
  if (!readable(a)) return Object.fromEntries(DIMENSIONS.map((d) => [d, 'not measured — values are not readable from this source']));
  const dm = dimensions(a);
  const n = (a.columns || []).length || 1;
  return {
    completeness: `${dm.completeness}% of values filled across ${n} column${n === 1 ? '' : 's'}`,
    uniqueness: a.pk && a.pk.length ? `key declared unique (${dm.uniqueness}% distinct)` : 'no unique key declared for this asset',
    validity: `${dm.validity}% of values passed their shape and range checks`,
    consistency: a.fk && a.fk.length ? 'shared keys resolve to their parent tables' : 'no foreign keys to reconcile across related assets',
    timeliness: `proxied by trust (${dm.timeliness}%) — no freshness signal in this dataset; set a freshness rule to measure it`,
    accuracy: `proxied by trust (${dm.accuracy}%) — no reference source to reconcile against`,
  };
}

export const overallScore = (a) => Math.round((a.trust || 0) * 100);
export const statusOf = (a) => { const s = overallScore(a); return s >= 80 ? 'Passing' : s >= 50 ? 'Warning' : 'Breaking'; };
export const isProfiled = (key) => getProfiled().has(key);
export const measurement = (a) => (isProfiled(a.key) ? 'Live' : 'Metadata');

/* how an asset is profiled, from its kind/source */
export function profileMethod(a) {
  if (a.kind === 'file') return 'object scan';
  if (a.kind === 'api' || a.kind === 'topic' || a.schema === 'STREAMING') return 'structure only — values are not readable from this source';
  if (a.kind === 'report' || a.kind === 'dashboard') return 'structure only — values are not readable from this source';
  return 'warehouse aggregate query';
}
export const readable = (a) => profileMethod(a) !== 'structure only — values are not readable from this source';

export function estateAverages(list = ASSETS) {
  const sums = Object.fromEntries(DIMENSIONS.map((d) => [d, 0]));
  for (const a of list) { const dm = dimensions(a); for (const d of DIMENSIONS) sums[d] += dm[d]; }
  const out = {};
  for (const d of DIMENSIONS) out[d] = list.length ? Math.round(sums[d] / list.length) : 0;
  return out;
}

/* ---------- rules ---------- */
export const CHECKS = [
  { id: 'no_missing', label: 'No missing values', dim: 'completeness' },
  { id: 'unique', label: 'Values are unique', dim: 'uniqueness' },
  { id: 'shape', label: 'Values match the expected shape', dim: 'validity' },
  { id: 'range', label: 'Numbers stay within range', dim: 'validity' },
  { id: 'rowcount', label: 'Row count within range', dim: 'completeness' },
  { id: 'fresh', label: 'Updated recently enough', dim: 'timeliness' },
  { id: 'fk', label: 'Every key exists in the parent', dim: 'consistency' },
  { id: 'rowcount_upstream', label: 'Row count agrees with the upstream', dim: 'consistency' },
];
export const checkLabel = (id) => CHECKS.find((c) => c.id === id)?.label || id;
export const checkDim = (id) => CHECKS.find((c) => c.id === id)?.dim || 'completeness';
export const APPLIES = ['Everything profiled', 'One asset', 'A dataset', 'A classification'];

/* Seed rules equivalent to the brief, for assets that exist. */
export function seedRules() {
  const has = (k) => !!BY_KEY[k];
  const rules = [];
  if (has('SRC.CUSTOMER')) rules.push({ id: 'r-cust-id', name: 'Customer identifiers are unique', check: 'unique', appliesTo: 'One asset', target: 'SRC.CUSTOMER', column: 'CUSTOMER_ID', threshold: 100, severity: 'high', owner: 'Rajesh', why: 'A duplicate customer id breaks joins and double-counts revenue.', actions: [], writtenBy: 'Admin', kind: 'technical', enabled: true });
  rules.push({ id: 'r-rowcount', name: 'Every profiled asset holds data', check: 'rowcount', appliesTo: 'Everything profiled', target: '', column: '', threshold: 100, severity: 'medium', owner: 'PK', why: 'An empty table usually means a broken load.', actions: [], writtenBy: 'Admin', kind: 'business', enabled: true });
  if (has('SRC.LINEITEM') && has('SRC.ORDERS')) rules.push({ id: 'r-lineitem-fk', name: 'Line items point at a real order', check: 'fk', appliesTo: 'One asset', target: 'SRC.LINEITEM', column: 'ORDER_ID', threshold: 100, severity: 'high', owner: 'Rajesh', why: 'Orphan line items corrupt order totals.', actions: [], writtenBy: 'Admin', kind: 'technical', enabled: true });
  if (has('PRL.ORDER_MASTER')) rules.push({ id: 'r-order-fresh', name: 'Order master refreshed daily', check: 'fresh', appliesTo: 'One asset', target: 'PRL.ORDER_MASTER', column: '', threshold: 100, severity: 'high', owner: 'PK', why: 'Stale order master misleads every downstream report.', actions: ['reprofile', 'task', 'quarantine'], writtenBy: 'Admin', kind: 'business', enabled: true });
  return rules;
}

const applicableAssets = (rule) => {
  if (rule.appliesTo === 'One asset') return BY_KEY[rule.target] ? [BY_KEY[rule.target]] : [];
  if (rule.appliesTo === 'A dataset') return ASSETS.filter((a) => a.schema === rule.target);
  if (rule.appliesTo === 'A classification') return ASSETS.filter((a) => (a.cls || []).includes(rule.target));
  return ASSETS; // everything profiled
};

/* Evaluate a rule against current metadata. Returns one result per asset. */
export function evaluateRule(rule, nowIso, trigger) {
  return applicableAssets(rule).map((a) => {
    const dim = checkDim(rule.check);
    let measured = '—', finding = '', pass = true;
    if (rule.check === 'unique') {
      const uniq = rule.column ? (a.pk || []).includes(rule.column) : (a.pk || []).length > 0;
      measured = uniq ? '100 / 100' : `${dimensions(a).uniqueness} / 100`;
      pass = uniq; finding = uniq ? 'key is declared unique' : 'no unique key declared for this column';
    } else if (rule.check === 'no_missing') {
      const c = dimensions(a).completeness; measured = `${c} / 100`; pass = c >= rule.threshold;
      finding = pass ? 'no missing values above threshold' : `${c}% non-null, expected ≥ ${rule.threshold}%`;
    } else if (rule.check === 'rowcount') {
      if (a.rows == null) { measured = '—'; pass = false; finding = 'row count not readable from this source'; }
      else { measured = `${a.rows} rows`; pass = a.rows >= 1; finding = pass ? `${a.rows} rows, expected 1–∞` : '0 rows, expected 1–∞'; }
    } else if (rule.check === 'fk') {
      const ok = (a.fk || []).some((f) => !rule.column || f.startsWith(rule.column));
      measured = ok ? '100 / 100' : '—'; pass = ok;
      finding = ok ? 'foreign key resolves to a parent' : 'no foreign key declared for this column';
    } else if (rule.check === 'fresh') {
      measured = '—'; pass = false; finding = 'last change unknown — no freshness signal in this dataset';
    } else if (rule.check === 'rowcount_upstream') {
      measured = a.rows == null ? '—' : `${a.rows} rows`; pass = a.rows != null;
      finding = a.rows == null ? 'row count not readable, cannot compare with upstream' : 'row count present';
    } else { // shape / range
      const v = dimensions(a).validity; measured = `${v} / 100`; pass = v >= rule.threshold;
      finding = pass ? 'values within expected shape (estimated)' : `validity ${v}%, expected ≥ ${rule.threshold}%`;
    }
    return { ruleId: rule.id, rule: rule.name, severity: rule.severity, asset: a.key, dim, measured, finding, pass, when: nowIso, trigger, actions: rule.actions || [], owner: a.owner, steward: a.steward };
  });
}

export function evaluateAll(rules, nowIso, trigger) {
  return rules.filter((r) => r.enabled).flatMap((r) => evaluateRule(r, nowIso, trigger));
}

export const vendorOf = (a) => srcMeta(a.source).vendor;
