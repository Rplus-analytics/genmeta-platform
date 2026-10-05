/* Governance › Stewardship — test data on the same 37-asset estate as the rest of the app
   (catalogue, Access & RBAC, DPIA & GDPR). People are the same test people used elsewhere. */
import { ASSETS } from '../catalogue/model.js';
import { ASSET_NAMES, PD_MAP, systemOf, sensitivityOf, colClass } from './data.js';

const MAP_PERSON = { PK: 'Pradeep Kumar', Priya: 'Priya Shah', 'Meera Shah (test user)': 'Meera Shah' };
const person = (p) => MAP_PERSON[p] || p;
export const catOf = (a) => ASSETS.find((x) => x.fqn === a);
export const columnsOfAsset = (a) => (catOf(a)?.columns.map((c) => c.name)) || (PD_MAP.find((x) => x.asset === a)?.cols || []);
export const datasetOf = (a) => a.slice(0, a.indexOf('.'));
const kindOf = (a) => { const k = catOf(a)?.kind; return k === 'report' || k === 'dashboard' || a.startsWith('BI.') ? 'report' : ['api', 'file', 'topic'].includes(k) || /^(API|S3_|STREAMING)/.test(a) ? 'file, API or topic' : 'table'; };

export const HOW = { a: 'assigned', i: 'inherited from dataset', m: 'imported', d: 'configured default' };
/* built-in roles always have a column; bespoke roles from the governance model get theirs too */
export const ROLE_COLS = [['owner', 'Data owner'], ['steward', 'Data steward'], ['custodian', 'Data custodian']];
export const BUILT_IN = ['owner', 'steward', 'custodian'];

/* ---------------------------------------------------------------- the ownership register (37 assets) */
const NO_OWNER = ['API.POST_orders', 'BI.Customer Churn Analysis'];
const C = (who, how) => ({ who, how });
export const REGISTER = ASSET_NAMES.map((a) => {
  const cat = catOf(a); const ds = datasetOf(a);
  const owner = NO_OWNER.includes(a) ? null : C(person(cat?.owner || 'Pradeep Kumar'), cat?.owner ? (ds === 'INT' || ds === 'SRC' ? 'm' : 'd') : 'd');
  const st = cat?.steward ? C(person(cat.steward), ds === 'INT' && cat.steward === 'Rajesh' ? 'i' : 'a') : null;
  const roles = { owner, steward: st, custodian: null, privacy: null, 'records-manager': null };
  if (['INT.CUSTOMER', 'INT.LINEITEM', 'INT.NATION'].includes(a)) roles.custodian = C('Owen Hughes', 'a');
  if (ds === 'SRC') roles.privacy = C('Dana Whitfield', 'i');
  if (['PRL.ORDER_MASTER', 'SRC.CUSTOMER', 'BI.Order Revenue Report'].includes(a)) roles['records-manager'] = C('Noor Ali', 'a');
  return { asset: a, system: systemOf(a), sens: sensitivityOf(a), kind: kindOf(a), roles };
});

/* who assigned what, shown when an asset is opened */
const T1 = '19 Sept 2026, 15:44';
export const ASSIGN_LOG = {
  'INT.CUSTOMER': [['Data custodian', 'Owen Hughes', 'assigned by Admin 24 Sept 2026, 08:12']],
  'INT.LINEITEM': [['Data custodian', 'Owen Hughes', 'assigned by Admin 24 Sept 2026, 08:49']],
  'INT.NATION': [['Data custodian', 'Owen Hughes', 'assigned by Admin 24 Sept 2026, 08:49']],
  'BI.Supplier Performance': [['Data owner', 'Meera Shah', `assigned by Raghav ${T1}, approved by Admin`]],
};
export const DEFAULT_BY = `by Admin ${T1}`;
/* column-level assignments override the asset's role for that column */
export const COLUMN_ROLES = [{ asset: 'SRC.CUSTOMER', column: 'ACCOUNT_BALANCE', role: 'steward', who: 'Dana Whitfield' }];
export const PEOPLE = ['Admin', 'Raghav', 'Rajesh', 'Pradeep Kumar', 'Priya Shah', 'Dana Whitfield', 'Emma Clarke', 'Sam Okafor', 'Owen Hughes', 'Aisha Khan', 'Meera Shah', 'Noor Ali', 'Tom Reid'];

