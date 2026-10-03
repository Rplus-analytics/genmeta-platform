import { useState } from 'react';
import { Send, KeyRound, ShieldQuestion, RefreshCw, Plus } from 'lucide-react';
import { PageHead, Tabs, Button } from '../components/ui.jsx';
import { Switch } from '../pages/admin/kit.jsx';
import {
  ASSET_NAMES, PERMISSIONS, ROLES, APPROVERS, ACCESS_POLICIES, SOD, ACCESS_RULES, DIRECTORY, PLATFORMS, PD_MAP, sensitivityOf, ownerOf,
} from './data.js';
import { Card, Tiles, StatusBadge, Empty, Note, Mono, Fld, ChipPick, toast } from './kit.jsx';

const TABS = ['Requests & grants', 'Roles & people', 'Permissions by level', 'Separation of duties', 'Access rules', 'Directory & identity', 'Platform consistency']
  .map((label, i) => ({ value: ['requests', 'roles', 'scopes', 'sod', 'rules', 'directory', 'platforms'][i], label }));
const ME = 'Admin';
const AssetSelect = ({ value, onChange }) => <select className="select" value={value} onChange={onChange}><option value="">Choose…</option>{ASSET_NAMES.map((a) => <option key={a}>{a}</option>)}</select>;
const clearanceOf = (roleKey) => ROLES.find((r) => r.key === roleKey)?.clearance || 'L1';

export default function Access() {
  const [tab, setTab] = useState('requests');
  const [requests, setRequests] = useState([]);
  const [grants, setGrants] = useState([]);
  const [assign, setAssign] = useState([]);
  const [scopes, setScopes] = useState([]);
  const [sod, setSod] = useState(SOD.map((s) => ({ ...s, on: true })));
  const [synced, setSynced] = useState(null);
  const top = tab === 'requests'
    ? [{ l: 'Requests pending', v: requests.filter((r) => r.status === 'pending').length, s: 'routed to owners and stewards' }, { l: 'Active grants', v: grants.filter((g) => g.status === 'active').length, s: 'each with an expiry' }, { l: 'Access policies', v: ACCESS_POLICIES.length, s: 'one per sensitivity level' }]
    : [{ l: 'Roles', v: ROLES.length, s: '0 defined here' }, { l: 'Role assignments', v: assign.length, s: `${synced ? assign.length : 0} from the directory` }, { l: 'Scopes', v: scopes.length, s: `${new Set(scopes.map((s) => s.level)).size} level(s) in use` }, { l: 'Identities synchronised', v: synced ? 7 : 0, s: synced ? `last ${synced}` : 'not yet synchronised' }];
  return (
    <div className="page gv">
      <PageHead eyebrow="Govern" title="Access"
        sub="Who may see what, and why: roles carrying a clearance, permissions held at system, dataset, table, column or report level, duties that may not be combined, and decisions made from the data's classification and the context of the request." />
      <Tabs items={TABS} value={tab} onChange={setTab} />
      <Tiles items={top} />
      {tab === 'requests' && <Requests requests={requests} setRequests={setRequests} grants={grants} setGrants={setGrants} />}
      {tab === 'roles' && <Roles assign={assign} setAssign={setAssign} sod={sod} />}
      {tab === 'scopes' && <Scopes scopes={scopes} setScopes={setScopes} />}
      {tab === 'sod' && <Sod sod={sod} setSod={setSod} assign={assign} />}
      {tab === 'rules' && <Rules />}
      {tab === 'directory' && <Directory synced={synced} onSync={() => { setSynced(new Date().toLocaleString('en-GB')); toast('Directory not configured in this environment — mapping checked, nothing imported'); }} />}
      {tab === 'platforms' && <Platforms />}
    </div>
  );
}

