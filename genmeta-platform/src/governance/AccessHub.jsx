import { useMemo, useState } from 'react';
import { NavLink, Navigate, useNavigate, useParams } from 'react-router-dom';
import {
  Users, Fingerprint, BadgeCheck, UserCheck, ClipboardList, ShieldCheck, ListChecks, ScrollText, Layers, KeyRound, Inbox, CalendarCheck, ClipboardCheck,
  ShieldQuestion, Split, Gavel, RefreshCw, Server, History, Search, Download, X, AlertTriangle, Eye, Lock, Building2, MapPin, Clock,
} from 'lucide-react';
import { PageHead, Button, Tabs } from '../components/ui.jsx';
import { BASE, ACCESS_RULES, AUDIT, fmtTs, ownerOf } from './data.js';
import { Card, Tiles, StatusBadge, Empty, Note, Mono, Fld, Drawer, toast, SubNav } from './kit.jsx';
import {
  useAccess, setViewRole, ACCESS_VIEW, roleOf, combinationsHeld, unassign, revokeGrant, syncDirectory, statementFor,
} from './access-store.js';
import { useStewardship, stewardRights } from './stewardship-store.js';
import { PEOPLE_DIR, GROUP_LIST, groupRole, rolesFor, sourceFor, initials, manualRolesOf, groupRolesOf, directoryStats } from './people.js';
import {
  Requests, Reviews, RolesMatrix, Scopes, Sod, Rules, Directory, Platforms, useAct, RoleNote,
} from './Access.jsx';
import { useFacets } from './catalog.jsx';
import { Register, StewardRoles, Gaps, Approvals, AuditTrail, ReviewQueue } from './Stewardship.jsx';
/* Govern › Governance › Access — one screen, two halves that match the requirements tracker:
   Access control and RBAC, and Data stewardship and ownership. "Viewing as (test)" is shared by both. */
export const ACCESS_BASE = `${BASE}/access`;
export const HALVES = [
  { key: 'access', label: 'Access control and RBAC', short: 'Access control and RBAC', tabs: [
    ['people', 'Roles & people', Users, 'RBAC-01'],
    ['permissions', 'Permissions by level', Layers, 'RBAC-02'],
    ['sod', 'Separation of duties', Split, 'RBAC-03'],
    ['rules', 'Access rules', Gavel, 'RBAC-04, RBAC-05'],
    ['requests', 'Requests & grants', Inbox, 'RBAC-05, RBAC-06, OWN-06'],
    ['policies', 'Access policies', ScrollText, 'OWN-06'],
    ['reviews', 'Access reviews', CalendarCheck, 'RBAC-06'],
    ['directory', 'Directory & identity', Fingerprint, 'RBAC-07'],
    ['platforms', 'Platform consistency', Server, 'RBAC-08'],
  ] },
  { key: 'stewardship', label: 'Data stewardship and ownership', short: 'Data stewardship and ownership', tabs: [
    ['responsibilities', 'Roles & responsibilities', ClipboardList, 'OWN-01, OWN-02, OWN-04'],
    ['ownership', 'Ownership register', UserCheck, 'OWN-01, OWN-04'],
    ['coverage', 'Coverage gaps', ShieldCheck, 'OWN-03'],
    ['approvals', 'Approvals & quality issues', ClipboardCheck, 'OWN-02'],
    ['audit', 'Audit trail', History, 'OWN-05'],
  ] },
];
/* Roles & people has three views; old links land on the tab that now holds them */
const VIEWS = [['people', 'People'], ['groups', 'Groups'], ['roles', 'Access roles']];
const MOVED = { grants: 'requests', check: 'requests', queue: 'approvals' };
const tabOf = (section) => (VIEWS.some(([v]) => v === section) ? 'people' : section);
export const halfOf = (section) => HALVES.find((h) => h.tabs.some(([k]) => k === tabOf(section)));

function useCounts(st, ss) {
  return {
    ownership: ss.register.length,
    requests: st.requests.filter((r) => r.status === 'pending').length || '',
    approvals: (ss.requests.filter((r) => r.status === 'pending').length + ss.issues.filter((i) => i.status === 'open').length + ss.queue.filter((q) => q.status === 'In review' || q.status === 'Open').length) || '',
    sod: combinationsHeld(st).length || '',
  };
}

function HalfTiles({ half, st, ss }) {
  const ds = directoryStats(st.assign);
  const unmappedGroups = GROUP_LIST.filter((g) => !groupRole(g));
  const active = st.grants.filter((g) => g.status === 'active');
  const items = half === 'access' ? [
    { l: 'People in the directory', v: ds.people.toLocaleString('en-GB'), s: `${GROUP_LIST.length} groups · ${st.sync ? `synchronised ${st.sync.at}` : 'not yet synchronised'}` },
    { l: 'From the directory', v: `${ds.fromDir}%`, s: `${ds.manual} manual access-role assignment(s) to tidy` },
    { l: 'Without an access role', v: ds.roleless, s: `members of ${unmappedGroups.join(', ')} — no role mapping` },
    { l: 'Separation-of-duties breaches', v: combinationsHeld(st).length, s: 'held today — needs a decision' },
    { l: 'Active grants', v: active.length, s: `${st.requests.filter((r) => r.status === 'pending').length} request(s) pending · Restricted ≤ 90 days` },
  ] : [
    { l: 'Assets in the register', v: ss.register.length, s: `governance model ${ss.changes[0][0]}` },
    { l: 'Steward coverage', v: `${Math.round((ss.register.filter((r) => r.roles.steward).length / ss.register.length) * 1000) / 10}%`, s: `${ss.register.filter((r) => r.roles.steward).length} of ${ss.register.length} assets` },
    { l: 'Open quality issues', v: ss.issues.filter((i) => i.status === 'open').length, s: 'routed to the asset’s steward' },
    { l: 'Change requests pending', v: ss.requests.filter((r) => r.status === 'pending').length, s: 'need a different approver' },
    { l: 'Review queue', v: ss.queue.filter((q) => q.status === 'In review' || q.status === 'Open').length, s: 'classification reviews and ownership gaps' },
  ];
  return <Tiles items={items} />;
}

