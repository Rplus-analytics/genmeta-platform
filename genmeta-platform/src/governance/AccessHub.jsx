import { useMemo, useState } from 'react';
import { NavLink, Navigate, useNavigate, useParams } from 'react-router-dom';
import {
  Users, Fingerprint, BadgeCheck, UserCheck, ClipboardList, ShieldCheck, ListChecks, ScrollText, Layers, KeyRound, Inbox, CalendarCheck, ClipboardCheck,
  ShieldQuestion, Split, Gavel, RefreshCw, Server, History, Search, Download, X, AlertTriangle,
} from 'lucide-react';
import { PageHead, Button } from '../components/ui.jsx';
import { BASE, ACCESS_RULES, AUDIT, fmtTs, ownerOf } from './data.js';
import { Card, Tiles, StatusBadge, Empty, Note, Mono, Fld, Drawer, toast } from './kit.jsx';
import {
  useAccess, setViewRole, ACCESS_VIEW, roleOf, combinationsHeld, unassign, revokeGrant, syncDirectory, statementFor,
} from './access-store.js';
import { useStewardship, stewardRights } from './stewardship-store.js';
import { PEOPLE_DIR, GROUP_LIST, groupRole, rolesFor, sourceFor, initials, DEPTS } from './people.js';
import {
  Requests, Reviews, RolesMatrix, Scopes, Sod, Rules, Directory, Platforms, useAct, RoleNote,
} from './Access.jsx';
import { Register, StewardRoles, Gaps, Approvals, AuditTrail, ReviewQueue } from './Stewardship.jsx';

/* Govern › Governance › Access — Stewardship and Access & RBAC as one section.
   Who (people, groups, roles), Ownership (register, responsibilities, gaps, queue), What (policies, permissions, grants),
   Decisions (requests, reviews, ownership changes and quality, check access) and Settings. People is the landing page. */
export const ACCESS_BASE = `${BASE}/access`;
export const ACCESS_SECTIONS = [
  ['Who', [['people', 'People', Users], ['groups', 'Groups', Fingerprint], ['roles', 'Roles', BadgeCheck]]],
  ['Ownership', [['ownership', 'Ownership register', UserCheck], ['responsibilities', 'Responsibilities', ClipboardList], ['coverage', 'Coverage gaps', ShieldCheck], ['queue', 'Review queue', ListChecks]]],
  ['What', [['policies', 'Access policies', ScrollText], ['permissions', 'Permissions by level', Layers], ['grants', 'Grants', KeyRound]]],
  ['Decisions', [['requests', 'Requests', Inbox], ['reviews', 'Access reviews', CalendarCheck], ['approvals', 'Ownership changes & quality', ClipboardCheck], ['check', 'Check access', ShieldQuestion]]],
  ['Settings', [['sod', 'Separation of duties', Split], ['rules', 'Access rules', Gavel], ['directory', 'Directory sync', RefreshCw], ['platforms', 'Platforms', Server], ['audit', 'Audit trail', History]]],
];
const ALL = ACCESS_SECTIONS.flatMap(([, l]) => l);
const LEADS = {
  people: 'Everyone the directory knows about. Search or filter — the list is paged and filtered, so 3,000 or 300,000 people behave the same. Open a person to see their effective access, what they own and where each right comes from.',
  groups: 'Directory groups are the unit of administration: a group carries a role, the role carries a clearance. Members come from AWS IAM Identity Center — nobody is added one by one here.',
  roles: 'Each role shows how many people hold it and through which groups — never a list of names. Open a role to page through its members; manual assignments are exceptions you can remove.',
  ownership: 'Who is accountable for every system, dataset, table, column and report: owners, stewards, custodians and bespoke roles.',
  responsibilities: 'The governance model: which responsibilities each ownership role carries. “Approve or decline access requests” and “Grant and revoke access directly” are what let an owner or steward act on access.',
  coverage: 'How much of the estate has each role filled, and every asset, column and dataset with a gap.',
  queue: 'Classification reviews and ownership gaps, priority-ordered.',
  policies: 'Every rule that decides access, in one list: persona policies (a role or team on part of the estate), purpose policies (by classification, wherever the data is), stakeholder policies (owners and stewards on their own assets) and the policy for each sensitivity level. Any deny wins.',
  permissions: 'Scopes that narrow or widen what a role may do on a system, dataset, table, column or report. The most specific wins.',
  grants: 'Every grant, paged and filterable — the same grants Access reviews works on.',
  requests: 'Ask for access, grant it directly, and decide requests. Approval follows ownership: the asset’s owner or steward, or a governance lead.',
  reviews: 'Recurring reviews of Restricted grants, decided by each asset’s owner.',
  approvals: 'Ownership change requests from non-leads, and data-quality issues routed to the asset’s steward.',
  check: 'See an asset as someone else would — the same decision point that runs on every view.',
  sod: 'Duties that may not be held by one person, and anyone who holds a conflicting pair today.',
  rules: 'Rules evaluated on every view, and the decision point to test them.',
  directory: 'Synchronise the test directory: applied, skipped (no group) and refused (separation of duties).',
  platforms: 'Check each saved scope on its platform and get the statement to correct drift.',
  audit: 'Every access and ownership action, newest first. The same entries are in the hash-chained Governance audit log.',
};

