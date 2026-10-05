import { useSyncExternalStore } from 'react';

/* Governance › Workflows — one workflow engine for the whole of GenMeta.
   A workflow belongs to a module (AI model governance first), starts on an event in that module, and runs
   a list of steps: automated checks, approvals, tasks and notifications. Any step can carry a "run only if"
   condition on the request's fields, so one workflow covers low- and high-risk cases.
   Approvals are role-, person- or owner-based, need one or all approvers, have an SLA and an escalation
   path, and can block the requester from approving their own request (separation of duties).
   Everything is test data held in memory; the store is shared so the register flow, model pages and the
   Workflows page all see the same requests. */

export const TODAY = new Date('2026-10-04T10:00:00');
const d = (s) => new Date(s);
export const fmt = (dt) => dt.toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).replace(' at', ',');
export const fmtDay = (dt) => dt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

/* modules: each declares the events that can start a workflow and the fields conditions can use */
export const MODULES = [
  { key: 'ai-models', label: 'AI models', icon: 'Bot', live: true,
    events: ['External model registered', 'Internal model version promoted to production', 'Periodic model review due', 'Model retired'],
    fields: {
      'Risk tier': ['Low risk', 'Medium risk', 'High risk'],
      'Data sent': ['Metadata only', 'No organisational data', 'Pseudonymised data', 'Personal data'],
      'Data held in': ['United Kingdom', 'EU data boundary', 'Outside the UK and EU', 'Not stated by the provider'],
      'Decisions about individuals': ['No', 'Supports a human decision', 'Makes an automated decision'],
      'Model source': ['External', 'Internal'],
    } },
  { key: 'policies', label: 'Policies', icon: 'ScrollText', live: true,
    events: ['Item submitted for review', 'Exception requested'],
    fields: { Type: ['policy', 'standard', 'control', 'obligation', 'retention'], Severity: ['low', 'medium', 'high'] } },
  { key: 'access', label: 'Access', icon: 'KeyRound', live: true,
    events: ['Access requested', 'Role changed'],
    fields: { Sensitivity: ['Internal', 'Confidential', 'Restricted'], 'Requested role': ['analyst', 'data-engineer', 'product-owner'] } },
  { key: 'data-products', label: 'Data products', icon: 'Package', live: true, events: ['Data product published', 'Data contract changed'], fields: { Sensitivity: ['Internal', 'Confidential', 'Restricted'] } },
  { key: 'dpia', label: 'DPIA', icon: 'ShieldCheck', live: true, events: ['DPIA submitted for sign-off'], fields: { 'Risk level': ['Low', 'Medium', 'High'] } },
  { key: 'metadata', label: 'Glossary', icon: 'BookOpen', live: true, events: ['Glossary term proposed', 'Classification changed'], fields: { Classification: ['PII', 'FINANCIAL', 'COMMERCIAL'] } },
  { key: 'quality', label: 'Quality', icon: 'Gauge', live: true, events: ['Quality rule changed', 'Remediation closed'], fields: { Severity: ['low', 'medium', 'high'] } },
];
export const moduleOf = (k) => MODULES.find((m) => m.key === k);

export const STEP_KINDS = {
  approval: { label: 'Approval', desc: 'One or more people approve or reject.' },
  automated: { label: 'Automated check', desc: 'GenMeta checks something and passes or stops the request.' },
  task: { label: 'Task', desc: 'Someone completes a checklist before the request moves on.' },
  notify: { label: 'Notify', desc: 'Send a message — no decision needed.' },
};
export const RULES = { any: 'Any one approver', all: 'Every approver', sequential: 'Each in turn' };

/* who can act: test users with a GenMeta role */
export const ACTORS = [
  ['Admin', 'governance-lead'], ['Priya Shah', 'governance-lead'], ['Dana Whitfield', 'dpo'], ['Meera Shah', 'platform-ops'],
  ['Rajesh', 'data-engineer'], ['Pradeep Kumar', 'product-owner'], ['Customer Analytics Lead', 'product-owner'],
];
export const ROLE_LABEL = { 'governance-lead': 'Governance lead', dpo: 'Data protection officer', 'platform-ops': 'Platform / Ops engineer', 'data-engineer': 'Data engineer', 'product-owner': 'Data product owner', analyst: 'Analyst', auditor: 'Auditor', owner: 'Owner of the item' };
export const APPROVER_ROLES = ['governance-lead', 'dpo', 'platform-ops', 'data-engineer', 'product-owner', 'auditor', 'owner'];

