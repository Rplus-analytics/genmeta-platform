/* ------------------------------------------------------------------
   Sample admin data: users, groups, API tokens and audit logs.
   Names match the stewards used across the other screens.
   Replace with the GenMeta API (FastAPI → /api/admin/*) when wiring up.
   ------------------------------------------------------------------ */

export const USERS = [
  { id: 'u01', name: 'Pradeep Kumar', ini: 'PK', email: 'pk@rplus.gov.uk', role: 'Platform Admin', groups: ['Platform admins', 'Data stewards'], mfa: true, status: 'active', last: '2 min ago' },
  { id: 'u02', name: 'Raghav Menon', ini: 'RM', email: 'raghav@rplus.gov.uk', role: 'Governance Lead', groups: ['Governance board', 'Data stewards'], mfa: true, status: 'active', last: '14 min ago' },
  { id: 'u03', name: 'Rajesh Iyer', ini: 'RI', email: 'rajesh@rplus.gov.uk', role: 'Data Steward', groups: ['Data stewards', 'Casework analysts'], mfa: true, status: 'active', last: '1 h ago' },
  { id: 'u04', name: 'Madhavi Rao', ini: 'MR', email: 'madhavi@rplus.gov.uk', role: 'Data Steward', groups: ['Data stewards', 'Finance analysts'], mfa: true, status: 'active', last: '3 h ago' },
  { id: 'u05', name: 'Aisha Khan', ini: 'AK', email: 'aisha.khan@rplus.gov.uk', role: 'Analyst', groups: ['Finance analysts'], mfa: true, status: 'active', last: 'Yesterday' },
  { id: 'u06', name: 'Tom Whitfield', ini: 'TW', email: 'tom.whitfield@rplus.gov.uk', role: 'Analyst', groups: ['Casework analysts'], mfa: false, status: 'active', last: 'Yesterday' },
  { id: 'u07', name: 'Priya Nair', ini: 'PN', email: 'priya.nair@rplus.gov.uk', role: 'Data Engineer', groups: ['Data engineering'], mfa: true, status: 'active', last: '26 min ago' },
  { id: 'u08', name: 'Owen Hughes', ini: 'OH', email: 'owen.hughes@rplus.gov.uk', role: 'Data Engineer', groups: ['Data engineering'], mfa: true, status: 'active', last: '2 days ago' },
  { id: 'u09', name: 'Sofia Martins', ini: 'SM', email: 'sofia.martins@rplus.gov.uk', role: 'Viewer', groups: ['Read-only'], mfa: false, status: 'invited', last: '—' },
  { id: 'u10', name: 'James Okafor', ini: 'JO', email: 'james.okafor@rplus.gov.uk', role: 'Governance Lead', groups: ['Governance board'], mfa: true, status: 'active', last: '5 h ago' },
  { id: 'u11', name: 'Emma Clarke', ini: 'EC', email: 'emma.clarke@rplus.gov.uk', role: 'Analyst', groups: ['Finance analysts', 'Read-only'], mfa: true, status: 'suspended', last: '3 weeks ago' },
  { id: 'u12', name: 'Daniel Ross', ini: 'DR', email: 'daniel.ross@rplus.gov.uk', role: 'Viewer', groups: ['Read-only'], mfa: false, status: 'invited', last: '—' },
];

export const GROUPS = [
  { id: 'g1', name: 'Platform admins', d: 'Full control of users, connectors, tokens and platform settings.', source: 'Entra ID', perms: ['Admin', 'Manage connectors', 'Manage tokens'], created: '12 Jan 2026' },
  { id: 'g2', name: 'Governance board', d: 'Owns policies and standards; signs off classification changes.', source: 'Entra ID', perms: ['Edit policies', 'Approve classifications'], created: '12 Jan 2026' },
  { id: 'g3', name: 'Data stewards', d: 'Review AI-drafted metadata, lineage edges and glossary terms.', source: 'Entra ID', perms: ['Approve metadata', 'Edit glossary'], created: '14 Jan 2026' },
  { id: 'g4', name: 'Data engineering', d: 'Registers sources, schedules scans and maintains pipelines.', source: 'Entra ID', perms: ['Manage sources', 'Run scans'], created: '20 Jan 2026' },
  { id: 'g5', name: 'Finance analysts', d: 'Query access to FINANCIAL domains with masking applied.', source: 'Local', perms: ['Query', 'View FINANCIAL'], created: '03 Feb 2026' },
  { id: 'g6', name: 'Casework analysts', d: 'Query access to casework; PERSONAL fields masked.', source: 'Local', perms: ['Query', 'View PERSONAL (masked)'], created: '03 Feb 2026' },
  { id: 'g7', name: 'Read-only', d: 'Browse the catalogue and knowledge graph. No query access.', source: 'Local', perms: ['Browse'], created: '10 Mar 2026' },
];

