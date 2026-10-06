/* ------------------------------------------------------------------
   Business glossary — data and in-memory state.
   TERMS and ACTIVITY are the prototype's seed (docs/glossary-atlan-style.html,
   itself built from docs/business-glossary-old-ui.md + catalogue-data.json).
   State is in-memory and reactive: every action mutates the arrays, appends to
   history/activity and notifies subscribers, so badges and counts recompute.
   ------------------------------------------------------------------ */
import { useSyncExternalStore } from 'react';
import { BY_KEY } from './catalogue/model.js';

/* ---------- assets (fqn → source + type) ---------- */
export const ASSET = {
  'INT.CUSTOMER': ['Rplus_DWH', 'view'], 'INT.LINEITEM': ['Rplus_DWH', 'view'], 'INT.NATION': ['Rplus_DWH', 'view'],
  'INT.ORDERS': ['Rplus_DWH', 'view'], 'INT.PART': ['Rplus_DWH', 'view'], 'INT.SUPPLIER': ['Rplus_DWH', 'view'],
  'PRL.ORDER_MASTER': ['Rplus_DWH', 'view'], 'SRC.CUSTOMER': ['Rplus_DWH', 'table'], 'SRC.LINEITEM': ['Rplus_DWH', 'table'],
  'SRC.NATION': ['Rplus_DWH', 'table'], 'SRC.ORDERS': ['Rplus_DWH', 'table'], 'SRC.PART': ['Rplus_DWH', 'table'],
  'SRC.SUPPLIER': ['Rplus_DWH', 'table'], 'STG.CUSTOMER_ORDER': ['Rplus_DWH', 'view'],
  'STG.CUSTOMER_ORDER_LIVE_RPLUS': ['Rplus_DWH', 'view'], 'STG.ORDER_ITEM_SUMMARY': ['Rplus_DWH', 'view'],
  'STREAMING.customer-value': ['Rplus Streaming (Confluent)', 'topic'], 'S3_RAW.CUSTOMER': ['Rplus Amazon S3', 'file'],
  'S3_RAW.ORDERS': ['Rplus Amazon S3', 'file'], 'S3_CLN.CUSTOMER': ['Rplus Amazon S3', 'file'],
  'S3_CLN.ORDERS': ['Rplus Amazon S3', 'file'], 'S3_ENR.CUSTOMER_ORDERS': ['Rplus Amazon S3', 'file'],
  'S3_ENR.CUSTOMER_SUMMARY': ['Rplus Amazon S3', 'file'], 'BI.Customer 360 Dashboard': ['Rplus Reports (Power BI)', 'dashboard'],
  'BI.Order Revenue Report': ['Rplus Reports (Power BI)', 'report'], 'BI.Supplier Performance': ['Rplus Reports (Power BI)', 'report'],
  'BI.Customer Churn Analysis': ['Rplus Reports (Power BI)', 'report'], 'API.GET_customers': ['Rplus API (Rest API)', 'api'],
  'API.GET_orders': ['Rplus API (Rest API)', 'api'],
};
export function assetInfo(fqn) {
  if (ASSET[fqn]) return { src: ASSET[fqn][0], type: ASSET[fqn][1] };
  const p = fqn.split('.');
  if (p.length === 3) { const t = ASSET[p[0] + '.' + p[1]]; return { src: t ? t[0] : (p[0].startsWith('SQL') ? 'Rplus SQL Server' : 'Rplus_DWH'), type: 'column' }; }
  if (p[0].startsWith('SQL')) return { src: 'Rplus SQL Server', type: p[0] === 'SQL_SRC' ? 'table' : 'view' };
  return { src: 'Rplus_DWH', type: 'table' };
}
/* Resolve an asset fqn to a catalogue asset id (column refs fall back to the parent). */
export function assetId(fqn) {
  const key = String(fqn);
  const direct = BY_KEY[key] || BY_KEY[key.toUpperCase()];
  if (direct) return String(direct.id);
  const seg = key.split('.');
  if (seg.length > 2) { const parent = BY_KEY[seg.slice(0, 2).join('.')]; if (parent) return String(parent.id); }
  return null;
}