const S = (id, kind, name, extra = {}) => ({ id, kind, name, approvers: [], rule: 'any', sla: 3, escalateTo: 'governance-lead', sod: false, runIf: null, evidence: [], message: '', ...extra });

let workflows = [
  { id: 'wf-ext-model', name: 'External AI model approval', module: 'ai-models', event: 'External model registered', status: 'active', version: 3,
    desc: 'Every externally provided model is approved before anyone in the organisation may call it.', updatedAt: d('2026-09-30T11:20:00'), updatedBy: 'Admin',
    usedBy: ['AI model governance › Register an external AI model'],
    outcome: { approved: 'Model moves to Validation, then In production once validated', rejected: 'Model is marked Rejected and may not be called' },
    steps: [
      S('s1', 'automated', 'Registration complete', { desc: 'Model card, accountable owner, intended use and all seven ethical AI answers are recorded.' }),
      S('s2', 'approval', 'Business owner sign-off', { approvers: ['owner'], sla: 3, evidence: ['Business need confirmed', 'Intended use and limits agreed'] }),
      S('s3', 'approval', 'Data protection review', { approvers: ['dpo'], sla: 5, runIf: { field: 'Data sent', op: 'is any of', value: ['Personal data', 'Pseudonymised data'] }, evidence: ['DPIA completed or updated', 'Lawful basis recorded', 'Data processing agreement with the provider'] }),
      S('s4', 'approval', 'Security and supplier review', { approvers: ['platform-ops'], sla: 5, runIf: { field: 'Data held in', op: 'is not', value: ['United Kingdom'] }, evidence: ['Supplier security assessment', 'International transfer safeguards'] }),
      S('s5', 'approval', 'AI ethics board', { approvers: ['governance-lead', 'dpo'], rule: 'all', sla: 10, runIf: { field: 'Risk tier', op: 'is', value: ['High risk'] }, evidence: ['Equality impact assessment', 'ATRS record drafted'] }),
      S('s6', 'approval', 'Model risk sign-off', { approvers: ['governance-lead'], sla: 3, sod: true, evidence: ['Model risk sign-off'] }),
      S('s7', 'notify', 'Tell the owners and requester', { message: 'Approved for use — the model can now be called from the systems named in the registration.' }),
    ] },
  { id: 'wf-int-promote', name: 'Internal model promotion to production', module: 'ai-models', event: 'Internal model version promoted to production', status: 'active', version: 2,
    desc: 'A model version built in SageMaker or MLflow is validated independently and signed off before it serves predictions.', updatedAt: d('2026-09-19T13:00:00'), updatedBy: 'Admin',
    usedBy: ['AI model governance › model page › Governance workflow'],
    outcome: { approved: 'Version is tagged @production in MLflow and approved in SageMaker', rejected: 'Version is marked Rejected; the current production version stays live' },
    steps: [
      S('p1', 'automated', 'Performance meets thresholds', { desc: 'Held-out accuracy, ROC AUC and F1 for the HIGH class are at or above the thresholds for the risk tier.' }),
      S('p2', 'approval', 'Independent validation', { approvers: ['data-engineer'], sla: 5, sod: true, evidence: ['Performance validated on held-out data', 'Bias assessed across protected groups', 'Explainability reviewed'] }),
      S('p3', 'approval', 'Data protection review', { approvers: ['dpo'], sla: 5, runIf: { field: 'Decisions about individuals', op: 'is not', value: ['No'] }, evidence: ['UK GDPR Article 22 assessment', 'DPIA completed'] }),
      S('p4', 'approval', 'Model risk sign-off', { approvers: ['governance-lead'], sla: 3, sod: true, evidence: ['Model risk sign-off'] }),
      S('p5', 'approval', 'Go-live by the product owner', { approvers: ['product-owner'], sla: 2 }),
      S('p6', 'notify', 'Tell the model owner and platform ops', { message: 'Promoted to production — monitoring and guardrails are now active.' }),
    ] },
  { id: 'wf-periodic', name: 'Periodic model review', module: 'ai-models', event: 'Periodic model review due', status: 'active', version: 1,
    desc: 'Every model in production is reviewed on the cycle set by its risk tier.', updatedAt: d('2026-09-19T13:05:00'), updatedBy: 'Admin',
    usedBy: ['AI model governance › model page › Periodic review'],
    outcome: { approved: 'Next review date is set from the risk tier', rejected: 'Model is deprecated and its owner is asked to retire it' },
    steps: [
      S('r1', 'task', 'Owner confirms the review checks', { approvers: ['owner'], sla: 10, evidence: ['Drift and bias results reviewed', 'Performance still acceptable', 'Continued business need confirmed'] }),
      S('r2', 'approval', 'Governance lead approves continued use', { approvers: ['governance-lead'], sla: 5 }),
    ] },
  { id: 'wf-policy', name: 'Policy item approval', module: 'policies', event: 'Item submitted for review', status: 'active', version: 1,
    desc: 'Policies, standards, controls, obligations and retention requirements are reviewed and approved before they become active.', updatedAt: d('2026-09-23T07:50:00'), updatedBy: 'Admin',
    usedBy: ['Policies › item page › Submit for review'],
    outcome: { approved: 'Status moves to approved, then active', rejected: 'Item goes back to draft with the reviewer’s comment' },
    steps: [
      S('q1', 'approval', 'Owner review', { approvers: ['owner'], sla: 5 }),
      S('q2', 'approval', 'Data protection review', { approvers: ['dpo'], sla: 5, runIf: { field: 'Severity', op: 'is', value: ['high'] } }),
      S('q3', 'approval', 'Governance lead approval', { approvers: ['governance-lead'], sla: 5, sod: true }),
    ] },
  { id: 'wf-access', name: 'Sensitive data access request', module: 'access', event: 'Access requested', status: 'active', version: 2,
    desc: 'Access to an asset is approved by its owner, and by a governance lead when the asset is Restricted.', updatedAt: d('2026-09-12T09:00:00'), updatedBy: 'Priya Shah',
    usedBy: ['Access › Requests & grants'],
    outcome: { approved: 'Grant is created and expires after 90 days', rejected: 'Requester is told why' },
    steps: [
      S('a1', 'approval', 'Asset owner approves', { approvers: ['owner'], sla: 2 }),
      S('a2', 'approval', 'Governance lead approves', { approvers: ['governance-lead'], sla: 2, sod: true, runIf: { field: 'Sensitivity', op: 'is', value: ['Restricted'] } }),
      S('a3', 'notify', 'Tell the requester', { message: 'Access granted for 90 days.' }),
    ] },
  { id: 'wf-product-publish', name: 'Data product publication', module: 'data-products', event: 'Data product published', status: 'active', version: 1,
    desc: 'A data product is checked and approved by its owner, and by the DPO when it contains Restricted data, before consumers can subscribe.', updatedAt: d('2026-09-25T10:00:00'), updatedBy: 'Priya Shah',
    usedBy: ['Data products › Publish'], outcome: { approved: 'Product is published to the marketplace', rejected: 'Product stays in draft with the reviewer’s comment' },
    steps: [
      S('dp1', 'automated', 'Contract and quality checks pass', { desc: 'Schema contract, freshness SLA and minimum quality score are met.' }),
      S('dp2', 'approval', 'Product owner approves', { approvers: ['product-owner'], sla: 3 }),
      S('dp3', 'approval', 'Data protection review', { approvers: ['dpo'], sla: 5, runIf: { field: 'Sensitivity', op: 'is', value: ['Restricted'] } }),
      S('dp4', 'notify', 'Tell subscribers', { message: 'A new data product is available.' }),
    ] },
  { id: 'wf-dpia-signoff', name: 'DPIA sign-off', module: 'dpia', event: 'DPIA submitted for sign-off', status: 'active', version: 1,
    desc: 'The ICO-template stages for every DPIA: the assessor completes it, the DPO advises, a governance lead accepts the residual risk.', updatedAt: d('2026-09-19T12:00:00'), updatedBy: 'Admin',
    usedBy: ['DPIA & GDPR › Assessments'], outcome: { approved: 'DPIA is signed off; review date set from the template', rejected: 'DPIA returns to the assessor' },
    steps: [
      S('dd1', 'task', 'Assessor completes the assessment', { approvers: ['owner'], sla: 10, evidence: ['Every risk has a measure'] }),
      S('dd2', 'approval', 'DPO review and advice', { approvers: ['dpo'], sla: 10, evidence: ['DPO advice recorded'] }),
      S('dd3', 'approval', 'Governance lead accepts residual risk', { approvers: ['governance-lead'], sla: 5, sod: true }),
      S('dd4', 'notify', 'Consult the ICO if residual risk is high', { message: 'High residual risk — ICO prior consultation required.', runIf: { field: 'Risk level', op: 'is', value: ['High'] } }),
    ] },
  { id: 'wf-dpia-highrisk', name: 'High-risk DPIA sign-off', module: 'dpia', event: 'DPIA submitted for sign-off', status: 'active', version: 1,
    desc: 'For DPIAs on special-category or large-scale processing: adds information assurance review and sign-off by the Senior Information Risk Owner.', updatedAt: d('2026-09-28T14:00:00'), updatedBy: 'Admin',
    usedBy: [], outcome: { approved: 'DPIA is signed off by the SIRO; review date set from the template', rejected: 'DPIA returns to the assessor' },
    steps: [
      S('dh1', 'task', 'Assessor completes the assessment', { approvers: ['owner'], sla: 10, evidence: ['Every risk has a measure'] }),
      S('dh2', 'approval', 'Information assurance review', { approvers: ['platform-ops'], sla: 5 }),
      S('dh3', 'approval', 'DPO review and advice', { approvers: ['dpo'], sla: 10, evidence: ['DPO advice recorded'] }),
      S('dh4', 'approval', 'SIRO accepts residual risk', { approvers: ['governance-lead'], sla: 5, sod: true }),
      S('dh5', 'notify', 'Consult the ICO if residual risk is high', { message: 'High residual risk — ICO prior consultation required.', runIf: { field: 'Risk level', op: 'is', value: ['High'] } }),
    ] },
  { id: 'wf-glossary-term', name: 'Glossary term approval', module: 'metadata', event: 'Glossary term proposed', status: 'active', version: 1,
    desc: 'New or changed business terms are reviewed by a steward and approved by the domain owner before they appear in the glossary.', updatedAt: d('2026-09-21T09:30:00'), updatedBy: 'Admin',
    usedBy: ['Glossary › Propose a term'], outcome: { approved: 'Term is published in the glossary', rejected: 'Term goes back to the proposer' },
    steps: [
      S('g1', 'approval', 'Steward review', { approvers: ['data-engineer'], sla: 3 }),
      S('g2', 'approval', 'Domain owner approves', { approvers: ['owner'], sla: 5, sod: true }),
    ] },
  { id: 'wf-quality-rule', name: 'Quality rule change', module: 'quality', event: 'Quality rule changed', status: 'draft', version: 1,
    desc: 'Changes to a quality rule on a high-severity asset are approved by the asset owner.', updatedAt: d('2026-10-02T15:00:00'), updatedBy: 'Rajesh',
    usedBy: [], outcome: { approved: 'Rule change goes live at the next run', rejected: 'Rule stays as it was' },
    steps: [S('qq1', 'approval', 'Asset owner approves', { approvers: ['owner'], sla: 2, runIf: { field: 'Severity', op: 'is', value: ['high'] } })] },
  { id: 'wf-policy-exc', name: 'Policy exception', module: 'policies', event: 'Exception requested', status: 'draft', version: 1,
    desc: 'An exception to a failing control needs a reason and a governance lead other than the requester.', updatedAt: d('2026-10-03T16:40:00'), updatedBy: 'Admin',
    usedBy: [], outcome: { approved: 'Check is counted as excepted', rejected: 'Check stays failing' },
    steps: [S('e1', 'approval', 'Governance lead decides', { approvers: ['governance-lead'], sla: 5, sod: true })] },
];