export const membersOf = (group) => USERS.filter((u) => u.groups.includes(group));

export const TOKENS = [
  { id: 't1', name: 'airflow-harvester', owner: 'Priya Nair', scopes: ['sources:read', 'scans:write'], created: '02 Apr 2026', expires: '02 Apr 2027', last: '4 min ago', status: 'active' },
  { id: 't2', name: 'powerbi-connector', owner: 'Aisha Khan', scopes: ['catalogue:read'], created: '18 May 2026', expires: '18 Nov 2026', last: '1 h ago', status: 'active' },
  { id: 't3', name: 'lineage-sync', owner: 'Owen Hughes', scopes: ['lineage:write'], created: '07 Jun 2026', expires: '07 Dec 2026', last: '17 min ago', status: 'active' },
  { id: 't4', name: 'ask-genmeta-slack', owner: 'Pradeep Kumar', scopes: ['ask:query', 'catalogue:read'], created: '21 Jul 2026', expires: '21 Jan 2027', last: '32 min ago', status: 'active' },
  { id: 't5', name: 'ci-metadata-check', owner: 'Priya Nair', scopes: ['catalogue:read'], created: '10 Jan 2026', expires: '10 Oct 2026', last: 'Yesterday', status: 'expiring' },
  { id: 't6', name: 'legacy-export', owner: 'Emma Clarke', scopes: ['catalogue:read', 'export'], created: '04 Nov 2025', expires: '04 May 2026', last: '5 months ago', status: 'revoked' },
];

export const QUERY_LOGS = [
  { t: '09:42:18', user: 'Aisha Khan', src: 'Snowflake', q: 'SELECT invoice_id, amount, due_date FROM finance.invoice_header WHERE status = \'OVERDUE\'', rows: 1284, ms: 412, status: 'ok' },
  { t: '09:39:02', user: 'Tom Whitfield', src: 'SQL Server', q: 'SELECT case_id, claimant_address FROM casework.claims WHERE opened_at > \'2026-09-01\'', rows: 312, ms: 188, status: 'masked' },
  { t: '09:31:47', user: 'ask-genmeta-slack', src: 'Ask GenMeta', q: 'Which tables feed the monthly payments dashboard?', rows: 9, ms: 1630, status: 'ok' },
  { t: '09:24:11', user: 'Priya Nair', src: 'Databricks', q: 'DESCRIBE HISTORY events.web_sessions', rows: 48, ms: 905, status: 'ok' },
  { t: '09:18:55', user: 'Sofia Martins', src: 'Oracle', q: 'SELECT * FROM ledger.payments', rows: 0, ms: 22, status: 'denied' },
  { t: '09:12:30', user: 'Madhavi Rao', src: 'Oracle', q: 'SELECT account_code, SUM(amount) FROM ledger.payments GROUP BY account_code', rows: 214, ms: 2210, status: 'ok' },
  { t: '09:05:09', user: 'powerbi-connector', src: 'Snowflake', q: 'SELECT * FROM reporting.monthly_payments_v', rows: 5120, ms: 3380, status: 'ok' },
  { t: '08:58:44', user: 'Owen Hughes', src: 'Confluent', q: 'GET /subjects/payments-value/versions/latest', rows: 1, ms: 64, status: 'ok' },
  { t: '08:51:20', user: 'Rajesh Iyer', src: 'Amazon S3', q: 'SELECT key, size FROM s3_manifest WHERE prefix = \'documents/2026/09/\'', rows: 0, ms: 30000, status: 'timeout' },
  { t: '08:44:02', user: 'Aisha Khan', src: 'Ask GenMeta', q: 'Show every field tagged FINANCIAL without a description', rows: 37, ms: 1204, status: 'ok' },
];

