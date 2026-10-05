import { useSyncExternalStore } from 'react';
import {
  ROLES, SOD, DIRECTORY, PLATFORMS, ACCESS_POLICIES, REVIEW_ITEMS, ASSET_NAMES, PD_MAP, SYSTEMS, systemOf, sensitivityOf, ownerOf, colClass, writeAudit,
} from './data.js';
import { stewardRights, ownersOf } from './stewardship-store.js';

/* Governance › Access & RBAC — one in-memory store so every tab (requests, reviews, roles, scopes, separation of duties,
   rules, directory, platforms) reads the same people, grants and decisions, and every action lands in the audit log.
   Test data only. */

/* ---------------------------------------------------------------- who is viewing (test) */
export const ACCESS_VIEW = [
  ['governance-lead', 'Admin'], ['dpo', 'Dana Whitfield'], ['auditor', 'Sam Okafor'], ['platform-ops', 'Owen Hughes'],
  ['data-engineer', 'Rajesh'], ['product-owner', 'Aisha Khan'], ['analyst', 'Priya Shah'],
];
export const CLEAR_RANK = { L1: 1, L2: 2, L3: 3 };

/* ---------------------------------------------------------------- the catalogue a permission can target */
const pdOf = (a) => PD_MAP.find((x) => x.asset === a);
export const datasetOf = (a) => a.split('.')[0];
export const columnsOf = (a) => pdOf(a)?.cols || [];
export const TARGETS = {
  system: SYSTEMS.map((s) => ({ id: s, system: s })),
  dataset: [...new Set(ASSET_NAMES.filter((a) => !a.startsWith('BI.')).map(datasetOf))].sort().map((d) => ({ id: d, system: systemOf(`${d}.x`) })),
  table: ASSET_NAMES.filter((a) => !a.startsWith('BI.')).map((a) => ({ id: a, system: systemOf(a) })),
  report: ASSET_NAMES.filter((a) => a.startsWith('BI.')).map((a) => ({ id: a, system: systemOf(a) })),
  column: PD_MAP.flatMap((x) => x.cols.map((c) => ({ id: `${x.asset}.${c}`, system: x.system, cls: colClass(c) }))),
};
export const LEVELS = ['system', 'dataset', 'table', 'column', 'report'];
const SPECIFICITY = { column: 4, table: 3, report: 3, dataset: 2, system: 1 };
export const isKnownAsset = (a) => ASSET_NAMES.includes(a);

/* ---------------------------------------------------------------- directory (test data) */
export const DIRECTORY_MEMBERS = [
  ['GenMeta-Governance', ['Admin', 'Sarah Jones']],
  ['GenMeta-Audit', ['Sam Okafor', 'Sarah Jones']],
  ['GenMeta-DPO', ['Dana Whitfield', 'Mark Owusu']],
  ['GenMeta-Analysts', ['Priya Shah', 'Emma Clarke', 'Noor Ali']],
  ['GenMeta-Engineering', ['Rajesh', 'Pradeep Kumar']],
  ['GenMeta-Ops', ['Owen Hughes']],
  ['GenMeta-ProductOwners', ['Aisha Khan']],
  ['Finance-Analysts', ['Meera Shah']],
  ['Risk-Investigators', []],
  ['GenMeta-Contractors', ['Liam Patel']],
];
/* grants the platform itself reports (Rplus_DWH publishes them; the others cannot be read) */
const PLATFORM_HAS = ['system:Rplus_DWH:data-engineer'];
const DB = { Rplus_DWH: 'RPLUS', 'SQL Server': 'RPLUS_SQL' };

/* ---------------------------------------------------------------- seeded state */
const today = () => new Date();
const fmtD = (d) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
const now = () => new Date().toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).replace(' at', ',');
const addDays = (n, from = today()) => { const d = new Date(from); d.setDate(d.getDate() + n); return fmtD(d); };