/* -------- conditions and paths */
export const condText = (c) => (c ? `${c.field} ${c.op} ${c.value.join(' or ')}` : '');
export const condHolds = (c, ctx) => {
  if (!c) return true;
  const v = ctx?.[c.field];
  if (v == null) return true;
  if (c.op === 'is' || c.op === 'is any of') return c.value.includes(v);
  if (c.op === 'is not') return !c.value.includes(v);
  return true;
};
export const pathFor = (wf, ctx) => wf.steps.map((s) => ({ step: s, applies: condHolds(s.runIf, ctx) }));

/* -------- requests (running instances) */
const R = (id, wfId, subject, ctx, by, at, decisions = [], extra = {}) => ({ id, wfId, subject, ctx, requestedBy: by, requestedAt: d(at), decisions, ...extra });
/* decisions: [stepId, 'approved'|'rejected'|'done', who, at, comment] */
let requests = [
  R('REQ-1042', 'wf-ext-model', { kind: 'model', id: 'gpt-41', label: 'GPT-4.1 · v1.1', owners: ['Customer Analytics Lead'] },
    { 'Risk tier': 'Medium risk', 'Data sent': 'Personal data', 'Data held in': 'Outside the UK and EU', 'Decisions about individuals': 'No', 'Model source': 'External' },
    'Admin', '2026-10-01T09:12:00', [['s2', 'approved', 'Customer Analytics Lead', '2026-10-01T15:40:00', 'Needed for the KARAN_TEAM drafting trial.']]),
  R('REQ-1044', 'wf-periodic', { kind: 'model', id: 'claude-sonnet-5', label: 'Claude Sonnet 5 · 180-day review', owners: ['Admin'] },
    { 'Risk tier': 'Medium risk', 'Model source': 'External' }, 'genmeta (scheduler)', '2026-09-28T06:00:00',
    [['r1', 'done', 'Admin', '2026-10-02T10:05:00', 'Drift n/a for an external service; answers spot-checked, still needed for Ask GenMeta.']]),
  R('REQ-1041', 'wf-policy', { kind: 'policy', id: 'pol-periodic-policy-review', label: 'Periodic Policy review', owners: ['Priya Shah'] },
    { Type: 'policy', Severity: 'medium' }, 'Priya Shah', '2026-10-02T11:30:00', [['q1', 'approved', 'Priya Shah', '2026-10-02T11:31:00', 'Owner review done.']]),
  R('REQ-1043', 'wf-access', { kind: 'access', id: 'STREAMING.customer-value', label: 'Emma Clarke → STREAMING.customer-value (read)', owners: ['Rajesh'] },
    { Sensitivity: 'Restricted', 'Requested role': 'analyst' }, 'Emma Clarke', '2026-10-03T08:45:00'),
  R('REQ-1039', 'wf-int-promote', { kind: 'model', id: 'customer-value-band', label: 'customer-value-band · v3', owners: ['Customer Analytics Lead'] },
    { 'Risk tier': 'Medium risk', 'Decisions about individuals': 'No', 'Model source': 'Internal' }, 'Rajesh', '2026-09-19T13:21:00',
    [['p2', 'approved', 'Data Engineer (validator)', '2026-09-19T13:22:00', 'Validated on held-out data; nation removed as an input.'],
      ['p4', 'approved', 'Admin', '2026-09-19T13:24:00', 'Signed off.'], ['p5', 'approved', 'Customer Analytics Lead', '2026-09-19T13:25:00', 'Go live for daily scoring.']]),
  R('REQ-1036', 'wf-ext-model', { kind: 'model', id: 'gemini-25-test', label: 'Gemini 2.5 Pro (test entry)', owners: ['Admin'] },
    { 'Risk tier': 'Low risk', 'Data sent': 'Personal data', 'Data held in': 'Not stated by the provider', 'Decisions about individuals': 'No', 'Model source': 'External' },
    'Priya Shah', '2026-09-20T10:00:00', [['s2', 'approved', 'Admin', '2026-09-20T12:00:00', ''], ['s3', 'rejected', 'Dana Whitfield', '2026-09-22T09:30:00', 'Provider does not state where personal data is held — no data processing agreement.']]),
];
let seq = 1045;