const CUST20 = ['INT.CUSTOMER', 'SRC.CUSTOMER', 'STG.CUSTOMER_ORDER', 'STG.CUSTOMER_ORDER_LIVE_RPLUS', 'STREAMING.customer-value', 'S3_RAW.CUSTOMER', 'S3_CLN.CUSTOMER', 'S3_ENR.CUSTOMER_ORDERS', 'S3_ENR.CUSTOMER_SUMMARY', 'SQL_CLN.CUSTOMER', 'SQL_ENR.CUSTOMER_ORDERS', 'SQL_ENR.CUSTOMER_SUMMARY', 'INT.CUSTOMER.CUSTOMER_ID', 'INT.CUSTOMER.CUSTOMER_NAME', 'SRC.CUSTOMER.CUSTOMER_ID', 'SRC.CUSTOMER.CUSTOMER_NAME', 'STG.CUSTOMER_ORDER.ORDER_ID', 'STG.CUSTOMER_ORDER.CUSTOMER_ID', 'STG.CUSTOMER_ORDER_LIVE_RPLUS.ORDER_ID', 'STG.CUSTOMER_ORDER_LIVE_RPLUS.CUSTOMER_ID'];
const WD = (n) => `Working definition for ${n}, pending review.`;
const HIST_SYS = (n) => [{ t: '17/09/2026, 20:17:09', who: 'system', what: `Derived from ${n} harvested asset(s)` }];

