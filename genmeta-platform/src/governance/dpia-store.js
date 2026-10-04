import { useSyncExternalStore } from 'react';
import {
  PD_MAP, ORG, DOMAIN_SYSTEMS, ROPA_DOMAINS, SECURITY_DEFAULT, ICO_TEMPLATE, POLICY_ITEMS, MODELS, CONTROLS, AUDIT, UNUSED,
  colClass, NEW_COLS, writeAudit, onAudit, SUGGESTED_RISKS, riskLevel, LIKELIHOOD, LAWFUL_BASES, SPECIAL_CONDITIONS,
} from './data.js';
import { applicability, hasCriteria } from './applicability.js';

/* DPIA & GDPR — one in-memory store so the DPIA tabs, Governance › Overview (controls, estate dashboard)
   and the audit trail all read the same state: records of processing, assessments, the last rule run,
   the viewing role and the templates. Test data only. */

export const PD_ASSETS = PD_MAP.map((r) => r.asset);
const pd = (a) => PD_MAP.find((r) => r.asset === a);

/* ---------------------------------------------------------------- links (test data) */
export const MODEL_OF = { 'S3_CLN.CUSTOMER': ['customer-value-band'], 'S3_ENR.CUSTOMER_ORDERS': ['customer-value-band'], 'S3_ENR.CUSTOMER_SUMMARY': ['customer-value-band'] };
export const PRODUCTS = [{ name: 'Customer', status: 'published', assets: ['INT.CUSTOMER'], owner: 'Rajesh' }];
export const productsOf = (a) => PRODUCTS.filter((p) => p.assets.includes(a)).map((p) => p.name);
export const modelsOf = (a) => MODEL_OF[a] || [];
export const classesOf = (a) => [...new Set((pd(a)?.cols || []).map(colClass))].sort();
export const STEWARDED = ['INT.CUSTOMER', 'SRC.CUSTOMER'];
/* access grants on personal data with no expiry date (test data) */
export const OPEN_GRANTS = [
  { asset: 'SQL_SRC.CUSTOMER', grantee: 'Finance analysts (group)', since: '12 Mar 2025' },
  { asset: 'API.GET_customers', grantee: 'Partner integration service', since: '2 Jun 2025' },
];
/* test users who can be assigned to each workflow stage */
export const TEST_USERS = {
  assessor: ['Priya Shah', 'Tom Reid', 'Aisha Khan'],
  dpo: ['Dana Whitfield', 'Mark Owusu'],
  lead: ['Admin', 'Sarah Jones'],
};

/* retention: active retention items whose applicability names the asset */
export function retentionOf(a) {
  return POLICY_ITEMS.filter((i) => i.type === 'retention' && i.status === 'active' && hasCriteria(i.applies) && applicability(i).rows.some((r) => r.asset === a));
}
export const retentionText = (i) => `${i.title} — ${(i.retention || '').split(' · ')[0] || 'period not stated'}`;
/* approved = the model has a version that is currently Approved or In production (retired / rejected versions do not count) */
export const modelApproved = (id) => {
  const m = MODELS.find((x) => x.id === id);
  return !!m && m.versionRows.some((v) => ['Approved', 'In production'].includes(v.stage));
};
export const modelStages = (id) => (MODELS.find((x) => x.id === id)?.versionRows || []).map((v) => `${v.v} ${v.stage.toLowerCase()}`).join(', ');

/* ---------------------------------------------------------------- record of processing helpers */
export const recipientsOf = (assets) => {
  const down = [...new Set(assets.flatMap((a) => pd(a)?.shared || []))].filter((x) => !assets.includes(x));
  return [
    ...down.map((x) => ['Downstream asset', x]),
    ...[...new Set(assets.flatMap(productsOf))].map((x) => ['Data product', x]),
    ...[...new Set(assets.flatMap(modelsOf))].map((x) => ['Model', x]),
  ];
};
export const recipientsText = (assets) => recipientsOf(assets).map(([k, v]) => `${k}: ${v}`).join('\n');
export const retentionFor = (assets) => [...new Set(assets.flatMap((a) => retentionOf(a).map((i) => `${i.title} — ${i.retention}`)))].join('\n');