/* the live state of a request: each step done, current, waiting or skipped, plus who it is waiting on */
export function stateOf(req, wfs = workflows) {
  const wf = wfs.find((w) => w.id === req.wfId);
  let started = req.requestedAt;
  let status = 'in progress';
  let current = null;
  const steps = wf.steps.map((s) => {
    const applies = condHolds(s.runIf, req.ctx);
    if (!applies) return { step: s, status: 'skipped' };
    if (status !== 'in progress') return { step: s, status: 'not reached' };
    if (s.kind === 'automated' || s.kind === 'notify') return { step: s, status: 'done', who: 'genmeta', at: started, auto: true };
    const mine = req.decisions.filter(([id]) => id === s.id);
    const rej = mine.find(([, v]) => v === 'rejected');
    if (rej) { status = 'rejected'; return { step: s, status: 'rejected', who: rej[2], at: d(rej[3]), comment: rej[4] }; }
    const need = s.rule === 'all' ? s.approvers.length : 1;
    if (mine.length >= need) { const last = mine[mine.length - 1]; started = d(last[3]); return { step: s, status: 'done', who: mine.map((m) => m[2]).join(', '), at: d(last[3]), comment: last[4], all: mine }; }
    current = s; status = 'waiting';
    const due = new Date(started.getTime() + s.sla * 864e5);
    return { step: s, status: 'current', since: started, due, got: mine };
  });
  if (status === 'in progress') status = 'approved';
  if (status === 'waiting') status = 'in progress';
  /* notify steps after an approval finish when the request finishes */
  return { wf, steps, status, current, cur: steps.find((x) => x.status === 'current') };
}

