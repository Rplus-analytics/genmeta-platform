import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, Download, UserCheck, Users, ShieldCheck, ClipboardCheck, ScrollText, ListChecks, Plus, Trash2, Check, X, ArrowRight, AlertTriangle, Layers, Inbox,
} from 'lucide-react';
import { PageHead, Tabs, Button, Segmented } from '../components/ui.jsx';
import { BY_KEY } from '../catalogue/model.js';
import {
  REGISTER, HOW, ROLE_COLS, datasetOf, ASSIGN_LOG, DEFAULT_BY, COLUMN_LEVEL, PEOPLE, RESPONSIBILITIES, MODEL_ROLES, MODEL_CHANGES,
  COLUMN_COVERAGE, DATASET_COVERAGE, CHANGE_REQUESTS, QUALITY_ISSUES, AUDIT_TRAIL, AUDIT_FILTERS, QUEUE, LABEL_REASON,
} from './stewardship-data.js';
import { BASE } from './data.js';
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
const ME = 'Admin';
const now = () => {
  const d = new Date();
  const m = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'][d.getMonth()];
  return `${d.getDate()} ${m} ${d.getFullYear()}, ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};
const TYPE_OF = { table: 'tables', 'file, API or topic': 'files, APIs & topics', report: 'reports' };

export default function Stewardship({ switcher }) {
  const [tab, setTab] = useState('register');
  const [register, setRegister] = useState(REGISTER);
  const [roles, setRoles] = useState(MODEL_ROLES);
  const [changes, setChanges] = useState(MODEL_CHANGES);
  const [issues, setIssues] = useState(QUALITY_ISSUES);
  const [audit, setAudit] = useState(AUDIT_TRAIL);
  const [queue, setQueue] = useState(QUEUE);
  const [extra, setExtra] = useState(ASSIGN_LOG);
  const log = (action, on, what, cat) => setAudit((a) => [{ at: now(), who: ME, action, on, what, cat }, ...a]);

  /* assign a person to a role at asset, dataset or system scope */
  const assign = ({ asset, scope, role, person, reason }) => {
    const row = register.find((r) => r.asset === asset);
    const hit = (r) => (scope === 'asset' ? r.asset === asset : scope === 'dataset' ? datasetOf(r.asset) === datasetOf(asset) : r.system === row.system);
    const how = scope === 'asset' ? 'a' : 'i';
    if (ROLE_COLS.some(([k]) => k === role)) {
      setRegister((all) => all.map((r) => (hit(r) && (scope === 'asset' || !r.roles[role] || r.roles[role].how !== 'a') ? { ...r, roles: { ...r.roles, [role]: { who: person, how } } } : r)));
    } else {
      setExtra((x) => ({ ...x, [asset]: [[roles.find((r) => r.key === role)?.name || role, person, `assigned by ${ME} ${now()}`], ...(x[asset] || [])] }));
    }
    const label = roles.find((r) => r.key === role)?.name || role;
    const where = scope === 'asset' ? asset : scope === 'dataset' ? `dataset ${datasetOf(asset)}` : `system ${row.system}`;
    log('ownership.assign', where, `${label} → ${person}${reason ? ` — ${reason}` : ''}`, 'ownership.assign');
    toast(`${label} on ${where} → ${person}`);
  };

  const openIssues = issues.filter((i) => i.status === 'open').length;
  const stewardCov = Math.round((register.filter((r) => r.roles.steward).length / register.length) * 1000) / 10;
  return (
    <div className="page gv">
      <PageHead eyebrow="Govern" title="Stewardship"
        sub="Who is accountable for every system, dataset, table, column and report: owners, stewards, custodians and bespoke roles, their responsibilities, coverage gaps, approvals and a full audit trail." />
      {switcher}
      <Tabs items={TABS} value={tab} onChange={setTab} />
      {tab !== 'queue' && (
        <Tiles items={[
          { l: 'Assets in the register', v: register.length, s: `governance model ${changes[0][0]}` },
          { l: 'Steward coverage', v: `${stewardCov}%`, s: `${register.filter((r) => r.roles.steward).length} of ${register.length} assets` },
          { l: 'Open quality issues', v: openIssues, s: 'routed to the asset’s steward' },
          { l: 'Tasks in the queue', v: queue.filter((q) => q.status === 'In review' || q.status === 'Open').length, s: 'classification reviews and ownership gaps' },
        ]} />
      )}
      {tab === 'register' && <Register register={register} roles={roles} extra={extra} changes={changes} onAssign={assign}
        onRaise={(asset, text, steward) => { setIssues((x) => [{ id: `q${Date.now()}`, title: text, asset, by: ME, at: now(), routed: steward || '', status: 'open' }, ...x]); log('quality.raise', asset, `raised quality issue “${text}” → ${steward || 'no steward'}`, 'ownership.quality'); toast('Quality issue raised for the steward'); }}
        onDescribe={(asset) => { log('metadata.describe', asset, 'description saved', 'ownership.assign'); toast('Description saved'); }} />}
      {tab === 'roles' && <Roles roles={roles} setRoles={setRoles} changes={changes}
        onChange={(what) => { setChanges((c) => [[`v${Number(c[0][0].slice(1)) + 1}`, now(), ME, what], ...c]); log('ownership.model', `governance model v${Number(changes[0][0].slice(1)) + 1}`, what, 'ownership.model'); }} />}
      {tab === 'gaps' && <Gaps register={register} extra={extra} onBulk={(assets, role, person) => {
        setRegister((all) => all.map((r) => (assets.includes(r.asset) ? { ...r, roles: { ...r.roles, [role]: { who: person, how: 'a' } } } : r)));
        log('ownership.assign', `${assets.length} asset(s)`, `${ROLE_COLS.find(([k]) => k === role)[1]} → ${person} (bulk)`, 'ownership.assign');
        toast(`${person} assigned as ${role} on ${assets.length} asset(s)`);
      }} />}
      {tab === 'approvals' && <Approvals issues={issues} onResolve={(id, note) => {
        const it = issues.find((i) => i.id === id);
        setIssues((x) => x.map((i) => (i.id === id ? { ...i, status: `resolved by ${ME}: ${note}` } : i)));
        log('quality.resolve', it.asset, `resolved quality issue — ${note}`, 'ownership.quality'); toast('Issue resolved');
      }} />}
      {tab === 'audit' && <AuditTrail audit={audit} />}
      {tab === 'queue' && <ReviewQueue queue={queue} register={register} onDecide={(id, ok) => {
        const q = queue.find((x) => x.id === id);
        setQueue((all) => all.map((x) => (x.id === id ? { ...x, status: ok ? 'Approved' : 'Rejected' } : x)));
        log(q.type === 'Ownership' ? 'ownership.review' : 'classification.review', q.asset, `${ok ? 'approved' : 'rejected'}: ${q.task}`, q.type === 'Ownership' ? 'ownership.assign' : 'ownership.quality');
        toast(`${ok ? 'Approved' : 'Rejected'} — recorded in the audit chain`);
      }} />}
    </div>
  );
}

/* ---------------------------------------------------------------- Ownership register */
function RoleCell({ c }) {
  if (!c) return <span className="gv-badge bad"><i />gap</span>;
  return <span className="gv-who"><b>{c.who}</b><em className={`gv-how h-${c.how}`}>{HOW[c.how]}</em></span>;
}
function Register({ register, roles, extra, changes, onAssign, onRaise, onDescribe }) {
  const [q, setQ] = useState('');
  const [sel, setSel] = useState(null);
  const shown = useMemo(() => {
    const w = q.trim().toLowerCase();
    return w ? register.filter((r) => `${r.asset} ${r.system} ${Object.values(r.roles).map((c) => c?.who || '').join(' ')}`.toLowerCase().includes(w)) : register;
  }, [q, register]);
  const row = register.find((r) => r.asset === sel);
  const exportCsv = () => downloadCsv('ownership-register.csv',
    [['Asset', 'System', 'Sensitivity', 'Type', ...ROLE_COLS.flatMap(([, l]) => [l, `${l} source`])],
      ...register.map((r) => [r.asset, r.system, r.sens, r.kind, ...ROLE_COLS.flatMap(([k]) => [r.roles[k]?.who || 'gap', r.roles[k] ? HOW[r.roles[k].how] : ''])])]);
  return (
    <div className="gv-stw">
      <Card icon={UserCheck} tone="info" title="Ownership register" count={register.length}
        sub={<>{shown.length === register.length ? `${register.length} assets` : `${shown.length} of ${register.length} assets`} · governance model {changes[0][0]} · {Object.entries(HOW).map(([k, l]) => <em key={k} className={`gv-how h-${k}`}>{l}</em>)}</>}
        actions={<Button variant="secondary" size="sm" icon={Download} onClick={exportCsv}>Export CSV</Button>}>
        <label className="search gv-search"><Search size={15} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find an asset or a person" aria-label="Find an asset or a person" /></label>
        <div className="table-wrap gv-scroll">
          <table className="tbl gv-reg">
            <thead><tr><th>Asset</th><th>Type</th>{ROLE_COLS.map(([k, l]) => <th key={k}>{l}</th>)}</tr></thead>
            <tbody>{shown.map((r) => (
              <tr key={r.asset} className={`click ${sel === r.asset ? 'on' : ''}`} onClick={() => setSel(r.asset)}>
                <td><span className="gv-strong mono gv-wrap">{r.asset}</span><span className="gv-sub">{r.system} · <span className={`sens sens-${r.sens.toLowerCase()}`}>{r.sens}</span></span></td>
                <td className="gv-muted">{r.kind}</td>
                {ROLE_COLS.map(([k]) => <td key={k}><RoleCell c={r.roles[k]} /></td>)}
              </tr>
            ))}</tbody>
          </table>
          {!shown.length && <Empty>No asset or person matches “{q}”.</Empty>}
        </div>
      </Card>
      <aside className="gv-stw-side">
        {row ? <AssetPanel key={row.asset} r={row} roles={roles} extra={extra[row.asset] || []} onAssign={onAssign} onRaise={onRaise} onDescribe={onDescribe} />
          : <div className="dash-card gv-stw-empty"><Inbox size={20} /><p>Select an asset to see and change who is accountable.</p></div>}
      </aside>
    </div>
  );
}

function AssetPanel({ r, roles, extra, onAssign, onRaise, onDescribe }) {
  const ds = datasetOf(r.asset);
  const [f, setF] = useState({ scope: 'asset', role: 'owner', person: '', reason: '', column: '' });
  const [desc, setDesc] = useState(BY_KEY[r.asset]?.desc || '');
  const [issue, setIssue] = useState('');
  const cols = BY_KEY[r.asset]?.columns || [];
  /* an explicit assignment record (who, when) replaces the register line for the same role */
  const covered = new Set(extra.map(([role]) => role));
  const lines = [
    ...extra.map(([role, who, how]) => [role, who, how]),
    ...ROLE_COLS.filter(([k, l]) => r.roles[k] && !covered.has(l)).map(([k, l]) => [l, r.roles[k].who, `${HOW[r.roles[k].how]}${r.roles[k].how === 'd' || r.roles[k].how === 'm' ? '' : ` ${DEFAULT_BY}`}`]),
  ];
  const gaps = ROLE_COLS.filter(([k]) => !r.roles[k]);
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
          {gaps.map(([k, l]) => <li key={k} className="gap"><span>{l}</span><b>gap</b><small>nobody holds this role</small></li>)}
        </ul>
        {COLUMN_LEVEL[r.asset] && <Note>{COLUMN_LEVEL[r.asset]}</Note>}
      </div>
      <div className="gv-ap-sec">
        <h4>Assign</h4>
        <div className="gv-form one">
          <Fld label="Scope"><select className="select" value={f.scope} onChange={(e) => setF({ ...f, scope: e.target.value })}>
            <option value="asset">This asset</option><option value="column">A column</option><option value="dataset">Dataset {ds}</option><option value="system">System {r.system}</option></select></Fld>
          {f.scope === 'column' && <Fld label="Column"><select className="select" value={f.column} onChange={(e) => setF({ ...f, column: e.target.value })}><option value="">Choose…</option>{cols.map((c) => <option key={c.name}>{c.name}</option>)}</select></Fld>}
          <Fld label="Role"><select className="select" value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })}>{roles.map((x) => <option key={x.key} value={x.key}>{x.name}</option>)}</select></Fld>
          <Fld label="Person"><input className="input" list="gv-people" value={f.person} onChange={(e) => setF({ ...f, person: e.target.value })} placeholder="Name or group" /></Fld>
          <datalist id="gv-people">{PEOPLE.map((p) => <option key={p} value={p} />)}</datalist>
          <Fld label="Reason"><input className="input" value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })} placeholder="Why (recorded in the audit trail)" /></Fld>
        </div>
        <Button variant="primary" size="md" disabled={!f.person.trim() || (f.scope === 'column' && !f.column)}
          onClick={() => { onAssign({ asset: r.asset, scope: f.scope === 'column' ? 'asset' : f.scope, role: f.role, person: f.person.trim(), reason: f.scope === 'column' ? `column ${f.column}${f.reason ? `; ${f.reason}` : ''}` : f.reason }); setF({ ...f, person: '', reason: '' }); }}>Assign</Button>
        <Note>Owner changes by anyone other than a governance lead go for approval by someone else.</Note>
      </div>
      <div className="gv-ap-sec">
        <h4>Steward actions <span className="gv-faint">— allowed only for people whose role carries the responsibility</span></h4>
        <Fld label="Description"><textarea className="input gv-ta" rows={3} value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="What this asset holds and what it is for" /></Fld>
        <Button variant="secondary" size="sm" disabled={!desc.trim()} onClick={() => onDescribe(r.asset)}>Save description</Button>
        <div style={{ height: 10 }} />
        <Fld label="Quality issue"><input className="input" value={issue} onChange={(e) => setIssue(e.target.value)} placeholder="e.g. Nulls found in ACCOUNT_BALANCE" /></Fld>
        <Button variant="secondary" size="sm" icon={AlertTriangle} disabled={!issue.trim()} onClick={() => { onRaise(r.asset, issue.trim(), r.roles.steward?.who); setIssue(''); }}>Raise for the steward</Button>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- Roles & responsibilities */
function Roles({ roles, setRoles, changes, onChange }) {
  const [nf, setNf] = useState({ name: '', desc: '' });
  const toggle = (key, i) => {
    setRoles((all) => all.map((r) => (r.key === key ? { ...r, resp: r.resp.split('').map((c, j) => (j === i ? (c === '1' ? '0' : '1') : c)).join('') } : r)));
    const r = roles.find((x) => x.key === key);
    onChange(`changed role ${r.name}; ${r.resp[i] === '1' ? 'removed' : 'added'} “${RESPONSIBILITIES[i]}”`);
  };
  return (
    <>
      <Card icon={Users} tone="violet" title="Roles and their responsibilities" sub={`Governance model ${changes[0][0]} · tick a box to give a role that responsibility.`}>
        <div className="table-wrap">
          <table className="tbl gv-rolemx">
            <thead><tr><th>Role</th>{RESPONSIBILITIES.map((r) => <th key={r} className="gv-rot"><span>{r}</span></th>)}<th /></tr></thead>
            <tbody>{roles.map((r) => (
              <tr key={r.key}>
                <td><div className="gv-inline" style={{ gap: 6, alignItems: 'center' }}><b className="gv-strong">{r.name}</b>{r.builtIn ? <><span className="gv-tag">built-in</span><span className="gv-tag info">required</span></> : <span className="gv-tag violet">bespoke</span>}</div><span className="gv-sub">{r.desc}</span></td>
                {RESPONSIBILITIES.map((x, i) => <td key={x} className="gv-cb"><input type="checkbox" checked={r.resp[i] === '1'} onChange={() => toggle(r.key, i)} aria-label={`${r.name}: ${x}`} /></td>)}
                <td>{!r.builtIn && <Button variant="link" icon={Trash2} onClick={() => { setRoles((all) => all.filter((x) => x.key !== r.key)); onChange(`removed role ${r.name}`); toast(`Removed ${r.name}`); }}>Remove</Button>}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
        <div className="gv-subhead">New bespoke role</div>
        <div className="gv-inline" style={{ alignItems: 'flex-end' }}>
          <Fld label="Name"><input className="input" value={nf.name} onChange={(e) => setNf({ ...nf, name: e.target.value })} placeholder="e.g. Records manager" /></Fld>
          <Fld label="Description"><input className="input" style={{ minWidth: 320 }} value={nf.desc} onChange={(e) => setNf({ ...nf, desc: e.target.value })} placeholder="What this role is for" /></Fld>
          <Button variant="primary" size="md" icon={Plus} disabled={!nf.name.trim()} onClick={() => {
            setRoles((all) => [...all, { key: nf.name.toLowerCase().replace(/\W+/g, '-'), name: nf.name.trim(), builtIn: false, desc: nf.desc.trim(), resp: '00000000' }]);
            onChange(`created bespoke role ${nf.name.trim()} with no responsibilities`); toast(`Added ${nf.name.trim()}`); setNf({ name: '', desc: '' });
          }}>Add role</Button>
        </div>
        <Note>Only a governance lead can change the model.</Note>
      </Card>
      <Card icon={ScrollText} tone="teal" title="Governance-model changes" count={changes.length}>
        <ol className="gv-tl">{changes.map(([v, at, who, what]) => <li key={v + at}><time>{v} · {at}</time><div><b>{who}</b> {what}</div></li>)}</ol>
      </Card>
    </>
  );
}

/* ---------------------------------------------------------------- Coverage gaps */
function Gaps({ register, extra, onBulk }) {
  const [type, setType] = useState('all');
  const [missing, setMissing] = useState('any');
  const [picked, setPicked] = useState([]);
  const [person, setPerson] = useState('');
  const byType = (t) => register.filter((r) => r.kind === t);
  const cov = (rows, k) => rows.filter((r) => r.roles[k]).length;
  const typeRows = [
    ...[['table', 'tables'], ['file, API or topic', 'files, APIs & topics'], ['report', 'reports']].map(([k, l]) => {
      const rows = byType(k); return [l, rows.length, cov(rows, 'owner'), cov(rows, 'steward'), cov(rows, 'custodian')];
    }),
  ];
  typeRows.splice(1, 0, ['columns', COLUMN_COVERAGE.count, COLUMN_COVERAGE.owner, COLUMN_COVERAGE.steward, COLUMN_COVERAGE.custodian]);
  typeRows.push(['datasets', DATASET_COVERAGE.count, DATASET_COVERAGE.owner, DATASET_COVERAGE.steward, DATASET_COVERAGE.custodian]);
  /* who holds what */
  const people = {};
  register.forEach((r) => ROLE_COLS.forEach(([k]) => { const c = r.roles[k]; if (c) { people[c.who] = people[c.who] || {}; const lab = k === 'privacy' ? 'privacy-lead' : k; people[c.who][lab] = (people[c.who][lab] || 0) + 1; } }));
  Object.values(extra).flat().filter(([role]) => !['Data custodian', 'Data owner', 'Data steward'].includes(role)).forEach(([role, who]) => { people[who] = people[who] || {}; people[who][role] = (people[who][role] || 0) + 1; });
  const ranked = Object.entries(people).sort((a, b) => Object.values(b[1]).reduce((x, y) => x + y, 0) - Object.values(a[1]).reduce((x, y) => x + y, 0));
  /* the gap list: assets, then their catalogued columns, then datasets */
  const gaps = useMemo(() => {
    const out = [];
    register.forEach((r) => {
      const miss = ['owner', 'steward', 'custodian'].filter((k) => !r.roles[k]);
      if (!miss.length) return;
      out.push({ id: r.asset, asset: r.asset, type: TYPE_OF[r.kind], miss, system: r.system });
      (BY_KEY[r.asset]?.columns || []).forEach((c) => out.push({ id: `${r.asset}.${c.name}`, asset: r.asset, type: 'columns', miss, system: r.system, column: true }));
    });
    const dss = [...new Set(register.map((r) => datasetOf(r.asset)))];
    dss.forEach((d) => {
      const rows = register.filter((r) => datasetOf(r.asset) === d);
      const miss = ['steward', 'custodian'].filter((k) => !rows.some((r) => r.roles[k]?.how === 'i'));
      if (miss.length) out.push({ id: `dataset ${d}`, asset: null, type: 'datasets', miss, system: rows[0].system });
    });
    return out;
  }, [register]);
  const shown = gaps.filter((g) => (type === 'all' || g.type === type) && (missing === 'any' || g.miss.includes(missing)));
  const canBulk = type !== 'all' && missing !== 'any' && !['columns', 'datasets'].includes(type);
  const TYPES = ['all', 'tables', 'columns', 'files, APIs & topics', 'reports', 'datasets'];
  return (
    <>
      <Card icon={ShieldCheck} tone="info" title="Coverage by type" sub="How much of the estate has each built-in role filled.">
        <div className="table-wrap">
          <table className="tbl">
            <thead><tr><th>Type</th><th className="num">Count</th><th>Owner</th><th>Steward</th><th>Custodian</th></tr></thead>
            <tbody>{typeRows.map(([l, n, o, s, c]) => (
              <tr key={l}><td className="gv-strong">{l}</td><td className="num">{n.toLocaleString('en-GB')}</td>
                {[o, s, c].map((v, i) => { const p = n ? (v / n) * 100 : 0; return <td key={i}><div className="gv-covcell"><Meter pct={p / 100} tone={meterTone(p / 100)} /><span>{`${Math.round(p * 10) / 10}%`} <small>({v.toLocaleString('en-GB')})</small></span></div></td>; })}
              </tr>
            ))}</tbody>
          </table>
        </div>
        <Note>People holding roles: {ranked.map(([who, rs], i) => <span key={who}>{i ? '; ' : ''}<b>{who}</b> ({Object.entries(rs).map(([k, n]) => `${k} ×${n}`).join(', ')})</span>)}</Note>
      </Card>
      <Card icon={AlertTriangle} tone="bad" title="Gaps" count={gaps.length} sub="Pick a type and a missing role to bulk-assign.">
        <div className="gv-chiprow">
          {TYPES.map((t) => <button key={t} type="button" className={`chip ${type === t ? 'on' : ''}`} onClick={() => { setType(t); setPicked([]); }}>{t === 'all' ? 'All types' : t} <b>{t === 'all' ? gaps.length : gaps.filter((g) => g.type === t).length}</b></button>)}
        </div>
        <div className="gv-chiprow">
          {['any', 'owner', 'steward', 'custodian'].map((m) => <button key={m} type="button" className={`chip ${missing === m ? 'on' : ''}`} onClick={() => { setMissing(m); setPicked([]); }}>{m === 'any' ? 'Any missing role' : m}</button>)}
        </div>
        {canBulk && (
          <div className="gv-bulk">
            <span><b>{picked.length}</b> selected</span>
            <input className="input" list="gv-people" value={person} onChange={(e) => setPerson(e.target.value)} placeholder={`Person to make ${missing}`} />
            <datalist id="gv-people">{PEOPLE.map((p) => <option key={p} value={p} />)}</datalist>
            <Button variant="primary" size="sm" disabled={!picked.length || !person.trim()} onClick={() => { onBulk(picked, missing, person.trim()); setPicked([]); setPerson(''); }}>Assign {missing} to selected</Button>
          </div>
        )}
        <div className="table-wrap gv-scroll">
          <table className="tbl">
            <thead><tr><th className="gv-cb">{canBulk && <input type="checkbox" checked={picked.length > 0 && picked.length === shown.length} onChange={(e) => setPicked(e.target.checked ? shown.map((g) => g.asset) : [])} aria-label="Select all" />}</th><th>Gap</th><th>Type</th><th>Missing</th><th>System</th></tr></thead>
            <tbody>{shown.slice(0, 400).map((g) => (
              <tr key={g.id}>
                <td className="gv-cb">{canBulk && <input type="checkbox" checked={picked.includes(g.asset)} onChange={(e) => setPicked((p) => (e.target.checked ? [...p, g.asset] : p.filter((x) => x !== g.asset)))} />}</td>
                <td className="mono gv-wrap">{g.id}</td><td className="gv-muted">{g.type}</td>
                <td><div className="gv-inline" style={{ gap: 4 }}>{g.miss.map((m) => <span key={m} className="gv-badge bad"><i />{m}</span>)}</div></td>
                <td className="gv-muted">{g.system}</td>
              </tr>
            ))}</tbody>
          </table>
          {shown.length > 400 && <p className="gv-faint" style={{ padding: '8px 12px', margin: 0 }}>Showing the first 400 of {shown.length.toLocaleString('en-GB')} gaps — narrow by type to see the rest.</p>}
          {!shown.length && <Empty>No gaps for this filter.</Empty>}
        </div>
      </Card>
    </>
  );
}

/* ---------------------------------------------------------------- Approvals & quality issues */
function Approvals({ issues, onResolve }) {
  const [f, setF] = useState('all');
  const [open, setOpen] = useState(null);
  const [note, setNote] = useState('');
  const list = issues.filter((i) => f === 'all' || (f === 'open' ? i.status === 'open' : i.status !== 'open'));
  return (
    <>
      <Card icon={ClipboardCheck} tone="violet" title="Ownership change requests" count={CHANGE_REQUESTS.length}>
        <div className="table-wrap">
          <table className="tbl">
            <thead><tr><th>Change</th><th>Requested by</th><th>Reason</th><th>Status</th></tr></thead>
            <tbody>{CHANGE_REQUESTS.map((c) => (
              <tr key={c.change}><td>{c.change}</td><td><b>{c.by}</b><span className="gv-sub">{c.at}</span></td><td>{c.reason}</td><td><StatusBadge s="ok">{c.status}</StatusBadge></td></tr>
            ))}</tbody>
          </table>
        </div>
      </Card>
      <Card icon={AlertTriangle} tone="warn" title="Data-quality issues" count={issues.length} sub="Resolved by the asset’s steward."
        actions={<Segmented size="sm" value={f} onChange={setF} options={[{ value: 'all', label: `All (${issues.length})` }, { value: 'open', label: `Open (${issues.filter((i) => i.status === 'open').length})` }, { value: 'resolved', label: `Resolved (${issues.filter((i) => i.status !== 'open').length})` }]} />}>
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
                    <Button variant="primary" size="sm" disabled={!note.trim()} onClick={() => { onResolve(i.id, note.trim()); setOpen(null); setNote(''); }}>Resolve</Button>
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
function AuditTrail({ audit }) {
  const [f, setF] = useState('');
  const [n, setN] = useState(200);
  const list = audit.filter((a) => !f || a.cat === f || (f === 'access' && a.cat === 'access'));
  return (
    <Card icon={ScrollText} tone="teal" title="Ownership and responsibility audit trail" sub={`${list.length.toLocaleString('en-GB')} entries · also in the hash-chained audit on Governance`}
      actions={<select className="select" style={{ height: 32 }} value={f} onChange={(e) => { setF(e.target.value); setN(200); }}>{AUDIT_FILTERS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>}>
      <div className="table-wrap gv-scroll">
        <table className="tbl">
          <thead><tr><th>When</th><th>Who</th><th>Action</th><th>On</th><th>What</th></tr></thead>
          <tbody>{list.slice(0, n).map((a, i) => (
            <tr key={i}><td className="gv-muted" style={{ whiteSpace: 'nowrap' }}>{a.at}</td><td>{a.who}</td><td><code className="gv-code">{a.action}</code></td><td className="mono gv-wrap">{a.on}</td><td>{a.what}</td></tr>
          ))}</tbody>
        </table>
        {!list.length && <Empty>No entries for this filter.</Empty>}
      </div>
      {list.length > n && <Button variant="secondary" size="sm" onClick={() => setN((x) => x + 300)}>Show more ({(list.length - n).toLocaleString('en-GB')} left)</Button>}
    </Card>
  );
}

/* ---------------------------------------------------------------- Review queue */
function ReviewQueue({ queue, register, onDecide }) {
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