const drafted = (d) => {
  const rows = PD_MAP.filter((r) => r.domain === d);
  const assets = rows.map((r) => r.asset);
  /* the draft was written before harvest v13 found the NINO and special-category columns */
  const cats = [...new Set(rows.flatMap((r) => r.cols.filter((c) => !NEW_COLS.includes(c)).map(colClass)))].sort();
  const later = rows.flatMap((r) => r.cols.filter((c) => NEW_COLS.includes(c)).map((c) => `${r.asset}.${c}`));
  return {
    id: d, activity: `${d} data processing`, controller: ORG.controller, contact: ORG.contact, basis: 'public_task', special: 'not_applicable', transfers: 'None outside the UK recorded',
    purpose: `Processing of ${d.toLowerCase()} data across ${DOMAIN_SYSTEMS(d)} for ${d.toLowerCase()} operations.`,
    subjects: 'Individuals whose records the department holds', categories: cats.join('\n'),
    recipients: '', retention: '', security: SECURITY_DEFAULT, assets, status: 'proposed', later,
    history: [['3 Oct 2026, 11:30', 'Claude', 'Drafted from the evidence']],
  };
};
export const evidenceOf = (r) => {
  const rows = PD_MAP.filter((x) => r.assets.includes(x.asset));
  return [
    `domain: ${r.id}`, `assets: ${r.assets.join(', ')}`, `systems: ${DOMAIN_SYSTEMS(r.id)}`,
    `columns: ${[...new Set(rows.flatMap((x) => x.cols))].sort().join(', ')}`,
    `shared with downstream: ${recipientsOf(r.assets).filter(([k]) => k === 'Downstream asset').map(([, v]) => v).join(', ') || '—'}`,
    `data products: ${[...new Set(r.assets.flatMap(productsOf))].join(', ') || '—'}`,
    `models trained on it: ${[...new Set(r.assets.flatMap(modelsOf))].join(', ') || '—'}`,
    `retention rules: ${[...new Set(r.assets.flatMap((a) => retentionOf(a).map((i) => i.title)))].join(', ') || '—'}`,
    `regions: ${[...new Set(rows.map((x) => x.region))].join(', ')}`, `owners: ${[...new Set(rows.map((x) => x.owner))].join(', ')}`,
  ].join(' · ');
};
/* classes held by a record's assets that its declared categories do not list */
export const beyondDeclared = (r) => {
  const declared = r.categories.split(/\n|,/).map((x) => x.trim().toUpperCase()).filter(Boolean);
  return r.assets.flatMap((a) => (pd(a)?.cols || []).filter((c) => !declared.includes(colClass(c))).map((c) => ({ asset: a, col: c, cls: colClass(c) })));
};
export const specialIn = (assets) => assets.flatMap((a) => (pd(a)?.cols || []).filter((c) => colClass(c) === 'SPECIAL_CATEGORY').map((c) => ({ asset: a, col: c })));
/* downstream / product / model uses the record does not name in its recipients */
export const undeclared = (r) => recipientsOf(r.assets).filter(([, v]) => !r.recipients.includes(v)).map(([kind, v]) => ({ kind, v, from: r.assets.find((a) => (pd(a)?.shared || []).includes(v) || productsOf(a).includes(v) || modelsOf(a).includes(v)) }));