/* ---------------------------------------------------------------- roles & responsibilities — governance model v7 */
export const RESPONSIBILITIES = [
  'Accountable for the asset and its use', 'Approve or decline access requests', 'Grant and revoke access directly', 'Approve ownership and governance changes',
  'Raise, triage and resolve data-quality issues', 'Maintain descriptions, terms and classifications', 'Operate storage, security, backup and retention', 'Review coverage, audit and compliance',
];
export const MODEL_ROLES = [
  { key: 'owner', name: 'Data owner', builtIn: true, desc: 'Accountable individual for the asset.', resp: '11110001' },
  { key: 'steward', name: 'Data steward', builtIn: true, desc: 'Looks after quality and meaning day to day.', resp: '01101100' },
  { key: 'custodian', name: 'Data custodian', builtIn: true, desc: 'Runs the technical environment that holds the data.', resp: '00000010' },
  { key: 'privacy', name: 'Privacy lead', builtIn: false, desc: 'Signs off access to personal data and reviews privacy risk.', resp: '01000001' },
  { key: 'records-manager', name: 'TEST Records manager', builtIn: false, desc: 'Keeps records under the retention schedule and arranges disposal.', resp: '00000011' },
];
export const MODEL_CHANGES = [
  ['v7', '30 Sept 2026, 10:20', 'Admin', 'created bespoke role TEST Records manager with technical_custody, governance_oversight'],
  ['v6', '24 Sept 2026, 07:04', 'Admin', 'removed role Data Analyst'],
  ['v5', '24 Sept 2026, 07:01', 'Admin', 'changed role Data Analyst; added accountability, approve_access, maintain_metadata'],
  ['v4', '24 Sept 2026, 07:00', 'Admin', 'created bespoke role Data Analyst with no responsibilities'],
  ['v3', T1, 'Admin', 'access policy for Confidential set to owner or steward, 120 days, justification, mask sensitive'],
  ['v2', T1, 'Admin', 'created bespoke role Privacy lead with approve_access, governance_oversight'],
];

/* ---------------------------------------------------------------- approvals & data-quality issues */
export const CHANGE_REQUESTS = [{ id: 'cr0', asset: 'BI.Supplier Performance', scope: 'asset', role: 'owner', person: 'Meera Shah', change: 'Data owner on BI.Supplier Performance: Raghav → Meera Shah', by: 'Raghav', at: T1, reason: 'Supplier reporting moves to procurement', status: 'approved', decidedBy: 'Admin', decidedAt: T1 }];
const RULE = {
  S: 'GDPR: Every asset holding personal data has a named steward — no steward assigned',
  R: 'GDPR: Every asset holding personal data appears in a record of processing — not in any accepted record of processing',
};
export const QUALITY_ISSUES = [
  { id: 'q1', title: RULE.S, asset: 'API.GET_customers_customerId', by: 'scheduler', at: '2 Oct 2026, 08:15', routed: '', status: 'open' },
  { id: 'q2', title: RULE.S, asset: 'PRL.ORDER_MASTER', by: 'scheduler', at: '2 Oct 2026, 08:15', routed: '', status: 'open' },
  { id: 'q3', title: RULE.R, asset: 'STG.CUSTOMER_ORDER', by: 'scheduler', at: '2 Oct 2026, 08:15', routed: '', status: 'open' },
  { id: 'q4', title: 'Order master refreshed daily failed: last change 446 h ago, expected within 24 h', asset: 'PRL.ORDER_MASTER', by: 'self-remediation', at: '20 Sept 2026, 06:39', routed: '', status: 'open' },
  { id: 'q5', title: 'Duplicate customer keys after the nightly load', asset: 'INT.CUSTOMER', by: 'Emma Clarke', at: '1 Oct 2026, 14:02', routed: 'Priya Shah', status: 'open' },
  { id: 'q6', title: 'Nulls found in ACCOUNT_BALANCE', asset: 'SRC.CUSTOMER', by: 'Priya Shah', at: T1, routed: 'Rajesh', status: 'resolved by Rajesh: Back-filled from the source ledger' },
];