export const EVENT_LOGS = [
  { t: '09:44:51', actor: 'Pradeep Kumar', cat: 'access', ev: 'Added user to group', target: 'Aisha Khan → Finance analysts', ip: '10.12.4.21', sev: 'info' },
  { t: '09:40:13', actor: 'system', cat: 'auth', ev: 'Failed sign-in (3 attempts)', target: 'emma.clarke@rplus.gov.uk', ip: '81.2.69.160', sev: 'warning' },
  { t: '09:33:08', actor: 'Priya Nair', cat: 'token', ev: 'API token rotated', target: 'airflow-harvester', ip: '10.12.7.3', sev: 'info' },
  { t: '09:27:40', actor: 'Raghav Menon', cat: 'config', ev: 'Policy updated', target: 'GOV-07 Sensitive data masking', ip: '10.12.4.88', sev: 'info' },
  { t: '09:18:55', actor: 'Sofia Martins', cat: 'access', ev: 'Query denied by policy', target: 'ledger.payments', ip: '10.12.9.40', sev: 'warning' },
  { t: '09:02:17', actor: 'Pradeep Kumar', cat: 'access', ev: 'User suspended', target: 'Emma Clarke', ip: '10.12.4.21', sev: 'critical' },
  { t: '08:55:32', actor: 'Pradeep Kumar', cat: 'token', ev: 'API token revoked', target: 'legacy-export', ip: '10.12.4.21', sev: 'critical' },
  { t: '08:47:09', actor: 'Madhavi Rao', cat: 'auth', ev: 'Signed in via Entra ID', target: 'madhavi@rplus.gov.uk', ip: '10.12.5.14', sev: 'info' },
  { t: '08:30:00', actor: 'system', cat: 'config', ev: 'Scheduled scan completed', target: 'Rplus_DWH (Snowflake)', ip: '—', sev: 'info' },
  { t: '08:12:44', actor: 'Pradeep Kumar', cat: 'access', ev: 'Invited user', target: 'daniel.ross@rplus.gov.uk', ip: '10.12.4.21', sev: 'info' },
];

export const ADMIN_TOTALS = {
  users: USERS.length,
  activeUsers: USERS.filter((u) => u.status === 'active').length,
  invited: USERS.filter((u) => u.status === 'invited').length,
  groups: GROUPS.length,
  entraGroups: GROUPS.filter((g) => g.source === 'Entra ID').length,
  tokens: TOKENS.filter((t) => t.status !== 'revoked').length,
  expiring: TOKENS.filter((t) => t.status === 'expiring').length,
  mfa: USERS.filter((u) => u.mfa).length / USERS.length,
  queries24h: 18432,
  events24h: 1206,
};

export const OAUTH_CLIENTS = [
  { id: 'c1', name: 'Power BI Service', clientId: 'gm_cl_8f2a91c4', grant: 'Authorization code + PKCE', redirect: 'https://app.powerbi.com/oauth/callback', scopes: ['catalogue:read'], created: '18 May 2026', status: 'active' },
  { id: 'c2', name: 'Tableau Cloud', clientId: 'gm_cl_3b7e0d55', grant: 'Authorization code', redirect: 'https://sso.online.tableau.com/callback', scopes: ['catalogue:read', 'lineage:read'], created: '02 Jun 2026', status: 'active' },
  { id: 'c3', name: 'Airflow scheduler', clientId: 'gm_cl_c19f6a02', grant: 'Client credentials', redirect: '—', scopes: ['sources:read', 'scans:write'], created: '02 Apr 2026', status: 'active' },
  { id: 'c4', name: 'Internal data portal', clientId: 'gm_cl_71d4be88', grant: 'Authorization code + PKCE', redirect: 'https://data.rplus.gov.uk/auth/callback', scopes: ['catalogue:read', 'ask:query'], created: '14 Aug 2026', status: 'active' },
  { id: 'c5', name: 'Legacy reporting', clientId: 'gm_cl_0a5c33e1', grant: 'Client credentials', redirect: '—', scopes: ['export'], created: '04 Nov 2025', status: 'revoked' },
];

export const SSO = {
  enabled: true,
  provider: 'Microsoft Entra ID',
  protocol: 'SAML 2.0',
  entityId: 'https://genmeta.rplus.gov.uk/saml/metadata',
  acsUrl: 'https://genmeta.rplus.gov.uk/saml/acs',
  idpEntityId: 'https://sts.windows.net/4f1c2b9e-0d7a-4c55-9b31-6e2a7f0c1d88/',
  idpSsoUrl: 'https://login.microsoftonline.com/4f1c2b9e-0d7a-4c55-9b31-6e2a7f0c1d88/saml2',
  certExpires: '14 Mar 2027',
  domains: ['rplus.gov.uk'],
  lastSync: '12 min ago',
  signIns24h: 214,
  failed24h: 3,
};

