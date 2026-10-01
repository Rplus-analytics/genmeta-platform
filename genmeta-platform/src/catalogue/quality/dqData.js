/* Demo data for the data-quality monitoring, anomalies, incidents, alerts,
   notification rules and trend charts. Values copy the data-quality-v2 prototype.
   The profiling / dimensions / rules / scorecards tabs keep deriving from the real
   catalogue model (metrics.js); this module only adds the monitoring-side material
   that the dataset has no signal for. Asset keys here are real catalogue keys so the
   cross-page links (Catalogue badge, product publish block) land on real assets. */

export const PEOPLE = { Raghav: 'RG', Madhavi: 'MD', PK: 'PK', Priya: 'PT', Rajesh: 'RJ', Admin: 'A' };
export const DIMS = ['completeness', 'uniqueness', 'validity', 'consistency', 'timeliness', 'accuracy'];
export const DIML = { completeness: 'Completeness', uniqueness: 'Uniqueness', validity: 'Validity', consistency: 'Consistency', timeliness: 'Timeliness', accuracy: 'Accuracy' };
export const DIMD = { completeness: 'No missing values, empty strings or missing rows', uniqueness: 'No duplicate keys or values', validity: 'Values match the expected shape and range', consistency: 'Same types and counts across related assets', timeliness: 'Data arrives and changes when expected', accuracy: 'Agrees with its source or a reference' };

export const AUTHORISERS = ['Madhavi (governance lead)', 'Raghav (product owner)'];
export const ACTION_LABEL = { reprofile: 'Reprofile', reharvest: 'Reharvest', quarantine: 'Quarantine', task: 'Create task', ai: 'AI describe' };

export const STL = { triage: 'Triage', investigating: 'Investigating', resolved: 'Resolved', fp: 'False positive' };
export const INCIDENTS = [
  { id: 'INC-1042', rule: 'R1', title: 'Order master refreshed daily', asset: 'PRL.ORDER_MASTER', dim: 'timeliness', kind: 'Rule', sev: 'high', status: 'triage', pri: 'Low', own: 'PK', first: '28 Sep', last: '1 Oct, 20:13', n: 4, measured: 'last change 1,402 h ago', expect: 'within 24 h' },
  { id: 'INC-1041', rule: 'R3', title: 'Line item key is unique', asset: 'SRC.LINEITEM', dim: 'uniqueness', kind: 'Rule', sev: 'high', status: 'investigating', pri: 'Medium', own: 'Madhavi', first: '30 Sep', last: '1 Oct, 20:13', n: 3, measured: '54.5% distinct', expect: '≥ 99%' },
  { id: 'INC-1040', rule: 'R6', title: 'Row count shifted 31%', asset: 'STG.ORDER_ITEM_SUMMARY', dim: 'completeness', kind: 'Anomaly', sev: 'medium', status: 'triage', pri: 'Medium', own: 'Madhavi', first: '1 Oct', last: '1 Oct, 20:13', n: 1, measured: '31 rows', expect: 'usual 45 ± 4 (z = 3.9)' },
  { id: 'INC-1039', rule: 'R2', title: 'Customer email present', asset: 'S3_ENR.CUSTOMER_SUMMARY', dim: 'completeness', kind: 'Rule', sev: 'medium', status: 'investigating', pri: 'Medium', own: 'Raghav', first: '27 Sep', last: '1 Oct, 08:00', n: 5, measured: '83.3% filled', expect: '≥ 100%' },
  { id: 'INC-1038', rule: null, title: 'Accuracy dropped 3 runs in a row', asset: 'S3_ENR.CUSTOMER_SUMMARY', dim: 'accuracy', kind: 'Anomaly', sev: 'high', status: 'triage', pri: 'Medium', own: 'Raghav', first: '29 Sep', last: '1 Oct, 08:00', n: 3, measured: '16.7%', expect: 'usual 98% (shift 81%)' },
  { id: 'INC-1037', rule: 'R4', title: 'Orders match source', asset: 'INT.ORDERS', dim: 'accuracy', kind: 'Rule', sev: 'low', status: 'resolved', pri: 'High', own: 'Raghav', first: '24 Sep', last: '25 Sep', n: 2, measured: '23 of 24 rows', expect: '≥ 100%' },
  { id: 'INC-1036', rule: 'R5', title: 'Balance in range', asset: 'SRC.CUSTOMER', dim: 'validity', kind: 'Rule', sev: 'low', status: 'fp', pri: 'High', own: 'Priya', first: '22 Sep', last: '22 Sep', n: 1, measured: 'max 52,100', expect: '0 – 50,000' },
];

