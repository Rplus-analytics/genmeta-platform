import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, Download, UserCheck, Users, ShieldCheck, ClipboardCheck, ScrollText, ListChecks, Plus, Trash2, Check, X, ArrowRight, AlertTriangle, Layers, Inbox, Lock,
} from 'lucide-react';
import { PageHead, Tabs, Button, Segmented } from '../components/ui.jsx';
import { BY_KEY } from '../catalogue/model.js';
import { HOW, datasetOf, DEFAULT_BY, RESPONSIBILITIES, AUDIT_FILTERS, LABEL_REASON, columnsOfAsset, BUILT_IN } from './stewardship-data.js';
import {
  useStewardship, assign as doAssign, decideChange, bulkAssign, changeModel, raiseIssue, resolveIssue, describe, decideTask, coverage, stewardRights,
} from './stewardship-store.js';
import { useAccess, setViewRole, ACCESS_VIEW, me } from './access-store.js';
import { BASE } from './data.js';
import { PersonPicker } from './Access.jsx';
import { Card, Tiles, StatusBadge, Empty, Note, Fld, Drawer, KV, Meter, meterTone, downloadCsv, toast } from './kit.jsx';

/* Govern › Governance › Stewardship — everything from the old UI's Stewardship page:
   ownership register (with the assign panel), roles & responsibilities, coverage gaps,
   approvals & quality issues, the audit trail and the review queue. */

const TABS = [
  { value: 'register', label: 'Ownership register', icon: UserCheck },
  { value: 'roles', label: 'Roles & responsibilities', icon: Users },
  { value: 'gaps', label: 'Coverage gaps', icon: ShieldCheck },
  { value: 'approvals', label: 'Approvals & quality issues', icon: ClipboardCheck },
  { value: 'audit', label: 'Audit trail', icon: ScrollText },
  { value: 'queue', label: 'Review queue', icon: ListChecks },
];
const TYPE_OF = { table: 'tables', 'file, API or topic': 'files, APIs & topics', report: 'reports' };

/* run an action; a refusal shows inline with its reason (and is logged under Refused actions) */
function useAct() {
  const [msg, setMsg] = useState(null);
  const run = (res, okText) => { if (!res.ok) { setMsg(res.why); toast(`Refused — ${res.why}`); return false; } setMsg(null); if (okText) toast(okText); return true; };
  const Refusal = () => (msg ? <div className="gv-callout bad ac-refuse"><Lock size={15} /><span><b>Refused —</b> {msg} <span className="gv-faint">Logged under Refused actions.</span></span><button type="button" className="ib" aria-label="Dismiss" onClick={() => setMsg(null)}><X size={13} /></button></div> : null);
  return { run, Refusal };
}

export default function Stewardship({ switcher }) {
  const ss = useStewardship();
  const acc = useAccess();
  const [tab, setTab] = useState('register');
  const { register, roles, changes, issues, queue } = ss;
  const openIssues = issues.filter((i) => i.status === 'open').length;
  const stewardCov = Math.round((register.filter((r) => r.roles.steward).length / register.length) * 1000) / 10;
  return (
    <div className="page gv">
      <PageHead eyebrow="Govern" title="Stewardship"
        sub="Who is accountable for every system, dataset, table, column and report: owners, stewards, custodians and bespoke roles, their responsibilities, coverage gaps, approvals and a full audit trail.">
        <Fld label="Viewing as (test)">
          <select className="select" value={acc.role} onChange={(e) => setViewRole(e.target.value)} aria-label="Viewing as">{ACCESS_VIEW.map(([r, p]) => <option key={r} value={r}>{r} · {p}</option>)}</select>
        </Fld>
      </PageHead>
      {switcher}
      <Tabs items={TABS} value={tab} onChange={setTab} />
      {tab !== 'queue' && (
        <Tiles items={[
          { l: 'Assets in the register', v: register.length, s: `governance model ${changes[0][0]}` },
          { l: 'Steward coverage', v: `${stewardCov}%`, s: `${register.filter((r) => r.roles.steward).length} of ${register.length} assets` },
          { l: 'Open quality issues', v: openIssues, s: 'routed to the asset’s steward' },
          { l: 'Change requests pending', v: ss.requests.filter((r) => r.status === 'pending').length, s: 'assignments by non-leads await a different approver' },
        ]} />
      )}
      {tab === 'register' && <Register ss={ss} />}
      {tab === 'roles' && <StewardRoles roles={roles} changes={changes} />}
      {tab === 'gaps' && <Gaps ss={ss} />}
      {tab === 'approvals' && <Approvals ss={ss} />}
      {tab === 'audit' && <AuditTrail audit={ss.trail} />}
      {tab === 'queue' && <ReviewQueue queue={queue} register={register} />}
    </div>
  );
}

