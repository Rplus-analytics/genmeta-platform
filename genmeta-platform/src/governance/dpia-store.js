import { useSyncExternalStore } from 'react';
import {
  PD_MAP, ORG, DOMAIN_SYSTEMS, ROPA_DOMAINS, SECURITY_DEFAULT, ICO_TEMPLATE, POLICY_ITEMS, MODELS, CONTROLS, AUDIT, UNUSED,
  colClass, NEW_COLS, writeAudit, onAudit, SUGGESTED_RISKS, riskLevel, LIKELIHOOD,
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

/* retention: active retention items whose applicability names the asset */
export function retentionOf(a) {
  return POLICY_ITEMS.filter((i) => i.type === 'retention' && i.status === 'active' && hasCriteria(i.applies) && applicability(i).rows.some((r) => r.asset === a));
}
export const retentionText = (i) => `${i.title} — ${(i.retention || '').split(' · ')[0] || 'period not stated'}`;
export const modelApproved = (id) => {
  const m = MODELS.find((x) => x.id === id);
  return !!m && m.versionRows.some((v) => (v.path || []).includes('In production'));
};

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
    R('access_expiry', 'Access to personal data expires (no open-ended grants)', PD_ASSETS, [], () => ''),
    R('model_record', 'Models trained on personal data hold an approved governance record', modelAssets, modelAssets.filter((a) => modelsOf(a).some((m) => !modelApproved(m))), (a) => `${modelsOf(a).filter((m) => !modelApproved(m)).join(', ')} has no approved governance record`),
    R('product_basis', 'Published data products containing personal data name a lawful basis', productAssets, productAssets.filter((a) => !inRecord.has(a)), (a) => `data product ${productsOf(a).join(', ')} uses ${a}, which no accepted record (and so no lawful basis) covers`),
  ];
}
export const ruleTotals = (st) => { const rules = handlingRules(st); const total = rules.reduce((n, r) => n + r.scope.length, 0); const failing = rules.reduce((n, r) => n + r.fail.length, 0); return { rules, total, failing }; };
export const unusedNow = () => UNUSED.filter((a) => !modelsOf(a).length && !productsOf(a).length);

/* ---------------------------------------------------------------- screening */
export const INDICATOR_WEIGHT = { 'Special category or criminal offence data': 3, 'Large-scale processing of personal data': 2, 'Systematic monitoring of individuals': 2, 'Data about vulnerable people': 2, 'Datasets combined or matched': 1, 'New technology, including AI': 2, 'Automated decision-making or profiling': 3 };
export function screen(r, ticked = []) {
  const found = [];
  const sp = specialIn(r.assets);
  if (sp.length) found.push(['Special category or criminal offence data', `special-category columns: ${sp.map((x) => `${x.asset}.${x.col}`).join(', ')}`]);
  if (r.assets.length >= 10) found.push(['Large-scale processing of personal data', `${r.assets.length} assets hold this data`]);
  if (PD_MAP.filter((x) => r.assets.includes(x.asset)).some((x) => x.shared.length)) found.push(['Datasets combined or matched', 'lineage joins these assets into downstream tables']);
  const models = [...new Set(r.assets.flatMap(modelsOf))];
  if (models.length) found.push(['New technology, including AI', `model ${models.join(', ')} is trained on this data`]);
  ticked.filter((t) => !found.some(([f]) => f === t)).forEach((t) => found.push([t, 'ticked by you']));
  const score = found.reduce((n, [i]) => n + (INDICATOR_WEIGHT[i] || 1), 0);
  const verdict = sp.length || score >= 4 ? 'DPIA required' : score >= 2 ? 'Consider a DPIA' : 'Not required';
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

/* ---------------------------------------------------------------- store */
const now = () => new Date().toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).replace(' at', ',');
let st = {
  records: ROPA_DOMAINS.map(drafted),
  assessments: [],
  role: 'governance-lead',
  lastRun: { at: '3 Oct 2026, 11:30', by: 'scheduler' },
  packAt: null,
  templates: [{ ...ICO_TEMPLATE }],
  auditN: AUDIT.length,
};
st.lastRun = { ...st.lastRun, ...(() => { const t = ruleTotals(st); return { total: t.total, failing: t.failing }; })() };
const listeners = new Set();
const emit = () => { st = { ...st, auditN: AUDIT.length }; listeners.forEach((l) => l()); };
onAudit(() => { st = { ...st, auditN: AUDIT.length }; listeners.forEach((l) => l()); });
export const useDpia = () => useSyncExternalStore((cb) => { listeners.add(cb); return () => listeners.delete(cb); }, () => st);
export const getDpia = () => st;
const who = () => ROLE_PERSON[st.role] || st.role;

export function setRole(role) { st = { ...st, role }; emit(); }
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

export function startAssessment(r, ticked) {
  const s = screen(r, ticked);
  const a = {
    id: r.id, name: `DPIA — ${r.activity}`, domain: r.id, stage: 'Completion', template: st.templates[0].name,
    assessor: ROLE_PERSON.assessor, dpo: ROLE_PERSON.dpo, lead: ROLE_PERSON['governance-lead'],
    risks: (SUGGESTED_RISKS[r.id] || []).map(([t, l, sv, m]) => ({ t, l, s: sv, measure: m, effect: 'Reduced', approved: false })),
    need: `${r.purpose} Screening score ${s.score}: ${s.found.map(([f, why]) => `${f} (${why})`).join('; ') || 'no high-risk indicators'}.`,
    advice: '', acceptedBy: '', ico: 'No', reviewDue: null,
    history: [[now(), who(), `Started from ${st.templates[0].name}; pre-filled from the record and screening (score ${s.score})`]],
  };
  st = { ...st, assessments: [...st.assessments, a] };
  writeAudit(who(), st.role, 'dpia.start', 'Policy actions', r.assets.join(', '), `started “${a.name}” — screening score ${s.score}, ${s.verdict.toLowerCase()}`);
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
  if (toStage === 'Approved') { const d = new Date(); d.setDate(d.getDate() + days); patch.reviewDue = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }); }
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