/* latest result per rule and asset (DQM-04) */
export const RESULTS = [
  ['fail', 'Order master refreshed daily', 'PRL.ORDER_MASTER', 'timeliness', 'last change 1,402 h ago', 'within 24 h', 'Schedule', '1 Oct, 20:13'],
  ['fail', 'Line item key is unique', 'SRC.LINEITEM', 'uniqueness', '54.5% distinct', '≥ 99%', 'Data change', '1 Oct, 20:13'],
  ['fail', 'Customer email present', 'S3_ENR.CUSTOMER_SUMMARY', 'completeness', '83.3% filled', '≥ 100%', 'Schedule', '1 Oct, 20:13'],
  ['pass', 'Orders match source', 'INT.ORDERS', 'accuracy', '24 of 24 rows', '≥ 100%', 'Schedule', '1 Oct, 20:13'],
  ['pass', 'Balance in range', 'SRC.CUSTOMER', 'validity', 'max 18,500', '0 – 50,000', 'Manual', '1 Oct, 19:40'],
  ['pass', 'Order item volume', 'STG.ORDER_ITEM_SUMMARY', 'completeness', '31 rows', 'learned band 28 – 52', 'Data change', '1 Oct, 20:13'],
];

export const ALS = { open: 'Open', ack: 'Acknowledged', resolved: 'Resolved' };
export const ALERTS = [
  { id: 'AL-311', inc: 'INC-1042', t: 'Order master refreshed daily failed', a: 'PRL.ORDER_MASTER', sev: 'high', to: 'PK (owner), Priya (steward)', mail: 'Delivered', st: 'open', w: '1 Oct, 20:13' },
  { id: 'AL-310', inc: 'INC-1041', t: 'Line item key is unique failed', a: 'SRC.LINEITEM', sev: 'high', to: 'Madhavi (owner), Priya (steward)', mail: 'Delivered', st: 'ack', w: '1 Oct, 20:13' },
  { id: 'AL-309', inc: 'INC-1040', t: 'Anomaly: row count shifted 31%', a: 'STG.ORDER_ITEM_SUMMARY', sev: 'medium', to: 'Madhavi (owner), Priya (steward)', mail: 'Sent', st: 'open', w: '1 Oct, 20:13' },
  { id: 'AL-308', inc: 'INC-1039', t: 'Customer email present failed', a: 'S3_ENR.CUSTOMER_SUMMARY', sev: 'medium', to: 'Raghav (owner), Priya (steward)', mail: 'Bounced: retrying', st: 'ack', w: '1 Oct, 08:00' },
  { id: 'AL-305', inc: 'INC-1037', t: 'Orders match source failed', a: 'INT.ORDERS', sev: 'low', to: 'Raghav (owner), Priya (steward)', mail: 'Delivered', st: 'resolved', w: '25 Sep, 11:40' },
];