export let TERMS = [
  { id: 'compliance-check-20306', name: 'Compliance Check 20306', status: 'approved', g: 'Customer', parent: null, def: 'Edited during requirement testing to prove terms can be managed.', owner: 'Rajesh', steward: 'Priya', custodian: 'Platform Ops', syn: ['Verification term'], rules: [], usage: [], notes: '',
    linked: ['BI.Customer 360 Dashboard', 'INT.CUSTOMER', 'INT.CUSTOMER.CUSTOMER_ID'],
    hist: [{ t: '18/09/2026, 09:31:47', who: 'tester', what: 'Changed assets, columns, reports' }, { t: '18/09/2026, 09:31:47', who: 'jane', what: 'in_review → approved' }, { t: '18/09/2026, 09:31:47', who: 'tester', what: 'draft → in_review' }] },
  { id: 'customer', name: 'Customer', status: 'approved', g: 'Customer', parent: null, def: 'A person or organisation that holds a relationship with the department and can be identified across systems.', owner: 'Rajesh', steward: 'Rajesh', custodian: '', syn: [],
    rules: ['A customer must have a unique customer identifier.', 'Customer name and contact details are personal data and are restricted.'],
    usage: ['“How many customers are in the Restricted tier?”', 'Used by the customer 360 view to join orders to a single customer record.'],
    notes: 'Seeded from the harvested catalogue; edit to make it authoritative.', linked: CUST20.slice(), hist: HIST_SYS(12) },
  { id: 'customer-order', name: 'Customer Order', status: 'draft', g: 'Customer', parent: 'customer', def: WD('Customer Order'), owner: '', steward: '', custodian: '', syn: [], rules: [], usage: [], notes: '', linked: ['STG.CUSTOMER_ORDER'], hist: HIST_SYS(1) },
  { id: 'customer-order-live-rplus', name: 'Customer Order Live Rplus', status: 'draft', g: 'Customer', parent: 'customer', def: WD('Customer Order Live Rplus'), owner: '', steward: '', custodian: '', syn: [], rules: [], usage: [], notes: '', linked: ['STG.CUSTOMER_ORDER_LIVE_RPLUS'], hist: HIST_SYS(1) },
  { id: 'customer-orders', name: 'Customer Orders', status: 'draft', g: 'Customer', parent: 'customer', def: WD('Customer Orders'), owner: '', steward: '', custodian: '', syn: [], rules: [], usage: [], notes: '', linked: ['S3_ENR.CUSTOMER_ORDERS', 'SQL_ENR.CUSTOMER_ORDERS'], hist: HIST_SYS(2) },
  { id: 'orders', name: 'Orders', status: 'approved', g: 'Orders', parent: null, def: 'A request placed by a customer that is recorded, priced and fulfilled through the order pipeline.', owner: 'PK', steward: 'PK', custodian: '', syn: [], rules: [], usage: [], notes: '',
    linked: ['INT.LINEITEM', 'INT.ORDERS', 'PRL.ORDER_MASTER', 'SRC.LINEITEM', 'SRC.ORDERS', 'STG.ORDER_ITEM_SUMMARY', 'S3_RAW.ORDERS', 'S3_CLN.ORDERS', 'SQL_CLN.ORDERS', 'INT.LINEITEM.LINEITEM_ID', 'INT.ORDERS.ORDER_ID', 'INT.ORDERS.CUSTOMER_ID', 'SRC.ORDERS.ORDER_ID', 'SRC.ORDERS.ORDER_DATE', 'PRL.ORDER_MASTER.ORDER_ID', 'PRL.ORDER_MASTER.ORDER_TOTAL_AMOUNT', 'STG.ORDER_ITEM_SUMMARY.ORDER_ID', 'INT.LINEITEM.ORDER_ID'], hist: HIST_SYS(10) },
  { id: 'lineitem', name: 'Lineitem', status: 'draft', g: 'Orders', parent: 'orders', def: WD('Lineitem'), owner: '', steward: '', custodian: '', syn: [], rules: [], usage: [], notes: '', linked: ['INT.LINEITEM', 'SRC.LINEITEM'], hist: HIST_SYS(2) },
  { id: 'order-item-summary', name: 'Order Item Summary', status: 'draft', g: 'Orders', parent: 'orders', def: WD('Order Item Summary'), owner: '', steward: '', custodian: '', syn: [], rules: [], usage: [], notes: '', linked: ['STG.ORDER_ITEM_SUMMARY'], hist: HIST_SYS(1) },
  { id: 'order-master', name: 'Order Master', status: 'draft', g: 'Orders', parent: 'orders', def: WD('Order Master'), owner: '', steward: '', custodian: '', syn: [], rules: [], usage: [], notes: '', linked: ['PRL.ORDER_MASTER'], hist: HIST_SYS(1) },
  { id: 'product', name: 'Product', status: 'approved', g: 'Product', parent: null, def: 'A distinct item or service that can be ordered, priced and supplied.', owner: 'Raghav', steward: 'Raghav', custodian: '', syn: [], rules: [], usage: [], notes: '', linked: ['INT.PART', 'SRC.PART', 'INT.PART.PART_ID', 'INT.PART.PART_NAME', 'SRC.PART.PART_ID', 'SRC.PART.PART_NAME'], hist: HIST_SYS(2) },
  { id: 'part', name: 'Part', status: 'draft', g: 'Product', parent: 'product', def: WD('Part'), owner: '', steward: '', custodian: '', syn: [], rules: [], usage: [], notes: '', linked: ['INT.PART', 'SRC.PART'], hist: HIST_SYS(2) },
  { id: 'reference', name: 'Reference', status: 'approved', g: 'Reference', parent: null, def: 'Shared lookup data used to standardise values across systems, such as country or nation codes.', owner: 'Raghav', steward: 'Raghav', custodian: '', syn: [], rules: [], usage: [], notes: '', linked: ['INT.NATION', 'SRC.NATION', 'INT.NATION.NATION_ID', 'INT.NATION.NATION_NAME', 'SRC.NATION.NATION_ID', 'SRC.NATION.NATION_NAME'], hist: HIST_SYS(2) },
  { id: 'nation', name: 'Nation', status: 'draft', g: 'Reference', parent: 'reference', def: 'The country reference used to locate a customer or supplier.', owner: '', steward: '', custodian: '', syn: [], rules: [], usage: [], notes: '', linked: ['INT.NATION', 'SRC.NATION'], hist: HIST_SYS(2) },
  { id: 'supplier', name: 'Supplier', status: 'approved', g: 'Supplier', parent: null, def: 'An organisation that provides goods or services and is paid against agreed terms.', owner: 'Raghav', steward: 'Raghav', custodian: '', syn: [], rules: [], usage: [], notes: '', linked: ['INT.SUPPLIER', 'SRC.SUPPLIER', 'INT.SUPPLIER.SUPPLIER_ID', 'INT.SUPPLIER.SUPPLIER_NAME', 'SRC.SUPPLIER.SUPPLIER_ID', 'SRC.SUPPLIER.SUPPLIER_NAME'], hist: HIST_SYS(2) },
  { id: 'taxpayer-reference', name: 'Taxpayer Reference', status: 'approved', g: 'Customer', parent: null, def: 'The unique reference used to identify a taxpayer record.', owner: 'Rajesh', steward: 'Priya', custodian: 'Platform Ops', syn: ['UTR'], rules: [], usage: [], notes: '', linked: [],
    hist: [{ t: '17/09/2026, 20:21:09', who: 'jane', what: 'in_review → approved' }, { t: '17/09/2026, 20:21:08', who: 'tester', what: 'draft → in_review' }, { t: '17/09/2026, 20:21:08', who: 'tester', what: 'Changed business_rules, usage_examples' }] },
];
export let ACTIVITY = [
  { term: 'compliance-check-20306', what: 'Changed assets, columns, reports', t: '18/09/2026, 09:31:47', who: 'tester' },
  { term: 'compliance-check-20306', what: 'in_review → approved', t: '18/09/2026, 09:31:47', who: 'jane' },
  { term: 'compliance-check-20306', what: 'draft → in_review', t: '18/09/2026, 09:31:47', who: 'tester' },
  { term: 'taxpayer-reference', what: 'in_review → approved', t: '17/09/2026, 20:21:09', who: 'jane' },
  { term: 'taxpayer-reference', what: 'draft → in_review', t: '17/09/2026, 20:21:08', who: 'tester' },
  { term: 'taxpayer-reference', what: 'Changed business_rules, usage_examples', t: '17/09/2026, 20:21:08', who: 'tester' },
];