/* ---------------------------------------------------------------- Ownership register */
function RoleCell({ c }) {
  if (!c) return <span className="gv-badge bad"><i />gap</span>;
  return <span className="gv-who"><b>{c.who}</b><em className={`gv-how h-${c.how}`}>{HOW[c.how]}</em></span>;
}
export function Register({ ss }) {
  const { register, roles, changes } = ss;
  const [q, setQ] = useState('');
  const [sel, setSel] = useState(null);
  const shown = useMemo(() => {
    const w = q.trim().toLowerCase();
    return w ? register.filter((r) => `${r.asset} ${r.system} ${Object.values(r.roles).map((c) => c?.who || '').join(' ')}`.toLowerCase().includes(w)) : register;
  }, [q, register]);
  const row = register.find((r) => r.asset === sel);
  /* every role in the governance model gets a column — built-in and bespoke */
  const cols = roles.map((r) => [r.key, r.name, r.builtIn]);
  const exportCsv = () => downloadCsv('ownership-register.csv',
    [['Asset', 'System', 'Sensitivity', 'Type', ...cols.flatMap(([, l]) => [l, `${l} source`])],
      ...register.map((r) => [r.asset, r.system, r.sens, r.kind, ...cols.flatMap(([k]) => [r.roles[k]?.who || 'gap', r.roles[k] ? HOW[r.roles[k].how] : ''])])]);
  return (
    <div className="gv-stw">
      <Card icon={UserCheck} tone="info" title="Ownership register" count={register.length}
        sub={<>{shown.length === register.length ? `${register.length} assets` : `${shown.length} of ${register.length} assets`} · governance model {changes[0][0]} · {Object.entries(HOW).map(([k, l]) => <em key={k} className={`gv-how h-${k}`}>{l}</em>)}</>}
        actions={<Button variant="secondary" size="sm" icon={Download} onClick={exportCsv}>Export CSV</Button>}>
        <label className="search gv-search"><Search size={15} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find an asset or a person" aria-label="Find an asset or a person" /></label>
        <div className="table-wrap gv-scroll">
          <table className="tbl gv-reg">
            <thead><tr><th>Asset</th><th>Type</th>{cols.map(([k, l, b]) => <th key={k}>{l}{!b && <span className="gv-sub">bespoke</span>}</th>)}</tr></thead>
            <tbody>{shown.map((r) => (
              <tr key={r.asset} className={`click ${sel === r.asset ? 'on' : ''}`} onClick={() => setSel(r.asset)}>
                <td><span className="gv-strong mono gv-wrap">{r.asset}</span><span className="gv-sub">{r.system} · <span className={`sens sens-${r.sens.toLowerCase()}`}>{r.sens}</span></span></td>
                <td className="gv-muted">{r.kind}</td>
                {cols.map(([k, , b]) => <td key={k}>{r.roles[k] ? <RoleCell c={r.roles[k]} /> : b ? <RoleCell c={null} /> : <span className="gv-faint">—</span>}</td>)}
              </tr>
            ))}</tbody>
          </table>
          {!shown.length && <Empty>No asset or person matches “{q}”.</Empty>}
        </div>
      </Card>
      <aside className="gv-stw-side">
        {row ? <AssetPanel key={row.asset} r={row} ss={ss} />
          : <div className="dash-card gv-stw-empty"><Inbox size={20} /><p>Select an asset to see and change who is accountable.</p></div>}
      </aside>
    </div>
  );
}