/* ------------------------------------------------------------------ page */
export default function AccessHub({ peopleFilters }) {
  const { section } = useParams();
  const nav = useNavigate();
  const st = useAccess(); const ss = useStewardship();
  if (!section) return <Navigate to={`${ACCESS_BASE}/people`} replace />;
  if (MOVED[section]) return <Navigate to={`${ACCESS_BASE}/${MOVED[section]}`} replace />;
  const half = halfOf(section);
  if (!half) return <Navigate to={`${ACCESS_BASE}/people`} replace />;
  const tab = tabOf(section);
  const [, title, , covers] = half.tabs.find(([k]) => k === tab);
  const count = useCounts(st, ss);
  const go = (k) => nav(`${ACCESS_BASE}/${k}`);
  return (
    <div className="page gv">
      <PageHead eyebrow={`Govern · Access · ${half.label} · ${title}`} title={title} sub={`Covers ${covers}`}>
        <Fld label="Viewing as (test)">
          <select className="select" value={st.role} onChange={(e) => setViewRole(e.target.value)} aria-label="Viewing as">{ACCESS_VIEW.map(([r, p]) => <option key={r} value={r}>{r} · {p}</option>)}</select>
        </Fld>
      </PageHead>
      <div className="ax-halves" role="tablist" aria-label="Requirement area">
        {HALVES.map((h) => <button key={h.key} type="button" role="tab" aria-selected={h === half} className={h === half ? 'on' : ''} onClick={() => go(h.tabs[0][0])}>{h.label}</button>)}
      </div>
      {half.key === 'stewardship' && <p className="ax-own6">OWN-06 (owners and stewards decide access) lives in Access control and RBAC › <button type="button" className="ax-same inline" onClick={() => go('requests')}>Requests & grants ›</button></p>}
      <HalfTiles half={half.key} st={st} ss={ss} />
      <Tabs items={half.tabs.map(([k, l, I]) => ({ value: k, label: count[k] !== undefined && count[k] !== '' ? `${l} (${count[k]})` : l, icon: I }))} value={tab} onChange={go} className="ax-tabs" />
      {tab === 'people' && <SubNav value={section} onChange={go} items={VIEWS.map(([v, l]) => ({ value: v, label: l, count: v === 'people' ? PEOPLE_DIR.length.toLocaleString('en-GB') : v === 'groups' ? GROUP_LIST.length : st.roles.length }))} />}
      {section === 'people' && <People st={st} ss={ss} filters={peopleFilters} />}
      {section === 'groups' && <Groups st={st} />}
      {section === 'roles' && <RolesSection st={st} />}
      {section === 'permissions' && <Scopes st={st} />}
      {section === 'sod' && <Sod st={st} />}
      {section === 'rules' && <Rules st={st} />}
      {section === 'requests' && <><Requests st={st} show={['request', 'requests']} /><Grants st={st} /><Requests st={st} show={['check']} /></>}
      {section === 'policies' && <Policies st={st} ss={ss} />}
      {section === 'reviews' && <Reviews st={st} />}
      {section === 'directory' && <><Groups st={st} title="AWS IAM Identity Center — groups and the access role each carries" note="The same directory as Roles & people › Groups: the group carries the access role, the access role carries the clearance. Microsoft Entra ID / Active Directory works the same way over SCIM or OIDC group claims. Manual assignments made in Roles & people › Access roles stay and keep their “manual” label." /><Directory st={st} syncOnly /></>}
      {section === 'platforms' && <Platforms st={st} />}
      {section === 'responsibilities' && <StewardRoles roles={ss.roles} changes={ss.changes} />}
      {section === 'ownership' && <Register ss={ss} />}
      {section === 'coverage' && <Gaps ss={ss} />}
      {section === 'approvals' && <><Approvals ss={ss} /><ReviewQueue queue={ss.queue} register={ss.register} /></>}
      {section === 'audit' && <Audit ss={ss} />}
    </div>
  );
}

/* ------------------------------------------------------------------ People (landing page)
   Filters live in the Governance inner menu (as Policies, DPIA and AI models); search, sort and paging stay on the page. */
