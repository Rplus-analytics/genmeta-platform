/* Data products — demo data, following Atlan's screens.
   The 6 existing products (Customer 360, Finance Ledger, Casework Insights,
   Web Engagement, Document Index, Streaming Orders) are kept exactly as they were;
   domains, ports, scores and the rest are added so the marketplace has something to show. */

/* asset catalogue: id -> [source system, asset type] */
export const ASSET = {
  'INT.CUSTOMER': ['Rplus_DWH', 'view'], 'INT.ORDERS': ['Rplus_DWH', 'view'], 'INT.LINEITEM': ['Rplus_DWH', 'view'],
  'PRL.ORDER_MASTER': ['Rplus_DWH', 'view'], 'SRC.CUSTOMER': ['Rplus_DWH', 'table'], 'SRC.ORDERS': ['Rplus_DWH', 'table'],
  'SRC.LINEITEM': ['Rplus_DWH', 'table'], 'STG.CUSTOMER_ORDER': ['Rplus_DWH', 'view'], 'STG.ORDER_ITEM_SUMMARY': ['Rplus_DWH', 'view'],
  'STREAMING.customer-value': ['Rplus Streaming (Confluent)', 'topic'], 'STREAMING.order-events': ['Rplus Streaming (Confluent)', 'topic'],
  'S3_RAW.CUSTOMER': ['Rplus Amazon S3', 'file'], 'S3_RAW.ORDERS': ['Rplus Amazon S3', 'file'], 'S3_CLN.CUSTOMER': ['Rplus Amazon S3', 'file'],
  'S3_CLN.ORDERS': ['Rplus Amazon S3', 'file'], 'S3_ENR.CUSTOMER_ORDERS': ['Rplus Amazon S3', 'file'], 'S3_ENR.CUSTOMER_SUMMARY': ['Rplus Amazon S3', 'file'],
  'S3_DOCS.FORMS_INDEX': ['Rplus Amazon S3', 'file'], 'SQL_CLN.CUSTOMER': ['Rplus SQL Server', 'view'], 'SQL_ENR.CUSTOMER_ORDERS': ['Rplus SQL Server', 'view'],
  'SQL_FIN.GENERAL_LEDGER': ['Rplus SQL Server', 'table'], 'SQL_FIN.PAYMENTS': ['Rplus SQL Server', 'table'], 'SQL_OPS.CASES': ['Rplus SQL Server', 'table'],
  'SQL_OPS.CASE_SLA': ['Rplus SQL Server', 'view'], 'WEB.SESSIONS': ['Rplus_DWH', 'table'], 'WEB.CAMPAIGN_EVENTS': ['Rplus_DWH', 'table'],
  'BI.Customer 360 Dashboard': ['Rplus Reports (Power BI)', 'dashboard'], 'BI.Order Revenue Report': ['Rplus Reports (Power BI)', 'report'],
  'BI.Customer Churn Analysis': ['Rplus Reports (Power BI)', 'report'], 'BI.Month End Close': ['Rplus Reports (Power BI)', 'report'],
  'BI.Casework SLA': ['Rplus Reports (Power BI)', 'dashboard'], 'BI.Fulfilment Live': ['Rplus Reports (Power BI)', 'dashboard'],
  'API.GET_customers': ['Rplus API (Rest API)', 'api'], 'API.GET_orders': ['Rplus API (Rest API)', 'api'],
};

export const DOMAINS = [
  { id: 'customer', name: 'Customer', color: '#4D8CFF', parent: null, owners: ['Raghav'], desc: 'Everything about the people and organisations we serve.', readme: 'Welcome to the Customer domain. Here you will find curated data products about customers, their profiles and how they engage with the department.' },
  { id: 'digital', name: 'Digital engagement', color: '#7FB2FF', parent: 'customer', owners: ['Raghav'], desc: 'Web and campaign behaviour.' },
  { id: 'finance', name: 'Finance', color: '#0E2A57', parent: null, owners: ['Madhavi'], desc: 'Ledger, payments and month-end reporting.', readme: 'Welcome to the Finance domain. Certified finance data products for month-end close, payments and revenue reporting.' },
  { id: 'operations', name: 'Operations', color: '#2F6BD8', parent: null, owners: ['Rajesh'], desc: 'Casework, documents and service levels.', readme: 'Welcome to the Operations domain. Data products that support casework, document handling and operational reporting.' },
  { id: 'documents', name: 'Documents', color: '#A9D3FF', parent: 'operations', owners: ['PK'], desc: 'Scanned forms and document indexes.' },
  { id: 'forecasting', name: 'Forecasting', color: '#3B6FD6', parent: 'finance', owners: ['Madhavi'], desc: 'Budgets, forecasts and operating expense.' },
  { id: 'orders', name: 'Orders', color: '#5B7FB8', parent: null, owners: ['Rajesh'], desc: 'Orders, items and fulfilment.', readme: 'Welcome to the Orders domain. Data products covering orders from placement to fulfilment.' },
  { id: 'fulfilment', name: 'Fulfilment', color: '#9BB7E0', parent: 'orders', owners: ['Rajesh'], desc: 'Real-time order events.' },
];