/* ---------------------------------------------------------------- data-handling rules, from the current state */
export function handlingRules(st) {
  const accepted = st.records.filter((r) => r.status === 'accepted');
  const inRecord = new Set(accepted.flatMap((r) => r.assets));
  const modelAssets = PD_ASSETS.filter((a) => modelsOf(a).length);
  const productAssets = PRODUCTS.filter((p) => p.status === 'published').flatMap((p) => p.assets).filter((a) => PD_ASSETS.includes(a));
  const R = (key, req, scope, fail, finding) => ({ key, req, scope, fail, finding });
  return [
    R('retention', 'A retention requirement applies to every asset holding personal data', PD_ASSETS, PD_ASSETS.filter((a) => !retentionOf(a).length), () => 'no active retention requirement applies'),
    R('ropa', 'Every asset holding personal data appears in a record of processing', PD_ASSETS, PD_ASSETS.filter((a) => !inRecord.has(a)), () => 'not in any accepted record of processing'),
    R('steward', 'Every asset holding personal data has a named steward', PD_ASSETS, PD_ASSETS.filter((a) => !STEWARDED.includes(a)), () => 'no steward assigned'),
    R('residency', 'Personal data stays in the UK region', PD_ASSETS, PD_ASSETS.filter((a) => pd(a).region === 'not recorded'), (a) => `the region of ${pd(a).system} is not recorded — confirm where this personal data is held`),
    R('classified', 'Personal data columns carry a classification', PD_ASSETS, [], () => ''),
    R('access_expiry', 'Access to personal data expires (no open-ended grants)', PD_ASSETS, [...new Set(OPEN_GRANTS.map((g) => g.asset))].filter((a) => PD_ASSETS.includes(a)), (a) => OPEN_GRANTS.filter((g) => g.asset === a).map((g) => `${g.grantee} has had access since ${g.since} with no expiry`).join('; ')),
    R('model_record', 'Models trained on personal data hold an approved governance record', modelAssets, modelAssets.filter((a) => modelsOf(a).some((m) => !modelApproved(m))), (a) => modelsOf(a).filter((m) => !modelApproved(m)).map((m) => `${m} has no version at Approved or In production (${modelStages(m)})`).join('; ')),
    R('product_basis', 'Published data products containing personal data name a lawful basis', productAssets, productAssets.filter((a) => !inRecord.has(a)), (a) => `data product ${productsOf(a).join(', ')} uses ${a}, which no accepted record (and so no lawful basis) covers`),
  ];
}
export const ruleTotals = (st) => { const rules = handlingRules(st); const total = rules.reduce((n, r) => n + r.scope.length, 0); const failing = rules.reduce((n, r) => n + r.fail.length, 0); return { rules, total, failing }; };
export const unusedNow = () => UNUSED.filter((a) => !modelsOf(a).length && !productsOf(a).length);

/* ---------------------------------------------------------------- screening */
export const RISK_INDICATORS = ['No retention rule', 'No named steward', 'Region not recorded', 'Open-ended access', 'Shared beyond the original system'];
export const INDICATOR_WEIGHT = {
  'Special category or criminal offence data': 3, 'Large-scale processing of personal data': 2, 'Systematic monitoring of individuals': 2, 'Data about vulnerable people': 2,
  'Datasets combined or matched': 1, 'New technology, including AI': 2, 'Automated decision-making or profiling': 3,
  ...Object.fromEntries(RISK_INDICATORS.map((k) => [k, 1])),
};
/* data-handling risk indicators GenMeta can see for an activity's assets, each with its evidence */
export function riskIndicators(r) {
  const rows = PD_MAP.filter((x) => r.assets.includes(x.asset));
  const out = [];
  const noRet = r.assets.filter((x) => !retentionOf(x).length);
  if (noRet.length) out.push(['No retention rule', `no active retention requirement covers ${noRet.join(', ')}`]);
  const noSt = r.assets.filter((x) => !STEWARDED.includes(x));
  if (noSt.length) out.push(['No named steward', `${noSt.length} of ${r.assets.length} assets have no steward: ${noSt.join(', ')}`]);
  const noReg = rows.filter((x) => x.region === 'not recorded');
  if (noReg.length) out.push(['Region not recorded', noReg.map((x) => `${x.asset} (${x.system})`).join(', ')]);
  const open = OPEN_GRANTS.filter((g) => r.assets.includes(g.asset));
  if (open.length) out.push(['Open-ended access', open.map((g) => `${g.grantee} on ${g.asset} since ${g.since}, no expiry`).join('; ')]);
  const beyond = rows.flatMap((x) => x.shared.map((t) => [x, pd(t)]).filter(([, y]) => y && y.system !== x.system).map(([x2, y]) => `${x2.asset} (${x2.system}) → ${y.asset} (${y.system})`));
  rows.forEach((x) => { productsOf(x.asset).forEach((pr) => beyond.push(`${x.asset} (${x.system}) → data product ${pr}`)); modelsOf(x.asset).forEach((mo) => beyond.push(`${x.asset} (${x.system}) → model ${mo} (ML platform)`)); });
  if (beyond.length) out.push(['Shared beyond the original system', beyond.join('; ')]);
  return out;
}
export const tickedFor = (s, id) => (s.ticked && s.ticked[id]) || [];
export function screen(r, ticked = []) {
  const found = [];
  const sp = specialIn(r.assets);
  if (sp.length) found.push(['Special category or criminal offence data', `special-category columns: ${sp.map((x) => `${x.asset}.${x.col}`).join(', ')}`, 'auto']);
  if (r.assets.length >= 10) found.push(['Large-scale processing of personal data', `${r.assets.length} assets hold this data`, 'auto']);
  if (PD_MAP.filter((x) => r.assets.includes(x.asset)).some((x) => x.shared.length)) found.push(['Datasets combined or matched', 'lineage joins these assets into downstream tables', 'auto']);
  const models = [...new Set(r.assets.flatMap(modelsOf))];
  if (models.length) found.push(['New technology, including AI', `model ${models.join(', ')} is trained on this data`, 'auto']);
  riskIndicators(r).forEach(([k, why]) => found.push([k, why, 'risk']));
  ticked.filter((t) => !found.some(([f]) => f === t)).forEach((t) => found.push([t, 'ticked for this activity', 'ticked']));
  const score = found.reduce((n, [i]) => n + (INDICATOR_WEIGHT[i] || 1), 0);
  const verdict = sp.length || score >= 6 ? 'DPIA required' : score >= 3 ? 'Consider a DPIA' : 'Not required';
  return { found, score, verdict };
}