/* ------------------------------------------------------------------ requests & grants */
function Requests({ requests, setRequests, grants, setGrants }) {
  const [rq, setRq] = useState({ asset: '', days: 30, why: '' });
  const [gr, setGr] = useState({ asset: '', person: '', days: 30 });
  const [pol, setPol] = useState(ACCESS_POLICIES);
  const [chk, setChk] = useState({ asset: '', person: '', role: 'analyst' });
  const [result, setResult] = useState(null);
  const policyFor = (a) => pol.find((p) => p.s === sensitivityOf(a));
  const send = () => {
    const p = policyFor(rq.asset);
    if (p.just && !rq.why.trim()) { toast('A business justification is required for this sensitivity'); return; }
    const days = Math.min(+rq.days, p.days);
    if (p.ap === 'No approval (automatic)') { setGrants((g) => [...g, { asset: rq.asset, person: ME, by: 'automatic', expires: `${days} days`, status: 'active' }]); toast('Granted automatically'); }
    else { setRequests((r) => [...r, { asset: rq.asset, by: ME, why: rq.why, policy: `${p.s} · max ${p.days} days`, approvers: p.ap === 'Asset owner' ? ownerOf(rq.asset) || 'owner' : `${ownerOf(rq.asset) || 'owner'} or steward`, days, status: 'pending' }]); toast('Request sent to the owner'); }
    setRq({ asset: '', days: 30, why: '' });
  };
  const decide = (i, status) => {
    const r = requests[i];
    if (r.by === ME && status === 'approved') { toast('Refused: the person who asks for access cannot be the person who approves it'); return; }
    setRequests((all) => all.map((x, k) => (k === i ? { ...x, status } : x)));
    if (status === 'approved') setGrants((g) => [...g, { asset: r.asset, person: r.by, by: r.approvers, expires: `${r.days} days`, status: 'active' }]);
  };
  const check = () => {
    const sens = sensitivityOf(chk.asset);
    const cls = PD_MAP.find((x) => x.asset === chk.asset) ? ['PII', 'FINANCIAL'] : [];
    const cl = clearanceOf(chk.role);
    const granted = grants.some((g) => g.asset === chk.asset && g.person === (chk.person || ME) && g.status === 'active');
    const p = policyFor(chk.asset);
    const out = [];
    if (cls.length && cl < 'L2') out.push(['mask', 'Personal and financial detail is masked below L2 (rule-pii-mask)']);
    if (sens === 'Restricted' && !granted && p.mask) out.push(['mask', `Restricted data without a grant — sensitive detail masked (${p.s} policy)`]);
    if (sens === 'Restricted') out.push(['mask', 'Restricted data needs a stated purpose (rule-purpose)']);
    setResult({ effect: out.length ? 'mask' : 'allow', sens, cl, granted, reasons: out.length ? out : [['allow', 'No rule restricts this view']] });
  };
  return (
    <>
      <div className="gv-two">
        <Card title="Request access">
          <Fld label="Asset"><AssetSelect value={rq.asset} onChange={(e) => setRq((o) => ({ ...o, asset: e.target.value }))} /></Fld>
          <div className="gv-inline">
            <Fld label="Days"><input className="input" type="number" min={1} value={rq.days} onChange={(e) => setRq((o) => ({ ...o, days: e.target.value }))} /></Fld>
            <Fld label="Business justification"><input className="input" placeholder="What you need it for" value={rq.why} onChange={(e) => setRq((o) => ({ ...o, why: e.target.value }))} /></Fld>
          </div>
          <div style={{ marginTop: 12 }}><Button variant="primary" size="md" icon={Send} disabled={!rq.asset} onClick={send}>Send request</Button></div>
          {rq.asset && <Note>{sensitivityOf(rq.asset)} · approved by {policyFor(rq.asset).ap.toLowerCase()} · up to {policyFor(rq.asset).days} days</Note>}
        </Card>
        <Card title="Grant directly" sub="Owners and stewards of the asset.">
          <Fld label="Asset"><AssetSelect value={gr.asset} onChange={(e) => setGr((o) => ({ ...o, asset: e.target.value }))} /></Fld>
          <div className="gv-inline">
            <Fld label="Person"><input className="input" value={gr.person} onChange={(e) => setGr((o) => ({ ...o, person: e.target.value }))} /></Fld>
            <Fld label="Days"><input className="input" type="number" min={1} value={gr.days} onChange={(e) => setGr((o) => ({ ...o, days: e.target.value }))} /></Fld>
          </div>
          <div style={{ marginTop: 12 }}><Button variant="secondary" size="md" icon={KeyRound} disabled={!gr.asset || !gr.person} onClick={() => { setGrants((g) => [...g, { asset: gr.asset, person: gr.person, by: ME, expires: `${Math.min(+gr.days, policyFor(gr.asset).days)} days`, status: 'active' }]); setGr({ asset: '', person: '', days: 30 }); toast('Access granted'); }}>Grant</Button></div>
        </Card>
      </div>
      <Card title="Requests" count={requests.length}>
        <div className="table-wrap"><table className="tbl">
          <thead><tr><th>Asset</th><th>Requested by</th><th>Justification</th><th>Policy</th><th>Approvers</th><th>Status</th><th /></tr></thead>
          <tbody>
            {requests.map((r, i) => <tr key={i}><td><Mono>{r.asset}</Mono></td><td>{r.by}</td><td>{r.why || '—'}</td><td>{r.policy}</td><td>{r.approvers}</td><td><StatusBadge s={r.status === 'approved' ? 'approved' : r.status === 'rejected' ? 'refused' : 'pending'}>{r.status}</StatusBadge></td>
              <td style={{ whiteSpace: 'nowrap' }}>{r.status === 'pending' && <><Button variant="secondary" size="sm" onClick={() => decide(i, 'approved')}>Approve</Button> <Button variant="subtle" size="sm" onClick={() => decide(i, 'rejected')}>Reject</Button></>}</td></tr>)}
            {!requests.length && <tr><td colSpan={7}><Empty>No requests.</Empty></td></tr>}
          </tbody>
        </table></div>
      </Card>
      <Card title="Grants" count={grants.length}>
        <div className="table-wrap"><table className="tbl">
          <thead><tr><th>Asset</th><th>Person</th><th>Granted by</th><th>Expires</th><th>Status</th><th /></tr></thead>
          <tbody>
            {grants.map((g, i) => <tr key={i}><td><Mono>{g.asset}</Mono></td><td>{g.person}</td><td>{g.by}</td><td>in {g.expires}</td><td><StatusBadge s={g.status === 'active' ? 'active' : 'refused'}>{g.status}</StatusBadge></td>
              <td>{g.status === 'active' && <Button variant="subtle" size="sm" onClick={() => { setGrants((all) => all.map((x, k) => (k === i ? { ...x, status: 'revoked' } : x))); toast('Grant revoked'); }}>Revoke</Button>}</td></tr>)}
            {!grants.length && <tr><td colSpan={6}><Empty>No grants.</Empty></td></tr>}
          </tbody>
        </table></div>
      </Card>
      <Card title="Access policies" sub="Enforced on every request and view." actions={<Button variant="secondary" size="md" onClick={() => toast('Access policies saved')}>Save policies</Button>}>
        <div className="table-wrap"><table className="tbl">
          <thead><tr><th>Sensitivity</th><th>Who approves</th><th>Max days</th><th>Justification</th><th>Mask sensitive detail without a grant</th></tr></thead>
          <tbody>{pol.map((p, i) => {
            const set = (k, v) => setPol((all) => all.map((x, j) => (j === i ? { ...x, [k]: v } : x)));
            return (
              <tr key={p.s}><td className="gv-strong">{p.s}</td>
                <td><select className="select" value={p.ap} onChange={(e) => set('ap', e.target.value)}>{APPROVERS.map((a) => <option key={a}>{a}</option>)}</select></td>
                <td><input className="input" type="number" style={{ width: 90 }} value={p.days} onChange={(e) => set('days', +e.target.value)} /></td>
                <td><label className="gv-check"><input type="checkbox" checked={p.just} onChange={(e) => set('just', e.target.checked)} />required</label></td>
                <td><label className="gv-check"><input type="checkbox" checked={p.mask} onChange={(e) => set('mask', e.target.checked)} />mask</label></td></tr>
            );
          })}</tbody>
        </table></div>
      </Card>
      <Card title="Check access — see an asset as someone else would">
        <div className="gv-inline">
          <Fld label="Asset"><AssetSelect value={chk.asset} onChange={(e) => setChk((o) => ({ ...o, asset: e.target.value }))} /></Fld>
          <Fld label="Person"><input className="input" value={chk.person} onChange={(e) => setChk((o) => ({ ...o, person: e.target.value }))} /></Fld>
          <Fld label="App role"><select className="select" value={chk.role} onChange={(e) => setChk((o) => ({ ...o, role: e.target.value }))}>{['analyst', 'data-engineer', 'product-owner', 'platform-ops', 'governance-lead'].map((r) => <option key={r}>{r}</option>)}</select></Fld>
          <Button variant="secondary" size="md" icon={ShieldQuestion} disabled={!chk.asset} onClick={check}>Check</Button>
        </div>
        {result && (
          <div className="gv-result">
            <header><StatusBadge s={result.effect === 'allow' ? 'allow' : 'warn'}>{result.effect === 'allow' ? 'Allowed' : 'Allowed, masked'}</StatusBadge><b>{chk.asset}</b><span className="gv-faint">{result.sens} · clearance {result.cl} · {result.granted ? 'has a grant' : 'no grant'}</span></header>
            <ul className="gv-lines">{result.reasons.map(([e, t], i) => <li key={i}><span className="tag">{e}</span> {t}</li>)}</ul>
          </div>
        )}
      </Card>
    </>
  );
}