const clearanceOf = (roles) => roles.map((r) => roleOf(r)?.clearance).filter(Boolean).sort().pop() || '—';
const PEOPLE_FACETS = [
  { key: 'show', label: 'Show', icon: Eye, open: true, of: (x) => x.show },
  { key: 'role', label: 'Access role', icon: BadgeCheck, open: true, of: (x) => (x.roles.length ? x.roles.map((r) => roleOf(r)?.name || r) : ['No access role']) },
  { key: 'cl', label: 'Clearance', icon: Lock, open: true, of: (x) => [x.cl === '—' ? 'No access role' : x.cl] },
  { key: 'src', label: 'Source', icon: RefreshCw, of: (x) => [x.src === 'manual' ? 'Manual assignment' : x.src === 'none' ? 'No assignment' : 'From directory'] },
  { key: 'dept', label: 'Department', icon: Building2, of: (x) => [x.p.dept] },
  { key: 'group', label: 'Directory group', icon: Fingerprint, of: (x) => x.p.groups },
  { key: 'loc', label: 'Location', icon: MapPin, of: (x) => [x.p.loc] },
  { key: 'active', label: 'Last active', icon: Clock, of: (x) => [x.p.lastActive <= 7 ? 'This week' : x.p.lastActive <= 30 ? 'Last 30 days' : x.p.lastActive <= 90 ? '31–90 days' : 'Over 90 days'] },
];
const PEOPLE_SORTS = {
  named: ['Named test people first', (a, b) => (b.p.named - a.p.named) || a.p.name.localeCompare(b.p.name)],
  name: ['Name', (a, b) => a.p.name.localeCompare(b.p.name)],
  active: ['Last active', (a, b) => a.p.lastActive - b.p.lastActive],
};
export function usePeopleFilters() {
  const st = useAccess(); const ss = useStewardship();
  const rows = useMemo(() => {
    const breachers = new Set(combinationsHeld(st).map((b) => b.person));
    const stewards = new Set(ss.register.flatMap((r) => Object.values(r.roles).filter(Boolean).map((c) => c.who)));
    return PEOPLE_DIR.map((p) => {
      const roles = rolesFor(p, st.assign); const src = sourceFor(p, st.assign);
      const show = [p.named && 'Named test people', stewards.has(p.name) && 'Owners & stewards', breachers.has(p.name) && 'Separation-of-duties breach', !roles.length && 'Without an access role', src === 'manual' && 'Manual assignment', p.lastActive > 90 && 'Inactive 90+ days'].filter(Boolean);
      return { p, roles, cl: clearanceOf(roles), src, show, sod: breachers.has(p.name) };
    });
  }, [st, ss.register]);
  return useFacets('access-people', rows, PEOPLE_FACETS, (x) => `${x.p.name} ${x.p.email}`, PEOPLE_SORTS);
}

function People({ st, ss, filters }) {
  const { results: list, q, setQ, sort, setSort, active, toggle, clearAll, total } = filters;
  const [pg, setPg] = useState({ page: 1, per: 25 });
  const [open, setOpen] = useState(null);
  const pages = Math.max(1, Math.ceil(list.length / pg.per)); const page = Math.min(pg.page, pages);
  const shown = list.slice((page - 1) * pg.per, page * pg.per);
  const label = (k) => PEOPLE_FACETS.find((f) => f.key === k)?.label;
  const exportCsv = () => {
    const csv = ['Name,Email,Access roles,Clearance,Department,Groups,Source', ...list.map((x) => [x.p.name, x.p.email, x.roles.join(' '), x.cl, x.p.dept, x.p.groups.join(' '), x.src].map((v) => `"${v}"`).join(','))].join('\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = 'people.csv'; a.click();
  };
  return (
    <>
      <Card icon={Users} tone="info" title="People" count={list.length.toLocaleString('en-GB')} actions={<Button variant="secondary" size="sm" icon={Download} onClick={exportCsv}>Export CSV</Button>}>
        <div className="ax-tools">
          <label className="search gv-search ax-search"><Search size={15} /><input value={q} onChange={(e) => { setQ(e.target.value); setPg((o) => ({ ...o, page: 1 })); }} placeholder={`Search ${total.toLocaleString('en-GB')} people by name or email`} aria-label="Search people" /></label>
          <select className="select" value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort">{Object.entries(PEOPLE_SORTS).map(([k, [l]]) => <option key={k} value={k}>Sort: {l.toLowerCase()}</option>)}</select>
        </div>
        <div className="applied ax-applied">
          {active.map(([k, v]) => <button type="button" key={k + v} className="achip" onClick={() => toggle(k, v)} aria-label={`Remove ${label(k)} ${v}`}><span>{label(k)}:</span> {v}<X size={12} /></button>)}
          {!active.length && !q && <span className="gv-muted">Showing everyone — filter from the menu on the left</span>}
          {(active.length > 0 || q) && <button type="button" className="btn link" onClick={clearAll}>Clear all</button>}
        </div>
        <div className="table-wrap">
          <table className="tbl">
            <thead><tr><th>Person</th><th>Access roles (via group)</th><th>Clearance</th><th>Department</th><th>Owns / stewards</th><th>Grants</th><th>Last active</th></tr></thead>
            <tbody>{shown.map((x) => {
              const owns = ss.register.filter((r) => Object.values(r.roles).some((c) => c && c.who === x.p.name)).length;
              const grants = st.grants.filter((g) => g.person === x.p.name && g.status === 'active').length;
              return (
                <tr key={x.p.id} className="click" onClick={() => setOpen(x.p)}>
                  <td><div className="ax-who"><span className="ax-av" style={{ background: x.p.col }}>{initials(x.p.name)}</span><div><b>{x.p.name}</b>{x.p.named && <span className="gv-tag info" style={{ marginLeft: 6 }}>test user</span>}<span className="gv-sub">{x.p.email}</span></div></div></td>
                  <td>{x.roles.map((r) => <span key={r} className="tag">{roleOf(r)?.name || r}</span>)}{!x.roles.length && <StatusBadge s="warn">no access role</StatusBadge>}{x.src === 'manual' && <span className="gv-tag violet" style={{ marginLeft: 4 }}>manual</span>}{x.sod && <StatusBadge s="fail">SoD</StatusBadge>}</td>
                  <td><span className="tag">{x.cl}</span></td>
                  <td>{x.p.dept}<span className="gv-sub">{x.p.loc}</span></td>
                  <td>{owns ? `${owns} asset${owns === 1 ? '' : 's'}` : <span className="gv-faint">—</span>}</td>
                  <td>{grants || <span className="gv-faint">—</span>}</td>
                  <td className="gv-muted">{x.p.lastActive === 0 ? 'today' : `${x.p.lastActive} days ago`}</td>
                </tr>
              );
            })}
            {!shown.length && <tr><td colSpan={7}><Empty>Nobody matches these filters.</Empty></td></tr>}</tbody>
          </table>
        </div>
        <div className="ax-pager">
          <span>{list.length ? ((page - 1) * pg.per + 1).toLocaleString('en-GB') : 0}–{Math.min(page * pg.per, list.length).toLocaleString('en-GB')} of {list.length.toLocaleString('en-GB')} people</span>
          <span className="gv-inline" style={{ gap: 6, alignItems: 'center' }}>
            <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPg((o) => ({ ...o, page: page - 1 }))}>‹</Button>
            Page {page} of {pages.toLocaleString('en-GB')}
            <Button variant="secondary" size="sm" disabled={page >= pages} onClick={() => setPg((o) => ({ ...o, page: page + 1 }))}>›</Button>
            <select className="select" value={pg.per} onChange={(e) => setPg({ per: +e.target.value, page: 1 })} aria-label="Per page">{[25, 50, 100].map((n) => <option key={n} value={n}>{n} per page</option>)}</select>
          </span>
        </div>
      </Card>
      {open && <PersonDrawer p={open} st={st} ss={ss} onClose={() => setOpen(null)} />}
    </>
  );
}