/* ---------------------------------------------------------------- people and roles */
export const VIEW_ROLES = ['governance-lead', 'dpo', 'assessor', 'data-engineer', 'analyst'];
export const ROLE_PERSON = { 'governance-lead': 'Admin', dpo: 'Dana Whitfield', assessor: 'Priya Shah', 'data-engineer': 'Rajesh', analyst: 'Emma Clarke' };
export const EARLIER_RISKS = [
  ['DPIA — Customer analytics (2025)', 'Profiling individuals from combined order and account data', 'Possible', 'Significant', 'Aggregate to segment level before analysis; no individual scores leave the platform'],
  ['DPIA — Customer analytics (2025)', 'Model outputs treat nationality groups unequally', 'Possible', 'Severe', 'Remove nationality as a feature; monitor disparate impact on every batch'],
  ['DPIA — Debt management pilot (2024)', 'National Insurance numbers exposed in downstream extracts', 'Probable', 'Severe', 'Mask NI numbers below L3 clearance; tokenise in extracts'],
  ['DPIA — Debt management pilot (2024)', 'Health information used beyond the purpose collected', 'Possible', 'Severe', 'Restrict DISABILITY_FLAG to vulnerability support; Article 9(2)(g) condition recorded'],
  ['DPIA — Supplier portal (2025)', 'Supplier contacts kept after the contract ends', 'Possible', 'Minimal', 'Apply the default HMRC retention period and delete at review'],
];