export function AssetPanel({ r, ss }) {
  const { roles } = ss;
  const extra = ss.extra[r.asset] || [];
  const ds = datasetOf(r.asset);
  const [f, setF] = useState({ scope: 'asset', role: 'owner', person: '', reason: '', column: '' });
  const [desc, setDesc] = useState(BY_KEY[r.asset]?.desc || '');
  const [issue, setIssue] = useState('');
  const a1 = useAct(); const a2 = useAct();
  const cols = columnsOfAsset(r.asset);
  const mine = stewardRights(me(), r.asset);
  /* an explicit assignment record (who, when) replaces the register line for the same role */
  const covered = new Set(extra.map(([role]) => role));
  const lines = [
    ...extra.filter(([role]) => roles.some((x) => x.name === role)).map(([role, who, how]) => [role, who, how]),
    ...roles.filter((x) => r.roles[x.key] && !covered.has(x.name)).map((x) => [x.name, r.roles[x.key].who, `${HOW[r.roles[x.key].how]}${r.roles[x.key].how === 'd' || r.roles[x.key].how === 'm' ? '' : ` ${DEFAULT_BY}`}`]),
  ];
  const gaps = roles.filter((x) => x.builtIn && !r.roles[x.key]);
  const colRoles = ss.columnRoles.filter((c) => c.asset === r.asset);
  const lead = useAccess().role === 'governance-lead';
  return (
    <div className="dash-card gv-asset-panel">
      <div className="gv-ap-h">
        <b className="mono gv-wrap">{r.asset}</b>
        <small>{r.kind} · {r.system} · dataset {ds}</small>
        <span className={`sens sens-${r.sens.toLowerCase()}`}>{r.sens}</span>
      </div>
      <div className="gv-ap-sec">
        <h4>Who is accountable</h4>
        <ul className="gv-ap-roles">
          {lines.map(([role, who, how], i) => <li key={i}><span>{role}</span><b>{who}</b><small>{how}</small></li>)}
          {gaps.map((x) => <li key={x.key} className="gap"><span>{x.name}</span><b>gap</b><small>nobody holds this role</small></li>)}
        </ul>
        {colRoles.map((c) => <Note key={c.column + c.role}>Column-level: {c.column} → {roles.find((x) => x.key === c.role)?.name} {c.who}</Note>)}
        <Note>You ({me()}){mine.keys.length ? ` hold ${mine.names.join(', ')} here — ${[mine.approve && 'approve access requests', mine.grant && 'grant and revoke access', mine.changes && 'approve ownership changes', mine.quality && 'resolve quality issues'].filter(Boolean).join(', ') || 'no access rights'}.` : ' hold no role on this asset.'}</Note>
      </div>
      <div className="gv-ap-sec">
        <h4>Assign</h4>
        <a1.Refusal />
        <div className="gv-form one">
          <Fld label="Scope"><select className="select" value={f.scope} onChange={(e) => setF({ ...f, scope: e.target.value })}>
            <option value="asset">This asset</option><option value="column">A column</option><option value="dataset">Dataset {ds}</option><option value="system">System {r.system}</option></select></Fld>
          {f.scope === 'column' && <Fld label="Column"><select className="select" value={f.column} onChange={(e) => setF({ ...f, column: e.target.value })}><option value="">Choose…</option>{cols.map((c) => <option key={c}>{c}</option>)}</select></Fld>}
          <Fld label="Role"><select className="select" value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })}>{roles.map((x) => <option key={x.key} value={x.key}>{x.name}</option>)}</select></Fld>
          <Fld label="Person"><PersonPicker groups value={f.person} onChange={(v) => setF({ ...f, person: v })} placeholder="Name or group" /></Fld>
          <Fld label="Reason"><input className="input" value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })} placeholder="Why (recorded in the audit trail)" /></Fld>
        </div>
        <Button variant="primary" size="md" disabled={!f.person.trim() || (f.scope === 'column' && !f.column)}
          onClick={() => { const res = doAssign({ asset: r.asset, scope: f.scope === 'column' ? 'asset' : f.scope, column: f.scope === 'column' ? f.column : '', role: f.role, person: f.person.trim(), reason: f.reason }); if (a1.run(res, res.pending ? 'Change request created — a different person must approve it (Approvals tab)' : 'Assigned — written to the audit log')) setF({ ...f, person: '', reason: '' }); }}>{lead ? 'Assign' : 'Request change'}</Button>
        <Note>{lead ? 'As a governance lead your assignment applies straight away.' : `You are viewing as ${me()} — this creates an ownership change request that a different person (a governance lead or the asset's owner) must approve.`}</Note>
      </div>
      <div className="gv-ap-sec">
        <h4>Steward actions <span className="gv-faint">— allowed only for people whose role carries the responsibility</span></h4>
        <a2.Refusal />
        <Fld label="Description"><textarea className="input gv-ta" rows={3} value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="What this asset holds and what it is for" /></Fld>
        <Button variant="secondary" size="sm" disabled={!desc.trim()} onClick={() => a2.run(describe(r.asset), 'Description saved')}>Save description</Button>
        <div style={{ height: 10 }} />
        <Fld label="Quality issue"><input className="input" value={issue} onChange={(e) => setIssue(e.target.value)} placeholder="e.g. Nulls found in ACCOUNT_BALANCE" /></Fld>
        <Button variant="secondary" size="sm" icon={AlertTriangle} disabled={!issue.trim()} onClick={() => { const res = raiseIssue(r.asset, issue.trim()); a2.run(res, `Quality issue raised → ${res.steward || 'no steward'}`); setIssue(''); }}>Raise for the steward</Button>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- Roles & responsibilities */
