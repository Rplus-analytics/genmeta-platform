import { useMemo, useState } from 'react';
import {
  Download, ShieldCheck, Search, Plus, BarChart3, ScanSearch, Link2, FileDown, Users, Server, Eye, ShieldAlert, Radar, Scale, ScrollText, Globe2, MapPin,
  ArrowLeftRight, EyeOff, FileSignature, CheckCircle2, AlertTriangle, AlertOctagon,
} from 'lucide-react';
import { Tabs, Button, Segmented } from '../components/ui.jsx';
import {
  AUDIT, AUDIT_CATEGORIES, fmtTs, FRAMEWORKS, INTEGRITY_POINTS, ASSET_NAMES,
  RESIDENCY_TILES, RESIDENCY_PROFILES, LOCATIONS, MOVEMENT, OBLIGATIONS, CANNOT_CONTROL,
} from './data.js';
import { Card, Tiles, StatusBadge, Empty, Note, Mono, Fld, downloadCsv, downloadText, toast, Meter, SubNav } from './kit.jsx';

const count = (rows, k) => rows.reduce((m, r) => ({ ...m, [r[k]]: (m[r[k]] || 0) + 1 }), {});
const top = (m, n = 5) => Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, n);
const PEOPLE = ['scheduler', 'residency-monitor'];
const SERVICES = ['ownership', 'metadata-harvester'];

/* ------------------------------------------------------------------ Audit & reporting */
export function AuditTab() {
  const [sub, setSub] = useState('search');
  return (
    <>
      <Tiles items={[
        { l: 'Audit records', v: AUDIT.length, s: `${AUDIT.length} carry the user identity` },
        { l: 'Chain integrity', v: 'Verified', s: '0 broken link(s)' },
        { l: 'Data access (14 days)', v: 0, s: '2 people active' },
        { l: 'Violations and refusals', v: 0, s: '0 anomalies flagged' },
      ]} />
      <SubNav value={sub} onChange={setSub} items={[
        { value: 'search', label: 'Search the trail', icon: Search, count: AUDIT.length }, { value: 'dash', label: 'Dashboards', icon: BarChart3 },
        { value: 'investigate', label: 'Investigate', icon: ScanSearch }, { value: 'integrity', label: 'Integrity', icon: Link2, count: FRAMEWORKS.length },
        { value: 'reports', label: 'Reports & export', icon: FileDown },
      ]} />
      {sub === 'search' && <SearchTrail />}
      {sub === 'dash' && <AuditDashboards />}
      {sub === 'investigate' && <Investigate />}
      {sub === 'integrity' && <Integrity />}
      {sub === 'reports' && <Reports />}
    </>
  );
}

const csvRows = (rows) => [['#', 'When', 'Who', 'Role', 'Action', 'Category', 'Asset', 'What happened'], ...rows.map((r) => [r.seq, fmtTs(r.ts), r.who, r.role, r.action, r.category, r.asset, r.what])];