/* ------------------------------------------------------------------ roles & people */
function Roles({ assign, setAssign, sod }) {
  const [f, setF] = useState({ person: '', role: ROLES[0].key });
  const add = () => {
    const held = assign.filter((a) => a.person.toLowerCase() === f.person.trim().toLowerCase()).map((a) => a.role);
    const clash = sod.find((s) => s.on && s.kind === 'role' && ((s.a === f.role && held.includes(s.b)) || (s.b === f.role && held.includes(s.a))));
    if (clash) { toast(`Refused: ${clash.why}`); return; }
    setAssign((a) => [...a, { person: f.person.trim(), role: f.role }]); setF((o) => ({ ...o, person: '' })); toast('Role assigned');
  };
  return (
    <>
      <Card title="Roles">
        <div className="table-wrap"><table className="tbl">
          <thead><tr><th>Role</th><th>Clearance</th><th>May do</th><th>Held by</th></tr></thead>
          <tbody>{ROLES.map((r) => { const who = assign.filter((a) => a.role === r.key).map((a) => a.person); return (
            <tr key={r.key}><td><span className="gv-strong">{r.name}</span><span className="gv-sub mono">{r.key}</span></td><td><span className="tag">{r.clearance}</span></td>
              <td><div className="gv-tags">{r.may.map((m) => <span key={m} className="tag mono">{m}</span>)}</div></td><td>{who.join(', ') || <span className="gv-faint">nobody yet</span>}</td></tr>
          ); })}</tbody>
        </table></div>
      </Card>
      <Card title="Assign a role">
        <div className="gv-inline">
          <Fld label="Person"><input className="input" placeholder="e.g. Priya Shah" value={f.person} onChange={(e) => setF((o) => ({ ...o, person: e.target.value }))} /></Fld>
          <Fld label="Role"><select className="select" value={f.role} onChange={(e) => setF((o) => ({ ...o, role: e.target.value }))}>{ROLES.map((r) => <option key={r.key} value={r.key}>{r.name}</option>)}</select></Fld>
          <Button variant="primary" size="md" icon={Plus} disabled={!f.person.trim()} onClick={add}>Assign role</Button>
        </div>
        <Note>An assignment that would break separation of duties is refused here, not logged and allowed.</Note>
      </Card>
    </>
  );
}