/* ---------------------------------------------------------------- template fields and pre-fill */
const SIGN_FIELDS = ['DPO advice', 'Residual risk accepted by', 'ICO consultation needed'];
export const parseField = (f) => { const m = /^(.*?) \((.*)\)$/.exec(f); const label = m ? m[1] : f; const meta = m ? m[2] : ''; return { label, meta, key: (/pre-filled from (\w+)/.exec(meta) || [])[1] || null, req: /required/.test(meta), table: /_table/.test(meta) }; };
/* the template sections whose fields are answered as text (sections 1–4 in the ICO template) */
export const answerSections = (tpl) => tpl.sections.map(([h, d, fields]) => [h, d, fields.map(parseField).filter((f) => !f.table && !SIGN_FIELDS.includes(f.label))]).filter(([, , f]) => f.length);
const basisText = (k) => (LAWFUL_BASES.find(([v]) => v === k) || [])[1] || k;
function prefillValue(key, r, s) {
  const rows = PD_MAP.filter((x) => r.assets.includes(x.asset));
  const systems = [...new Set(rows.map((x) => x.system))];
  const classes = [...new Set(r.assets.flatMap(classesOf))].sort();
  const rec = recipientsOf(r.assets);
  const models = [...new Set(r.assets.flatMap(modelsOf))];
  const ret = retentionFor(r.assets);
  const noRet = r.assets.filter((a) => !retentionOf(a).length);
  const unused = unusedNow().filter((a) => r.assets.includes(a));
  switch (key) {
    case 'summary': return [r.purpose, 'the record of processing (purpose)'];
    case 'triggers': return [`Screening score ${s.score} — ${s.verdict}. ${s.found.map(([f, why]) => `${f}: ${why}`).join('. ') || 'No high-risk indicators.'}`, 'screening (indicators and their evidence)'];
    case 'nature': return [`Collected in ${systems.join(', ')} and moved through lineage into ${rec.filter(([k]) => k === 'Downstream asset').length} downstream table(s)${models.length ? `; used to train ${models.join(', ')}` : ''}.`, 'lineage and the model register'];
    case 'scope': return [`${r.assets.length} assets with ${rows.reduce((n, x) => n + x.cols.length, 0)} personal-data columns (${classes.join(', ')}). About: ${r.subjects}.`, 'the classifier and the record of processing'];
    case 'context': return [`Systems: ${systems.join(', ')}. Regions: ${[...new Set(rows.map((x) => x.region))].join(', ')}. Shared with: ${rec.map(([, v]) => v).join(', ') || 'no one'}.`, 'systems, lineage and sharing'];
    case 'purposes': return [`${r.purpose} Lawful basis: ${basisText(r.basis)}.`, 'the record of processing (purpose and lawful basis)'];
    case 'consulted': return [`DPO (${ROLE_PERSON.dpo}), information assurance and the asset owners: ${[...new Set(rows.map((x) => x.owner))].join(', ')}.`, 'the ownership register'];
    case 'lawful': { const sp = specialIn(r.assets); return [`${basisText(r.basis)}.${sp.length ? ` Special-category data (${sp.map((x) => x.col).join(', ')}) — Article 9 condition: ${(SPECIAL_CONDITIONS.find(([k]) => k === r.special) || [])[1] || 'none recorded'}.` : ''}`, 'the record of processing (lawful basis and Article 9)']; }
    case 'minimisation': return [unused.length ? `${unused.length} asset(s) are not read by anyone: ${unused.join(', ')} — candidates for removal.` : 'Every asset in this activity is in use.', 'usage logs and the classifier'];
    case 'retention': return [ret ? `${ret}${noRet.length ? `. Not covered: ${noRet.join(', ')}` : ''}` : `No retention requirement applies to ${noRet.join(', ')}.`, 'retention requirements (Policies)'];
    case 'rights': return ['Subject access, rectification and erasure requests are handled by the data protection team using the asset owners named above.', 'the standard wording for this department'];
    default: return ['', null];
  }
}
export function prefillAnswers(r, tpl, s) {
  return answerSections(tpl).map(([h, , fields]) => ({ sec: h, fields: fields.map((f) => { const [v, src] = prefillValue(f.key, r, s); return { label: f.label, req: f.req, v, src: src ? `pre-filled from ${src}` : '' }; }) }));
}
/* suggested risks, minus any that contradict the current state (e.g. "no retention rule" when retention is set) */
export function suggestedRisks(r) {
  const allRet = r.assets.every((a) => retentionOf(a).length);
  return (SUGGESTED_RISKS[r.id] || []).filter(([t]) => !(allRet && /no retention rule/i.test(t)))
    .map(([t, l, sv, m]) => ({ t, l, s: sv, measure: m, effect: 'Reduced', approved: false, src: 'pre-filled from GenMeta metadata' }));
}