/* a person's effective access, ownership, grants and activity — where each right comes from */
function PersonDrawer({ p, st, ss, onClose }) {
  const nav = useNavigate();
  const [tab, setTab] = useState('access');
  const roles = rolesFor(p, st.assign);
  const may = [...new Set(roles.flatMap((r) => roleOf(r)?.may || []))];
  const sod = combinationsHeld(st).filter((b) => b.person === p.name);
  const scopes = st.scopes.filter((s) => roles.includes(s.role));
  const owns = ss.register.flatMap((r) => Object.entries(r.roles).filter(([, c]) => c && c.who === p.name).map(([k, c]) => ({ asset: r.asset, system: r.system, sens: r.sens, role: ss.roles.find((x) => x.key === k)?.name || k, how: c.how, rights: stewardRights(p.name, r.asset) })));
  const cols = ss.columnRoles.filter((c) => c.who === p.name);
  const grants = st.grants.filter((g) => g.person === p.name);
  const acts = AUDIT.filter((a) => a.who === p.name).slice(0, 12);
  const TABS = [['access', 'Effective access'], ['roles', 'Roles & groups'], ['own', `Ownership (${owns.length + cols.length})`], ['grants', `Grants (${grants.filter((g) => g.status === 'active').length})`], ['act', 'Activity']];
  return (
    <Drawer wide className="ax-drawer" onClose={onClose}
      title={<span className="ax-who"><span className="ax-av" style={{ background: p.col }}>{initials(p.name)}</span><span><b>{p.name}</b><small className="gv-sub">{p.email} · {p.dept} · {p.loc}</small></span></span>}
      footer={<><Button variant="secondary" size="md" onClick={onClose}>Close</Button><Button variant="primary" size="md" icon={ShieldQuestion} onClick={() => nav(`${ACCESS_BASE}/check`)}>Check access</Button></>}>
      <div className="ax-dtabs">{TABS.map(([k, l]) => <button key={k} type="button" className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}</button>)}</div>
      {tab === 'access' && (<>
        {sod.map((b) => <div key={b.rule.a + b.rule.b} className="gv-callout bad" style={{ marginBottom: 10 }}><AlertTriangle size={15} /><span><b>Separation of duties:</b> holds {b.detail} — {b.rule.why}</span></div>)}
        <dl className="gl-kv gv-kv">
          <dt>Clearance</dt><dd><span className="tag">{clearanceOf(roles)}</span> highest of {roles.length || 'no'} role(s)</dd>
          <dt>May</dt><dd>{may.length ? may.map((m) => <span key={m} className="tag mono">{m}</span>) : '—'}</dd>
          <dt>Persona policies</dt><dd>{scopes.length ? scopes.map((s, i) => <span key={i} className="tag">{s.role} · {s.level} {s.target} → {s.actions.join(', ')}</span>) : <span className="gv-faint">none — the access role’s own permissions apply</span>}</dd>
          <dt>Purpose policies</dt><dd>{ACCESS_RULES.map((r) => <span key={r.id} className="tag">{r.name}</span>)}</dd>
          <dt>Stakeholder rights</dt><dd>{owns.some((o) => o.rights.approve || o.rights.grant) ? `${owns.filter((o) => o.rights.approve).length} asset(s) where they approve access, ${owns.filter((o) => o.rights.grant).length} where they grant it` : <span className="gv-faint">none — holds no stewardship role with access rights</span>}</dd>
        </dl>
        <div className="gv-section-label">Why {p.name.split(' ')[0]} has this access</div>
        {roles.map((r) => {
          const g = p.groups.find((x) => groupRole(x) === r);
          const a = st.assign.find((x) => x.person === p.name && x.role === r);
          const man = manualRolesOf(p, st.assign).includes(r);
          return <div key={r} className="ax-path"><span className="tag mono">{man ? 'manual assignment' : g || 'directory'}</span><i>→</i><span className="tag">{roleOf(r)?.name || r}</span><i>→</i><span className="tag">clearance {roleOf(r)?.clearance}</span><small>{a ? `${a.source} · since ${a.at}` : man ? 'given by hand — reviewed as an exception' : 'synced from AWS IAM Identity Center'}</small></div>;
        })}
        {!roles.length && <p className="gv-muted">No role — {p.groups.join(', ')} carries no GenMeta mapping.</p>}
        {owns.slice(0, 3).map((o) => <div key={o.asset + o.role} className="ax-path"><span className="tag">{o.role}</span><i>on</i><Mono>{o.asset}</Mono><i>→</i><span className="tag">{[o.rights.approve && 'approve requests', o.rights.grant && 'grant and revoke'].filter(Boolean).join(', ') || 'no access rights'}</span><small>Ownership register</small></div>)}
        <Note>The person-centric view Collibra and Entra give: everything one person can do and where each right comes from — so a large estate is navigated by finding one person, not by scrolling a role table.</Note>
      </>)}
      {tab === 'roles' && (
        <div className="table-wrap"><table className="tbl"><thead><tr><th>Group</th><th>Carries access role</th><th>Clearance</th><th>Source</th></tr></thead>
          <tbody>{p.groups.map((g) => <tr key={g}><td className="mono">{g}</td><td>{groupRole(g) ? roleOf(groupRole(g))?.name : <StatusBadge s="warn">no mapping</StatusBadge>}</td><td>{groupRole(g) ? roleOf(groupRole(g))?.clearance : '—'}</td><td>directory</td></tr>)}
            {manualRolesOf(p, st.assign).map((r) => { const a = st.assign.find((x) => x.person === p.name && x.role === r); return <tr key={r}><td className="gv-muted">—</td><td>{roleOf(r)?.name}</td><td>{roleOf(r)?.clearance}</td><td><span className="gv-tag violet">manual{a ? ` · ${a.at}` : ''}</span></td></tr>; })}</tbody></table></div>
      )}
      {tab === 'own' && (owns.length || cols.length ? (
        <div className="table-wrap"><table className="tbl"><thead><tr><th>Asset</th><th>Stewardship role</th><th>How</th><th>Access rights here</th></tr></thead>
          <tbody>{owns.map((o) => <tr key={o.asset + o.role}><td><Mono>{o.asset}</Mono><span className="gv-sub">{o.system} · {o.sens}</span></td><td>{o.role}</td><td className="gv-muted">{{ a: 'assigned', i: 'inherited from dataset', m: 'imported', d: 'configured default' }[o.how]}</td><td>{[o.rights.approve && 'approve or decline requests', o.rights.grant && 'grant and revoke', o.rights.changes && 'approve ownership changes', o.rights.quality && 'resolve quality issues'].filter(Boolean).join(' · ') || '—'}</td></tr>)}
            {cols.map((c) => <tr key={c.asset + c.column}><td><Mono>{c.asset}.{c.column}</Mono><span className="gv-sub">column</span></td><td>{ss.roles.find((x) => x.key === c.role)?.name}</td><td className="gv-muted">column-level</td><td>—</td></tr>)}</tbody></table></div>
      ) : <Empty>{p.name} holds no ownership or stewardship role on any asset.</Empty>)}
      {tab === 'grants' && (grants.length ? (
        <div className="table-wrap"><table className="tbl"><thead><tr><th>Asset</th><th>Granted by</th><th>Expires</th><th>Status</th></tr></thead>
          <tbody>{grants.map((g) => <tr key={g.id}><td><Mono>{g.asset}</Mono><span className="gv-sub">{g.why}</span></td><td>{g.by}<span className="gv-sub">{g.granted}</span></td><td>{g.expires}{g.extended && <span className="gv-sub">extended by {g.extended.by} on {g.extended.at}</span>}</td><td><StatusBadge s={g.status === 'active' ? 'active' : 'refused'}>{g.status}</StatusBadge></td></tr>)}</tbody></table></div>
      ) : <Empty>No direct grants — access comes only from access roles and policies.</Empty>)}
      {tab === 'act' && (acts.length ? <ul className="gv-lines">{acts.map((a) => <li key={a.seq}><Mono>{a.action}</Mono> · {a.what} <span className="gv-faint">· {fmtTs(a.ts)}</span></li>)}</ul> : <p className="gv-muted">Signed in {p.lastActive === 0 ? 'today' : `${p.lastActive} days ago`}; no governance actions recorded.</p>)}
    </Drawer>
  );
}