/* anomalies beyond the rules (DQM-05) */
export const ANOMS = [
  { a: 'STG.ORDER_ITEM_SUMMARY', m: 'Row count', now: '31', usual: '45 (range 41 – 49)', how: 'Robust z-score 3.9 over the metric history (threshold 3.5)', n: 28, inc: 'INC-1040', why: 'The row count fell by 14 compared with its usual level. SRC.LINEITEM, which feeds this view, also loaded fewer rows in the same harvest, so the drop most likely starts upstream rather than in this view.', check: ['Check the last SRC.LINEITEM load: was the source extract partial?', 'Compare order dates in the missing rows: is one day absent?', 'If the source is correct, re-harvest STG.ORDER_ITEM_SUMMARY.'] },
  { a: 'S3_ENR.CUSTOMER_SUMMARY', m: 'Accuracy', now: '16.7%', usual: '98%', how: 'Level shift: last 3 runs moved 81% from the earlier level (threshold 25%)', n: 14, inc: 'INC-1038', why: 'Accuracy reconciles this file against S3_CLN.CUSTOMER. Since 29 Sep only 1 of 6 rows matches. S3_CLN.CUSTOMER also changed its column order on that date, so the enrichment job is likely reading columns in the wrong position.', check: ['Open the 29 Sep schema change on S3_CLN.CUSTOMER.', 'Check the enrichment job mapping by column name, not position.', 'Re-profile after the fix to clear the shift.'] },
  { a: 'SRC.CUSTOMER', m: 'Distinct SEGMENT', now: '3', usual: '4 (constant)', how: 'Changed from a previously constant value', n: 30, inc: null, why: 'SEGMENT has had exactly 4 distinct values for every reading on record. The latest reading has 3, so one segment is missing or two were merged.', check: ['List the 4 segments from the previous snapshot and find the missing one.', 'Ask the owner whether the change was intended.'] },
];

export const NOTIF_SEED = [
  { name: 'Critical and high to owners', ch: 'Email', to: 'Asset owner and steward', f: 'Severity: High · Priority: Critical, High', on: true },
  { name: 'Finance data to #fin-data', ch: 'Slack', to: '#fin-data', f: 'Domain: Finance · any severity', on: true },
  { name: 'Everything in the app', ch: 'In-app', to: 'Owner, steward, watchers', f: 'All incidents', on: true },
];

/* seed quarantine + remediation record on a real asset so cross-page links work */
export const QUARANTINE_SEED = [
  { asset: 'PRL.ORDER_MASTER', why: 'Breaking — "Order master refreshed daily" failed 4 runs in a row', since: '29 Sep 2026', by: 'PK' },
];
export const REMEDIATION_SEED = [
  { when: '2026-10-01T20:13', asset: 'PRL.ORDER_MASTER', rule: 'Order master refreshed daily', actions: 'Task created · Quarantine kept', routedTo: 'PK (owner)', authorisedBy: 'Madhavi · governance lead', task: true },
  { when: '2026-10-01T08:00', asset: 'S3_ENR.CUSTOMER_SUMMARY', rule: 'Customer email present', actions: 'Reprofiled · Task created', routedTo: 'Raghav (owner), Priya (steward)', authorisedBy: 'Raghav · product owner', task: true },
  { when: '2026-09-30T14:20', asset: 'SRC.LINEITEM', rule: 'Line item key is unique', actions: 'Task created · AI description drafted', routedTo: 'Madhavi (owner)', authorisedBy: 'Madhavi · governance lead', task: true },
  { when: '2026-09-29T09:05', asset: 'PRL.ORDER_MASTER', rule: 'Order master refreshed daily', actions: 'Quarantined', routedTo: 'PK (steward)', authorisedBy: 'Madhavi · governance lead', task: false },
  { when: '2026-09-25T11:40', asset: 'INT.ORDERS', rule: 'Orders match source', actions: 'Reharvested', routedTo: 'Raghav (owner)', authorisedBy: 'Raghav · product owner', task: false },
];

export const ACTIVITY = [
  ['Today', [['MD', 'Madhavi', 'changed INC-1041 to Investigating', '20:40'], ['A', 'GenMeta', 'ran 6 checks on schedule: 3 failed', '20:13'], ['A', 'GenMeta', 'flagged an anomaly on STG.ORDER_ITEM_SUMMARY', '20:13'], ['RG', 'Raghav', 'started investigating INC-1039', '09:12']]],
  ['Yesterday', [['MD', 'Madhavi', 'wrote rule "Line item key is unique"', '14:18'], ['A', 'GenMeta', 'created a task for SRC.LINEITEM', '14:20'], ['PT', 'Priya', 'marked INC-1036 as False positive', '10:02']]],
  ['29 Sep', [['PK', 'PK', 'quarantined PRL.ORDER_MASTER', '09:05'], ['KS', 'Karan', 'added a Slack notification rule', '08:30']]],
];