export const SSO_MAPPINGS = [
  { idp: 'SG-GenMeta-Admins', group: 'Platform admins', role: 'Platform Admin', users: 1 },
  { idp: 'SG-Data-Governance', group: 'Governance board', role: 'Governance Lead', users: 2 },
  { idp: 'SG-Data-Stewards', group: 'Data stewards', role: 'Data Steward', users: 4 },
  { idp: 'SG-Data-Engineering', group: 'Data engineering', role: 'Data Engineer', users: 2 },
  { idp: 'SG-Finance-Analytics', group: 'Finance analysts', role: 'Analyst', users: 3 },
  { idp: 'SG-All-Staff', group: 'Read-only', role: 'Viewer', users: 3 },
];

export const SMTP = {
  configured: true,
  host: 'smtp.office365.com',
  port: 587,
  security: 'STARTTLS',
  username: 'genmeta-noreply@rplus.gov.uk',
  fromName: 'Rplus GenMeta',
  fromEmail: 'genmeta-noreply@rplus.gov.uk',
  lastTest: 'Delivered · 2 days ago',
};

export const INTEGRATIONS = [
  { id: 'slack', name: 'Slack', ini: 'SL', d: 'Ask GenMeta from Slack and receive steward notifications in channels.', connected: true, detail: '#data-governance' },
  { id: 'teams', name: 'Microsoft Teams', ini: 'MT', d: 'Post approvals and alerts to Teams channels.', connected: true, detail: 'Data Office team' },
  { id: 'jira', name: 'Jira', ini: 'JI', d: 'Open tickets for data-quality issues and stewardship tasks.', connected: false },
  { id: 'servicenow', name: 'ServiceNow', ini: 'SN', d: 'Raise access requests as ServiceNow catalogue items.', connected: false },
  { id: 'powerbi', name: 'Power BI', ini: 'PB', d: 'Harvest report lineage and surface descriptions in Power BI.', connected: true, detail: 'Rplus tenant' },
  { id: 'github', name: 'GitHub', ini: 'GH', d: 'Sync dbt models and review metadata changes as pull requests.', connected: false },
];

export const WEBHOOKS = [
  { id: 'w1', url: 'https://hooks.rplus.gov.uk/genmeta/classification', events: ['classification.changed'], last: '200 · 8 min ago', status: 'ok' },
  { id: 'w2', url: 'https://airflow.rplus.internal/api/v1/genmeta', events: ['scan.completed', 'source.failed'], last: '200 · 17 min ago', status: 'ok' },
  { id: 'w3', url: 'https://audit.rplus.gov.uk/ingest', events: ['user.*', 'token.*'], last: '503 · 1 h ago', status: 'failing' },
  { id: 'w4', url: 'https://example-partner.io/webhooks/rplus', events: ['product.published'], last: '—', status: 'disabled' },
];

export const NOTIFICATION_EVENTS = [
  { id: 'task', l: 'Stewardship task assigned', d: 'A steward is asked to review a change.', email: true, slack: true, app: true },
  { id: 'class', l: 'Classification changed', d: 'A PERSONAL or FINANCIAL tag is added or removed.', email: true, slack: true, app: true },
  { id: 'scan', l: 'Source scan failed', d: 'A scheduled harvest could not complete.', email: true, slack: false, app: true },
  { id: 'access', l: 'Access request', d: 'Someone requests access to a restricted asset.', email: true, slack: false, app: true },
  { id: 'token', l: 'API token expiring', d: 'A token expires within 14 days.', email: true, slack: false, app: false },
  { id: 'digest', l: 'Weekly estate digest', d: 'Summary of coverage, changes and open tasks.', email: true, slack: false, app: false },
];

export const LABS = [
  { id: 'nl2sql', l: 'Natural-language to SQL', d: 'Ask GenMeta drafts runnable SQL against the source system, with masking applied.', on: true, stage: 'Beta' },
  { id: 'autoclass', l: 'Auto-apply classifications', d: 'Apply high-confidence PERSONAL tags without steward review.', on: false, stage: 'Experimental' },
  { id: 'colineage', l: 'Column-level lineage from query logs', d: 'Infer field-to-field lineage by parsing query history.', on: true, stage: 'Beta' },
  { id: 'dq', l: 'Data-quality anomaly detection', d: 'Flag unusual row counts and null rates after each scan.', on: false, stage: 'Experimental' },
  { id: 'graph3d', l: '3D knowledge graph', d: 'Explore the knowledge graph in an interactive 3D view.', on: false, stage: 'Preview' },
];