/* can this person act on the current step? returns [ok, reason] */
export function canAct(req, actor) {
  const st = stateOf(req);
  if (!st.cur) return [false, 'Nothing is waiting on a decision.'];
  const [name, role] = ACTORS.find(([n]) => n === actor) || [actor, ''];
  const s = st.cur.step;
  if (s.sod && req.requestedBy === name) return [false, 'Needs someone other than the requester (separation of duties).'];
  if (st.cur.got.some((g) => g[2] === name)) return [false, 'You have already approved this step — waiting on the other approvers.'];
  const ok = s.approvers.some((a) => (a === 'owner' ? (req.subject.owners || []).includes(name) || (!(req.subject.owners || []).length && role === 'governance-lead') : a === role));
  if (!ok) return [false, `Waiting on ${waitingOn(req, st)}.`];
  return [true, ''];
}
export const approverText = (s, req) => s.approvers.map((a) => (a === 'owner' ? (req?.subject.owners?.length ? `owner (${req.subject.owners.join(', ')})` : 'owner of the item') : ROLE_LABEL[a] || a)).join(s.rule === 'all' ? ' and ' : ' or ');
export const waitingOn = (req, st = stateOf(req)) => {
  if (!st.cur) return '—';
  const s = st.cur.step;
  if (s.rule === 'all') { const got = st.cur.got.length; return `${approverText(s, req)} (${got} of ${s.approvers.length})`; }
  return approverText(s, req);
};