export const GLOSSARIES = ['Customer', 'Orders', 'Product', 'Reference', 'Supplier'];
export const ROLE = 'governance-lead';
export const ME = 'Admin';
/* [label, badge modifier class] and the tree status dot colour, per status. */
export const STATUS = { approved: ['Approved', 'gl-approved'], review: ['In review', 'gl-review'], draft: ['Draft', 'gl-draft'], deprecated: ['Deprecated', 'gl-deprecated'] };
export const SDOT = { approved: 'var(--royal)', review: 'var(--sky)', draft: 'var(--line2)', deprecated: '#fff' };
const STATUS_VERB = { draft: 'draft', review: 'in_review', approved: 'approved', deprecated: 'deprecated' };

/* ---------- reactive in-memory store ---------- */
let version = 0;
const listeners = new Set();
const emit = () => { version += 1; listeners.forEach((l) => l()); };
const subscribe = (l) => { listeners.add(l); return () => listeners.delete(l); };
/* Subscribe a component to every glossary mutation. Read TERMS/ACTIVITY after calling. */
export const useGlossaryData = () => useSyncExternalStore(subscribe, () => version);

/* ---------- helpers ---------- */
export const T = (id) => TERMS.find((t) => t.id === id);
export const kids = (id) => TERMS.filter((t) => t.parent === id);
export const ini = (n) => (n ? n.split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase() : '');
export const now = () => { const d = new Date(); return d.toLocaleDateString('en-GB') + ', ' + d.toLocaleTimeString('en-GB'); };
export function counts(list = TERMS) { const c = { approved: 0, review: 0, draft: 0, deprecated: 0 }; list.forEach((t) => { c[t.status] += 1; }); return c; }
export const uniqAssets = () => new Set(TERMS.flatMap((t) => t.linked.filter((a) => a.split('.').length === 2)));
export const allLinks = () => TERMS.flatMap((t) => t.linked.map((a) => ({ term: t, a, ...assetInfo(a) })));
export const matchQ = (t, q) => { if (!q) return true; q = q.toLowerCase(); return t.name.toLowerCase().includes(q) || t.def.toLowerCase().includes(q) || t.syn.join(' ').toLowerCase().includes(q); };

/* Breadcrumb segments after "Business glossary" for a glossary pathname. */
export function glossaryCrumbs(pathname) {
  const m = pathname.match(/^\/app\/glossary(?:\/(.*))?$/);
  if (!m || !m[1]) return [];
  const rest = m[1];
  if (rest.startsWith('g/')) return [{ label: decodeURIComponent(rest.slice(2)) }];
  if (rest === 'new') return [{ label: 'New term' }];
  const t = T(rest);
  return t ? [{ label: t.g, to: `/app/glossary/g/${t.g}` }, { label: t.name }] : [];
}

/* ---------- actions (mutate + log + notify) ---------- */
function log(term, what) { const e = { term, what, t: now(), who: ME }; ACTIVITY.unshift(e); T(term)?.hist.unshift({ t: e.t, who: ME, what }); }

export function setStatus(id, to) { const t = T(id); if (!t) return; log(id, `${STATUS_VERB[t.status]} → ${STATUS_VERB[to]}`); t.status = to; emit(); }

const FIELD_LABEL = { def: 'definition', syn: 'synonyms', rules: 'business_rules', usage: 'usage_examples' };
export function saveTerm(id, upd) {
  const t = T(id); if (!t) return 0;
  const changed = [];
  Object.entries(upd).forEach(([k, v]) => { if (JSON.stringify(v) !== JSON.stringify(t[k])) changed.push(FIELD_LABEL[k] || k); });
  Object.assign(t, upd);
  if (changed.length) log(id, 'Changed ' + changed.join(', '));
  emit();
  return changed.length;
}

export function createTerm({ name, g, parent, def, owner, steward, custodian, syn }) {
  const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const t = { id, name, status: 'draft', g, parent: parent || null, def: def || WD(name), owner: owner || '', steward: steward || '', custodian: custodian || '', syn: syn || [], rules: [], usage: [], notes: '', linked: [], hist: [] };
  TERMS.push(t); log(id, 'Created as draft'); emit();
  return id;
}

export function deleteTerm(id) {
  const t = T(id); if (!t) return;
  kids(id).forEach((k) => { k.parent = null; });
  TERMS = TERMS.filter((x) => x.id !== id);
  ACTIVITY.unshift({ term: id, what: `Deleted "${t.name}"`, t: now(), who: ME });
  emit();
}

export function linkAssets(id, sel) { const t = T(id); if (!t || !sel.length) return; t.linked.push(...sel); log(id, `Linked ${sel.length} asset(s)`); emit(); }
export function unlinkAsset(id, a) { const t = T(id); if (!t) return; t.linked = t.linked.filter((x) => x !== a); log(id, `Unlinked ${a}`); emit(); }

/* ---------- toast (tiny pub/sub) ---------- */
let toastCb = null;
export const registerToast = (cb) => { toastCb = cb; };
export const toast = (m) => { if (toastCb) toastCb(m); };