const A = (person, role, source = 'manual', at = '12 Sep 2026') => ({ person, role, source, at });
let st = {
  role: 'governance-lead',
  roles: ROLES.map((r) => ({ ...r, builtIn: true })),
  assign: [
    A('Admin', 'governance-lead'), A('Dana Whitfield', 'dpo'), A('Sam Okafor', 'auditor'), A('Owen Hughes', 'platform-ops'),
    A('Rajesh', 'data-engineer'), A('Pradeep Kumar', 'data-engineer'), A('Aisha Khan', 'product-owner'),
    A('Priya Shah', 'analyst'), A('Emma Clarke', 'analyst'),
    /* held before the manage_metadata ↔ approve_access rule was switched on — shows under "Combinations held today" */
    A('Tom Reid', 'data-engineer', 'manual', '3 Mar 2026'), A('Tom Reid', 'product-owner', 'manual', '3 Mar 2026'),
  ],
  scopes: [
    { role: 'analyst', level: 'dataset', target: 'INT', actions: ['read_metadata', 'read_profile'], by: 'Admin', at: '14 Sep 2026' },
    { role: 'analyst', level: 'column', target: 'INT.CUSTOMER.NI_NUMBER', actions: ['read_metadata'], by: 'Admin', at: '14 Sep 2026' },
    { role: 'analyst', level: 'report', target: 'BI.Customer 360 Dashboard', actions: ['read_metadata', 'read_profile'], by: 'Admin', at: '20 Sep 2026' },
    { role: 'data-engineer', level: 'system', target: 'Rplus_DWH', actions: ['read_metadata', 'read_profile', 'manage_metadata'], by: 'Admin', at: '2 Sep 2026' },
  ],
  sod: SOD.map((s) => ({ ...s, on: true })),
  /* the same grants Access reviews works on */
  grants: REVIEW_ITEMS.map((r) => ({ id: r.id, person: r.person, role: r.role, asset: r.asset, sens: r.sens, granted: r.granted, lastUsed: r.lastUsed, why: r.why, by: ownerOf(r.asset) || 'owner', expires: (() => { const e = new Date(r.granted); e.setDate(e.getDate() + 90); const min = new Date(); min.setDate(min.getDate() + 21); return fmtD(e > min ? e : min); })(), status: 'active', source: 'request' })),
  requests: [],
  policies: ACCESS_POLICIES.map((p) => ({ ...p })),
  sync: null,
  recon: null,
  review: { dec: {}, applied: null },
};

const listeners = new Set();
const emit = () => { st = { ...st }; listeners.forEach((l) => l()); };
export const useAccess = () => useSyncExternalStore((cb) => { listeners.add(cb); return () => listeners.delete(cb); }, () => st);
export const getAccess = () => st;
const personOf = (role) => (ACCESS_VIEW.find(([r]) => r === role) || [])[1] || role;
export const me = () => personOf(st.role);
export const roleOf = (key) => st.roles.find((r) => r.key === key);
const log = (action, asset, what) => writeAudit(me(), st.role, action, 'Ownership and access', asset, what);
const refuse = (action, asset, why0) => { const why = why0.charAt(0).toUpperCase() + why0.slice(1); log(`${action}.refused`, asset, `refused — ${why}`); emit(); return { ok: false, why }; };
const can = (perm) => roleOf(st.role)?.may.includes(perm);
/* OWN-06: a governance lead always may; otherwise the asset's owner or steward, if the governance model gives their role the responsibility */
const mayOnAsset = (asset, what) => st.role === 'governance-lead' || stewardRights(me(), asset)[what];
const notOwner = (asset, resp) => `${me()} is not a governance lead, and holds no role on ${asset} with “${resp}” in the Stewardship register (owner or steward with that responsibility).`;
export const approversFor = (asset) => { const o = ownersOf(asset); return o.length ? `${o.join(', ')} or a governance lead` : 'a governance lead (no owner or steward with that responsibility)'; };

export function setViewRole(role) { st = { ...st, role }; emit(); }

