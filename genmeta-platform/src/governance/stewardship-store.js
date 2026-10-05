import { useSyncExternalStore } from 'react';
import { writeAudit } from './data.js';
import {
  REGISTER, ASSIGN_LOG, MODEL_ROLES, MODEL_CHANGES, QUALITY_ISSUES, AUDIT_TRAIL, QUEUE, CHANGE_REQUESTS, COLUMN_ROLES, RESPONSIBILITIES, datasetOf, BUILT_IN, columnsOfAsset,
} from './stewardship-data.js';
import { getAccess, me } from './access-store.js';

/* Governance › Stewardship — one store, so Access & RBAC can ask who owns or stewards an asset and what the
   governance model lets them do. "Viewing as (test)" is shared with Access & RBAC. Test data only. */

const now = () => {
  const d = new Date();
  const m = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'][d.getMonth()];
  return `${d.getDate()} ${m} ${d.getFullYear()}, ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};
let st = {
  register: REGISTER, extra: ASSIGN_LOG, roles: MODEL_ROLES, changes: MODEL_CHANGES, issues: QUALITY_ISSUES, trail: AUDIT_TRAIL, queue: QUEUE,
  requests: CHANGE_REQUESTS, columnRoles: COLUMN_ROLES,
};
const listeners = new Set();
const emit = () => { st = { ...st }; listeners.forEach((l) => l()); };
export const useStewardship = () => useSyncExternalStore((cb) => { listeners.add(cb); return () => listeners.delete(cb); }, () => st);
export const getStewardship = () => st;
const viewRole = () => getAccess().role;
const isLead = () => viewRole() === 'governance-lead';
const roleName = (k) => st.roles.find((r) => r.key === k)?.name || k;

/* every Stewardship action goes to the page's trail and the hash-chained Governance audit log */
const log = (action, on, what, cat) => {
  st = { ...st, trail: [{ at: now(), who: me(), role: viewRole(), action, on, what, cat }, ...st.trail] };
  writeAudit(me(), viewRole(), action, 'Ownership and access', on, what);
};
const refuse = (action, on, why) => { log(`${action}.refused`, on, `refused — ${why}`, 'ownership.denied'); emit(); return { ok: false, why }; };

/* ---------------------------------------------------------------- what someone may do on an asset (OWN-06) */
export function stewardRoles(person, asset) {
  const r = st.register.find((x) => x.asset === asset);
  if (!r) return [];
  return Object.entries(r.roles).filter(([, c]) => c && c.who.toLowerCase() === person.toLowerCase()).map(([k]) => k);
}
const hasResp = (keys, i) => keys.some((k) => st.roles.find((r) => r.key === k)?.resp[i] === '1');
export function stewardRights(person, asset) {
  const keys = stewardRoles(person, asset);
  return { keys, names: keys.map(roleName), approve: hasResp(keys, 1), grant: hasResp(keys, 2), changes: hasResp(keys, 3), quality: hasResp(keys, 4) };
}
export const ownersOf = (asset) => {
  const r = st.register.find((x) => x.asset === asset);
  if (!r) return [];
  const by = {};
  Object.entries(r.roles).filter(([k, c]) => c && hasResp([k], 1)).forEach(([k, c]) => { by[c.who] = [...(by[c.who] || []), roleName(k).toLowerCase()]; });
  return Object.entries(by).map(([who, rs]) => `${who} (${rs.join(', ')})`);
};

/* ---------------------------------------------------------------- assign (direct for a governance lead, otherwise a change request) */
function apply({ asset, scope, role, person, column }) {
  const row = st.register.find((r) => r.asset === asset);
  if (column) { st = { ...st, columnRoles: [...st.columnRoles.filter((c) => !(c.asset === asset && c.column === column && c.role === role)), { asset, column, role, who: person }] }; return `column ${asset}.${column}`; }
  const hit = (r) => (scope === 'asset' ? r.asset === asset : scope === 'dataset' ? datasetOf(r.asset) === datasetOf(asset) : r.system === row.system);
  const how = scope === 'asset' ? 'a' : 'i';
  st = { ...st, register: st.register.map((r) => (hit(r) && (scope === 'asset' || !r.roles[role] || r.roles[role].how !== 'a') ? { ...r, roles: { ...r.roles, [role]: { who: person, how } } } : r)),
    extra: scope === 'asset' ? { ...st.extra, [asset]: [[roleName(role), person, `assigned by ${me()} ${now()}`], ...(st.extra[asset] || []).filter(([l]) => l !== roleName(role))] } : st.extra };
  return scope === 'asset' ? asset : scope === 'dataset' ? `dataset ${datasetOf(asset)}` : `system ${row.system}`;
}
export function assign(a) {
  const where = a.column ? `column ${a.asset}.${a.column}` : a.scope === 'asset' ? a.asset : a.scope === 'dataset' ? `dataset ${datasetOf(a.asset)}` : `system ${st.register.find((r) => r.asset === a.asset).system}`;
  if (!isLead()) {
    const r = { id: `cr${Date.now()}`, ...a, change: `${roleName(a.role)} on ${where}: ${(st.register.find((x) => x.asset === a.asset)?.roles[a.role]?.who) || '—'} → ${a.person}`, by: me(), at: now(), status: 'pending' };
    st = { ...st, requests: [r, ...st.requests] };
    log('ownership.change.request', where, `requested ${roleName(a.role)} → ${a.person}${a.reason ? `: ${a.reason}` : ''} — needs approval by someone else`, 'ownership.change');
    emit();
    return { ok: true, pending: true };
  }
  apply(a);
  log('ownership.assign', where, `${roleName(a.role)} → ${a.person}${a.reason ? ` — ${a.reason}` : ''}`, 'ownership.assign');
  emit();
  return { ok: true };
}
export function decideChange(id, approve) {
  const r = st.requests.find((x) => x.id === id);
  if (r.by === me()) return refuse(approve ? 'ownership.change.approve' : 'ownership.change.reject', r.asset, `${me()} asked for this change — a different person must approve it.`);
  if (!isLead() && !stewardRights(me(), r.asset).changes) return refuse(approve ? 'ownership.change.approve' : 'ownership.change.reject', r.asset, `${me()} is not a governance lead and holds no role on ${r.asset} that may approve ownership changes.`);
  if (approve) apply(r);
  st = { ...st, requests: st.requests.map((x) => (x.id === id ? { ...x, status: approve ? 'approved' : 'rejected', decidedBy: me(), decidedAt: now() } : x)) };
  log(approve ? 'ownership.change.approve' : 'ownership.change.reject', r.asset, `${approve ? 'approved' : 'rejected'} ${r.change} (requested by ${r.by})`, 'ownership.change');
  emit();
  return { ok: true };
}
export function bulkAssign(assets, role, person) {
  if (!isLead()) return refuse('ownership.assign.bulk', `${assets.length} asset(s)`, `bulk assignment needs a governance lead (you are viewing as ${viewRole()}) — assign one asset at a time to request a change.`);
  st = { ...st, register: st.register.map((r) => (assets.includes(r.asset) ? { ...r, roles: { ...r.roles, [role]: { who: person, how: 'a' } } } : r)) };
  log('ownership.assign.bulk', `${assets.length} asset(s)`, `${roleName(role)} → ${person} (bulk): ${assets.slice(0, 6).join(', ')}${assets.length > 6 ? '…' : ''}`, 'ownership.assign');
  emit();
  return { ok: true };
}

/* ---------------------------------------------------------------- governance model */
export function changeModel(fn, what) {
  if (!isLead()) return refuse('ownership.model', 'governance model', `only a governance lead can change the governance model (you are viewing as ${viewRole()}).`);
  const v = `v${Number(st.changes[0][0].slice(1)) + 1}`;
  st = { ...st, roles: fn(st.roles), changes: [[v, now(), me(), what], ...st.changes] };
  log('ownership.model', `governance model ${v}`, what, 'ownership.model');
  emit();
  return { ok: true };
}

/* ---------------------------------------------------------------- quality issues */
export function raiseIssue(asset, title) {
  const steward = st.register.find((r) => r.asset === asset)?.roles.steward?.who || '';
  st = { ...st, issues: [{ id: `q${Date.now()}`, title, asset, by: me(), at: now(), routed: steward, status: 'open' }, ...st.issues] };
  log('quality.raise', asset, `raised quality issue “${title}” → ${steward || 'no steward'}`, 'ownership.quality');
  emit();
  return { ok: true, steward };
}
export function resolveIssue(id, note) {
  const it = st.issues.find((i) => i.id === id);
  const steward = st.register.find((r) => r.asset === it.asset)?.roles.steward?.who;
  if (!isLead() && (!steward || steward.toLowerCase() !== me().toLowerCase())) return refuse('ownership.resolve', it.asset, `${me()} is not the steward of ${it.asset}${steward ? ` (${steward} is)` : ' (it has no steward)'} and is not a governance lead.`);
  st = { ...st, issues: st.issues.map((i) => (i.id === id ? { ...i, status: `resolved by ${me()}: ${note}` } : i)) };
  log('quality.resolve', it.asset, `resolved “${it.title}” — ${note}`, 'ownership.quality');
  emit();
  return { ok: true };
}
export function describe(asset) { log('metadata.describe', asset, 'description saved', 'ownership.assign'); emit(); return { ok: true }; }

/* ---------------------------------------------------------------- review queue */
export function decideTask(id, ok) {
  const q = st.queue.find((x) => x.id === id);
  if (!isLead() && !stewardRights(me(), q.asset).keys.length) return refuse(q.type === 'Ownership' ? 'ownership.review' : 'classification.review', q.asset, `${me()} holds no role on ${q.asset} and is not a governance lead.`);
  st = { ...st, queue: st.queue.map((x) => (x.id === id ? { ...x, status: ok ? 'Approved' : 'Rejected' } : x)) };
  log(q.type === 'Ownership' ? 'ownership.review' : 'classification.review', q.asset, `${ok ? 'approved' : 'rejected'}: ${q.task}`, q.type === 'Ownership' ? 'ownership.assign' : 'ownership.quality');
  emit();
  return { ok: true };
}

/* ---------------------------------------------------------------- coverage and gaps from the same rows */
const colHas = (s, asset, col, k) => s.columnRoles.some((c) => c.asset === asset && c.column === col && c.role === k);
export function coverage(s = st) {
  const TYPES = [['table', 'tables'], ['file, API or topic', 'files, APIs & topics'], ['report', 'reports']];
  const gaps = [];
  const rows = [];
  TYPES.forEach(([kind, label]) => {
    const list = s.register.filter((r) => r.kind === kind);
    rows.push({ label, n: list.length, has: Object.fromEntries(BUILT_IN.map((k) => [k, list.filter((r) => r.roles[k]).length])) });
    list.forEach((r) => { const miss = BUILT_IN.filter((k) => !r.roles[k]); if (miss.length) gaps.push({ id: r.asset, asset: r.asset, type: label, miss, system: r.system }); });
  });
  const cols = s.register.flatMap((r) => columnsOfAsset(r.asset).map((c) => ({ r, c })));
  rows.splice(1, 0, { label: 'columns', n: cols.length, has: Object.fromEntries(BUILT_IN.map((k) => [k, cols.filter(({ r, c }) => r.roles[k] || colHas(s, r.asset, c, k)).length])) });
  cols.forEach(({ r, c }) => { const miss = BUILT_IN.filter((k) => !r.roles[k] && !colHas(s, r.asset, c, k)); if (miss.length) gaps.push({ id: `${r.asset}.${c}`, asset: r.asset, type: 'columns', miss, system: r.system, column: true }); });
  const dss = [...new Set(s.register.map((r) => datasetOf(r.asset)))];
  rows.push({ label: 'datasets', n: dss.length, has: Object.fromEntries(BUILT_IN.map((k) => [k, dss.filter((d) => s.register.filter((r) => datasetOf(r.asset) === d).every((r) => r.roles[k])).length])) });
  dss.forEach((d) => { const list = s.register.filter((r) => datasetOf(r.asset) === d); const miss = BUILT_IN.filter((k) => !list.every((r) => r.roles[k])); if (miss.length) gaps.push({ id: `dataset ${d}`, asset: null, type: 'datasets', miss, system: list[0].system }); });
  return { rows, gaps };
}
export { RESPONSIBILITIES };