/* the base six, kept exactly, plus Order Master as a worked draft example */
const BASE = [
  { id: 'customer-360', name: 'Customer 360', owner: 'Raghav', domain: 'customer', desc: 'Unified customer profile across orders, events and casework.', consumers: 128, sources: 3, quality: 96, status: 'published', crit: 'high', sens: 'confidential', vis: 'Public', cert: 'Verified', terms: ['Customer', 'Customer Orders'], tags: ['PII', 'Restricted'], experts: ['Rajesh'],
    inputs: ['INT.CUSTOMER', 'STREAMING.customer-value', 'S3_ENR.CUSTOMER_SUMMARY'], outputs: ['BI.Customer 360 Dashboard', 'API.GET_customers'], assets: ['INT.CUSTOMER', 'SRC.CUSTOMER', 'S3_CLN.CUSTOMER', 'S3_ENR.CUSTOMER_SUMMARY', 'SQL_CLN.CUSTOMER', 'STREAMING.customer-value', 'BI.Customer 360 Dashboard', 'API.GET_customers'],
    sc: [5, 5, 5, 4, 4, 5], created: 'Apr 2026', fresh: '12 min ago', sla: { fresh: ['Every 30 min', '12 min ago', 1], avail: ['99.5%', '99.9%', 1], qual: ['≥ 90%', '96%', 1] }, users: [42, 51, 48, 60, 64, 72] },
  { id: 'finance-ledger', name: 'Finance Ledger', owner: 'Madhavi', domain: 'finance', desc: 'Certified general ledger and payments for month-end reporting.', consumers: 64, sources: 2, quality: 98, status: 'published', crit: 'high', sens: 'confidential', vis: 'Private to domain members', cert: 'Verified', terms: ['Supplier'], tags: ['Finance'], experts: ['PK'],
    inputs: ['SQL_FIN.GENERAL_LEDGER', 'SQL_FIN.PAYMENTS'], outputs: ['BI.Month End Close'], assets: ['SQL_FIN.GENERAL_LEDGER', 'SQL_FIN.PAYMENTS', 'BI.Month End Close', 'BI.Order Revenue Report'],
    sc: [4, 5, 5, 5, 4, 5], created: 'Feb 2026', fresh: '1 h ago', sla: { fresh: ['Daily 06:00', 'Today 05:52', 1], avail: ['99%', '99.7%', 1], qual: ['≥ 95%', '98%', 1] }, users: [20, 22, 30, 25, 28, 31] },
  { id: 'casework-insights', name: 'Casework Insights', owner: 'Rajesh', domain: 'operations', desc: 'Case volumes, SLAs and outcomes for operational reporting.', consumers: 91, sources: 2, quality: 92, status: 'published', crit: 'medium', sens: 'internal', vis: 'Public', cert: 'Verified', terms: ['Customer'], tags: ['Operations'], experts: ['Priya'],
    inputs: ['SQL_OPS.CASES', 'SQL_OPS.CASE_SLA'], outputs: ['BI.Casework SLA'], assets: ['SQL_OPS.CASES', 'SQL_OPS.CASE_SLA', 'BI.Casework SLA'],
    sc: [4, 4, 5, 4, 3, 4], created: 'Jan 2026', fresh: '3 h ago', sla: { fresh: ['Every 4 h', '3 h ago', 1], avail: ['99%', '99.2%', 1], qual: ['≥ 90%', '92%', 1] }, users: [30, 35, 33, 38, 40, 44] },
  { id: 'web-engagement', name: 'Web Engagement', owner: 'Raghav', domain: 'digital', desc: 'Sessionised web and campaign events for product analytics.', consumers: 47, sources: 2, quality: 89, status: 'published', crit: 'medium', sens: 'internal', vis: 'Public', cert: 'Draft', terms: [], tags: ['Marketing'], experts: [],
    inputs: ['WEB.SESSIONS', 'WEB.CAMPAIGN_EVENTS'], outputs: ['BI.Customer Churn Analysis'], assets: ['WEB.SESSIONS', 'WEB.CAMPAIGN_EVENTS', 'BI.Customer Churn Analysis'],
    sc: [2, 4, 5, 3, 3, 3], created: 'May 2026', fresh: '45 min ago', sla: { fresh: ['Hourly', '45 min ago', 1], avail: ['99%', '98.6%', 0], qual: ['≥ 90%', '89%', 0] }, users: [12, 15, 14, 18, 17, 19] },
  { id: 'document-index', name: 'Document Index', owner: 'PK', domain: 'documents', desc: 'Searchable index of scanned forms and documents in S3.', consumers: 23, sources: 1, quality: 85, status: 'sunset', crit: 'low', sens: 'confidential', vis: 'Private to selected members', cert: 'Deprecated', terms: [], tags: ['PII'], experts: [],
    inputs: ['S3_DOCS.FORMS_INDEX'], outputs: ['S3_DOCS.FORMS_INDEX'], assets: ['S3_DOCS.FORMS_INDEX'], announce: 'Being replaced by the new Document Search product on 31 Dec 2026.',
    sc: [1, 3, 5, 4, 2, 2], created: 'Oct 2025', fresh: '2 days ago', sla: { fresh: ['Daily', '2 days ago', 0], avail: ['99%', '99.1%', 1], qual: ['≥ 85%', '85%', 1] }, users: [9, 8, 7, 6, 5, 4] },
  { id: 'streaming-orders', name: 'Streaming Orders', owner: 'Rajesh', domain: 'fulfilment', desc: 'Real-time order events for fulfilment dashboards.', consumers: 36, sources: 2, quality: 90, status: 'published', crit: 'high', sens: 'internal', vis: 'Public', cert: 'Verified', terms: ['Orders', 'Lineitem'], tags: ['Real-time'], experts: ['PK'],
    inputs: ['STREAMING.order-events', 'INT.ORDERS'], outputs: ['BI.Fulfilment Live', 'API.GET_orders'], assets: ['STREAMING.order-events', 'INT.ORDERS', 'S3_RAW.ORDERS', 'S3_CLN.ORDERS', 'BI.Fulfilment Live', 'API.GET_orders'],
    sc: [4, 4, 5, 4, 5, 4], created: 'Jun 2026', fresh: '1 min ago', sla: { fresh: ['Under 5 min', '1 min ago', 1], avail: ['99.9%', '99.95%', 1], qual: ['≥ 90%', '90%', 1] }, users: [18, 20, 25, 27, 30, 33] },
  { id: 'order-master', name: 'Order Master', owner: 'PK', domain: 'orders', desc: 'One record per order with totals, ready for revenue and fulfilment reporting.', consumers: 0, sources: 1, quality: 59, status: 'draft', crit: 'medium', sens: 'internal', vis: 'Private to domain members', cert: 'Draft', terms: ['Order Master', 'Orders'], tags: [], experts: [],
    inputs: ['PRL.ORDER_MASTER'], outputs: ['PRL.ORDER_MASTER'], assets: ['PRL.ORDER_MASTER', 'INT.ORDERS', 'INT.LINEITEM'],
    sc: [3, 2, 4, 2, 3, 1], created: 'Sep 2026', fresh: '19 Sep 2026', sla: null, users: [0, 0, 0, 0, 0, 0] },
];