/* ---------------------------------------------------------------- store */
const now = () => new Date().toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).replace(' at', ',');
/* the register already holds two signed-off DPIAs (test data), so reuse has something real to draw on */
const SEEDED = {
  Orders: { at: '14 Mar 2026', due: '14 Mar 2027', risks: [
    ['Profiling individuals from combined order and account data', 'Possible', 'Significant', 'Aggregate to segment level before analysis; no individual scores leave the platform'],
    ['Order values linked back to named customers in reports', 'Possible', 'Significant', 'Aggregate below customer level in PRL.ORDER_MASTER consumers'],
  ] },
  Supplier: { at: '2 Jun 2026', due: '2 Jun 2027', risks: [
    ['Supplier contacts kept after the contract ends', 'Possible', 'Minimal', 'Apply the default HMRC retention period and delete at review'],
    ['Supplier contact names shared in Power BI without a record', 'Possible', 'Minimal', 'Name the report in the record of processing'],
  ] },
};
const seedRecords = ROPA_DOMAINS.map(drafted).map((r) => (SEEDED[r.id] ? { ...r, status: 'accepted', recipients: recipientsText(r.assets), retention: retentionFor(r.assets), history: [[`${SEEDED[r.id].at}, 10:05`, 'Admin (governance-lead)', 'Accepted the record'], ...r.history] } : r));
const seedAssessments = seedRecords.filter((r) => SEEDED[r.id]).map((r) => {
  const x = SEEDED[r.id]; const s = screen(r);
  return {
    id: r.id, name: `DPIA — ${r.activity}`, domain: r.id, stage: 'Approved', template: ICO_TEMPLATE.name, templateVersion: ICO_TEMPLATE.version,
    assessor: 'Tom Reid', dpo: ROLE_PERSON.dpo, lead: 'Admin',
    risks: x.risks.map(([t, l, sv, m]) => ({ t, l, s: sv, measure: m, effect: 'Reduced', approved: true, src: 'written here' })),
    answers: prefillAnswers(r, ICO_TEMPLATE, s), need: `Screening score ${s.score}: ${s.found.map(([f]) => f).join('; ')}.`,
    advice: 'Proceed. Measures are proportionate; review at the annual date.', adviceBy: ROLE_PERSON.dpo, adviceAt: `${x.at}, 09:40`,
    acceptedBy: 'Admin', ico: 'No', reviewDue: x.due, approvedAt: x.at,
    history: [[`${x.at}, 11:20`, 'Admin', `Approved and signed off — review due ${x.due}`], [`${x.at}, 09:40`, ROLE_PERSON.dpo, 'DPO advice written'], [`${x.at}, 09:00`, 'Tom Reid', `Started from ${ICO_TEMPLATE.name} ${ICO_TEMPLATE.version}`]],
  };
});
let st = {
  records: seedRecords,
  assessments: seedAssessments,
  role: 'governance-lead',
  lastRun: { at: '3 Oct 2026, 11:30', by: 'scheduler' },
  packAt: null,
  templates: [{ ...ICO_TEMPLATE, changedBy: 'ICO', changedAt: 'published guidance' }],
  ticked: {},
  auditN: AUDIT.length,
};
st.lastRun = { ...st.lastRun, ...(() => { const t = ruleTotals(st); return { total: t.total, failing: t.failing }; })() };
const listeners = new Set();
const emit = () => { st = { ...st, auditN: AUDIT.length }; listeners.forEach((l) => l()); };
onAudit(() => { st = { ...st, auditN: AUDIT.length }; listeners.forEach((l) => l()); });
export const useDpia = () => useSyncExternalStore((cb) => { listeners.add(cb); return () => listeners.delete(cb); }, () => st);
export const getDpia = () => st;
const who = () => ROLE_PERSON[st.role] || st.role;
export const currentPerson = () => who();
export const nowText = () => now();

