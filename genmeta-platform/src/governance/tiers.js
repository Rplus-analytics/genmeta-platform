import { useSyncExternalStore } from 'react';
import { RISK_TIERS } from './data.js';

/* MLG-06 — model governance workflow templates, one per risk tier, configurable to regulatory and
   HMRC requirements. Test data copied from the old UI (Governance › Model governance › Workflows & policy).
   Kept in one in-memory store so a saved template updates the tier cards and every model page at once. */

export const WORKFLOW_STAGES = ['Registered', 'Validation', 'Approval', 'In production', 'Periodic review'];

const STAGE_DEFAULTS = {
  Registered: [['Model card completed', 'Accountable owner named', 'Intended use and limits stated'], ['governance-lead', 'platform-ops', 'data-engineer']],
  Validation: [['Performance validated on held-out data', 'Bias assessed across protected groups', 'Explainability reviewed', 'Independent validator (not the developer)'], ['governance-lead', 'data-engineer']],
  Approval: [['DPIA completed', 'UK GDPR Article 22 assessment', 'Equality impact assessment', 'ATRS record drafted', 'Model risk sign-off'], ['governance-lead', 'product-owner']],
  'In production': [['Drift and bias monitoring enabled', 'Guardrails configured'], ['governance-lead', 'platform-ops']],
  'Periodic review': [['Drift and bias results reviewed', 'Performance still acceptable', 'Continued business need confirmed'], ['governance-lead']],
};
const REGULATIONS = [
  'UK GDPR Article 22 — automated decision-making',
  'UK GDPR Article 35 — data protection impact assessment',
  'Data Protection Act 2018',
  'Equality Act 2010 — Public Sector Equality Duty',
  'ICO guidance on AI and data protection',
  'Algorithmic Transparency Recording Standard (ATRS)',
  'HMRC internal model risk policy (reference to be configured by HMRC)',
];

const fresh = (days, approvers) => ({
  days, approvers,
  stages: Object.fromEntries(WORKFLOW_STAGES.map((s) => [s, { evidence: [...STAGE_DEFAULTS[s][0]], roles: [...STAGE_DEFAULTS[s][1]] }])),
  regulations: [...REGULATIONS],
  savedAt: null, savedBy: null,
});

let templates = Object.fromEntries(RISK_TIERS.map(([name, , days, approvers]) => [name, fresh(days, approvers)]));
const listeners = new Set();

export const getTemplates = () => templates;
export const templateFor = (risk) => templates[risk] || templates['Medium risk'];

/* save one tier: replace its template, keep RISK_TIERS (used for summaries) in step, tell every subscriber */
export function saveTemplate(name, tpl, by) {
  templates = { ...templates, [name]: { ...tpl, savedAt: new Date().toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }), savedBy: by } };
  const row = RISK_TIERS.find(([r]) => r === name);
  if (row) { row[2] = tpl.days; row[3] = tpl.approvers; }
  listeners.forEach((l) => l());
}

export function useTemplates() {
  return useSyncExternalStore((cb) => { listeners.add(cb); return () => listeners.delete(cb); }, getTemplates);
}

export const tierSummary = (t) => `review every ${t.days} days · ${t.approvers} approver(s)`;
export const ROLES = ['governance-lead', 'data-engineer', 'product-owner', 'platform-ops'];