/* defaults for the extra demo products so the domains feel populated */
const mk = (o) => Object.assign({
  consumers: 0, sources: 1, quality: 80, status: 'published', crit: 'medium', sens: 'internal', vis: 'Public', cert: 'Verified',
  terms: [], tags: [], experts: [], sla: { fresh: ['Daily', 'Today 06:10', 1], avail: ['99%', '99.4%', 1], qual: ['≥ 90%', '93%', 1] }, users: [0, 0, 0, 0, 0, 0],
}, o);

const EXTRA = [
  mk({ id: 'payments-reconciliation', name: 'Payments Reconciliation', owner: 'Madhavi', domain: 'finance', desc: 'Matches bank payments to ledger entries so finance can close each day with no unexplained differences.', consumers: 41, sources: 2, quality: 95, crit: 'high', sens: 'confidential', terms: ['Supplier'], tags: ['Finance'], inputs: ['SQL_FIN.PAYMENTS'], outputs: ['SQL_FIN.PAYMENTS', 'BI.Month End Close'], assets: ['SQL_FIN.PAYMENTS', 'SQL_FIN.GENERAL_LEDGER', 'BI.Month End Close'], sc: [4, 5, 5, 5, 4, 5], created: 'Mar 2026', fresh: '2 h ago' }),
  mk({ id: 'revenue-forecast', name: 'Revenue Forecast', owner: 'Madhavi', domain: 'forecasting', desc: 'Monthly revenue forecast built from order history, used by leadership for the quarterly outlook.', consumers: 27, sources: 2, quality: 91, crit: 'high', terms: ['Orders'], inputs: ['INT.ORDERS'], outputs: ['BI.Order Revenue Report'], assets: ['INT.ORDERS', 'S3_ENR.CUSTOMER_ORDERS', 'BI.Order Revenue Report'], sc: [5, 5, 5, 4, 5, 5], created: 'Jul 2026', fresh: '1 day ago' }),
  mk({ id: 'operating-expense', name: 'Operating Expense', owner: 'PK', domain: 'forecasting', desc: 'Operating expense by cost centre, so budget holders can track spend against plan.', consumers: 19, sources: 1, quality: 88, crit: 'medium', inputs: ['SQL_FIN.GENERAL_LEDGER'], outputs: ['SQL_FIN.GENERAL_LEDGER'], assets: ['SQL_FIN.GENERAL_LEDGER'], sc: [4, 4, 5, 4, 4, 4], created: 'Aug 2026', fresh: '5 h ago' }),
  mk({ id: 'supplier-spend', name: 'Supplier Spend', owner: 'Madhavi', domain: 'finance', desc: 'Spend by supplier and category, being prepared for procurement reviews.', status: 'draft', cert: 'Draft', quality: 72, inputs: ['SQL_FIN.PAYMENTS'], outputs: ['SQL_FIN.PAYMENTS'], assets: ['SQL_FIN.PAYMENTS'], sc: [2, 3, 5, 2, 2, 1], created: 'Sep 2026', fresh: '3 days ago', sla: null }),
  mk({ id: 'returns-refunds', name: 'Returns and Refunds', owner: 'Rajesh', domain: 'orders', desc: 'Returned items and refunds per order, linked back to the original order line.', consumers: 14, sources: 2, quality: 90, terms: ['Orders', 'Lineitem'], inputs: ['INT.LINEITEM', 'INT.ORDERS'], outputs: ['API.GET_orders'], assets: ['INT.LINEITEM', 'INT.ORDERS', 'API.GET_orders'], sc: [4, 4, 5, 4, 4, 4], created: 'Mar 2026', fresh: '30 min ago' }),
  mk({ id: 'customer-churn', name: 'Customer Churn Signals', owner: 'Raghav', domain: 'customer', desc: 'Early warning signals for customers likely to leave, scored weekly from engagement and casework.', consumers: 33, sources: 3, quality: 87, crit: 'high', sens: 'confidential', terms: ['Customer'], tags: ['PII'], inputs: ['INT.CUSTOMER', 'WEB.SESSIONS', 'SQL_OPS.CASES'], outputs: ['BI.Customer Churn Analysis'], assets: ['INT.CUSTOMER', 'WEB.SESSIONS', 'SQL_OPS.CASES', 'BI.Customer Churn Analysis'], sc: [5, 4, 5, 4, 4, 4], created: 'Aug 2026', fresh: 'Weekly · Mon 07:00' }),
  mk({ id: 'legacy-case-extract', name: 'Legacy Case Extract', owner: 'Rajesh', domain: 'operations', desc: 'Old nightly case extract, replaced by Casework Insights. Kept for audit only.', status: 'archived', cert: 'Deprecated', quality: 70, crit: 'low', inputs: ['SQL_OPS.CASES'], outputs: ['SQL_OPS.CASES'], assets: ['SQL_OPS.CASES'], sc: [2, 2, 4, 3, 2, 1], created: 'Nov 2025', fresh: 'Archived', sla: null }),
];