export function setRole(role) { st = { ...st, role }; emit(); }
export function setTicked(id, list) { st = { ...st, ticked: { ...st.ticked, [id]: list } }; emit(); }
export function saveRecord(rec, status) {
  const by = who();
  st = { ...st, records: st.records.map((x) => (x.id === rec.id ? { ...rec, status, history: [[now(), `${by} (${st.role})`, status === 'accepted' ? 'Accepted the record' : 'Saved as draft'], ...rec.history] } : x)) };
  if (status === 'accepted') writeAudit(by, st.role, 'ropa.accept', 'Policy actions', rec.assets.join(', '), `accepted the record of processing “${rec.activity}” (${rec.assets.length} assets, basis ${rec.basis})`);
  else writeAudit(by, st.role, 'ropa.draft', 'Policy actions', rec.id, `saved a draft of the record of processing “${rec.activity}”`);
  emit();
}
export function runChecks() {
  const t = ruleTotals(st);
  const issues = t.rules.reduce((n, r) => n + Math.min(r.fail.length, 6), 0);
  st = { ...st, lastRun: { at: now(), by: `${who()}`, total: t.total, failing: t.failing, issues } };
  writeAudit(who(), st.role, 'gdpr.monitor', 'Policy actions', 'personal data', `ran the personal-data handling rules: ${t.total} checks, ${t.failing} failing, ${issues} issue(s) raised`);
  emit();
  return st.lastRun;
}
export function regeneratePack() { st = { ...st, packAt: now() }; writeAudit(who(), st.role, 'gdpr.pack', 'Policy actions', 'personal data', 'regenerated the accountability pack from the current state'); emit(); }
export function setTemplates(templates) { st = { ...st, templates }; emit(); }
const bump = (v) => `v${(parseInt(String(v).replace(/\D/g, ''), 10) || 1) + 1}`;
export function copyTemplate(name) {
  const base = st.templates.find((t) => t.kind === 'standard') || st.templates[0];
  const t = { ...base, sections: base.sections.map(([h, d, f]) => [h, d, [...f]]), stages: base.stages.map((x) => [...x]), name, kind: 'departmental', version: 'v1', changedBy: who(), changedAt: now() };
  st = { ...st, templates: [...st.templates, t] };
  writeAudit(who(), st.role, 'dpia.template', 'Policy actions', name, `copied “${base.name}” as the template “${name}” (v1)`);
  emit();
}
export function saveTemplate(name, next, changes) {
  if (st.role !== 'governance-lead') { writeAudit(who(), st.role, 'dpia.template.refused', 'Policy actions', name, `tried to change the template “${name}” — refused: only a governance lead can change templates`); emit(); return false; }
  const cur = st.templates.find((t) => t.name === name);
  const t = { ...next, version: bump(cur.version), changedBy: who(), changedAt: now() };
  st = { ...st, templates: st.templates.map((x) => (x.name === name ? t : x)) };
  writeAudit(who(), st.role, 'dpia.template', 'Policy actions', name, `changed the template “${name}” to ${t.version}: ${changes || 'edited'}`);
  emit();
  return t.version;
}
export function removeTemplate(name) {
  st = { ...st, templates: st.templates.filter((t) => t.name !== name) };
  writeAudit(who(), st.role, 'dpia.template', 'Policy actions', name, `removed the template copy “${name}”`);
  emit();
}