function SearchTrail() {
  const [f, setF] = useState({ person: '', cat: 'Everything', action: '', asset: '', text: '', from: '', to: '', viol: false });
  const [limit, setLimit] = useState(50);
  const set = (k) => (e) => setF((o) => ({ ...o, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));
  const rows = useMemo(() => AUDIT.filter((r) =>
    (!f.person || r.who.toLowerCase().includes(f.person.toLowerCase()))
    && (f.cat === 'Everything' || r.category === f.cat)
    && (!f.action || r.action.startsWith(f.action))
    && (!f.asset || r.asset.toLowerCase().includes(f.asset.toLowerCase()))
    && (!f.text || r.what.toLowerCase().includes(f.text.toLowerCase()))
    && !f.viol), [f]);
  const byCat = top(count(rows, 'category'), 9);
  const who = count(rows, 'who');
  const assets = top(count(rows.filter((r) => !['estate', 'personal data'].includes(r.asset)), 'asset'), 5);
  return (
    <Card icon={Search} tone="info" title="Search the trail" sub="Every record carries the person, their role, the action, the moment and the asset it affected.">
      <div className="gv-toolbar">
        <Fld label="Person"><input className="input" value={f.person} onChange={set('person')} /></Fld>
        <Fld label="What was recorded"><select className="select" value={f.cat} onChange={set('cat')}>{['Everything', ...AUDIT_CATEGORIES.filter((c) => c !== 'Other')].map((c) => <option key={c}>{c}</option>)}</select></Fld>
        <Fld label="Action starts with"><input className="input" value={f.action} onChange={set('action')} placeholder="e.g. gdpr." /></Fld>
        <Fld label="Asset"><input className="input" value={f.asset} onChange={set('asset')} /></Fld>
        <Fld label="Text"><input className="input" value={f.text} onChange={set('text')} /></Fld>
        <Fld label="From"><input className="input" value={f.from} onChange={set('from')} placeholder="dd/mm/yyyy" /></Fld>
        <Fld label="To"><input className="input" value={f.to} onChange={set('to')} placeholder="dd/mm/yyyy" /></Fld>
      </div>
      <div className="gv-inline" style={{ justifyContent: 'space-between', marginBottom: 12 }}>
        <label className="gv-check"><input type="checkbox" checked={f.viol} onChange={set('viol')} />Violations and refusals only</label>
        <Button variant="secondary" size="md" icon={Download} onClick={() => downloadCsv('audit-records.csv', csvRows(rows))}>Export these records</Button>
      </div>
      <p className="gv-muted" style={{ fontSize: 13, margin: '0 0 12px' }}>{rows.length} record(s) match. Every record carries the person, their role, the action, the moment and the asset it affected.</p>
      {rows.length > 0 && (
        <>
          <div className="gv-bars" style={{ marginBottom: 12 }}>
            {byCat.map(([c, n]) => <div key={c}><span>{c}</span><Meter pct={n / rows.length} tone="info" /><b>{n}</b></div>)}
          </div>
          <Note>Most active people: {PEOPLE.filter((p) => who[p]).map((p) => `${p} (${who[p]})`).join(', ') || '—'} · by the platform itself: {SERVICES.filter((p) => who[p]).map((p) => `${p} (${who[p]})`).join(', ') || '—'} · most touched: {assets.map(([a, n]) => `${a} (${n})`).join(', ') || '—'}</Note>
        </>
      )}
      <div className="table-wrap" style={{ marginTop: 14 }}>
        <table className="tbl">
          <thead><tr><th className="num">#</th><th>When</th><th>Who</th><th>Action</th><th>Asset</th><th>What happened</th></tr></thead>
          <tbody>
            {rows.slice(0, limit).map((r) => (
              <tr key={r.seq}>
                <td className="num gv-faint">{r.seq}</td><td style={{ whiteSpace: 'nowrap' }}>{fmtTs(r.ts)}</td>
                <td>{r.who}{r.role && <span className="gv-sub">{r.role}</span>}</td>
                <td><Mono>{r.action}</Mono><span className="gv-sub">{r.category}</span></td>
                <td>{r.asset}</td><td className="gv-muted">{r.what}</td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={6}><Empty>No records match.</Empty></td></tr>}
          </tbody>
        </table>
      </div>
      {rows.length > limit && <div style={{ marginTop: 12 }}><Button variant="link" onClick={() => setLimit((l) => l + 50)}>Show {Math.min(50, rows.length - limit)} more</Button></div>}
    </Card>
  );
}

function AuditDashboards() {
  const [period, setPeriod] = useState('7');
  const who = count(AUDIT, 'who');
  return (
    <>
      <Card icon={BarChart3} tone="info" title="Activity" actions={<Segmented size="sm" value={period} onChange={setPeriod} options={[['7', 'last 7 days'], ['14', 'last 14 days'], ['30', 'last 30 days'], ['90', 'last 90 days']].map(([value, label]) => ({ value, label }))} />}>
        <p className="gv-muted" style={{ fontSize: 13, margin: '0 0 14px' }}>{AUDIT.length} action(s): 2 person(s) plus 111 by the platform's own services; 0 data access.</p>
        <div className="gv-section-label" style={{ marginTop: 0 }}>Usage</div>
        <div className="gv-bars"><div><span>3 Oct 2026</span><Meter pct={1} tone="info" /><b>{AUDIT.length}</b></div></div>
      </Card>
      <div className="gv-three">
        <Card icon={Users} tone="violet" title="Most active people"><ul className="gv-lines">{PEOPLE.map((p) => <li key={p}>{p} — {who[p]} action(s)</li>)}</ul></Card>
        <Card icon={Server} tone="teal" title="Platform services"><ul className="gv-lines">{SERVICES.map((p) => <li key={p}>{p} — {who[p]} action(s)</li>)}</ul></Card>
        <Card icon={Eye} tone="info" title="Most opened assets"><Empty>No asset opened in this period.</Empty></Card>
      </div>
      <Card icon={ShieldAlert} tone="bad" title="Policy violations and refusals" sub="0 in the period — refused actions, failed checks and breached guardrails.">
        <div className="table-wrap"><table className="tbl"><thead><tr><th>When</th><th>Who</th><th>Action</th><th>What</th></tr></thead><tbody><tr><td colSpan={4}><Empty>None.</Empty></td></tr></tbody></table></div>
      </Card>
      <Card icon={Radar} tone="warn" title="Anomalies" sub="Activity spikes against a person's own usual rate, access outside working hours, repeated refusals, and the data anomalies found by quality monitoring.">
        <div className="table-wrap"><table className="tbl"><thead><tr><th>Kind</th><th>Who</th><th>When</th><th>What was noticed</th></tr></thead><tbody><tr><td colSpan={4}><Empty>Nothing unusual.</Empty></td></tr></tbody></table></div>
      </Card>
    </>
  );
}

function Investigate() {
  const [f, setF] = useState({ asset: '', person: '', win: 'all' });
  const [res, setRes] = useState(null);
  const set = (k) => (e) => setF((o) => ({ ...o, [k]: e.target.value }));
  const run = () => setRes(AUDIT.filter((r) => (!f.asset || r.asset === f.asset) && (!f.person || r.who.includes(f.person))).slice().reverse());
  return (
    <Card icon={ScanSearch} tone="violet" title="Investigate an incident or a data issue" sub="Build a timeline of everything recorded for an asset or a person.">
      <div className="gv-inline">
        <Fld label="Asset"><select className="select" value={f.asset} onChange={set('asset')}><option value="">Any</option>{ASSET_NAMES.map((a) => <option key={a}>{a}</option>)}</select></Fld>
        <Fld label="Person"><input className="input" value={f.person} onChange={set('person')} /></Fld>
        <Fld label="Window"><select className="select" value={f.win} onChange={set('win')}>{[['all', 'All time'], ['24', 'last 24 hours'], ['72', 'last 72 hours'], ['168', 'last 168 hours'], ['720', 'last 720 hours']].map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Fld>
        <Button variant="primary" size="md" icon={Search} disabled={!f.asset && !f.person} onClick={run}>Explain what happened</Button>
      </div>
      {!res && <Note>Choose an asset or a person to build the timeline.</Note>}
      {res && (
        <div style={{ marginTop: 16 }}>
          <p className="gv-muted" style={{ fontSize: 13 }}>{res.length} event(s) for {f.asset || f.person}, oldest first. {res.length ? `First ${fmtTs(res[0].ts)}, last ${fmtTs(res[res.length - 1].ts)}.` : ''}</p>
          {res.length ? <div className="gv-feed">{res.map((r) => <div key={r.seq}><span className="seq">#{r.seq}</span><div><span className="act">{r.action}<span className="tag">{r.asset}</span></span><small>{r.who} · {r.what} · {fmtTs(r.ts)}</small></div></div>)}</div> : <Empty>Nothing recorded for this choice.</Empty>}
        </div>
      )}
    </Card>
  );
}

function Integrity() {
  const [tamper, setTamper] = useState(null);
  const [rows, setRows] = useState(FRAMEWORKS);
  const [add, setAdd] = useState({ fw: '', ctl: '', exp: '', prov: '' });
  const set = (k) => (e) => setAdd((o) => ({ ...o, [k]: e.target.value }));
  return (
    <>
      <Card icon={Link2} tone="ok" title="Integrity of the trail" sub={`verified ${AUDIT.length} record(s) checked with sha-256 hash-chain, 0 broken link(s).`}
        actions={<Button variant="secondary" size="md" icon={ShieldCheck} onClick={() => setTamper(Math.ceil(AUDIT.length / 2))}>Run a tamper check</Button>}>
        <p style={{ fontSize: 13, margin: '0 0 8px' }}>hash-chained records persisted to object storage; each record carries the hash of the one before it</p>
        <ul className="gv-lines">{INTEGRITY_POINTS.map((p) => <li key={p}>{p}</li>)}</ul>
        <Note>Alters a record in a copy of the chain and shows that verification catches it. The live trail is never touched.</Note>
        {tamper && <div className="gv-callout ok" style={{ marginTop: 12 }}><ShieldCheck size={15} /><span><b>Tamper detected in the copy.</b> Altering record {tamper} in a copy was detected: its hash no longer matches, and every later link breaks. The live trail is unchanged — {AUDIT.length} record(s), 0 broken link(s).</span></div>}
      </Card>
      <Card icon={Scale} tone="violet" title="Regulations and internal control frameworks" sub="Add or edit controls to match HMRC's internal framework; the evidence column is measured from the trail.">
        <div className="table-wrap">
          <table className="tbl">
            <thead><tr><th>Framework</th><th>Control</th><th>What it expects</th><th>What the audit provides</th><th>Measured now</th></tr></thead>
            <tbody>{rows.map((r, i) => <tr key={i}><td className="gv-strong">{r[0]}</td><td>{r[1]}</td><td>{r[2]}</td><td className="gv-muted">{r[3]}</td><td>{r[4]}</td></tr>)}</tbody>
          </table>
        </div>
        <div className="gv-section-label">Add a control</div>
        <div className="gv-inline">
          <Fld label="Framework"><input className="input" value={add.fw} onChange={set('fw')} placeholder="HMRC internal control framework" /></Fld>
          <Fld label="Control"><input className="input" value={add.ctl} onChange={set('ctl')} /></Fld>
          <Fld label="What it expects"><input className="input" value={add.exp} onChange={set('exp')} /></Fld>
          <Fld label="What the audit provides"><input className="input" value={add.prov} onChange={set('prov')} /></Fld>
          <Button variant="secondary" size="md" icon={Plus} disabled={!add.fw || !add.ctl} onClick={() => { setRows((r) => [...r, [add.fw, add.ctl, add.exp, add.prov, 'measured on the next audit run']]); setAdd({ fw: '', ctl: '', exp: '', prov: '' }); toast('Control added'); }}>Add control</Button>
        </div>
      </Card>
    </>
  );
}

function Reports() {
  const [period, setPeriod] = useState('7');
  const cats = top(count(AUDIT, 'category'), 9);
  const report = () => downloadText('genmeta-audit-report.html', `<h1>GenMeta audit report</h1><p>Generated 3 Oct 2026, 11:35 · last ${period} days</p><p>${AUDIT.length} records · chain verified · 0 broken links</p><table>${FRAMEWORKS.map((r) => `<tr><td>${r[0]}</td><td>${r[1]}</td><td>${r[4]}</td></tr>`).join('')}</table>`, 'text/html');
  return (
    <>
      <Card icon={FileDown} tone="info" title="Reports & export" actions={<>
        <select className="select" value={period} onChange={(e) => setPeriod(e.target.value)} aria-label="Period">{[['7', 'last 7 days'], ['30', 'last 30 days'], ['90', 'last 90 days'], ['365', 'last 365 days']].map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
        <Button variant="primary" size="md" icon={Download} onClick={report}>Download the audit report</Button>
        <Button variant="secondary" size="md" icon={Download} onClick={() => downloadCsv('audit-all-records.csv', csvRows(AUDIT))}>Download every record (CSV)</Button>
      </>}>
        <p className="gv-muted" style={{ fontSize: 13, margin: 0 }}>Generated 3 Oct 2026, 11:35 — suitable for internal or external review.</p>
      </Card>
      <div className="gv-two">
        <Card icon={ScrollText} tone="info" title="Records" sub={`${AUDIT.length} in the trail, ${AUDIT.length} in this period.`}>
          <ul className="gv-lines">{cats.map(([c, n]) => <li key={c}>{c} — {n}</li>)}</ul>
        </Card>
        <Card icon={Link2} tone="ok" title="Integrity" sub={`verified ${AUDIT.length} record(s), 0 broken link(s), ${AUDIT.length} with user identity.`}>
          <p style={{ fontSize: 13, margin: 0 }}>Tamper check: altering record 65 in a copy was detected.</p>
        </Card>
        <Card icon={ShieldAlert} tone="bad" title="Violations" sub="0 in the period."><Empty>None.</Empty></Card>
        <Card icon={Radar} tone="warn" title="Anomalies"><Empty>None.</Empty></Card>
      </div>
      <Card icon={Scale} tone="violet" title="Controls">
        <div className="table-wrap">
          <table className="tbl"><thead><tr><th>Framework</th><th>Control</th><th>Measured</th></tr></thead>
            <tbody>{FRAMEWORKS.map((r) => <tr key={r[1]}><td className="gv-strong">{r[0]}</td><td>{r[1]}</td><td>{r[4]}</td></tr>)}</tbody></table>
        </div>
      </Card>
    </>
  );
}

/* ------------------------------------------------------------------ Residency & sovereignty */
export function ResidencyTab() {
  const [profile, setProfile] = useState('uk');
  const [locs, setLocs] = useState(LOCATIONS);
  const [overrides, setOverrides] = useState([]);
  const [d, setD] = useState({ what: LOCATIONS[9][0], region: '', reason: '' });
  const p = RESIDENCY_PROFILES[profile];
  const outside = locs.filter((l) => l[6] === 'outside').length;
  const declare = () => {
    setLocs((all) => all.map((l) => (l[0] === d.what ? [l[0], l[1], l[2], d.region, p.allowed.includes(d.region) ? 'United Kingdom' : 'outside the policy', 'declared', p.allowed.includes(d.region) ? 'inside' : 'outside'] : l)));
    toast(`Declared ${d.what} in ${d.region} — written to the audit trail`); setD((x) => ({ ...x, region: '' }));
  };
  const override = () => { setOverrides((o) => [...o, { ...d, by: 'governance-lead' }]); toast('Override recorded with its reason'); setD((x) => ({ ...x, reason: '' })); };
  return (
    <>
      <Tiles items={RESIDENCY_TILES.map((t) => (t.l === 'Residency policy' ? { ...t, v: p.label, s: `${p.allowed.length} allowed region(s)` } : t.l === 'Outside the policy' ? { ...t, v: outside } : t.l === 'Overrides recorded' ? { ...t, v: overrides.length } : t))} />
      <Card icon={Globe2} tone="info" title="The policy in force" actions={<Segmented size="sm" value={profile} onChange={setProfile} options={[{ value: 'uk', label: 'United Kingdom only' }, { value: 'eu', label: 'UK and the EU data boundary' }]} />}>
        <p style={{ fontSize: 13.5, margin: '0 0 10px' }}>{p.d}</p>
        <div className="gv-tags">{p.allowed.map((r) => <span key={r} className="tag mono">{r}</span>)}</div>
      </Card>
      <div className="gv-three">
        {[
          ['In the United Kingdom', locs.filter((l) => l[6] === 'inside'), 'measured or configured in a UK region', 'ok', CheckCircle2],
          ['Outside, disclosed', locs.filter((l) => l[6] === 'disclosed'), 'no HMRC data held — processing or delivery only', 'warn', AlertTriangle],
          ['No region established', locs.filter((l) => l[6] === 'outside'), 'treated as outside the policy until measured or declared', 'bad', AlertOctagon],
        ].map(([t, list, sub, tn, I]) => (
          <div key={t} className={`dash-card gv-region ${tn}`}>
            <div className="gv-inline" style={{ alignItems: 'center' }}><span className={`gv-chip ${tn}`}><I size={16} /></span><span className="gv-strong" style={{ flex: 1 }}>{t}</span><b>{list.length}</b></div>
            <small>{sub}</small>
            <div className="gv-tags" style={{ marginTop: 10 }}>{list.map((l) => <span key={l[0]} className="tag" title={l[1]}>{l[0].replace(/ \(genmeta-demo.*\)/, '')}</span>)}</div>
          </div>
        ))}
      </div>
      <Card icon={MapPin} tone="violet" title="Where HMRC data and metadata are" sub="Every place data or metadata is stored, processed or backed up, and how its region was established.">
        <div className="table-wrap">
          <table className="tbl">
            <thead><tr><th>What</th><th>Provider</th><th>Region</th><th>How that was established</th><th>Against the policy</th></tr></thead>
            <tbody>{locs.map((l) => (
              <tr key={l[0]}>
                <td><span className="gv-strong">{l[0]}</span><span className="gv-sub">{l[1]}</span></td>
                <td>{l[2]}</td><td><Mono>{l[3]}</Mono><span className="gv-sub">{l[4]}</span></td>
                <td className="gv-muted">{l[5]}</td>
                <td><StatusBadge s={l[6]}>{l[6] === 'disclosed' ? 'disclosed · no data held' : l[6]}</StatusBadge></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </Card>
      <Card icon={ArrowLeftRight} tone="teal" title="What can move data between regions">
        <div className="table-wrap">
          <table className="tbl"><thead><tr><th>Control</th><th>State</th><th>How that was established</th><th /></tr></thead>
            <tbody>{MOVEMENT.map((m) => <tr key={m[0]}><td className="gv-strong">{m[0]}</td><td>{m[1]}</td><td className="gv-muted">{m[2]}</td><td><StatusBadge s={m[3]} /></td></tr>)}</tbody></table>
        </div>
      </Card>
      <Card icon={Scale} tone="warn" title="Obligations, and the evidence for each">
        <div className="table-wrap">
          <table className="tbl"><thead><tr><th>Obligation</th><th>What it requires</th><th>Evidence in this platform</th><th>State</th></tr></thead>
            <tbody>{OBLIGATIONS.map((o) => <tr key={o[0]}><td className="gv-strong">{o[0]}</td><td>{o[1]}</td><td className="gv-muted">{o[2]}</td><td><StatusBadge s={o[3]} />{o[4] && <span className="gv-sub">{o[4]}</span>}</td></tr>)}</tbody></table>
        </div>
      </Card>
      <Card icon={EyeOff} tone="bad" title="What we cannot control, or have not measured">
        <div className="table-wrap">
          <table className="tbl"><thead><tr><th>Item</th><th>Dependency</th><th>Consideration</th><th>The control you have</th></tr></thead>
            <tbody>{CANNOT_CONTROL.map((c) => <tr key={c[0]}><td className="gv-strong">{c[0]}</td><td>{c[1]}</td><td className="gv-muted">{c[2]}</td><td><Mono>{c[3]}</Mono></td></tr>)}</tbody></table>
        </div>
      </Card>
      <Card icon={FileSignature} tone="ok" title="Record a decision" sub="Every location is checked against the policy on each scheduled harvest, and a change is written to the audit trail. A source outside the policy is refused when it is added.">
        <div className="gv-inline">
          <Fld label="What"><select className="select" value={d.what} onChange={(e) => setD((x) => ({ ...x, what: e.target.value }))}>{locs.map((l) => <option key={l[0]}>{l[0]}</option>)}</select></Fld>
          <Fld label="Region"><input className="input mono" value={d.region} placeholder="eu-west-2" onChange={(e) => setD((x) => ({ ...x, region: e.target.value }))} /></Fld>
          <Fld label="Reason (for an override)"><input className="input" value={d.reason} onChange={(e) => setD((x) => ({ ...x, reason: e.target.value }))} /></Fld>
        </div>
        <div className="gv-actions" style={{ marginTop: 12 }}>
          <Button variant="primary" size="md" disabled={!d.region} onClick={declare}>Declare its region</Button>
          <Button variant="secondary" size="md" disabled={!d.reason} onClick={override}>Record an override</Button>
        </div>
        {overrides.length > 0 && <ul className="gv-lines" style={{ marginTop: 12 }}>{overrides.map((o, i) => <li key={i}><b>{o.what}</b> — override by {o.by}: {o.reason}</li>)}</ul>}
      </Card>
    </>
  );
}