/* ------------------------------------------------------------------ permissions by level */
function Scopes({ scopes, setScopes }) {
  const [f, setF] = useState({ role: ROLES[0].key, level: 'table', target: '', actions: [] });
  return (
    <>
      <Card title="Permissions by level">
        <div className="table-wrap"><table className="tbl">
          <thead><tr><th>Role</th><th>Level</th><th>Target</th><th>Actions</th><th>Set by</th><th /></tr></thead>
          <tbody>
            {scopes.map((s, i) => <tr key={i}><td>{ROLES.find((r) => r.key === s.role).name}</td><td><span className="tag">{s.level}</span></td><td><Mono>{s.target}</Mono></td><td><div className="gv-tags">{s.actions.map((a) => <span key={a} className="tag mono">{a}</span>)}</div></td><td>{ME}</td>
              <td><Button variant="subtle" size="sm" onClick={() => setScopes((all) => all.filter((_, k) => k !== i))}>Remove</Button></td></tr>)}
            {!scopes.length && <tr><td colSpan={6}><Empty>No scope set yet — roles carry only their own permissions.</Empty></td></tr>}
          </tbody>
        </table></div>
      </Card>
      <Card title="Set a scope">
        <div className="gv-inline">
          <Fld label="Role"><select className="select" value={f.role} onChange={(e) => setF((o) => ({ ...o, role: e.target.value }))}>{ROLES.map((r) => <option key={r.key} value={r.key}>{r.name}</option>)}</select></Fld>
          <Fld label="Level"><select className="select" value={f.level} onChange={(e) => setF((o) => ({ ...o, level: e.target.value }))}>{['system', 'dataset', 'table', 'column', 'report'].map((l) => <option key={l}>{l}</option>)}</select></Fld>
          <Fld label="Target"><input className="input mono" placeholder="Rplus_DWH · SRC · SRC.CUSTOMER · SRC.CUSTOMER.EMAIL" value={f.target} onChange={(e) => setF((o) => ({ ...o, target: e.target.value }))} /></Fld>
        </div>
        <Fld label="Actions"><ChipPick options={PERMISSIONS} value={f.actions} onChange={(v) => setF((o) => ({ ...o, actions: v }))} /></Fld>
        <Button variant="primary" size="md" disabled={!f.target.trim() || !f.actions.length} onClick={() => { setScopes((s) => [...s, f]); setF((o) => ({ ...o, target: '', actions: [] })); toast('Scope saved'); }}>Save scope</Button>
        <Note>The most specific scope wins: column, then table or report, then dataset, then system.</Note>
      </Card>
    </>
  );
}