/* members of a group or role, paged and searchable */
function MembersDrawer({ title, sub, list, st, onClose, removable }) {
  const [q, setQ] = useState(''); const [g, setG] = useState('all'); const [page, setPage] = useState(1);
  const a1 = useAct();
  const groups = [...new Set(list.flatMap((p) => p.groups))];
  const rows = list.filter((p) => (!q || p.name.toLowerCase().includes(q.toLowerCase())) && (g === 'all' || p.groups.includes(g)));
  const pages = Math.max(1, Math.ceil(rows.length / 20)); const pg = Math.min(page, pages);
  return (
    <Drawer wide onClose={onClose} title={<span>{title}<small className="gv-sub">{list.length.toLocaleString('en-GB')} members · {sub}</small></span>} footer={<Button variant="secondary" size="md" onClick={onClose}>Close</Button>}>
      <a1.Refusal />
      <div className="ax-tools">
        <label className="search gv-search ax-search"><Search size={15} /><input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder={`Search ${list.length.toLocaleString('en-GB')} members`} aria-label="Search members" /></label>
        <select className="select" value={g} onChange={(e) => { setG(e.target.value); setPage(1); }} aria-label="Group"><option value="all">All groups</option>{groups.map((x) => <option key={x}>{x}</option>)}</select>
      </div>
      <div className="table-wrap"><table className="tbl"><thead><tr><th>Person</th><th>Via</th><th>Department</th><th>Last active</th>{removable && <th />}</tr></thead>
        <tbody>{rows.slice((pg - 1) * 20, pg * 20).map((p) => { const manual = removable && manualRolesOf(p, st.assign).includes(removable); const viaG = removable ? p.groups.filter((g) => groupRole(g) === removable) : p.groups; return (
          <tr key={p.id}><td><div className="ax-who"><span className="ax-av" style={{ background: p.col }}>{initials(p.name)}</span>{p.name}</div></td><td className="mono">{manual ? <span className="gv-tag violet">manual</span> : viaG.join(', ')}</td><td>{p.dept}</td><td className="gv-muted">{p.lastActive}d</td>
            {removable && <td>{manual && p.named && <Button variant="link" icon={X} onClick={() => a1.run(unassign(p.name, removable), `Removed ${removable} from ${p.name}`)}>Remove</Button>}</td>}</tr>
        ); })}</tbody></table></div>
      <div className="ax-pager"><span>{rows.length.toLocaleString('en-GB')} shown</span><span className="gv-inline" style={{ gap: 6, alignItems: 'center' }}><Button variant="secondary" size="sm" disabled={pg <= 1} onClick={() => setPage(pg - 1)}>‹</Button>{pg} / {pages.toLocaleString('en-GB')}<Button variant="secondary" size="sm" disabled={pg >= pages} onClick={() => setPage(pg + 1)}>›</Button></span></div>
      <Note>To change who holds this, change the group in the directory — or add a manual assignment in Roles & people › Access roles, which shows up as an exception for review.</Note>
    </Drawer>
  );
}