export const PRODUCTS = [...BASE, ...EXTRA];

export const CANDS = [
  { a: 'PRL.ORDER_MASTER', n: 'Order Master', q: 32, s: 59, why: 'Queried 32 times in 30 days' },
  { a: 'STG.CUSTOMER_ORDER', n: 'Customer Order', q: 20, s: 52, why: 'Queried 20 times in 30 days' },
  { a: 'STG.ORDER_ITEM_SUMMARY', n: 'Order Item Summary', q: 14, s: 44, why: 'Queried 14 times in 30 days' },
  { a: 'INT.CUSTOMER', n: 'Customer', q: 9, s: 43, why: 'High value: 2 downstream consumers' },
];

export const PRINC = ['Discoverable', 'Understandable', 'Addressable', 'Secure', 'Interoperable', 'Trustworthy'];
export const CHECK = [
  ['Product has terms linked', 'Link glossary terms to the product'],
  ['Product has a description and readme', 'Add a readme'],
  ['Product and output ports have owners', 'Assign owners to output ports'],
  ['Sensitivity and tags set on output ports', 'Tag output ports'],
  ['Lineage is complete across output ports', 'Complete lineage for output ports'],
  ['Certified with a contract attached', 'Certify the product and add a contract'],
];
export const PST = { draft: ['Draft', 'b-draft'], published: ['Published', 'b-published'], sunset: ['Sunset', 'b-sunset'], archived: ['Archived', 'b-archived'] };
export const STATUS_MEANING = { draft: 'Visible only to owners', published: 'Visible to all users with access', sunset: 'Planned for retirement', archived: 'Retired and hidden for all users' };
export const CRIT = { high: ['High', '#9F2D2D'], medium: ['Medium', '#E3A008'], low: ['Low', '#8694AB'] };
export const SENS = { public: ['Public', '#4D8CFF'], internal: ['Internal', '#2F6BD8'], confidential: ['Confidential', '#0E2A57'] };