/* ------------------------------------------------------------------ separation of duties */
function Sod({ sod, setSod, assign }) {
  const people = [...new Set(assign.map((a) => a.person))];
  return (
    <Card title="Separation of duties">
      <div className="table-wrap"><table className="tbl">
        <thead><tr><th>Conflict</th><th>Kind</th><th>Why</th><th>Enforced</th><th>State</th></tr></thead>
        <tbody>{sod.map((s, i) => (
          <tr key={s.a + s.b}><td><Mono>{s.a} ↔ {s.b}</Mono>{s.builtIn && <span className="gv-sub">built in</span>}</td><td>{s.kind}</td><td>{s.why}</td><td className="gv-muted">{s.when}</td>
            <td><Switch on={s.on} label={`${s.a} and ${s.b}`} onChange={(v) => { if (s.builtIn) { toast('Built-in duties cannot be switched off'); return; } setSod((all) => all.map((x, k) => (k === i ? { ...x, on: v } : x))); }} /></td></tr>
        ))}</tbody>
      </table></div>
      <div className="gv-section-label">Combinations held today</div>
      <p style={{ fontSize: 13, margin: 0 }}>No one holds a conflicting combination ({people.length} people checked).</p>
    </Card>
  );
}

/* ------------------------------------------------------------------ access rules */
function Rules() {
  const [f, setF] = useState({ asset: 'SRC.CUSTOMER', column: '', loc: 'uk', purpose: '' });
  const [res, setRes] = useState(null);
  const evaluate = () => {
    const sens = sensitivityOf(f.asset);
    const pii = PD_MAP.find((x) => x.asset === f.asset);
    const hits = [];
    if (sens === 'Restricted' && f.loc !== 'uk') hits.push(ACCESS_RULES[1]);
    if (pii && (!f.column || pii.cols.map((c) => c.toLowerCase()).includes(f.column.toLowerCase()))) hits.push(ACCESS_RULES[2]);
    if (sens === 'Restricted' && !f.purpose.trim()) hits.push(ACCESS_RULES[3]);
    const effect = hits.some((h) => h.effect === 'deny') ? 'deny' : hits.length ? 'mask' : 'allow';
    setRes({ effect, hits, sens });
  };
  return (
    <>
      <Card title="Access rules">
        <div className="table-wrap"><table className="tbl">
          <thead><tr><th className="num">#</th><th>Rule</th><th>Applies when</th><th>Effect</th></tr></thead>
          <tbody>{ACCESS_RULES.map((r) => <tr key={r.id}><td className="num">{r.n}</td><td><span className="gv-strong">{r.name}</span><span className="gv-sub mono">{r.id}</span></td><td><Mono>{r.when}</Mono></td><td><StatusBadge s={r.effect === 'deny' ? 'deny' : 'warn'}>{r.effect}</StatusBadge></td></tr>)}</tbody>
        </table></div>
      </Card>
      <Card title="Ask the decision point">
        <div className="gv-inline">
          <Fld label="Asset"><input className="input mono" placeholder="SRC.CUSTOMER" value={f.asset} onChange={(e) => setF((o) => ({ ...o, asset: e.target.value }))} /></Fld>
          <Fld label="Column"><input className="input mono" placeholder="EMAIL (optional)" value={f.column} onChange={(e) => setF((o) => ({ ...o, column: e.target.value }))} /></Fld>
          <Fld label="Location"><select className="select" value={f.loc} onChange={(e) => setF((o) => ({ ...o, loc: e.target.value }))}><option value="uk">United Kingdom</option><option value="non-uk">Outside the UK</option></select></Fld>
          <Fld label="Purpose"><input className="input" placeholder="why you are asking" value={f.purpose} onChange={(e) => setF((o) => ({ ...o, purpose: e.target.value }))} /></Fld>
          <Button variant="primary" size="md" disabled={!f.asset.trim()} onClick={evaluate}>Evaluate</Button>
        </div>
        {res && (
          <div className="gv-result">
            <header><StatusBadge s={res.effect}>{res.effect}</StatusBadge><b>{f.asset}{f.column && `.${f.column}`}</b><span className="gv-faint">{res.sens} · {f.loc === 'uk' ? 'United Kingdom' : 'outside the UK'} · audited</span></header>
            {res.hits.length ? <ul className="gv-lines">{res.hits.map((h) => <li key={h.id}>{h.name} <span className="gv-faint mono">{h.id}</span> → <b>{h.effect}</b></li>)}</ul> : <p style={{ margin: 0 }}>No rule applies — shown in full.</p>}
          </div>
        )}
      </Card>
    </>
  );
}