/* ---------------------------------------------------------------- roles, assignments, separation of duties */
export const rolesHeld = (person) => st.assign.filter((a) => a.person.toLowerCase() === person.toLowerCase()).map((a) => a.role);
const permsOf = (roleKeys) => [...new Set(roleKeys.flatMap((k) => roleOf(k)?.may || []))];
/* the separation-of-duties rule an assignment would break, with a sentence saying why */
export function sodClash(person, role, sod = st.sod) {
  const held = rolesHeld(person);
  if (held.includes(role)) return null;
  for (const s of sod.filter((x) => x.on)) {
    if (s.kind === 'role') {
      const other = s.a === role ? s.b : s.b === role ? s.a : null;
      if (other && held.includes(other)) return { rule: s, text: `${person} already holds ${other}. ${s.why}` };
    } else {
      const before = permsOf(held); const add = roleOf(role)?.may || [];
      const hit = (before.includes(s.a) && add.includes(s.b)) || (before.includes(s.b) && add.includes(s.a));
      if (hit) {
        const has = before.includes(s.a) && add.includes(s.b) ? s.a : s.b;
        const via = held.find((k) => roleOf(k)?.may.includes(has));
        return { rule: s, text: `${person} already holds ${via} (${has}); ${role} would add ${has === s.a ? s.b : s.a}. ${s.why}` };
      }
    }
  }
  return null;
}
/* people who hold a conflicting pair today (e.g. from before a rule was switched on) */
export function combinationsHeld(s = st) {
  const people = [...new Set(s.assign.map((a) => a.person))];
  const out = [];
  people.forEach((p) => {
    const held = s.assign.filter((a) => a.person === p).map((a) => a.role);
    const perms = permsOf(held);
    s.sod.forEach((r) => {
      if (r.kind === 'role' && held.includes(r.a) && held.includes(r.b)) out.push({ person: p, rule: r, detail: `${r.a} + ${r.b}` });
      if (r.kind === 'duty' && perms.includes(r.a) && perms.includes(r.b)) {
        const ra = held.find((k) => roleOf(k)?.may.includes(r.a)); const rb = held.find((k) => roleOf(k)?.may.includes(r.b));
        if (ra !== rb) out.push({ person: p, rule: r, detail: `${r.a} via ${ra} + ${r.b} via ${rb}` });
      }
    });
  });
  return out;
}
export function assignRole(person, role, source = 'manual') {
  const p = person.trim();
  if (source === 'manual' && st.role !== 'governance-lead') return refuse('access.assign', p, `only a governance lead can assign roles (you are viewing as ${st.role})`);
  if (rolesHeld(p).includes(role)) return refuse('access.assign', p, `${p} already holds ${role}`);
  const c = sodClash(p, role);
  if (c) return refuse('access.assign', p, `${p} → ${role}: ${c.text}`);
  st = { ...st, assign: [...st.assign, A(p, role, source, fmtD(today()))] };
  log('access.assign', p, `assigned ${role} to ${p} (${source})`);
  emit();
  return { ok: true };
}
export function unassign(person, role) {
  if (st.role !== 'governance-lead') return refuse('access.unassign', person, `only a governance lead can remove role assignments (you are viewing as ${st.role})`);
  st = { ...st, assign: st.assign.filter((a) => !(a.person === person && a.role === role)) };
  log('access.unassign', person, `removed ${role} from ${person}`);
  emit();
  return { ok: true };
}
export function defineRole({ name, clearance, may }) {
  if (st.role !== 'governance-lead') return refuse('access.role', name, `only a governance lead can define roles (you are viewing as ${st.role})`);
  const key = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  if (!key || st.roles.some((r) => r.key === key || r.name.toLowerCase() === name.trim().toLowerCase())) return refuse('access.role', name, `a role called “${name.trim()}” already exists`);
  if (!may.length) return refuse('access.role', name, 'a role needs at least one permission');
  st = { ...st, roles: [...st.roles, { name: name.trim(), key, clearance, may, builtIn: false, by: me(), at: fmtD(today()) }] };
  log('access.role', key, `defined the role “${name.trim()}” (${key}) — clearance ${clearance}, may ${may.join(', ')}`);
  emit();
  return { ok: true, key };
}
export function toggleSod(i, on) {
  if (st.role !== 'governance-lead') return refuse('access.sod', 'separation of duties', `only a governance lead can change separation-of-duties rules (you are viewing as ${st.role})`);
  const s = st.sod[i];
  st = { ...st, sod: st.sod.map((x, k) => (k === i ? { ...x, on } : x)) };
  log('access.sod', `${s.a} ↔ ${s.b}`, `${on ? 'switched on' : 'switched off'} the ${s.builtIn ? 'built-in ' : ''}separation-of-duties rule ${s.a} ↔ ${s.b}`);
  emit();
  return { ok: true };
}

/* ---------------------------------------------------------------- scopes (permissions held at a level) */
export function saveScope(f) {
  if (st.role !== 'governance-lead') return refuse('access.scope', f.target, `only a governance lead can set scopes (you are viewing as ${st.role})`);
  if (!TARGETS[f.level].some((t) => t.id === f.target)) return refuse('access.scope', f.target || '—', `“${f.target}” is not a ${f.level} in the catalogue`);
  st = { ...st, scopes: [...st.scopes, { ...f, by: me(), at: fmtD(today()) }] };
  log('access.scope', f.target, `set a ${f.level} scope for ${f.role} on ${f.target}: ${f.actions.join(', ')}`);
  emit();
  return { ok: true };
}
export function removeScope(i) {
  if (st.role !== 'governance-lead') return refuse('access.scope', st.scopes[i].target, `only a governance lead can remove scopes (you are viewing as ${st.role})`);
  const s = st.scopes[i];
  st = { ...st, scopes: st.scopes.filter((_, k) => k !== i) };
  log('access.scope', s.target, `removed the ${s.level} scope for ${s.role} on ${s.target}`);
  emit();
  return { ok: true };
}
const scopeMatches = (s, asset, col) => (s.level === 'system' && s.target === systemOf(asset)) || (s.level === 'dataset' && s.target === datasetOf(asset))
  || ((s.level === 'table' || s.level === 'report') && s.target === asset) || (s.level === 'column' && col && s.target === `${asset}.${col}`);