/* ------------------------------------------------------------------ Groups */
function Groups({ st, title = 'Directory groups', note }) {
  const [open, setOpen] = useState(null);
  const a1 = useAct();
  return (
    <>
      <Card icon={Fingerprint} tone="warn" title={title} count={GROUP_LIST.length}
        sub={`${PEOPLE_DIR.length.toLocaleString('en-GB')} people · AWS IAM Identity Center (test directory)${st.sync ? ` · last synchronised ${st.sync.at}` : ''}`}
        actions={<Button variant="secondary" size="md" icon={RefreshCw} onClick={() => a1.run(syncDirectory(), 'Directory synchronised — results under Directory & identity')}>Synchronise now</Button>}>
        <RoleNote st={st} need={['governance-lead', 'platform-ops']} what="synchronising the directory" />
        <a1.Refusal />
        <div className="table-wrap"><table className="tbl">
          <thead><tr><th>Group</th><th>Access role in GenMeta</th><th>Clearance</th><th className="num">Members</th><th /></tr></thead>
          <tbody>{GROUP_LIST.map((g) => { const r = groupRole(g); const n = PEOPLE_DIR.filter((p) => p.groups.includes(g)).length; return (
            <tr key={g} className="click" onClick={() => setOpen(g)}><td className="mono">{g}</td><td>{r ? <span className="tag">{roleOf(r)?.name}</span> : <StatusBadge s="warn">no mapping — members get no access role</StatusBadge>}</td><td>{r ? roleOf(r)?.clearance : '—'}</td><td className="num"><b>{n.toLocaleString('en-GB')}</b></td><td><Button variant="link">View members ›</Button></td></tr>
          ); })}</tbody>
        </table></div>
        <Note>{note || 'Access roles are given to groups, and membership is managed in the directory (as in Entra, Collibra and Atlan). Counts here; members on demand — never 2,000 names in a cell. Each count is the same number the access-role card shows for that group.'}</Note>
      </Card>
      {open && <MembersDrawer title={open} sub={groupRole(open) ? `carries ${roleOf(groupRole(open))?.name}` : 'no GenMeta mapping'} list={PEOPLE_DIR.filter((p) => p.groups.includes(open))} st={st} onClose={() => setOpen(null)} />}
    </>
  );
}