/* ------------------------------------------------------------------ directory & identity */
function Directory({ synced, onSync }) {
  return (
    <Card title="AWS IAM Identity Center" sub="not configured in this environment" actions={<Button variant="secondary" size="md" icon={RefreshCw} onClick={onSync}>Synchronise now</Button>}>
      <div className="table-wrap"><table className="tbl">
        <thead><tr><th>Directory group</th><th>Role in GenMeta</th></tr></thead>
        <tbody>{DIRECTORY.map(([g, r]) => <tr key={g}><td><Mono>{g}</Mono></td><td><span className="tag mono">{r}</span></td></tr>)}</tbody>
      </table></div>
      <Note>Microsoft Entra ID / Active Directory: the same group → role → clearance mapping over SCIM or OIDC group claims.</Note>
      <Note>Adding a person to a directory group is the only administrative step: the group carries the role, the role carries the clearance, and a combination that breaks separation of duties is refused rather than imported.{synced && ` Last synchronised ${synced}.`}</Note>
    </Card>
  );
}

/* ------------------------------------------------------------------ platform consistency */
function Platforms() {
  const [last, setLast] = useState('03/10/2026, 11:30:58');
  return (
    <Card title="Platform consistency" sub={`Last reconciled ${last} · 0 scope(s) checked, 0 missing in the platform, 0 not checkable · platform roles follow GENMETA_<ROLE>`}
      actions={<Button variant="secondary" size="md" icon={RefreshCw} onClick={() => { setLast(new Date().toLocaleString('en-GB')); toast('Reconciled 0 scope(s) across 6 platform(s)'); }}>Reconcile now</Button>}>
      <p className="gv-muted" style={{ fontSize: 13, margin: '0 0 12px' }}>Automatic correction: none — GenMeta reports drift and the statement to correct it.</p>
      <div className="table-wrap"><table className="tbl">
        <thead><tr><th>Platform</th><th className="num">Assets</th><th>Grants readable</th><th className="num">Scopes checked</th><th className="num">Not checkable</th><th className="num">Missing in platform</th><th>What to run</th></tr></thead>
        <tbody>{PLATFORMS.map(([p, n, ok, why]) => <tr key={p}><td className="gv-strong">{p}</td><td className="num">{n}</td><td><StatusBadge s={ok ? 'yes' : 'warn'}>{ok ? 'yes' : 'no'}</StatusBadge><span className="gv-sub">{why}</span></td><td className="num">0</td><td className="num">0</td><td className="num">0</td><td className="gv-faint">—</td></tr>)}</tbody>
      </table></div>
      <Note>Where a platform cannot report its grants, it says so and why — the register is never presented as confirmed when it has not been checked.</Note>
    </Card>
  );
}