/* the scope that decides, most specific first */
export function winningScope(role, asset, col) {
  const hits = st.scopes.filter((s) => s.role === role && scopeMatches(s, asset, col)).sort((a, b) => SPECIFICITY[b.level] - SPECIFICITY[a.level]);
  return { win: hits[0] || null, all: hits };
}
const scopeEffect = (actions) => (actions.includes('read_sensitive') || actions.includes('read_profile') ? 'allow' : 'mask');

/* ---------------------------------------------------------------- the decision point */
export function decide({ asset, column, role, person, loc = 'uk', purpose = '' }) {
  const r = roleOf(role);
  const cl = r.clearance; const rank = CLEAR_RANK[cl] || 1;
  const steps = [];
  const S = (k, t, e) => steps.push([k, t, e]);
  S('Who is asking', `${person} · ${r.name} (${r.key}) · clearance ${cl}`, 'allow');
  if (!isKnownAsset(asset)) {
    S('Catalogue', `“${asset}” is not in the catalogue — unknown assets are refused, never allowed by default`, 'deny');
    return { effect: 'deny', steps, cols: [], asker: { person, role: r, cl }, known: false };
  }
  const sens = sensitivityOf(asset); const sys = systemOf(asset);
  const cols = columnsOf(asset);
  if (column && !cols.includes(column)) {
    S('Catalogue', `${asset} has no catalogued column “${column}” — refused`, 'deny');
    return { effect: 'deny', steps, cols: [], asker: { person, role: r, cl }, known: true, sens };
  }
  S('Catalogue', `${asset} · ${sys} · ${sens}${cols.length ? ` · ${cols.length} personal-data column(s)` : ''}`, 'allow');
  const { win, all } = winningScope(role, asset, column);
  const granted = st.grants.find((g) => g.asset === asset && g.person === person && g.status === 'active');
  const over = granted ? ` — overridden: ${person} holds an active grant on this asset (expires ${granted.expires})` : '';
  if (win) { const e = scopeEffect(win.actions); S('Scope (most specific wins)', `${win.level} ${win.target} → ${win.actions.join(', ')}${all.length > 1 ? ` · beats ${all.slice(1).map((x) => `${x.level} ${x.target}`).join(', ')}` : ''}${e === 'mask' ? over : granted ? ` · grant held` : ''}`, granted ? 'allow' : e); }
  else { const e = r.may.includes('read_profile') || r.may.includes('read_sensitive') ? 'allow' : 'mask'; S('Scope (most specific wins)', `no scope for ${r.key} on ${asset} — the role's own permissions apply (${r.may.includes('read_profile') ? 'may read profiles' : 'metadata only'})${e === 'mask' ? over : granted ? ' · grant held' : ''}`, granted ? 'allow' : e); }
  const pol = st.policies.find((p) => p.s === sens);
  const needsGrant = (sens === 'Restricted' || sens === 'Confidential') && pol?.mask;
  S('Access policy and grants', granted ? `${person} holds an active grant (expires ${granted.expires})` : needsGrant ? (r.may.includes('read_sensitive') ? `${sens}: no grant, but ${r.key} may read sensitive detail` : `${sens}: no grant — sensitive detail is masked (approved by ${pol.ap.toLowerCase()}, up to ${pol.days} days)`) : `${sens}: no grant needed`, granted || !needsGrant || r.may.includes('read_sensitive') ? 'allow' : 'mask');
  const special = cols.filter((c) => colClass(c) === 'SPECIAL_CATEGORY');
  const specialHit = column ? (colClass(column) === 'SPECIAL_CATEGORY' ? [column] : []) : special;
  S('rule-special-category', specialHit.length ? (rank < 3 ? `${specialHit.map((c) => `${asset}.${c}`).join(', ')} is special-category data — clearance ${cl} is below L3: ${column ? 'denied' : 'those column(s) denied'}` : `special-category column(s) ${specialHit.join(', ')} — clearance ${cl} meets L3`) : 'no special-category column — not applied', specialHit.length && rank < 3 ? (column ? 'deny' : 'mask') : 'allow');
  S('rule-offshore', sens === 'Restricted' ? (loc === 'uk' ? 'request from the United Kingdom — not applied' : 'Restricted data requested from outside the UK — denied') : 'not Restricted — not applied', sens === 'Restricted' && loc !== 'uk' ? 'deny' : 'allow');
  const pii = (column ? [column] : cols).filter((c) => ['PII', 'FINANCIAL', 'GOVERNMENT_ID'].includes(colClass(c)));
  S('rule-pii-mask', pii.length ? (rank < 2 ? (granted ? `clearance ${cl} is below L2 — not applied: ${person} holds a grant on this asset` : `personal and financial column(s) masked — clearance ${cl} is below L2`) : `clearance ${cl} — not applied`) : 'no personal or financial column — not applied', pii.length && rank < 2 && !granted ? 'mask' : 'allow');
  const purposeOver = r.may.includes('read_sensitive') || (granted && granted.why && granted.why !== '—');
  S('rule-purpose', sens === 'Restricted' ? (purpose.trim() ? `purpose stated: “${purpose.trim()}”` : purposeOver ? `no purpose given — not applied: ${granted && granted.why && granted.why !== '—' ? `the grant's purpose stands (“${granted.why}”)` : `${r.key} holds read_sensitive`}` : 'Restricted data needs a stated purpose — none given') : 'not Restricted — not applied', sens === 'Restricted' && !purpose.trim() && !purposeOver ? 'mask' : 'allow');
  const effect = steps.some((x) => x[2] === 'deny') ? 'deny' : steps.some((x) => x[2] === 'mask') ? 'mask' : 'allow';
  /* per column */
  const colRows = (column ? [column] : cols).map((c) => {
    const cls = colClass(c);
    const cw = winningScope(role, asset, c).win;
    if (cls === 'SPECIAL_CATEGORY' && rank < 3) return { col: c, cls, effect: 'deny', why: `special category — needs L3, ${person} has ${cl}` };
    if (sens === 'Restricted' && loc !== 'uk') return { col: c, cls, effect: 'deny', why: 'outside the UK' };
    if (cw && cw.level === 'column' && !granted) return { col: c, cls, effect: scopeEffect(cw.actions), why: `column scope: ${cw.actions.join(', ')}` };
    if (['PII', 'FINANCIAL', 'GOVERNMENT_ID'].includes(cls) && rank < 2 && !granted) return { col: c, cls, effect: 'mask', why: `${cls} masked below L2 — no grant` };
    if (needsGrant && !granted && !r.may.includes('read_sensitive')) return { col: c, cls, effect: 'mask', why: 'no grant on Restricted data' };
    if (sens === 'Restricted' && !purpose.trim() && !purposeOver) return { col: c, cls, effect: 'mask', why: 'no purpose stated' };
    return { col: c, cls, effect: 'allow', why: granted ? 'grant held' : 'clearance and scope allow it' };
  });
  return { effect, steps, cols: colRows, asker: { person, role: r, cl }, known: true, sens, granted: !!granted };
}
export function evaluate(q, kind = 'evaluate') {
  const res = decide(q);
  log(`access.${kind}${res.effect === 'deny' ? '.denied' : ''}`, q.asset || '—', `${kind === 'check' ? 'checked access' : 'asked the decision point'} for ${q.person} (${q.role}) on ${q.asset}${q.column ? `.${q.column}` : ''}: ${res.effect}${res.cols.filter((c) => c.effect !== 'allow').length ? ` · ${res.cols.filter((c) => c.effect !== 'allow').map((c) => `${c.col} ${c.effect}`).join(', ')}` : ''}`);
  emit();
  return res;
}

/* ---------------------------------------------------------------- requests, approvals, provisioning */
export const policyFor = (asset) => st.policies.find((p) => p.s === sensitivityOf(asset));
export function setPolicies(policies) {
  if (st.role !== 'governance-lead') return refuse('access.policy', 'access policies', `only a governance lead can change access policies (you are viewing as ${st.role})`);
  st = { ...st, policies }; log('access.policy', 'access policies', 'saved the access policies'); emit(); return { ok: true };
}
const userId = (p) => `"${p.toLowerCase().replace(/[^a-z]+/g, '.')}@hmrc.gov.uk"`;
const objectFor = (asset) => { const sys = systemOf(asset); const [ds, ...rest] = asset.split('.'); return DB[sys] ? `${DB[sys]}.${ds}.${rest.join('.')}` : asset; };
export function provisionFor(asset, person, days) {
  const sys = systemOf(asset); const due = addDays(days);
  if (DB[sys]) return { platform: sys, grant: `GRANT SELECT ON TABLE ${objectFor(asset)} TO USER ${userId(person)};`, revoke: `REVOKE SELECT ON TABLE ${objectFor(asset)} FROM USER ${userId(person)};`, due, auto: sys === 'Rplus_DWH' };
  if (sys === 'Rplus Amazon S3') return { platform: sys, grant: `aws iam attach-user-policy --user-name ${person.replace(/\s+/g, '.').toLowerCase()} --policy-arn arn:aws:iam::rplus:policy/read-${asset.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`, revoke: `aws iam detach-user-policy --user-name ${person.replace(/\s+/g, '.').toLowerCase()} --policy-arn arn:aws:iam::rplus:policy/read-${asset.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`, due, auto: false };
  if (sys === 'Rplus Reports (Power BI)') return { platform: sys, grant: `Add ${person} as Viewer on the “${asset.slice(3)}” report (Power BI admin)`, revoke: `Remove ${person} from the “${asset.slice(3)}” report`, due, auto: false };
  return { platform: sys, grant: `Grant ${person} read on ${asset} in ${sys}`, revoke: `Remove ${person}'s read on ${asset} in ${sys}`, due, auto: false };
}
export function requestAccess({ asset, days, why }) {
  const p = me(); const role = st.role;
  if (!isKnownAsset(asset)) return refuse('access.request', asset || '—', `“${asset}” is not in the catalogue`);
  const pol = policyFor(asset);
  const has = st.grants.find((g) => g.asset === asset && g.person === p && g.status === 'active');
  if (has) return refuse('access.request', asset, `You already have access to ${asset} (granted ${has.granted}, expires ${has.expires}).`);
  if (st.requests.some((r) => r.asset === asset && r.by === p && r.status === 'pending')) return refuse('access.request', asset, `You already have a pending request for ${asset}.`);
  if (+days < 1) return refuse('access.request', asset, 'ask for at least one day');
  if (+days > pol.days) return refuse('access.request', asset, `${days} days is above the ${pol.s} maximum of ${pol.days} days.`);
  if (pol.just && !why.trim()) return refuse('access.request', asset, `${pol.s} data needs a business justification.`);
  if (pol.ap === 'No approval (automatic)') { const r0 = { id: `q${Date.now()}`, asset, by: p, role, clearance: roleOf(role).clearance, at: now(), days: +days, why, status: 'pending', approvers: 'automatic' }; st = { ...st, requests: [r0, ...st.requests] }; return approveRequest(r0.id, true); }
  const r = { id: `q${Date.now()}`, asset, by: p, role, clearance: roleOf(role).clearance, at: now(), days: +days, why, status: 'pending', policy: `${pol.s} · max ${pol.days} days`, approvers: approversFor(asset) };
  st = { ...st, requests: [r, ...st.requests] };
  log('access.request', asset, `${p} (${role}) asked for ${days} days on ${asset}${why ? ` — “${why}”` : ''}; sent to ${r.approvers}`);
  emit();
  return { ok: true };
}
export function approveRequest(id, automatic = false) {
  const r = st.requests.find((x) => x.id === id);
  if (!automatic) {
    if (r.by === me()) return refuse('access.approve', r.asset, `${me()} asked for this access — the person who asks cannot be the person who approves it.`);
    if (!mayOnAsset(r.asset, 'approve')) return refuse('access.approve', r.asset, notOwner(r.asset, 'Approve or decline access requests'));
  }
  const prov = provisionFor(r.asset, r.by, r.days);
  const g = { id: `g${Date.now()}`, person: r.by, role: r.role, asset: r.asset, sens: sensitivityOf(r.asset), granted: fmtD(today()), lastUsed: 'never', why: r.why || '—', by: automatic ? 'automatic' : me(), expires: prov.due, status: 'active', source: 'request', provision: prov };
  st = { ...st, requests: st.requests.map((x) => (x.id === id ? { ...x, status: 'approved', decidedBy: automatic ? 'automatic' : `${me()} (${st.role})`, decidedAt: now(), provision: prov } : x)), grants: [g, ...st.grants] };
  log('access.approve', r.asset, `${automatic ? 'automatically approved' : 'approved'} ${r.by}'s request for ${r.days} days on ${r.asset}`);
  log('access.grant', r.asset, `provisioned on ${prov.platform}: ${prov.grant} · due ${prov.due} · revoke with ${prov.revoke}${prov.auto ? '' : ` (${prov.platform} does not publish its grants — cannot be confirmed)`} — recorded, not applied: automatic correction is off`);
  emit();
  return { ok: true, prov };
}
export function rejectRequest(id) {
  const r = st.requests.find((x) => x.id === id);
  if (r.by === me()) return refuse('access.reject', r.asset, `${me()} asked for this access — withdraw it instead of deciding it.`);
  if (!mayOnAsset(r.asset, 'approve')) return refuse('access.reject', r.asset, notOwner(r.asset, 'Approve or decline access requests'));
  st = { ...st, requests: st.requests.map((x) => (x.id === id ? { ...x, status: 'rejected', decidedBy: `${me()} (${st.role})`, decidedAt: now() } : x)) };
  log('access.reject', r.asset, `rejected ${r.by}'s request on ${r.asset}`);
  emit();
  return { ok: true };
}
export function grantDirect({ asset, person, days }) {
  if (!isKnownAsset(asset)) return refuse('access.grant', asset || '—', `“${asset}” is not in the catalogue`);
  if (!mayOnAsset(asset, 'grant')) return refuse('access.grant', asset, notOwner(asset, 'Grant and revoke access directly'));
  const pol = policyFor(asset);
  if (st.grants.some((g) => g.asset === asset && g.person === person && g.status === 'active')) return refuse('access.grant', asset, `${person} already has access to ${asset}.`);
  if (+days > pol.days) return refuse('access.grant', asset, `${days} days is above the ${pol.s} maximum of ${pol.days} days.`);
  const prov = provisionFor(asset, person, +days);
  st = { ...st, grants: [{ id: `g${Date.now()}`, person, role: rolesHeld(person)[0] || '—', asset, sens: sensitivityOf(asset), granted: fmtD(today()), lastUsed: 'never', why: 'granted directly', by: me(), expires: prov.due, status: 'active', source: 'direct', provision: prov }, ...st.grants] };
  log('access.grant', asset, `granted ${person} ${days} days on ${asset} directly · ${prov.grant} · due ${prov.due}`);
  emit();
  return { ok: true };
}
export function revokeGrant(id, why = 'revoked') {
  const g = st.grants.find((x) => x.id === id);
  if (why === 'revoked' && !mayOnAsset(g.asset, 'grant')) return refuse('access.revoke', g.asset, notOwner(g.asset, 'Grant and revoke access directly'));
  const prov = g.provision || provisionFor(g.asset, g.person, 1);
  st = { ...st, grants: st.grants.map((x) => (x.id === id ? { ...x, status: 'revoked' } : x)) };
  log('access.revoke', g.asset, `${why === 'revoked' ? 'revoked' : why} ${g.person}'s grant on ${g.asset} · ${prov.revoke}`);
  emit();
  return { ok: true };
}

/* ---------------------------------------------------------------- access reviews (same grants) */
export function setReviewDecision(id, d) { st = { ...st, review: { ...st.review, dec: { ...st.review.dec, [id]: d } } }; emit(); }
export function clearReviewDecision(id) { const dec = { ...st.review.dec }; delete dec[id]; st = { ...st, review: { ...st.review, dec } }; emit(); }
export function applyReview() {
  if (!can('approve_access') && st.role !== 'governance-lead') return refuse('access.review', 'Q4 2026 review', `${st.role} cannot apply review results`);
  const deny = Object.entries(st.review.dec).filter(([, d]) => d === 'Deny').map(([id]) => id);
  deny.forEach((id) => { const g = st.grants.find((x) => x.id === id); if (g && g.status === 'active') { st = { ...st, grants: st.grants.map((x) => (x.id === id ? { ...x, status: 'revoked' } : x)) }; log('access.revoke', g.asset, `access review: revoked ${g.person}'s grant on ${g.asset}`); } });
  st = { ...st, review: { ...st.review, applied: fmtD(today()) } };
  log('access.review', 'Q4 2026 review', `applied the access review — ${deny.length} grant(s) revoked, ${Object.values(st.review.dec).filter((d) => d === 'Approve').length} kept`);
  emit();
  return { ok: true, revoked: deny.length };
}

/* ---------------------------------------------------------------- directory sync */
export function syncDirectory() {
  if (!['governance-lead', 'platform-ops'].includes(st.role)) return refuse('access.sync', 'directory', `only a governance lead or platform ops can synchronise the directory (you are viewing as ${st.role})`);
  const map = Object.fromEntries(DIRECTORY);
  const results = [];
  DIRECTORY_MEMBERS.forEach(([group, people]) => people.forEach((p) => {
    const role = map[group];
    if (!role) { results.push({ person: p, group, role: '—', outcome: 'skipped', why: 'no group mapping — the group carries no GenMeta role' }); return; }
    if (rolesHeld(p).includes(role)) { results.push({ person: p, group, role, outcome: 'unchanged', why: st.assign.find((a) => a.person === p && a.role === role).source === 'manual' ? 'already held — kept as a manual assignment' : 'already held' }); return; }
    const c = sodClash(p, role);
    if (c) { results.push({ person: p, group, role, outcome: 'refused', why: `separation of duties — ${c.text}` }); log('access.sync.refused', p, `directory sync refused ${role} for ${p}: ${c.text}`); return; }
    st = { ...st, assign: [...st.assign, A(p, role, 'directory', fmtD(today()))] };
    results.push({ person: p, group, role, outcome: 'applied', why: `added from ${group}` });
  }));
  const n = (o) => results.filter((r) => r.outcome === o).length;
  st = { ...st, sync: { at: now(), by: me(), results } };
  log('access.sync', 'directory', `synchronised AWS IAM Identity Center: ${n('applied')} applied, ${n('unchanged')} unchanged, ${n('skipped')} skipped (no group), ${n('refused')} refused (separation of duties)`);
  emit();
  return { ok: true, results };
}

/* ---------------------------------------------------------------- platform reconciliation */
const platformRole = (role) => `GENMETA_${role.toUpperCase().replace(/[^A-Z0-9]+/g, '_')}`;
export function statementFor(s) {
  const sys = s.level === 'system' ? s.target : TARGETS[s.level].find((t) => t.id === s.target)?.system;
  const db = DB[sys]; const pr = platformRole(s.role);
  if (!db) return { sys, why: (PLATFORMS.find(([p]) => p === sys) || [])[3] || 'this platform does not publish its grants', sql: `— ${sys} does not take SQL grants: grant ${pr} ${s.actions.includes('read_profile') ? 'read' : 'metadata'} on ${s.target} in the platform console`, checkable: false };
  const checkable = (PLATFORMS.find(([p]) => p === sys) || [])[2];
  if (s.level === 'system') return { sys, sql: `GRANT USAGE ON DATABASE ${db} TO ROLE ${pr};`, checkable };
  if (s.level === 'dataset') return { sys, sql: `GRANT USAGE ON DATABASE ${db} TO ROLE ${pr};\nGRANT USAGE ON SCHEMA ${db}.${s.target} TO ROLE ${pr};${s.actions.includes('read_profile') ? `\nGRANT SELECT ON ALL TABLES IN SCHEMA ${db}.${s.target} TO ROLE ${pr};` : ''}`, checkable };
  if (s.level === 'table') return { sys, sql: `GRANT SELECT ON TABLE ${db}.${s.target} TO ROLE ${pr};`, checkable };
  if (s.level === 'column') {
    /* Snowflake: column access is a masking policy, not a GRANT — and SHOW GRANTS cannot see it */
    const [ds, tb, col] = s.target.split('.');
    const pol = `${db}.GOVERNANCE.GENMETA_MASK_${col}`;
    const shows = s.actions.includes('read_profile') || s.actions.includes('read_sensitive');
    return { sys, checkable: false, why: 'not checkable with SHOW GRANTS — column access is a masking policy',
      sql: `CREATE MASKING POLICY IF NOT EXISTS ${pol} AS (val STRING) RETURNS STRING ->\n  CASE WHEN IS_ROLE_IN_SESSION('${pr}') ${shows ? "THEN val ELSE '***MASKED***'" : "THEN '***MASKED***' ELSE val"} END;\nALTER TABLE ${db}.${ds}.${tb} MODIFY COLUMN ${col} SET MASKING POLICY ${pol};` };
  }
  return { sys, sql: `GRANT SELECT ON ${s.target} TO ROLE ${pr};`, checkable };
}
export function reconcile() {
  if (!['governance-lead', 'platform-ops'].includes(st.role)) return refuse('access.reconcile', 'platforms', `only a governance lead or platform ops can reconcile platforms (you are viewing as ${st.role})`);
  const rows = st.scopes.map((s) => {
    const x = statementFor(s);
    const present = PLATFORM_HAS.includes(`${s.level}:${s.target}:${s.role}`);
    return { scope: s, sys: x.sys, sql: x.sql, why: x.why || (!x.checkable ? (PLATFORMS.find(([p]) => p === x.sys) || [])[3] : ''), state: !x.checkable ? 'not checkable' : present ? 'present' : 'missing' };
  });
  const per = Object.fromEntries(PLATFORMS.map(([p]) => [p, { checked: 0, missing: 0, nc: 0, sql: [] }]));
  rows.forEach((r) => { const p = per[r.sys]; if (!p) return; p.checked += 1; if (r.state === 'missing') { p.missing += 1; p.sql.push(r.sql); } if (r.state === 'not checkable') { p.nc += 1; p.sql.push(r.sql); } });
  st = { ...st, recon: { at: now(), by: me(), rows, per } };
  const m = rows.filter((r) => r.state === 'missing').length; const nc = rows.filter((r) => r.state === 'not checkable').length;
  log('access.reconcile', 'platforms', `reconciled ${rows.length} scope(s) across ${PLATFORMS.length} platform(s): ${rows.length - m - nc} present, ${m} missing in the platform, ${nc} not checkable`);
  emit();
  return { ok: true };
}