export function startAssessment(r, ticked, tplName) {
  const s = screen(r, ticked);
  const tpl = st.templates.find((t) => t.name === tplName) || st.templates[0];
  const a = {
    id: r.id, name: `DPIA — ${r.activity}`, domain: r.id, stage: 'Completion', template: tpl.name, templateVersion: tpl.version,
    assessor: TEST_USERS.assessor[0], dpo: TEST_USERS.dpo[0], lead: TEST_USERS.lead[0],
    risks: suggestedRisks(r),
    answers: prefillAnswers(r, tpl, s),
    need: `${r.purpose} Screening score ${s.score}: ${s.found.map(([f, why]) => `${f} (${why})`).join('; ') || 'no high-risk indicators'}.`,
    advice: '', adviceBy: '', adviceAt: '', acceptedBy: '', ico: 'No', reviewDue: null, approvedAt: null,
    history: [[now(), who(), `Started from ${tpl.name} ${tpl.version}; pre-filled from the record and screening (score ${s.score})`]],
  };
  st = { ...st, assessments: [...st.assessments, a] };
  writeAudit(who(), st.role, 'dpia.start', 'Policy actions', r.assets.join(', '), `started “${a.name}” from ${tpl.name} ${tpl.version} — screening score ${s.score}, ${s.verdict.toLowerCase()}`);
  emit();
}
/* an action the workflow would not allow: kept in the assessment trail and the Governance audit log */
export function refuseAssessment(id, label, reason) {
  const a = st.assessments.find((x) => x.id === id);
  st = { ...st, assessments: st.assessments.map((x) => (x.id === id ? { ...x, history: [[now(), `${who()} (${st.role})`, `Refused: ${label} — ${reason}`], ...x.history] } : x)) };
  writeAudit(who(), st.role, 'dpia.refused', 'Policy actions', a.domain, `${a.name}: “${label}” refused — ${reason}`);
  emit();
}
export function updateAssessment(id, patch, what) {
  st = { ...st, assessments: st.assessments.map((x) => (x.id === id ? { ...x, ...patch, history: what ? [[now(), who(), what], ...x.history] : x.history } : x)) };
  emit();
}
export function advanceAssessment(id, toStage, label) {
  const a = st.assessments.find((x) => x.id === id);
  const days = (st.templates.find((t) => t.name === a.template) || st.templates[0]).review;
  const patch = { stage: toStage };
  if (toStage === 'Approved') { const d = new Date(); d.setDate(d.getDate() + days); patch.reviewDue = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }); patch.approvedAt = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }); }
  const what = toStage === 'Approved' ? `Approved and signed off — residual risk accepted by ${a.acceptedBy}; review due ${patch.reviewDue}` : `${label} — now ${toStage}`;
  updateAssessment(id, patch, what);
  writeAudit(who(), st.role, toStage === 'Approved' ? 'dpia.signoff' : 'dpia.stage', 'Policy actions', a.domain, `${a.name}: ${what}`);
}
export const highestResidual = (a, residual) => ['High', 'Medium', 'Low'].find((lv) => a.risks.some((r) => riskLevel(...residual(r)) === lv)) || '—';
export const residualOf = (r) => {
  if (r.effect === 'Eliminated') return ['Remote', 'Minimal'];
  if (r.effect === 'Reduced') return [LIKELIHOOD[Math.max(0, LIKELIHOOD.indexOf(r.l) - 1)], r.s];
  return [r.l, r.s];
};

/* ---------------------------------------------------------------- Governance › Overview controls, live */
export function dpiaControl(s = st) {
  const acc = s.records.filter((r) => r.status === 'accepted').length;
  const required = s.records.filter((r) => screen(r).verdict === 'DPIA required');
  const signed = s.assessments.filter((a) => a.stage === 'Approved').length;
  const open = required.filter((r) => !s.assessments.some((a) => a.id === r.id && a.stage === 'Approved')).length;
  const status = acc === s.records.length && open === 0 ? 'Passing' : 'Warning';
  return { status, evidence: `${acc} of ${s.records.length} records of processing accepted · ${signed} DPIA(s) signed off · ${open} required DPIA(s) not signed off` };
}
export function liveControls(s = st) {
  return CONTROLS.map((c) => {
    if (c.id === 'dpia') { const d = dpiaControl(s); return { ...c, status: d.status, evidence: d.evidence, api: '/api/gm/dpia/register' }; }
    if (c.id === 'audit-log') return { ...c, evidence: `sha-256 hash-chain · ${AUDIT.length} entries · 0 broken links` };
    return c;
  });
}

/* Governance › Controls & compliance › improvement actions whose status follows the live state */
export function liveActionStatus(s = st) {
  const n = s.records.length; const acc = s.records.filter((r) => r.status === 'accepted').length;
  const withRet = PD_ASSETS.filter((a) => retentionOf(a).length).length;
  const stew = PD_ASSETS.filter((a) => STEWARDED.includes(a)).length;
  const st3 = (got, of) => (got >= of ? 'Passed' : got > 0 ? 'In progress' : 'Not started');
  return {
    'IA-03': { status: st3(acc, n), progress: `${acc}/${n} records accepted` },
    'IA-04': { status: st3(withRet, PD_ASSETS.length), progress: `${withRet}/${PD_ASSETS.length} assets under retention` },
    'IA-05': { status: st3(stew, PD_ASSETS.length), progress: `${stew}/${PD_ASSETS.length} assets with a steward` },
  };
}