/* ------------------------------------------------------------------ the sub-menu under “Access” in the Governance menu */
export function AccessMenu() {
  const st = useAccess(); const ss = useStewardship();
  const count = {
    people: PEOPLE_DIR.length.toLocaleString('en-GB'), groups: GROUP_LIST.length, roles: st.roles.length, ownership: ss.register.length,
    grants: st.grants.filter((g) => g.status === 'active').length, requests: st.requests.filter((r) => r.status === 'pending').length || '',
    approvals: (ss.requests.filter((r) => r.status === 'pending').length + ss.issues.filter((i) => i.status === 'open').length) || '',
    queue: ss.queue.filter((q) => q.status === 'In review' || q.status === 'Open').length || '', sod: combinationsHeld(st).length || '',
  };
  return (
    <div className="ax-menu">
      {ACCESS_SECTIONS.map(([g, list]) => (
        <div key={g}>
          <div className="ax-menu-g">{g}</div>
          {list.map(([k, l, I]) => (
            <NavLink key={k} to={`${ACCESS_BASE}/${k}`} className={({ isActive }) => `ax-link ${isActive ? 'on' : ''}`}><I size={14} /><span>{l}</span>{count[k] !== undefined && count[k] !== '' && <em>{count[k]}</em>}</NavLink>
          ))}
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ page */
export default function AccessHub() {
  const { section } = useParams();
  const st = useAccess(); const ss = useStewardship();
  if (!section) return <Navigate to={`${ACCESS_BASE}/people`} replace />;
  const cur = ALL.find(([k]) => k === section);
  if (!cur) return <Navigate to={`${ACCESS_BASE}/people`} replace />;
  const group = ACCESS_SECTIONS.find(([, l]) => l.some(([k]) => k === section))[0];
  return (
    <div className="page gv">
      <PageHead eyebrow={`Govern · Access · ${group}`} title={cur[1]} sub={LEADS[section]}>
        <Fld label="Viewing as (test)">
          <select className="select" value={st.role} onChange={(e) => setViewRole(e.target.value)} aria-label="Viewing as">{ACCESS_VIEW.map(([r, p]) => <option key={r} value={r}>{r} · {p}</option>)}</select>
        </Fld>
      </PageHead>
      <SectionTiles group={group} st={st} ss={ss} />
      {section === 'people' && <People st={st} ss={ss} />}
      {section === 'groups' && <Groups st={st} />}
      {section === 'roles' && <RolesSection st={st} />}
      {section === 'ownership' && <Register ss={ss} />}
      {section === 'responsibilities' && <StewardRoles roles={ss.roles} changes={ss.changes} />}
      {section === 'coverage' && <Gaps ss={ss} />}
      {section === 'queue' && <ReviewQueue queue={ss.queue} register={ss.register} />}
      {section === 'policies' && <Policies st={st} ss={ss} />}
      {section === 'permissions' && <Scopes st={st} />}
      {section === 'grants' && <Grants st={st} />}
      {section === 'requests' && <Requests st={st} show={['request', 'requests']} />}
      {section === 'reviews' && <Reviews st={st} />}
      {section === 'approvals' && <Approvals ss={ss} />}
      {section === 'check' && <Requests st={st} show={['check']} />}
      {section === 'sod' && <Sod st={st} />}
      {section === 'rules' && <Rules st={st} />}
      {section === 'directory' && <Directory st={st} />}
      {section === 'platforms' && <Platforms st={st} />}
      {section === 'audit' && <Audit ss={ss} />}
    </div>
  );
}

function SectionTiles({ group, st, ss }) {
  const active = st.grants.filter((g) => g.status === 'active');
  const roleless = PEOPLE_DIR.filter((p) => !rolesFor(p, st.assign).length).length;
  const manual = PEOPLE_DIR.filter((p) => sourceFor(p, st.assign) === 'manual').length;
  const items = {
    Who: [
      { l: 'People', v: PEOPLE_DIR.length.toLocaleString('en-GB'), s: `${PEOPLE_DIR.filter((p) => p.lastActive <= 30).length.toLocaleString('en-GB')} active in 30 days` },
      { l: 'From the directory', v: `${Math.round(((PEOPLE_DIR.length - manual) / PEOPLE_DIR.length) * 100)}%`, s: `${manual} manual assignment(s) to tidy` },
      { l: 'Without a role', v: roleless, s: 'in a group with no mapping' },
      { l: 'Separation-of-duties breaches', v: combinationsHeld(st).length, s: 'held today — needs a decision' },
    ],
    Ownership: [
      { l: 'Assets in the register', v: ss.register.length, s: `governance model ${ss.changes[0][0]}` },
      { l: 'Steward coverage', v: `${Math.round((ss.register.filter((r) => r.roles.steward).length / ss.register.length) * 1000) / 10}%`, s: `${ss.register.filter((r) => r.roles.steward).length} of ${ss.register.length} assets` },
      { l: 'Open quality issues', v: ss.issues.filter((i) => i.status === 'open').length, s: 'routed to the asset’s steward' },
      { l: 'Change requests pending', v: ss.requests.filter((r) => r.status === 'pending').length, s: 'await a different approver' },
    ],
    What: [
      { l: 'Access policies', v: st.scopes.length + ACCESS_RULES.length + st.policies.length + ss.roles.filter((r) => r.resp[1] === '1' || r.resp[2] === '1').length, s: 'persona, purpose, stakeholder and sensitivity' },
      { l: 'Scopes', v: st.scopes.length, s: `${new Set(st.scopes.map((s) => s.level)).size} level(s) in use` },
      { l: 'Active grants', v: active.length, s: 'each with an expiry' },
      { l: 'Grants not used in 30 days', v: active.filter((g) => g.lastUsed === 'never' || /Jun|May|Apr|Jul/.test(g.lastUsed)).length, s: 'candidates to revoke' },
    ],
    Decisions: [
      { l: 'Requests pending', v: st.requests.filter((r) => r.status === 'pending').length, s: 'routed to owners and stewards' },
      { l: 'Reviews open', v: st.review.applied ? 0 : 1, s: 'quarterly · Restricted data' },
      { l: 'Ownership changes pending', v: ss.requests.filter((r) => r.status === 'pending').length, s: 'need a different approver' },
      { l: 'Open quality issues', v: ss.issues.filter((i) => i.status === 'open').length, s: 'with the asset’s steward' },
    ],
    Settings: [
      { l: 'Roles', v: st.roles.length, s: `${st.roles.filter((r) => !r.builtIn).length} defined here` },
      { l: 'Role assignments (named)', v: st.assign.length, s: `${st.assign.filter((a) => a.source === 'directory').length} from the directory · ${st.assign.filter((a) => a.source === 'manual').length} manual` },
      { l: 'Scopes', v: st.scopes.length, s: st.recon ? `last reconciled ${st.recon.at}` : 'not reconciled yet' },
      { l: 'Identities synchronised', v: st.sync ? new Set(st.sync.results.map((r) => r.person)).size : 0, s: st.sync ? `last ${st.sync.at}` : 'not yet synchronised' },
    ],
  };
  return <Tiles items={items[group]} />;
}

/* ------------------------------------------------------------------ People (landing page) */
const SOURCES = [['all', 'All'], ['directory', 'From directory'], ['manual', 'Manual'], ['named', 'Named test people'], ['inactive', 'Inactive 90+ days'], ['sod', 'SoD breach'], ['owners', 'Owners & stewards']];
const clearanceOf = (roles) => roles.map((r) => roleOf(r)?.clearance).filter(Boolean).sort().pop() || '—';
function People({ st, ss }) {
  const [f, setF] = useState({ q: '', role: [], cl: [], dept: [], group: [], src: 'all', sort: 'named', page: 1, per: 25 });
  const [open, setOpen] = useState(null);
  const breachers = new Set(combinationsHeld(st).map((b) => b.person));
  const stewards = new Set(ss.register.flatMap((r) => Object.values(r.roles).filter(Boolean).map((c) => c.who)));
  const rows = useMemo(() => PEOPLE_DIR.map((p) => { const roles = rolesFor(p, st.assign); return { p, roles, cl: clearanceOf(roles), src: sourceFor(p, st.assign) }; }), [st.assign]);
  const match = (x, except) => {
    const q = f.q.trim().toLowerCase();
    return (!q || x.p.name.toLowerCase().includes(q) || x.p.email.includes(q))
      && (except === 'role' || !f.role.length || x.roles.some((r) => f.role.includes(r)))
      && (except === 'cl' || !f.cl.length || f.cl.includes(x.cl))
      && (except === 'dept' || !f.dept.length || f.dept.includes(x.p.dept))
      && (except === 'group' || !f.group.length || x.p.groups.some((g) => f.group.includes(g)))
      && (f.src === 'all' || (f.src === 'manual' ? x.src === 'manual' : f.src === 'directory' ? x.src === 'directory' : f.src === 'named' ? x.p.named : f.src === 'inactive' ? x.p.lastActive > 90 : f.src === 'sod' ? breachers.has(x.p.name) : stewards.has(x.p.name)));
  };
  const list = rows.filter((x) => match(x)).sort((a, b) => (f.sort === 'active' ? a.p.lastActive - b.p.lastActive : f.sort === 'named' ? (b.p.named - a.p.named) || a.p.name.localeCompare(b.p.name) : a.p.name.localeCompare(b.p.name)));
  const pages = Math.max(1, Math.ceil(list.length / f.per)); const page = Math.min(f.page, pages);
  const shown = list.slice((page - 1) * f.per, page * f.per);
  const cnt = (key, fn) => { const m = {}; rows.filter((x) => match(x, key)).forEach((x) => [].concat(fn(x)).forEach((k) => { m[k] = (m[k] || 0) + 1; })); return m; };
  const rc = cnt('role', (x) => x.roles); const cc = cnt('cl', (x) => x.cl); const dc = cnt('dept', (x) => x.p.dept); const gc = cnt('group', (x) => x.p.groups);
  const toggle = (k, v) => setF((o) => ({ ...o, page: 1, [k]: o[k].includes(v) ? o[k].filter((x) => x !== v) : [...o[k], v] }));
  const Facet = ({ title, k, items }) => (<><h5>{title}</h5>{items.map(([v, n, l]) => <label key={v}><input type="checkbox" checked={f[k].includes(v)} onChange={() => toggle(k, v)} />{l || v}<em>{(n || 0).toLocaleString('en-GB')}</em></label>)}</>);
  const exportCsv = () => {
    const csv = ['Name,Email,Roles,Clearance,Department,Groups,Source', ...list.map((x) => [x.p.name, x.p.email, x.roles.join(' '), x.cl, x.p.dept, x.p.groups.join(' '), x.src].map((v) => `"${v}"`).join(','))].join('\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = 'people.csv'; a.click();
  };
  return (
    <div className="ax-people">
      <aside className="dash-card ax-facets">
        <Facet title="Role" k="role" items={st.roles.map((r) => [r.key, rc[r.key], r.name])} />
        <Facet title="Clearance" k="cl" items={['L3', 'L2', 'L1', '—'].map((c) => [c, cc[c], c === '—' ? 'No role' : c])} />
        <Facet title="Department" k="dept" items={DEPTS.map((d) => [d, dc[d]]).sort((a, b) => (b[1] || 0) - (a[1] || 0))} />
        <Facet title="Group" k="group" items={GROUP_LIST.map((g) => [g, gc[g]]).sort((a, b) => (b[1] || 0) - (a[1] || 0))} />
      </aside>
      <Card icon={Users} tone="info" title="People" count={list.length.toLocaleString('en-GB')} actions={<Button variant="secondary" size="sm" icon={Download} onClick={exportCsv}>Export CSV</Button>}>
        <div className="ax-tools">
          <label className="search gv-search ax-search"><Search size={15} /><input value={f.q} onChange={(e) => setF((o) => ({ ...o, q: e.target.value, page: 1 }))} placeholder={`Search ${PEOPLE_DIR.length.toLocaleString('en-GB')} people by name or email`} aria-label="Search people" /></label>
          <select className="select" value={f.sort} onChange={(e) => setF((o) => ({ ...o, sort: e.target.value }))} aria-label="Sort"><option value="name">Sort: name</option><option value="named">Sort: named test people first</option><option value="active">Sort: last active</option></select>
        </div>
        <div className="gv-chiprow">{SOURCES.map(([k, l]) => <button key={k} type="button" className={`chip ${f.src === k ? 'on' : ''}`} onClick={() => setF((o) => ({ ...o, src: k, page: 1 }))}>{l}</button>)}</div>
        <div className="table-wrap">
          <table className="tbl">
            <thead><tr><th>Person</th><th>Roles (via group)</th><th>Clearance</th><th>Department</th><th>Owns / stewards</th><th>Grants</th><th>Last active</th></tr></thead>
            <tbody>{shown.map((x) => {
              const owns = ss.register.filter((r) => Object.values(r.roles).some((c) => c && c.who === x.p.name)).length;
              const grants = st.grants.filter((g) => g.person === x.p.name && g.status === 'active').length;
              return (
                <tr key={x.p.id} className="click" onClick={() => setOpen(x.p)}>
                  <td><div className="ax-who"><span className="ax-av" style={{ background: x.p.col }}>{initials(x.p.name)}</span><div><b>{x.p.name}</b>{x.p.named && <span className="gv-tag info" style={{ marginLeft: 6 }}>test user</span>}<span className="gv-sub">{x.p.email}</span></div></div></td>
                  <td>{x.roles.map((r) => <span key={r} className="tag">{roleOf(r)?.name || r}</span>)}{!x.roles.length && <StatusBadge s="warn">no role</StatusBadge>}{x.src === 'manual' && <span className="gv-tag violet" style={{ marginLeft: 4 }}>manual</span>}{breachers.has(x.p.name) && <StatusBadge s="fail">SoD</StatusBadge>}</td>
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
          <span>{list.length ? ((page - 1) * f.per + 1).toLocaleString('en-GB') : 0}–{Math.min(page * f.per, list.length).toLocaleString('en-GB')} of {list.length.toLocaleString('en-GB')} people</span>
          <span className="gv-inline" style={{ gap: 6, alignItems: 'center' }}>
            <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setF((o) => ({ ...o, page: page - 1 }))}>‹</Button>
            Page {page} of {pages.toLocaleString('en-GB')}
            <Button variant="secondary" size="sm" disabled={page >= pages} onClick={() => setF((o) => ({ ...o, page: page + 1 }))}>›</Button>
            <select className="select" value={f.per} onChange={(e) => setF((o) => ({ ...o, per: +e.target.value, page: 1 }))} aria-label="Per page">{[25, 50, 100].map((n) => <option key={n} value={n}>{n} per page</option>)}</select>
          </span>
        </div>
      </Card>
      {open && <PersonDrawer p={open} st={st} ss={ss} onClose={() => setOpen(null)} />}
    </div>
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
          <dt>Persona policies</dt><dd>{scopes.length ? scopes.map((s, i) => <span key={i} className="tag">{s.role} · {s.level} {s.target} → {s.actions.join(', ')}</span>) : <span className="gv-faint">none — the role’s own permissions apply</span>}</dd>
          <dt>Purpose policies</dt><dd>{ACCESS_RULES.map((r) => <span key={r.id} className="tag">{r.name}</span>)}</dd>
          <dt>Stakeholder rights</dt><dd>{owns.some((o) => o.rights.approve || o.rights.grant) ? `${owns.filter((o) => o.rights.approve).length} asset(s) where they approve access, ${owns.filter((o) => o.rights.grant).length} where they grant it` : <span className="gv-faint">none — holds no owner or steward role with access rights</span>}</dd>
        </dl>
        <div className="gv-section-label">Why {p.name.split(' ')[0]} has this access</div>
        {roles.map((r) => {
          const g = p.groups.find((x) => groupRole(x) === r);
          const a = st.assign.find((x) => x.person === p.name && x.role === r);
          return <div key={r} className="ax-path"><span className="tag mono">{a && a.source === 'manual' ? 'manual assignment' : g || 'directory'}</span><i>→</i><span className="tag">{roleOf(r)?.name || r}</span><i>→</i><span className="tag">clearance {roleOf(r)?.clearance}</span><small>{a ? `${a.source} · since ${a.at}` : 'synced from AWS IAM Identity Center'}</small></div>;
        })}
        {!roles.length && <p className="gv-muted">No role — {p.groups.join(', ')} carries no GenMeta mapping.</p>}
        {owns.slice(0, 3).map((o) => <div key={o.asset + o.role} className="ax-path"><span className="tag">{o.role}</span><i>on</i><Mono>{o.asset}</Mono><i>→</i><span className="tag">{[o.rights.approve && 'approve requests', o.rights.grant && 'grant and revoke'].filter(Boolean).join(', ') || 'no access rights'}</span><small>Stewardship register</small></div>)}
        <Note>The person-centric view Collibra and Entra give: everything one person can do and where each right comes from — so a large estate is navigated by finding one person, not by scrolling a role table.</Note>
      </>)}
      {tab === 'roles' && (
        <div className="table-wrap"><table className="tbl"><thead><tr><th>Group</th><th>Carries role</th><th>Clearance</th><th>Source</th></tr></thead>
          <tbody>{p.groups.map((g) => <tr key={g}><td className="mono">{g}</td><td>{groupRole(g) ? roleOf(groupRole(g))?.name : <StatusBadge s="warn">no mapping</StatusBadge>}</td><td>{groupRole(g) ? roleOf(groupRole(g))?.clearance : '—'}</td><td>directory</td></tr>)}
            {st.assign.filter((a) => a.person === p.name && a.source === 'manual').map((a) => <tr key={a.role}><td className="gv-muted">—</td><td>{roleOf(a.role)?.name}</td><td>{roleOf(a.role)?.clearance}</td><td><span className="gv-tag violet">manual · {a.at}</span></td></tr>)}</tbody></table></div>
      )}
      {tab === 'own' && (owns.length || cols.length ? (
        <div className="table-wrap"><table className="tbl"><thead><tr><th>Asset</th><th>Role</th><th>How</th><th>Access rights here</th></tr></thead>
          <tbody>{owns.map((o) => <tr key={o.asset + o.role}><td><Mono>{o.asset}</Mono><span className="gv-sub">{o.system} · {o.sens}</span></td><td>{o.role}</td><td className="gv-muted">{{ a: 'assigned', i: 'inherited from dataset', m: 'imported', d: 'configured default' }[o.how]}</td><td>{[o.rights.approve && 'approve or decline requests', o.rights.grant && 'grant and revoke', o.rights.changes && 'approve ownership changes', o.rights.quality && 'resolve quality issues'].filter(Boolean).join(' · ') || '—'}</td></tr>)}
            {cols.map((c) => <tr key={c.asset + c.column}><td><Mono>{c.asset}.{c.column}</Mono><span className="gv-sub">column</span></td><td>{ss.roles.find((x) => x.key === c.role)?.name}</td><td className="gv-muted">column-level</td><td>—</td></tr>)}</tbody></table></div>
      ) : <Empty>{p.name} holds no ownership or stewardship role on any asset.</Empty>)}
      {tab === 'grants' && (grants.length ? (
        <div className="table-wrap"><table className="tbl"><thead><tr><th>Asset</th><th>Granted by</th><th>Expires</th><th>Status</th></tr></thead>
          <tbody>{grants.map((g) => <tr key={g.id}><td><Mono>{g.asset}</Mono><span className="gv-sub">{g.why}</span></td><td>{g.by}<span className="gv-sub">{g.granted}</span></td><td>{g.expires}</td><td><StatusBadge s={g.status === 'active' ? 'active' : 'refused'}>{g.status}</StatusBadge></td></tr>)}</tbody></table></div>
      ) : <Empty>No direct grants — access comes only from roles and policies.</Empty>)}
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
        <tbody>{rows.slice((pg - 1) * 20, pg * 20).map((p) => { const manual = removable && st.assign.find((a) => a.person === p.name && a.role === removable); return (
          <tr key={p.id}><td><div className="ax-who"><span className="ax-av" style={{ background: p.col }}>{initials(p.name)}</span>{p.name}</div></td><td className="mono">{manual ? <span className="gv-tag violet">{manual.source}</span> : p.groups.join(', ')}</td><td>{p.dept}</td><td className="gv-muted">{p.lastActive}d</td>
            {removable && <td>{manual && <Button variant="link" icon={X} onClick={() => a1.run(unassign(p.name, removable), `Removed ${removable} from ${p.name}`)}>Remove</Button>}</td>}</tr>
        ); })}</tbody></table></div>
      <div className="ax-pager"><span>{rows.length.toLocaleString('en-GB')} shown</span><span className="gv-inline" style={{ gap: 6, alignItems: 'center' }}><Button variant="secondary" size="sm" disabled={pg <= 1} onClick={() => setPage(pg - 1)}>‹</Button>{pg} / {pages.toLocaleString('en-GB')}<Button variant="secondary" size="sm" disabled={pg >= pages} onClick={() => setPage(pg + 1)}>›</Button></span></div>
      <Note>To change who holds this, change the group in the directory — or add a manual assignment in Roles, which shows up as an exception for review.</Note>
    </Drawer>
  );
}

/* ------------------------------------------------------------------ Groups */
function Groups({ st }) {
  const [open, setOpen] = useState(null);
  const a1 = useAct();
  return (
    <>
      <Card icon={Fingerprint} tone="warn" title="Directory groups" count={GROUP_LIST.length}
        sub={`${PEOPLE_DIR.length.toLocaleString('en-GB')} people · AWS IAM Identity Center (test directory)${st.sync ? ` · last synchronised ${st.sync.at}` : ''}`}
        actions={<Button variant="secondary" size="md" icon={RefreshCw} onClick={() => a1.run(syncDirectory(), 'Directory synchronised — results under Settings › Directory sync')}>Synchronise now</Button>}>
        <RoleNote st={st} need={['governance-lead', 'platform-ops']} what="synchronising the directory" />
        <a1.Refusal />
        <div className="table-wrap"><table className="tbl">
          <thead><tr><th>Group</th><th>Role in GenMeta</th><th>Clearance</th><th className="num">Members</th><th /></tr></thead>
          <tbody>{GROUP_LIST.map((g) => { const r = groupRole(g); const n = PEOPLE_DIR.filter((p) => p.groups.includes(g)).length; return (
            <tr key={g} className="click" onClick={() => setOpen(g)}><td className="mono">{g}</td><td>{r ? <span className="tag">{roleOf(r)?.name}</span> : <StatusBadge s="warn">no mapping — members get no role</StatusBadge>}</td><td>{r ? roleOf(r)?.clearance : '—'}</td><td className="num"><b>{n.toLocaleString('en-GB')}</b></td><td><Button variant="link">View members ›</Button></td></tr>
          ); })}</tbody>
        </table></div>
        <Note>Roles are given to groups, and membership is managed in the directory (as in Entra, Collibra and Atlan). Counts here; members on demand — never 2,000 names in a cell.</Note>
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
        const manual = holders.filter((p) => sourceFor(p, st.assign) === 'manual' && (!p.named || st.assign.some((a) => a.person === p.name && a.role === r.key && a.source === 'manual'))).length;
        const n = (g) => holders.filter((p) => p.groups.includes(g)).length;
        return (
          <button type="button" key={r.key} className="dash-card ax-role" onClick={() => setOpen(r.key)}>
            <div className="ax-role-h"><div><b>{r.name}</b><span className="gv-sub mono">{r.key}{!r.builtIn ? ' · defined here' : ''}</span></div><span className="tag">{r.clearance}</span></div>
            <div className="ax-big">{holders.length.toLocaleString('en-GB')} <small>people</small></div>
            <div className="ax-bar">{via.map((g, i) => <i key={g} style={{ width: `${(n(g) / Math.max(1, holders.length)) * 100}%`, background: BAR[i % BAR.length] }} />)}</div>
            <div className="ax-legend">{via.map((g, i) => <span key={g}><i style={{ background: BAR[i % BAR.length] }} />{g} · {n(g).toLocaleString('en-GB')}</span>)}{manual > 0 && <span><i style={{ background: 'var(--gv-violet, #6D4AFF)' }} />{manual} manual</span>}{!via.length && <span>no directory group carries this role</span>}</div>
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
    ...st.scopes.map((s) => ({ kind: 'Persona', name: `${roleOf(s.role)?.name || s.role} — ${s.level} ${s.target}`, who: groupsFor(s.role).length ? groupsFor(s.role) : [s.role], n: peopleFor(s.role), what: `${s.level}: ${s.target} (${statementFor(s).sys})`, effect: s.actions.includes('read_profile') || s.actions.includes('read_sensitive') ? 'Allow' : 'Mask', detail: s.actions.join(', '), to: 'permissions' })),
    ...ACCESS_RULES.map((r) => ({ kind: 'Purpose', name: r.name, who: ['Everyone'], n: PEOPLE_DIR.length, what: r.when, effect: r.effect === 'deny' ? 'Deny' : 'Mask', detail: r.id, to: 'rules' })),
    ...ss.roles.filter((r) => r.resp[1] === '1' || r.resp[2] === '1').map((r) => ({ kind: 'Stakeholder', name: `${r.name} — on the assets they hold`, who: [`${r.name}s in the register`], n: new Set(ss.register.map((x) => x.roles[r.key]?.who).filter(Boolean)).size, what: `${ss.register.filter((x) => x.roles[r.key]).length} assets in the Stewardship register`, effect: 'Allow', detail: [r.resp[1] === '1' && 'approve or decline requests', r.resp[2] === '1' && 'grant and revoke'].filter(Boolean).join(' · '), to: 'responsibilities' })),
    ...st.policies.map((p) => ({ kind: 'Sensitivity', name: `${p.s} data`, who: ['Everyone'], n: PEOPLE_DIR.length, what: `assets classified ${p.s}`, effect: p.mask ? 'Mask' : 'Allow', detail: `approved by ${p.ap.toLowerCase()} · up to ${p.days} days${p.just ? ' · justification' : ''}${p.mask ? ' · masked without a grant' : ''}`, to: 'policies-edit' })),
  ];
  const shown = rows.filter((r) => kind === 'all' || r.kind === kind);
  const KINDS = [['all', 'All'], ['Persona', 'Persona — by role or team'], ['Purpose', 'Purpose — by classification'], ['Stakeholder', 'Stakeholder — owners & stewards'], ['Sensitivity', 'Sensitivity level']];
  return (
    <>
      <Card icon={ScrollText} tone="violet" title="Access policies" count={rows.length} sub="Who (groups or stakeholder roles, never individuals) · what (part of the estate, or a classification) · effect. Effective access is the union of allows; any deny wins.">
        <div className="gv-chiprow">{KINDS.map(([k, l]) => <button key={k} type="button" className={`chip ${kind === k ? 'on' : ''}`} onClick={() => setKind(k)}>{l} <b>{k === 'all' ? rows.length : rows.filter((r) => r.kind === k).length}</b></button>)}</div>
        <div className="ax-pols">{shown.map((r, i) => (
          <div key={i} className="ax-pol">
            <div><small>{r.kind}</small><b>{r.name}</b></div>
            <div><small>Who</small>{r.who.map((w) => <span key={w} className="tag mono">{w}</span>)}<span className="gv-sub">{r.n.toLocaleString('en-GB')} people</span></div>
            <div><small>What</small>{r.what}</div>
            <div><small>Effect</small><StatusBadge s={r.effect === 'Deny' ? 'fail' : r.effect === 'Mask' ? 'warn' : 'ok'}>{r.effect}</StatusBadge><span className="gv-sub">{r.detail}</span></div>
            <div>{r.to !== 'policies-edit' && <Button variant="link" onClick={() => nav(`${ACCESS_BASE}/${r.to}`)}>Edit ›</Button>}</div>
          </div>
        ))}</div>
        <Note>Persona policies follow Atlan's personas; purpose policies follow Atlan purposes and Informatica CDAM (written once per classification); stakeholder policies follow Informatica's stakeholder-role policies — the OWN-06 rule that owners and stewards act on their own assets.</Note>
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
  const exportCsv = () => { const csv = ['Asset,Person,Granted,By,Expires,Last used,Status', ...rows.map((g) => [g.asset, g.person, g.granted, g.by, g.expires, g.lastUsed, g.status].map((v) => `"${v}"`).join(','))].join('\n'); const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = 'grants.csv'; a.click(); };
  return (
    <Card icon={KeyRound} tone="ok" title="Grants" count={rows.length} sub="The same grants Access reviews works on — revoking here or there changes both. Owners and stewards may revoke on their own assets (OWN-06)."
      actions={<Button variant="secondary" size="sm" icon={Download} onClick={exportCsv}>Export CSV</Button>}>
      <a1.Refusal />
      <div className="ax-tools">
        <label className="search gv-search ax-search"><Search size={15} /><input value={f.q} onChange={(e) => setF((o) => ({ ...o, q: e.target.value, page: 1 }))} placeholder="Search by asset or person" aria-label="Search grants" /></label>
        <select className="select" value={f.status} onChange={(e) => setF((o) => ({ ...o, status: e.target.value, page: 1 }))} aria-label="Status"><option value="active">Active</option><option value="revoked">Revoked</option><option value="all">All</option></select>
        <select className="select" value={f.sens} onChange={(e) => setF((o) => ({ ...o, sens: e.target.value, page: 1 }))} aria-label="Sensitivity"><option value="all">Any sensitivity</option><option>Restricted</option><option>Confidential</option><option>Internal</option></select>
      </div>
      <div className="table-wrap"><table className="tbl">
        <thead><tr><th>Asset</th><th>Person</th><th>Granted</th><th>Granted by</th><th>Expires</th><th>Last used</th><th>Status</th><th /></tr></thead>
        <tbody>{rows.slice((pg - 1) * 25, pg * 25).map((g) => <tr key={g.id}><td><Mono>{g.asset}</Mono><span className="gv-sub">{g.sens} · owner {ownerOf(g.asset) || '—'}</span></td><td>{g.person}<span className="gv-sub">{g.role}</span></td><td>{g.granted}</td><td>{g.by}</td><td>{g.expires}</td><td>{g.lastUsed}</td><td><StatusBadge s={g.status === 'active' ? 'active' : 'refused'}>{g.status}</StatusBadge></td>
          <td>{g.status === 'active' && <Button variant="subtle" size="sm" onClick={() => a1.run(revokeGrant(g.id), 'Grant revoked — written to the audit log')}>Revoke</Button>}</td></tr>)}
          {!rows.length && <tr><td colSpan={8}><Empty>No grants match.</Empty></td></tr>}</tbody>
      </table></div>
      <div className="ax-pager"><span>{rows.length} grant(s)</span><span className="gv-inline" style={{ gap: 6, alignItems: 'center' }}><Button variant="secondary" size="sm" disabled={pg <= 1} onClick={() => setF((o) => ({ ...o, page: pg - 1 }))}>‹</Button>{pg} / {pages}<Button variant="secondary" size="sm" disabled={pg >= pages} onClick={() => setF((o) => ({ ...o, page: pg + 1 }))}>›</Button></span></div>
    </Card>
  );
}

/* ------------------------------------------------------------------ one audit trail for access and ownership */
function Audit({ ss }) {
  const access = AUDIT.filter((a) => a.action.startsWith('access.')).map((a) => ({ at: fmtTs(a.ts), who: a.who, role: a.role, action: a.action, on: a.asset || '—', what: a.what || '', cat: /refused|denied/.test(a.action) ? 'ownership.denied' : 'access' }));
  return <AuditTrail title="Access and ownership audit trail" audit={[...access, ...ss.trail]} />;
}