export const VIEWS = { 'customer-360': 41, 'finance-ledger': 22, 'casework-insights': 18, 'streaming-orders': 15, 'web-engagement': 9, 'payments-reconciliation': 8, 'customer-churn': 7, 'revenue-forecast': 6 };
export const RECENT = [['customer-360', '18 minutes ago'], ['finance', '2 hours ago'], ['streaming-orders', '3 hours ago'], ['customer', '5 hours ago']];
export const FEEDS = { 'customer-360': ['customer-churn'], 'web-engagement': ['customer-churn'], 'casework-insights': ['customer-churn'], 'streaming-orders': ['returns-refunds', 'revenue-forecast'], 'finance-ledger': ['payments-reconciliation', 'operating-expense'] };
export const STAKE = {
  customer: [['Raghav', 'Domain owner'], ['Rajesh', 'Data product owner'], ['PK', 'Data engineer']],
  finance: [['Madhavi', 'Domain owner'], ['PK', 'Data architect']],
  operations: [['Rajesh', 'Domain owner'], ['Priya', 'Data product owner']],
  orders: [['Rajesh', 'Domain owner'], ['PK', 'Data engineer']],
};
export const MON = ['Oct 25', 'Nov 25', 'Dec 25', 'Jan 26', 'Feb 26', 'Mar 26', 'Apr 26', 'May 26', 'Jun 26', 'Jul 26', 'Aug 26', 'Sep 26', 'Oct 26'];

export const INITIAL_ACT = [
  { p: 'customer-360', what: 'Output port API.GET_customers added', t: '29/09/2026, 10:12', who: 'Raghav' },
  { p: 'document-index', what: 'Status published → sunset', t: '28/09/2026, 16:40', who: 'PK' },
  { p: 'order-master', what: 'Created as draft from usage candidate', t: '19/09/2026, 14:07', who: 'PK' },
  { p: 'finance-ledger', what: 'Certificate set to Verified', t: '15/09/2026, 09:03', who: 'Madhavi' },
];
export const INITIAL_REQS = [{ p: 'finance-ledger', who: 'Venkat', why: 'Quarterly revenue reconciliation', t: '30/09/2026', st: 'pending' }];

/* ---- pure helpers (depend only on static data) ---- */
export const D = (id) => DOMAINS.find((d) => d.id === id);
export const subs = (id) => DOMAINS.filter((d) => d.parent === id);
export const score = (p) => Math.round(p.sc.reduce((a, b) => a + b, 0) / p.sc.length * 10) / 10;
export const sclass = (v) => (v >= 4 ? 's-hi' : v >= 3 ? 's-mid' : 's-lo');
export const ini = (n) => (n ? n.split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase() : '');
export const ainfo = (a) => { const x = ASSET[a] || ['Rplus_DWH', 'table']; return { src: x[0], type: x[1] }; };
export const midx = (s) => { const [m, y] = s.split(' '); return MON.indexOf(m + ' ' + y.slice(2)); };
export const COVER = (c) => `linear-gradient(115deg, ${c} 0%, #4D8CFF 55%, #A9D3FF 100%)`;
export const upstream = (id) => Object.keys(FEEDS).filter((k) => FEEDS[k].includes(id));
export const downstream = (id) => FEEDS[id] || [];
export const typGlyph = (t) => ({ dashboard: '▦', report: '▤', api: '⇄', topic: '≋', file: '▭', table: '▦', view: '◫' }[t] || '▪');
export const now = () => { const d = new Date(); return d.toLocaleDateString('en-GB') + ', ' + d.toLocaleTimeString('en-GB').slice(0, 5); };