/* ------------------------------------------------------------------ Roles as head-counts */
const BAR = ['#2F6BFF', '#6D4AFF', '#1E8E5A', '#B26A00', '#0E7C86'];
function RolesSection({ st }) {
  const [open, setOpen] = useState(null);
  return (
    <>
      <div className="ax-roles">{st.roles.map((r) => {
        const holders = PEOPLE_DIR.filter((p) => rolesFor(p, st.assign).includes(r.key));
        const via = GROUP_LIST.filter((g) => groupRole(g) === r.key);
        const manual = holders.filter((p) => manualRolesOf(p, st.assign).includes(r.key)).length;
        const n = (g) => holders.filter((p) => p.groups.includes(g) && !manualRolesOf(p, st.assign).includes(r.key)).length;
        return (
          <button type="button" key={r.key} className="dash-card ax-role" onClick={() => setOpen(r.key)}>
            <div className="ax-role-h"><div><b>{r.name}</b><span className="gv-sub mono">{r.key}{!r.builtIn ? ' · defined here' : ''}</span></div><span className="tag">{r.clearance}</span></div>
            <div className="ax-big">{holders.length.toLocaleString('en-GB')} <small>people</small></div>
            <div className="ax-bar">{via.map((g, i) => <i key={g} style={{ width: `${(n(g) / Math.max(1, holders.length)) * 100}%`, background: BAR[i % BAR.length] }} />)}</div>
            <div className="ax-legend">{via.map((g, i) => <span key={g}><i style={{ background: BAR[i % BAR.length] }} />{g} · {n(g).toLocaleString('en-GB')}</span>)}{manual > 0 && <span><i style={{ background: 'var(--gv-violet, #6D4AFF)' }} />{manual} manual</span>}{!via.length && <span>no directory group carries this access role</span>}</div>
            <div className="gv-tags">{r.may.map((m) => <span key={m} className="tag mono">{m}</span>)}</div>
            <span className="ax-more">View {holders.length.toLocaleString('en-GB')} members ›</span>
          </button>
        );
      })}</div>
      <RolesMatrix st={st} hideTable />
      {open && <MembersDrawer title={roleOf(open)?.name} sub={`${roleOf(open)?.clearance} · ${roleOf(open)?.may.length} permissions`} list={PEOPLE_DIR.filter((p) => rolesFor(p, st.assign).includes(open))} st={st} removable={open} onClose={() => setOpen(null)} />}
    </>
  );
}

/* ------------------------------------------------------------------ Access policies — one list */
function Policies({ st, ss }) {
  const [kind, setKind] = useState('all');
  const nav = useNavigate();
  const groupsFor = (role) => GROUP_LIST.filter((g) => groupRole(g) === role);
  const peopleFor = (role) => PEOPLE_DIR.filter((p) => rolesFor(p, st.assign).includes(role)).length;
  const rows = [
    ...st.scopes.map((s) => ({ same: ['Permissions by level', 'permissions'], kind: 'Persona', name: `${roleOf(s.role)?.name || s.role} — ${s.level} ${s.target}`, who: groupsFor(s.role).length ? groupsFor(s.role) : [s.role], n: peopleFor(s.role), what: `${s.level}: ${s.target} (${statementFor(s).sys})`, effect: s.actions.includes('read_profile') || s.actions.includes('read_sensitive') ? 'Allow' : 'Mask', detail: s.actions.join(', '), to: 'permissions' })),
    ...ACCESS_RULES.map((r) => ({ same: ['Access rules', 'rules'], kind: 'Purpose', name: r.name, who: ['Everyone'], n: PEOPLE_DIR.length, what: r.when, effect: r.effect === 'deny' ? 'Deny' : 'Mask', detail: r.id, to: 'rules' })),
    ...ss.roles.filter((r) => r.resp[1] === '1' || r.resp[2] === '1').map((r) => ({ kind: 'Stakeholder', name: `${r.name} — on the assets they hold`, who: [`${r.name}s in the register`], n: new Set(ss.register.map((x) => x.roles[r.key]?.who).filter(Boolean)).size, what: `${ss.register.filter((x) => x.roles[r.key]).length} assets in the Ownership register`, effect: 'Allow', detail: [r.resp[1] === '1' && 'approve or decline requests', r.resp[2] === '1' && 'grant and revoke'].filter(Boolean).join(' · '), to: 'responsibilities' })),
    ...st.policies.map((p) => ({ kind: 'Sensitivity', name: `${p.s} data`, who: ['Everyone'], n: PEOPLE_DIR.length, what: `assets classified ${p.s}`, effect: p.mask ? 'Mask' : 'Allow', detail: `approved by ${p.ap.toLowerCase()} · up to ${p.days} days${p.just ? ' · justification' : ''}${p.mask ? ' · masked without a grant' : ''}`, to: 'policies-edit' })),
  ];
  const shown = rows.filter((r) => kind === 'all' || r.kind === kind);
  const KINDS = [['all', 'All'], ['Persona', 'Persona — by access role or team'], ['Purpose', 'Purpose — by classification'], ['Stakeholder', 'Stakeholder — owners & stewards'], ['Sensitivity', 'Sensitivity level']];
  return (
    <>
      <Card icon={ScrollText} tone="violet" title="Access policies" count={rows.length} sub="Who (groups or stewardship roles, never individuals) · what (part of the estate, or a classification) · effect. Effective access is the union of allows; any deny wins.">
        <div className="gv-chiprow">{KINDS.map(([k, l]) => <button key={k} type="button" className={`chip ${kind === k ? 'on' : ''}`} onClick={() => setKind(k)}>{l} <b>{k === 'all' ? rows.length : rows.filter((r) => r.kind === k).length}</b></button>)}</div>
        <div className="ax-pols">{shown.map((r, i) => (
          <div key={i} className="ax-pol">
            <div><small>{r.kind}</small><b>{r.name}</b>{r.same && <button type="button" className="ax-same" onClick={() => nav(`${ACCESS_BASE}/${r.same[1]}`)}>same as {r.same[0]} ›</button>}</div>
            <div><small>Who</small>{r.who.map((w) => <span key={w} className="tag mono">{w}</span>)}<span className="gv-sub">{r.n.toLocaleString('en-GB')} people</span></div>
            <div><small>What</small>{r.what}</div>
            <div><small>Effect</small><StatusBadge s={r.effect === 'Deny' ? 'fail' : r.effect === 'Mask' ? 'warn' : 'ok'}>{r.effect}</StatusBadge><span className="gv-sub">{r.detail}</span></div>
            <div>{r.to !== 'policies-edit' && <Button variant="link" onClick={() => nav(`${ACCESS_BASE}/${r.to}`)}>Edit ›</Button>}</div>
          </div>
        ))}</div>
        <Note>Persona policies follow Atlan's personas; purpose policies follow Atlan purposes and Informatica CDAM (written once per classification); stakeholder policies follow Informatica's stakeholder-role policies — owners and stewards act on access to their own assets.</Note>
      </Card>
      <Requests st={st} show={['policies']} />
    </>
  );
}