/* ---------------------------------------------------------------- audit trail (latest first) */
const noSteward = REGISTER.filter((r) => !r.roles.steward && PD_MAP.some((x) => x.asset === r.asset)).map((r) => r.asset);
const scheduled = ['2 Oct 2026, 08:15', '1 Oct 2026, 08:15', '30 Sept 2026, 08:15'].flatMap((at) => noSteward.slice(0, 6).map((a) => ({ at, who: 'scheduler', action: 'quality.raise', on: a, what: `raised quality issue “${RULE.S}” → no steward`, cat: 'ownership.quality' })));
const older = [
  { at: '1 Oct 2026, 14:02', who: 'Emma Clarke', action: 'quality.raise', on: 'INT.CUSTOMER', what: 'raised quality issue “Duplicate customer keys after the nightly load” → Priya Shah', cat: 'ownership.quality' },
  { at: '30 Sept 2026, 11:05', who: 'Admin', action: 'ownership.assign', on: 'PRL.ORDER_MASTER', what: 'TEST Records manager → Noor Ali', cat: 'ownership.assign' },
  { at: '30 Sept 2026, 10:20', who: 'Admin', action: 'ownership.model', on: 'governance model v7', what: 'created bespoke role TEST Records manager', cat: 'ownership.model' },
  { at: '28 Sept 2026, 16:40', who: 'Priya Shah', action: 'ownership.resolve.refused', on: 'PRL.ORDER_MASTER', what: 'refused — Priya Shah is not the steward of PRL.ORDER_MASTER (no steward) and is not a governance lead', cat: 'ownership.denied' },
  { at: '24 Sept 2026, 08:49', who: 'Admin', action: 'ownership.assign', on: 'INT.NATION', what: 'Data custodian → Owen Hughes', cat: 'ownership.assign' },
  { at: '24 Sept 2026, 08:49', who: 'Admin', action: 'ownership.assign', on: 'INT.LINEITEM', what: 'Data custodian → Owen Hughes', cat: 'ownership.assign' },
  { at: '24 Sept 2026, 08:12', who: 'Admin', action: 'ownership.assign', on: 'INT.CUSTOMER', what: 'Data custodian → Owen Hughes', cat: 'ownership.assign' },
  { at: '24 Sept 2026, 07:04', who: 'Admin', action: 'ownership.model', on: 'governance model v6', what: 'removed role Data Analyst', cat: 'ownership.model' },
  { at: T1, who: 'Admin', action: 'ownership.change.approve', on: 'BI.Supplier Performance', what: 'approved owner change → Meera Shah', cat: 'ownership.change' },
  { at: T1, who: 'Raghav', action: 'ownership.change.request', on: 'BI.Supplier Performance', what: 'requested Data owner → Meera Shah: Supplier reporting moves to procurement', cat: 'ownership.change' },
  { at: T1, who: 'Rajesh', action: 'quality.resolve', on: 'SRC.CUSTOMER', what: 'resolved “Nulls found in ACCOUNT_BALANCE” — Back-filled from the source ledger', cat: 'ownership.quality' },
  { at: T1, who: 'Admin', action: 'ownership.model', on: 'governance model v2', what: 'created bespoke role Privacy lead', cat: 'ownership.model' },
  { at: T1, who: 'Admin', action: 'ownership.assign', on: 'dataset SRC', what: 'Privacy lead → Dana Whitfield (inherited by 6 tables)', cat: 'ownership.assign' },
  { at: T1, who: 'Admin', action: 'ownership.assign', on: 'dataset INT', what: 'Data steward → Rajesh (inherited by 5 tables)', cat: 'ownership.assign' },
];
export const AUDIT_TRAIL = [...scheduled, ...older];
export const AUDIT_FILTERS = [['', 'All actions'], ['ownership.assign', 'Assignments'], ['ownership.change', 'Change requests'], ['ownership.model', 'Governance model'], ['ownership.quality', 'Quality'], ['access', 'Access'], ['ownership.denied', 'Refused actions']];

/* ---------------------------------------------------------------- review queue — classification reviews and ownership gaps */
export const LABEL_REASON = {
  PII: 'Matches PII patterns — name/identifier that can be linked to a person', FINANCIAL: 'Matches financial patterns — balance, price or amount fields',
  SPECIAL_CATEGORY: 'Matches special_category classification patterns', GOVERNMENT_ID: 'Matches government_id classification patterns',
};
export const domainOf = (a) => (/CUSTOMER|customer/.test(a) ? 'Customer' : /ORDER|order|Revenue/.test(a) ? 'Orders' : /PART/.test(a) ? 'Products' : /SUPPLIER|Supplier/.test(a) ? 'Suppliers' : /NATION/.test(a) ? 'Geography' : /LINEITEM/.test(a) ? 'Order items' : 'Other');
const CLS_REVIEW = [['INT.CUSTOMER', 'DISABILITY_FLAG'], ['API.GET_customers', 'ethnicity'], ['API.GET_customers', 'nino'], ['SQL_SRC.CUSTOMER', 'NI_NUMBER'], ['SRC.CUSTOMER', 'ACCOUNT_BALANCE']];
export const QUEUE = [
  ...CLS_REVIEW.map(([asset, column], i) => { const label = colClass(column); return { id: `c${i}`, priority: ['SPECIAL_CATEGORY', 'GOVERNMENT_ID'].includes(label) ? 'High' : 'Medium', type: 'Classification', label, column, asset, task: `${label} classification review for ${column}`, by: 'Classifier (AI)', status: 'In review', system: systemOf(asset), domain: domainOf(asset) }; }),
  ...NO_OWNER.map((asset, i) => ({ id: `o${i}`, priority: sensitivityOf(asset) === 'Restricted' ? 'High' : 'Medium', type: 'Ownership', asset, task: `Assign an owner for ${asset.slice(asset.indexOf('.') + 1)}`, by: 'Metadata scan', status: 'Open', system: systemOf(asset), domain: domainOf(asset), reason: 'No accountable owner' })),
].sort((a, b) => (a.priority === b.priority ? 0 : a.priority === 'High' ? -1 : 1));