/* 30 days of trend: high/medium/low incident counts, score, time-to-resolve, outcome counts */
export const TREND = (() => {
  let s = 7; const out = []; const r = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  for (let i = 0; i < 30; i++) {
    const h = r() < 0.25 ? 1 + Math.floor(r() * 2) : 0, m = r() < 0.35 ? 1 + Math.floor(r() * 2) : 0, l = r() < 0.3 ? 1 : 0;
    const non = 40 + Math.floor(r() * 8);
    const sc = Math.max(52, Math.min(100, Math.round(100 - (h * 9 + m * 5 + l * 2) - r() * 4)));
    out.push({ h, m, l, non, sc, ttr: +(6 + r() * 30).toFixed(1), res: Math.floor(r() * 3), fp: r() < 0.15 ? 1 : 0, inv: i > 25 ? 1 + Math.floor(r() * 2) : 0, tri: i > 27 ? 1 + Math.floor(r() * 2) : 0 });
  }
  return out;
})();
export const DAYS = (() => {
  const a = []; const d = new Date(2026, 8, 2); const M = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  for (let i = 0; i < 30; i++) { const x = new Date(d); x.setDate(d.getDate() + i); a.push(x.getDate() + ' ' + M[x.getMonth()]); }
  return a;
})();

/* per-dimension parameter fields keyed by check template */
export const TEMPLATES = {
  completeness: [['No missing values', 'Every value in the column is filled in'], ['Row count within range', 'The table has between a low and high number of rows']],
  uniqueness: [['Values are unique', 'No value appears twice']],
  validity: [['Values match the expected shape', 'Email, postcode, date, or a pattern you pick'], ['Numbers stay within range', 'Between a minimum and maximum']],
  consistency: [['Every key exists in the parent', 'Each ID can be found in the parent table']],
  timeliness: [['Updated recently enough', 'The asset changed within the last N hours']],
  accuracy: [['Row count agrees with the upstream', 'Same number of rows as its source']],
};
/* which parameter fields a template needs: [{label,key,placeholder,kind,options?}] */
export function paramFields(tpl) {
  const t = tpl || '';
  if (/recently/.test(t)) return [{ label: 'Updated within (hours)', key: 'p1', placeholder: '24' }];
  if (/stay within range|Row count within/.test(t)) return [{ label: 'Minimum', key: 'p1', placeholder: '0' }, { label: 'Maximum', key: 'p2', placeholder: '50000' }];
  if (/shape/.test(t)) return [{ label: 'Expected shape', key: 'p1', kind: 'select', options: ['Email', 'UK postcode', 'Date', 'NI number', 'Custom pattern'] }];
  if (/parent/.test(t)) return [{ label: 'Parent table and key', key: 'p1', placeholder: 'SRC.CUSTOMER.CUSTOMER_ID' }];
  if (/upstream/.test(t)) return [{ label: 'Upstream asset', key: 'p1', placeholder: 'SRC.ORDERS' }];
  return [];
}
export function paramText(d) {
  const t = d.tpl || '';
  if (/recently/.test(t) && d.p1) return ` within ${d.p1} h`;
  if (/range/.test(t) && (d.p1 || d.p2)) return ` between ${d.p1 || '…'} and ${d.p2 || '…'}`;
  if (/shape/.test(t) && d.p1) return ` as ${d.p1}`;
  if (/parent|upstream/.test(t) && d.p1) return ` against ${d.p1}`;
  return '';
}

export const sevLabel = (s) => s[0].toUpperCase() + s.slice(1);
export const fmtWhen = (iso) => { try { return new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }); } catch { return iso; } };