export function StewardRoles({ roles, changes }) {
  const [nf, setNf] = useState({ name: '', desc: '' });
  const a1 = useAct();
  const toggle = (key, i) => {
    const r = roles.find((x) => x.key === key);
    a1.run(changeModel((all) => all.map((x) => (x.key === key ? { ...x, resp: x.resp.split('').map((c, j) => (j === i ? (c === '1' ? '0' : '1') : c)).join('') } : x)), `changed role ${r.name}; ${r.resp[i] === '1' ? 'removed' : 'added'} “${RESPONSIBILITIES[i]}”`), 'Governance model updated — written to the audit log');
  };
  return (
    <>
      <Card icon={Users} tone="violet" title="Roles and their responsibilities" sub={`Governance model ${changes[0][0]} · tick a box to give a role that responsibility. “Approve or decline access requests” and “Grant and revoke access directly” are what let an owner or steward act on access.`}>
        <a1.Refusal />
        <div className="table-wrap">
          <table className="tbl gv-rolemx">
            <thead><tr><th>Role</th>{RESPONSIBILITIES.map((r) => <th key={r} className="gv-rot"><span>{r}</span></th>)}<th /></tr></thead>
            <tbody>{roles.map((r) => (
              <tr key={r.key}>
                <td><div className="gv-inline" style={{ gap: 6, alignItems: 'center' }}><b className="gv-strong">{r.name}</b>{r.builtIn ? <><span className="gv-tag">built-in</span><span className="gv-tag info">required</span></> : <span className="gv-tag violet">bespoke</span>}</div><span className="gv-sub">{r.desc}</span></td>
                {RESPONSIBILITIES.map((x, i) => <td key={x} className="gv-cb"><input type="checkbox" checked={r.resp[i] === '1'} onChange={() => toggle(r.key, i)} aria-label={`${r.name}: ${x}`} /></td>)}
                <td>{!r.builtIn && <Button variant="link" icon={Trash2} onClick={() => a1.run(changeModel((all) => all.filter((x) => x.key !== r.key), `removed role ${r.name}`), `Removed ${r.name}`)}>Remove</Button>}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
        <div className="gv-subhead">New bespoke role</div>
        <div className="gv-inline" style={{ alignItems: 'flex-end' }}>
          <Fld label="Name"><input className="input" value={nf.name} onChange={(e) => setNf({ ...nf, name: e.target.value })} placeholder="e.g. Records manager" /></Fld>
          <Fld label="Description"><input className="input" style={{ minWidth: 320 }} value={nf.desc} onChange={(e) => setNf({ ...nf, desc: e.target.value })} placeholder="What this role is for" /></Fld>
          <Button variant="primary" size="md" icon={Plus} disabled={!nf.name.trim() || roles.some((x) => x.name.toLowerCase() === nf.name.trim().toLowerCase())} onClick={() => {
            const name = nf.name.trim();
            if (a1.run(changeModel((all) => [...all, { key: name.toLowerCase().replace(/\W+/g, '-'), name, builtIn: false, desc: nf.desc.trim(), resp: '00000000' }], `created bespoke role ${name} with no responsibilities`), `Added ${name} — it now has its own column in the register`)) setNf({ name: '', desc: '' });
          }}>Add role</Button>
        </div>
        <Note>Only a governance lead can change the model; anyone else is refused and it is logged.</Note>
      </Card>
      <Card icon={ScrollText} tone="teal" title="Governance-model changes" count={changes.length}>
        <ol className="gv-tl">{changes.map(([v, at, who, what]) => <li key={v + at}><time>{v} · {at}</time><div><b>{who}</b> {what}</div></li>)}</ol>
      </Card>
    </>
  );
}

/* ---------------------------------------------------------------- Coverage gaps (counted from the same rows as the gap list) */
export function Gaps({ ss }) {
  const { register, roles } = ss;
  const [type, setType] = useState('all');
  const [missing, setMissing] = useState('any');
  const [picked, setPicked] = useState([]);
  const [person, setPerson] = useState('');
  const a1 = useAct();
  const { rows, gaps } = useMemo(() => coverage(ss), [ss]);
  const people = {};
  register.forEach((r) => Object.entries(r.roles).forEach(([k, c]) => { if (c) { const lab = roles.find((x) => x.key === k)?.name || k; people[c.who] = people[c.who] || {}; people[c.who][lab] = (people[c.who][lab] || 0) + 1; } }));
  const ranked = Object.entries(people).sort((a, b) => Object.values(b[1]).reduce((x, y) => x + y, 0) - Object.values(a[1]).reduce((x, y) => x + y, 0));
  const shown = gaps.filter((g) => (type === 'all' || g.type === type) && (missing === 'any' || g.miss.includes(missing)));
  const canBulk = type !== 'all' && missing !== 'any' && !['columns', 'datasets'].includes(type);
  const TYPES = ['all', 'tables', 'columns', 'files, APIs & topics', 'reports', 'datasets'];
  return (
    <>
      <Card icon={ShieldCheck} tone="info" title="Coverage by type" sub="How much of the estate has each built-in role filled. Every row that is not 100% appears in Gaps below.">
        <div className="table-wrap">
          <table className="tbl">
            <thead><tr><th>Type</th><th className="num">Count</th><th>Owner</th><th>Steward</th><th>Custodian</th><th className="num">With a gap</th></tr></thead>
            <tbody>{rows.map((x) => (
              <tr key={x.label}><td className="gv-strong">{x.label}</td><td className="num">{x.n.toLocaleString('en-GB')}</td>
                {BUILT_IN.map((k) => { const v = x.has[k]; const p = x.n ? (v / x.n) * 100 : 0; return <td key={k}><div className="gv-covcell"><Meter pct={p / 100} tone={meterTone(p / 100)} /><span>{`${Math.round(p * 10) / 10}%`} <small>({v.toLocaleString('en-GB')})</small></span></div></td>; })}
                <td className="num"><b>{gaps.filter((g) => g.type === x.label).length}</b></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
        <Note>People holding roles: {ranked.map(([who, rs], i) => <span key={who}>{i ? '; ' : ''}<b>{who}</b> ({Object.entries(rs).map(([k, n]) => `${k} ×${n}`).join(', ')})</span>)}</Note>
      </Card>
      <Card icon={AlertTriangle} tone="bad" title="Gaps" count={gaps.length} sub="Every asset, column and dataset missing an owner, steward or custodian. Pick a type and a missing role to bulk-assign.">
        <a1.Refusal />
        <div className="gv-chiprow">
          {TYPES.map((t) => <button key={t} type="button" className={`chip ${type === t ? 'on' : ''}`} onClick={() => { setType(t); setPicked([]); }}>{t === 'all' ? 'All types' : t} <b>{t === 'all' ? gaps.length : gaps.filter((g) => g.type === t).length}</b></button>)}
        </div>
        <div className="gv-chiprow">
          {['any', ...BUILT_IN].map((m) => <button key={m} type="button" className={`chip ${missing === m ? 'on' : ''}`} onClick={() => { setMissing(m); setPicked([]); }}>{m === 'any' ? 'Any missing role' : m} <b>{m === 'any' ? shown.length : gaps.filter((g) => (type === 'all' || g.type === type) && g.miss.includes(m)).length}</b></button>)}
        </div>
        {canBulk && (
          <div className="gv-bulk">
            <span><b>{picked.length}</b> selected</span>
            <PersonPicker groups value={person} onChange={setPerson} placeholder={`Person to make ${missing}`} />
            <Button variant="primary" size="sm" disabled={!picked.length || !person.trim()} onClick={() => { if (a1.run(bulkAssign(picked, missing, person.trim()), `${person.trim()} assigned as ${missing} on ${picked.length} asset(s) — written to the audit log`)) { setPicked([]); setPerson(''); } }}>Assign {missing} to selected</Button>
          </div>
        )}
        <div className="table-wrap gv-scroll">
          <table className="tbl">
            <thead><tr><th className="gv-cb">{canBulk && <input type="checkbox" checked={picked.length > 0 && picked.length === shown.length} onChange={(e) => setPicked(e.target.checked ? shown.map((g) => g.asset) : [])} aria-label="Select all" />}</th><th>Gap</th><th>Type</th><th>Missing</th><th>System</th></tr></thead>
            <tbody>{shown.map((g, gi) => (
              <tr key={`${g.id}-${gi}`}>
                <td className="gv-cb">{canBulk && <input type="checkbox" checked={picked.includes(g.asset)} onChange={(e) => setPicked((p) => (e.target.checked ? [...p, g.asset] : p.filter((x) => x !== g.asset)))} />}</td>
                <td className="mono gv-wrap">{g.id}</td><td className="gv-muted">{g.type}</td>
                <td><div className="gv-inline" style={{ gap: 4 }}>{g.miss.map((m) => <span key={m} className="gv-badge bad"><i />{m}</span>)}</div></td>
                <td className="gv-muted">{g.system}</td>
              </tr>
            ))}</tbody>
          </table>
          {!shown.length && <Empty>No gaps for this filter.</Empty>}
        </div>
      </Card>
    </>
  );
}

/* ---------------------------------------------------------------- Approvals & quality issues */
export function Approvals({ ss }) {
  const { issues, requests } = ss;
  const [f, setF] = useState('all');
  const [open, setOpen] = useState(null);
  const [note, setNote] = useState('');
  const a1 = useAct(); const a2 = useAct();
  const list = issues.filter((i) => f === 'all' || (f === 'open' ? i.status === 'open' : i.status !== 'open'));
  return (
    <>
      <Card icon={ClipboardCheck} tone="violet" title="Ownership change requests" count={requests.length} sub="Assignments made by anyone other than a governance lead wait here for a different person — a governance lead or the asset's owner — to approve.">
        <a1.Refusal />
        <div className="table-wrap">
          <table className="tbl">
            <thead><tr><th>Change</th><th>Requested by</th><th>Reason</th><th>Status</th><th /></tr></thead>
            <tbody>{requests.map((c) => (
              <tr key={c.id}><td>{c.change}</td><td><b>{c.by}</b><span className="gv-sub">{c.at}</span></td><td>{c.reason || '—'}</td>
                <td><StatusBadge s={c.status === 'approved' ? 'ok' : c.status === 'rejected' ? 'bad' : 'pending'}>{c.status}</StatusBadge>{c.decidedBy && <span className="gv-sub">by {c.decidedBy}, {c.decidedAt}</span>}</td>
                <td style={{ whiteSpace: 'nowrap' }}>{c.status === 'pending' && <><Button variant="secondary" size="sm" icon={Check} onClick={() => a1.run(decideChange(c.id, true), 'Change approved and applied — written to the audit log')}>Approve</Button> <Button variant="subtle" size="sm" icon={X} onClick={() => a1.run(decideChange(c.id, false), 'Change rejected')}>Reject</Button></>}</td></tr>
            ))}</tbody>
          </table>
        </div>
      </Card>
      <Card icon={AlertTriangle} tone="warn" title="Data-quality issues" count={issues.length} sub="Resolved by the asset’s steward or a governance lead — anyone else is refused, and it is logged under Refused actions."
        actions={<Segmented size="sm" value={f} onChange={setF} options={[{ value: 'all', label: `All (${issues.length})` }, { value: 'open', label: `Open (${issues.filter((i) => i.status === 'open').length})` }, { value: 'resolved', label: `Resolved (${issues.filter((i) => i.status !== 'open').length})` }]} />}>
        <a2.Refusal />
        <div className="table-wrap gv-scroll">
          <table className="tbl">
            <thead><tr><th>Issue</th><th>Routed to</th><th>Status</th><th /></tr></thead>
            <tbody>{list.map((i) => (
              <tr key={i.id}>
                <td><span className="gv-strong">{i.title}</span><span className="gv-sub"><span className="mono">{i.asset}</span> · raised by {i.by} {i.at}</span></td>
                <td>{i.routed || <span className="gv-badge bad"><i />no steward</span>}</td>
                <td>{i.status === 'open' ? <StatusBadge s="bad">open</StatusBadge> : <StatusBadge s="ok">{i.status}</StatusBadge>}</td>
                <td>{i.status === 'open' && (open === i.id ? (
                  <div className="gv-inline" style={{ gap: 6 }}>
                    <input className="input" style={{ height: 30, width: 200 }} autoFocus value={note} onChange={(e) => setNote(e.target.value)} placeholder="How it was fixed" />
                    <Button variant="primary" size="sm" disabled={!note.trim()} onClick={() => { a2.run(resolveIssue(i.id, note.trim()), 'Issue resolved — written to the audit log'); setOpen(null); setNote(''); }}>Resolve</Button>
                    <Button variant="link" onClick={() => setOpen(null)}>Cancel</Button>
                  </div>
                ) : <Button variant="secondary" size="sm" icon={Check} onClick={() => { setOpen(i.id); setNote(''); }}>Resolve</Button>)}</td>
              </tr>
            ))}</tbody>
          </table>
          {!list.length && <Empty>No issues in this state.</Empty>}
        </div>
      </Card>
    </>
  );
}

/* ---------------------------------------------------------------- Audit trail */
export function AuditTrail({ audit, title = 'Ownership and responsibility audit trail' }) {
  const [f, setF] = useState({ action: '', on: '', who: '' });
  const [n, setN] = useState(200);
  const whoList = [...new Set(audit.map((a) => a.who))].sort();
  const onList = [...new Set(audit.map((a) => a.on))].sort();
  const list = audit.filter((a) => (!f.action || a.cat === f.action) && (!f.on || a.on.toLowerCase().includes(f.on.toLowerCase())) && (!f.who || a.who === f.who));
  const set = (k) => (e) => { setF((o) => ({ ...o, [k]: e.target.value })); setN(200); };
  return (
    <Card icon={ScrollText} tone="teal" title={title} sub={`${list.length.toLocaleString('en-GB')} of ${audit.length.toLocaleString('en-GB')} entries · every action here is also written to the hash-chained audit log on Governance › Controls & compliance`}>
      <div className="gv-inline" style={{ marginBottom: 12 }}>
        <Fld label="Action"><select className="select" value={f.action} onChange={set('action')}>{AUDIT_FILTERS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Fld>
        <Fld label="Asset or scope"><input className="input" list="st-on" value={f.on} onChange={set('on')} placeholder="e.g. INT.CUSTOMER or dataset SRC" /><datalist id="st-on">{onList.map((o) => <option key={o} value={o} />)}</datalist></Fld>
        <Fld label="Person"><select className="select" value={f.who} onChange={set('who')}><option value="">Everyone</option>{whoList.map((w) => <option key={w}>{w}</option>)}</select></Fld>
      </div>
      <div className="table-wrap gv-scroll">
        <table className="tbl">
          <thead><tr><th>When</th><th>Who</th><th>Action</th><th>Asset or scope</th><th>What</th></tr></thead>
          <tbody>{list.slice(0, n).map((a, i) => (
            <tr key={i} className={a.cat === 'ownership.denied' ? 'ac-off' : ''}><td className="gv-muted" style={{ whiteSpace: 'nowrap' }}>{a.at}</td><td>{a.who}{a.role && <span className="gv-sub">{a.role}</span>}</td><td><code className="gv-code">{a.action}</code></td><td className="mono gv-wrap">{a.on}</td><td>{a.what}</td></tr>
          ))}</tbody>
        </table>
        {!list.length && <Empty>No entries for these filters.</Empty>}
      </div>
      {list.length > n && <Button variant="secondary" size="sm" onClick={() => setN((x) => x + 300)}>Show more ({(list.length - n).toLocaleString('en-GB')} left)</Button>}
    </Card>
  );
}

/* ---------------------------------------------------------------- Review queue */
export function ReviewQueue({ queue, register }) {
  const a1 = useAct();
  const onDecide = (id, ok) => a1.run(decideTask(id, ok), `${ok ? 'Approved' : 'Rejected'} — recorded in the audit chain`);
  const nav = useNavigate();
  const [kind, setKind] = useState('all');
  const [dom, setDom] = useState('all');
  const [open, setOpen] = useState(null);
  const pending = queue.filter((q) => q.status === 'In review' || q.status === 'Open');
  const sensitive = new Set(queue.filter((q) => q.type === 'Classification').map((q) => q.asset)).size;
  const sources = new Set(register.map((r) => r.system)).size;
  const byKind = (k) => (k === 'all' ? queue : queue.filter((q) => q.type === (k === 'cls' ? 'Classification' : 'Ownership')));
  const doms = ['Other', 'Customer', 'Orders', 'Products', 'Suppliers', 'Geography', 'Order items'];
  const list = byKind(kind).filter((q) => dom === 'all' || q.domain === dom);
  const t = queue.find((q) => q.id === open);
  const owner = t && register.find((r) => r.asset === t.asset)?.roles.owner;
  return (
    <>
      <Tiles items={[
        { l: 'Classification reviews', v: queue.filter((q) => q.type === 'Classification' && q.status === 'In review').length, s: 'AI-suggested labels awaiting confirmation' },
        { l: 'Ownership gaps', v: queue.filter((q) => q.type === 'Ownership' && q.status === 'Open').length, s: 'Assets with no accountable owner' },
        { l: 'Sensitive assets', v: sensitive, s: 'Contain classified columns' },
        { l: 'Sources', v: sources, s: 'Connected source platforms' },
        { l: 'Assets assessed', v: register.length, s: 'Across the connected estate' },
      ]} />
      <div className="gv-rq">
        <div className="dash-card gv-rq-side">
          <div className="gv-rq-h">Queue</div>
          {[['all', 'All tasks'], ['cls', 'Classification reviews'], ['own', 'Ownership gaps']].map(([k, l]) => (
            <button key={k} type="button" className={`admin-link ${kind === k ? 'on' : ''}`} onClick={() => setKind(k)}><span>{l}</span><em>{byKind(k).length}</em></button>
          ))}
          <div className="gv-rq-h">Domains</div>
          {[['all', 'All domains'], ...doms.map((d) => [d, d])].map(([k, l]) => (
            <button key={k} type="button" className={`admin-link ${dom === k ? 'on' : ''}`} onClick={() => setDom(k)}><span>{l}</span><em>{byKind(kind).filter((q) => k === 'all' || q.domain === k).length}</em></button>
          ))}
        </div>
        <Card icon={ListChecks} tone="violet" title="Stewardship queue" count={list.length} sub="Priority-ordered. Click a task to review its evidence.">
          <a1.Refusal />
          <div className="table-wrap gv-scroll">
            <table className="tbl">
              <thead><tr><th>Priority</th><th>Task</th><th>Asset</th><th>Type</th><th>Suggested by</th><th>Status</th></tr></thead>
              <tbody>{list.slice(0, 300).map((q) => (
                <tr key={q.id} className={`click ${open === q.id ? 'on' : ''}`} onClick={() => setOpen(q.id)}>
                  <td><StatusBadge s={q.priority === 'High' ? 'bad' : 'warn'}>{q.priority}</StatusBadge></td>
                  <td className="gv-strong">{q.task}</td><td className="mono gv-wrap gv-muted">{q.asset}</td>
                  <td>{q.type === 'Classification' ? <span className="gv-tag violet">Classification</span> : <span className="gv-tag info">Ownership</span>}</td>
                  <td className="gv-muted">{q.by}</td>
                  <td><StatusBadge s={q.status === 'Approved' ? 'ok' : q.status === 'Rejected' ? 'bad' : 'info'}>{q.status}</StatusBadge></td>
                </tr>
              ))}</tbody>
            </table>
            {list.length > 300 && <p className="gv-faint" style={{ padding: '8px 12px', margin: 0 }}>Showing the first 300 of {list.length} tasks — pick a queue or domain to narrow it.</p>}
          </div>
        </Card>
      </div>
      {t && (
        <Drawer title="Task review" onClose={() => setOpen(null)}
          footer={<>
            <Button variant="secondary" icon={X} disabled={t.status === 'Approved' || t.status === 'Rejected'} onClick={() => { onDecide(t.id, false); setOpen(null); }}>Reject</Button>
            <Button variant="primary" icon={Check} disabled={t.status === 'Approved' || t.status === 'Rejected'} onClick={() => { onDecide(t.id, true); setOpen(null); }}>Approve</Button>
          </>}>
          <h3 style={{ margin: '0 0 8px', fontSize: 16, color: 'var(--navy)' }}>{t.task}</h3>
          <div className="gv-inline" style={{ gap: 6, marginBottom: 14 }}>
            <StatusBadge s={t.priority === 'High' ? 'bad' : 'warn'}>{t.priority} priority</StatusBadge>
            <StatusBadge s={t.status === 'Approved' ? 'ok' : t.status === 'Rejected' ? 'bad' : 'info'}>{t.status}</StatusBadge>
          </div>
          <KV rows={[
            ['Asset', <span className="mono">{t.asset}</span>],
            ...(t.type === 'Classification' ? [['Column', <span className="mono">{t.column}</span>], ['Suggested', <span className="cls">{t.label}</span>], ['Reason', LABEL_REASON[t.label]]] : [['Reason', t.reason]]),
            ['Source', t.system], ['Detected by', t.by], ['Current owner', owner?.how === 'a' || owner?.how === 'm' ? owner.who : 'Not assigned'],
            ['Domain', t.domain], ['Policy', 'HMRC Data Classification (prototype)'],
          ]} />
          <Note>Decisions are appended to the tamper-evident audit chain. Write-back of owners and confirmed classifications to the source systems is out of scope for this prototype.</Note>
          <div className="gv-inline" style={{ gap: 16, marginTop: 12 }}>
            <Button variant="link" icon={ArrowRight} onClick={() => nav(BASE)}>Governance controls</Button>
            <Button variant="link" icon={Layers} onClick={() => nav('/app/graph')}>Open in Knowledge</Button>
          </div>
        </Drawer>
      )}
    </>
  );
}