/* -------- store */
const listeners = new Set();
const emit = () => { snap = { workflows, requests }; listeners.forEach((l) => l()); };
let snap = { workflows, requests };
export function useWorkflowStore() {
  return useSyncExternalStore((cb) => { listeners.add(cb); return () => listeners.delete(cb); }, () => snap);
}
export const getWorkflows = () => workflows;
export const getRequests = () => requests;
export const workflowFor = (module, event) => workflows.filter((w) => w.module === module && w.event === event && w.status === 'active');

export function saveWorkflow(wf, by, publish) {
  const exists = workflows.some((w) => w.id === wf.id);
  const next = { ...wf, updatedAt: new Date(), updatedBy: by, ...(publish ? { status: 'active', version: exists ? (wf.version || 0) + 1 : 1 } : {}) };
  workflows = exists ? workflows.map((w) => (w.id === wf.id ? next : w)) : [...workflows, next];
  emit();
  return next;
}
/* record that something (e.g. a DPIA template) uses this workflow — no new version */
export function linkUsedBy(wfId, label) {
  workflows = workflows.map((w) => (w.id === wfId && !w.usedBy.includes(label) ? { ...w, usedBy: [...w.usedBy, label] } : w));
  emit();
}
/* the stages a DPIA follows under a workflow: its task and approval steps, with the role that acts */
export const dpiaStagesOf = (wf) => wf.steps.filter((x) => x.kind === 'task' || x.kind === 'approval').map((x) => [x.name, x.approvers[0] === 'owner' ? 'assessor' : x.approvers[0]]);
export function newWorkflowId(name) { return `wf-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 30)}-${Date.now().toString(36).slice(-4)}`; }

export function startRequest(wfId, subject, ctx, by) {
  const req = { id: `REQ-${seq++}`, wfId, subject, ctx, requestedBy: by, requestedAt: new Date(), decisions: [] };
  requests = [req, ...requests];
  emit();
  return req;
}
export function decide(reqId, actor, verdict, comment) {
  requests = requests.map((r) => {
    if (r.id !== reqId) return r;
    const st = stateOf(r);
    if (!st.cur) return r;
    return { ...r, decisions: [...r.decisions, [st.cur.step.id, verdict, actor, new Date().toISOString(), comment || '']] };
  });
  emit();
}
export const requestsFor = (kind, id) => requests.filter((r) => r.subject.kind === kind && r.subject.id === id);