/* ------------------------------------------------------------------ Grants, paged */
function Grants({ st }) {
  const [f, setF] = useState({ q: '', status: 'active', sens: 'all', page: 1 });
  const a1 = useAct();
  const rows = st.grants.filter((g) => (f.status === 'all' || g.status === f.status) && (f.sens === 'all' || g.sens === f.sens) && (!f.q || `${g.asset} ${g.person}`.toLowerCase().includes(f.q.toLowerCase())));
  const pages = Math.max(1, Math.ceil(rows.length / 25)); const pg = Math.min(f.page, pages);
  const exportCsv = () => { const csv = ['Asset,Person,Granted,By,Expires,Extended,Last used,Status', ...rows.map((g) => [g.asset, g.person, g.granted, g.by, g.expires, g.extended ? `by ${g.extended.by} on ${g.extended.at}` : '', g.lastUsed, g.status].map((v) => `"${v}"`).join(','))].join('\n'); const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = 'grants.csv'; a.click(); };
  return (
    <Card icon={KeyRound} tone="ok" title="Grants" count={rows.length} sub="The same grants Access reviews works on — revoking here or there changes both. Owners and stewards may revoke on their own assets. Restricted grants last at most 90 days; an extension shows who extended it and when."
      actions={<Button variant="secondary" size="sm" icon={Download} onClick={exportCsv}>Export CSV</Button>}>
      <a1.Refusal />
      <div className="ax-tools">
        <label className="search gv-search ax-search"><Search size={15} /><input value={f.q} onChange={(e) => setF((o) => ({ ...o, q: e.target.value, page: 1 }))} placeholder="Search by asset or person" aria-label="Search grants" /></label>
        <select className="select" value={f.status} onChange={(e) => setF((o) => ({ ...o, status: e.target.value, page: 1 }))} aria-label="Status"><option value="active">Active</option><option value="revoked">Revoked</option><option value="all">All</option></select>
        <select className="select" value={f.sens} onChange={(e) => setF((o) => ({ ...o, sens: e.target.value, page: 1 }))} aria-label="Sensitivity"><option value="all">Any sensitivity</option><option>Restricted</option><option>Confidential</option><option>Internal</option></select>
      </div>
      <div className="table-wrap"><table className="tbl">
        <thead><tr><th>Asset</th><th>Person</th><th>Granted</th><th>Granted by</th><th>Expires</th><th>Last used</th><th>Status</th><th /></tr></thead>
        <tbody>{rows.slice((pg - 1) * 25, pg * 25).map((g) => <tr key={g.id}><td><Mono>{g.asset}</Mono><span className="gv-sub">{g.sens} · owner {ownerOf(g.asset) || '—'}</span></td><td>{g.person}<span className="gv-sub">{g.role}</span></td><td>{g.granted}</td><td>{g.by}</td><td>{g.expires}{g.extended && <span className="gv-sub">extended by {g.extended.by} on {g.extended.at}{g.extended.times > 1 ? ` (${g.extended.times}×)` : ''}</span>}</td><td>{g.lastUsed}</td><td><StatusBadge s={g.status === 'active' ? 'active' : 'refused'}>{g.status}</StatusBadge></td>
          <td>{g.status === 'active' && <Button variant="subtle" size="sm" onClick={() => a1.run(revokeGrant(g.id), 'Grant revoked — written to the audit log')}>Revoke</Button>}</td></tr>)}
          {!rows.length && <tr><td colSpan={8}><Empty>No grants match.</Empty></td></tr>}</tbody>
      </table></div>
      <div className="ax-pager"><span>{rows.length} grant(s)</span><span className="gv-inline" style={{ gap: 6, alignItems: 'center' }}><Button variant="secondary" size="sm" disabled={pg <= 1} onClick={() => setF((o) => ({ ...o, page: pg - 1 }))}>‹</Button>{pg} / {pages}<Button variant="secondary" size="sm" disabled={pg >= pages} onClick={() => setF((o) => ({ ...o, page: pg + 1 }))}>›</Button></span></div>
    </Card>
  );
}

/* ------------------------------------------------------------------ one audit trail for access and ownership */
function Audit({ ss }) {
  const nav = useNavigate();
  const access = AUDIT.filter((a) => a.action.startsWith('access.')).map((a) => ({ at: fmtTs(a.ts), who: a.who, role: a.role, action: a.action, on: a.asset || '—', what: a.what || '', cat: /refused|denied/.test(a.action) ? 'ownership.denied' : 'access' }));
  return (
    <>
      <p className="ax-own6">One trail for both halves — access and stewardship. The tamper-evident, hash-chained log is on <button type="button" className="ax-same inline" onClick={() => nav(`${BASE}?tab=audit`)}>Governance › Overview › Audit & reporting ›</button></p>
      <AuditTrail title="Access and stewardship audit trail" audit={[...access, ...ss.trail]} />
    </>
  );
}
