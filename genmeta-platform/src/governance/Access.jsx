import { useState } from 'react';
import {
  Send, KeyRound, ShieldQuestion, RefreshCw, Plus, Check, X, HelpCircle, Inbox, ShieldCheck, Eye, Users, UserPlus, Layers, Split, Gavel, Fingerprint,
  CalendarCheck, ListChecks,
} from 'lucide-react';
import { PageHead, Tabs, Button, Segmented } from '../components/ui.jsx';
import { Switch } from '../pages/admin/kit.jsx';
import {
  REVIEW_ITEMS, recommend, ASSET_NAMES, PERMISSIONS, ROLES, APPROVERS, ACCESS_POLICIES, SOD, ACCESS_RULES, DIRECTORY, PLATFORMS, PD_MAP, sensitivityOf, ownerOf,
} from './data.js';
import { Card, Tiles, StatusBadge, Empty, Note, Mono, Fld, ChipPick, toast , Meter } from './kit.jsx';

const TABS = ['Requests & grants', 'Access reviews', 'Roles & people', 'Permissions', 'Separation of duties', 'Access rules', 'Directory', 'Platforms']
  .map((label, i) => ({ value: ['requests', 'reviews', 'roles', 'scopes', 'sod', 'rules', 'directory', 'platforms'][i], label, icon: [Inbox, CalendarCheck, Users, Layers, Split, Gavel, Fingerprint, RefreshCw][i] }));
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
  const top = tab === 'reviews'
    ? [{ l: 'Reviews open', v: 1, s: 'quarterly · Restricted data' }, { l: 'Grants to review', v: REVIEW_ITEMS.length, s: 'reviewed by each asset\'s owner' }, { l: 'Recommended to revoke', v: REVIEW_ITEMS.filter((r) => recommend(r)[0] === 'Revoke').length, s: 'not used in 30 days' }]
    : tab === 'requests'
    ? [{ l: 'Requests pending', v: requests.filter((r) => r.status === 'pending').length, s: 'routed to owners and stewards' }, { l: 'Active grants', v: grants.filter((g) => g.status === 'active').length, s: 'each with an expiry' }, { l: 'Access policies', v: ACCESS_POLICIES.length, s: 'one per sensitivity level' }]
    : [{ l: 'Roles', v: ROLES.length, s: '0 defined here' }, { l: 'Role assignments', v: assign.length, s: `${synced ? assign.length : 0} from the directory` }, { l: 'Scopes', v: scopes.length, s: `${new Set(scopes.map((s) => s.level)).size} level(s) in use` }, { l: 'Identities synchronised', v: synced ? 7 : 0, s: synced ? `last ${synced}` : 'not yet synchronised' }];
  return (
    <div className="page gv">
      <PageHead eyebrow="Govern" title="Access & RBAC"
        sub="Who may see what, and why: roles carrying a clearance, permissions held at system, dataset, table, column or report level, duties that may not be combined, and decisions made from the data's classification and the context of the request." />
      <Tabs items={TABS} value={tab} onChange={setTab} />
      <Tiles items={top} />
      {tab === 'requests' && <Requests requests={requests} setRequests={setRequests} grants={grants} setGrants={setGrants} />}
      {tab === 'reviews' && <Reviews />}
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
  /* Atlan-style evaluation: every source is checked in order and any deny wins. */
  const check = () => {
    const sens = sensitivityOf(chk.asset);
    const pii = PD_MAP.find((x) => x.asset === chk.asset);
    const role = ROLES.find((r) => r.key === chk.role);
    const cl = role.clearance;
    const who = chk.person || ME;
    const granted = grants.some((g) => g.asset === chk.asset && g.person === who && g.status === 'active');
    const p = policyFor(chk.asset);
    const steps = [
      ['Role and clearance', `${role.name} · clearance ${cl} · may ${role.may.includes('read_sensitive') ? 'read sensitive detail' : 'read metadata'}`, 'allow'],
      ['Access policy', `${p.s}: approved by ${p.ap.toLowerCase()}, up to ${p.days} days${p.mask ? ', sensitive detail masked without a grant' : ''}`, sens === 'Restricted' && !granted && p.mask && !role.may.includes('read_sensitive') ? 'mask' : 'allow'],
      ['Grants', granted ? `${who} holds an active grant` : `${who} holds no grant on this asset`, granted ? 'allow' : sens === 'Public' || sens === 'Internal' ? 'allow' : 'mask'],
      ['rule-pii-mask', pii ? (cl < 'L2' ? 'Personal and financial columns, clearance below L2' : 'clearance L2 or above — not applied') : 'no personal data — not applied', pii && cl < 'L2' ? 'mask' : 'allow'],
      ['rule-purpose', sens === 'Restricted' ? 'Restricted data needs a stated purpose (none given in this check)' : 'not Restricted — not applied', sens === 'Restricted' ? 'mask' : 'allow'],
      ['rule-offshore', 'request from the United Kingdom — not applied', 'allow'],
    ];
    const effect = steps.some((x) => x[2] === 'deny') ? 'deny' : steps.some((x) => x[2] === 'mask') ? 'mask' : 'allow';
    setResult({ effect, sens, cl, granted, steps });
  };
  return (
    <>
      <div className="gv-two">
        <Card icon={Send} tone="info" title="Request access" sub="Routed to the asset's owner or steward under the policy for its sensitivity.">
          <Fld label="Asset"><AssetSelect value={rq.asset} onChange={(e) => setRq((o) => ({ ...o, asset: e.target.value }))} /></Fld>
          <div className="gv-inline">
            <Fld label="Days"><input className="input" type="number" min={1} value={rq.days} onChange={(e) => setRq((o) => ({ ...o, days: e.target.value }))} /></Fld>
            <Fld label="Business justification"><input className="input" placeholder="What you need it for" value={rq.why} onChange={(e) => setRq((o) => ({ ...o, why: e.target.value }))} /></Fld>
          </div>
          <div style={{ marginTop: 12 }}><Button variant="primary" size="md" icon={Send} disabled={!rq.asset} onClick={send}>Send request</Button></div>
          {rq.asset && <Note>{sensitivityOf(rq.asset)} · approved by {policyFor(rq.asset).ap.toLowerCase()} · up to {policyFor(rq.asset).days} days</Note>}
        </Card>
        <Card icon={KeyRound} tone="ok" title="Grant directly" sub="Owners and stewards of the asset.">
          <Fld label="Asset"><AssetSelect value={gr.asset} onChange={(e) => setGr((o) => ({ ...o, asset: e.target.value }))} /></Fld>
          <div className="gv-inline">
            <Fld label="Person"><input className="input" value={gr.person} onChange={(e) => setGr((o) => ({ ...o, person: e.target.value }))} /></Fld>
            <Fld label="Days"><input className="input" type="number" min={1} value={gr.days} onChange={(e) => setGr((o) => ({ ...o, days: e.target.value }))} /></Fld>
          </div>
          <div style={{ marginTop: 12 }}><Button variant="secondary" size="md" icon={KeyRound} disabled={!gr.asset || !gr.person} onClick={() => { setGrants((g) => [...g, { asset: gr.asset, person: gr.person, by: ME, expires: `${Math.min(+gr.days, policyFor(gr.asset).days)} days`, status: 'active' }]); setGr({ asset: '', person: '', days: 30 }); toast('Access granted'); }}>Grant</Button></div>
        </Card>
      </div>
      <Card icon={Inbox} tone="warn" title="Requests" count={requests.length}>
        <div className="table-wrap"><table className="tbl">
          <thead><tr><th>Asset</th><th>Requested by</th><th>Justification</th><th>Policy</th><th>Approvers</th><th>Status</th><th /></tr></thead>
          <tbody>
            {requests.map((r, i) => <tr key={i}><td><Mono>{r.asset}</Mono></td><td>{r.by}</td><td>{r.why || '—'}</td><td>{r.policy}</td><td>{r.approvers}</td><td><StatusBadge s={r.status === 'approved' ? 'approved' : r.status === 'rejected' ? 'refused' : 'pending'}>{r.status}</StatusBadge></td>
              <td style={{ whiteSpace: 'nowrap' }}>{r.status === 'pending' && <><Button variant="secondary" size="sm" onClick={() => decide(i, 'approved')}>Approve</Button> <Button variant="subtle" size="sm" onClick={() => decide(i, 'rejected')}>Reject</Button></>}</td></tr>)}
            {!requests.length && <tr><td colSpan={7}><Empty>No requests.</Empty></td></tr>}
          </tbody>
        </table></div>
      </Card>
      <Card icon={KeyRound} tone="ok" title="Grants" count={grants.length}>
        <div className="table-wrap"><table className="tbl">
          <thead><tr><th>Asset</th><th>Person</th><th>Granted by</th><th>Expires</th><th>Status</th><th /></tr></thead>
          <tbody>
            {grants.map((g, i) => <tr key={i}><td><Mono>{g.asset}</Mono></td><td>{g.person}</td><td>{g.by}</td><td>in {g.expires}</td><td><StatusBadge s={g.status === 'active' ? 'active' : 'refused'}>{g.status}</StatusBadge></td>
              <td>{g.status === 'active' && <Button variant="subtle" size="sm" onClick={() => { setGrants((all) => all.map((x, k) => (k === i ? { ...x, status: 'revoked' } : x))); toast('Grant revoked'); }}>Revoke</Button>}</td></tr>)}
            {!grants.length && <tr><td colSpan={6}><Empty>No grants.</Empty></td></tr>}
          </tbody>
        </table></div>
      </Card>
      <Card icon={ShieldCheck} tone="violet" title="Access policies" sub="Enforced on every request and view." actions={<Button variant="secondary" size="md" onClick={() => toast('Access policies saved')}>Save policies</Button>}>
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
      <Card icon={ShieldQuestion} tone="teal" title="Check access — see an asset as someone else would">
        <div className="gv-inline">
          <Fld label="Asset"><AssetSelect value={chk.asset} onChange={(e) => setChk((o) => ({ ...o, asset: e.target.value }))} /></Fld>
          <Fld label="Person"><input className="input" value={chk.person} onChange={(e) => setChk((o) => ({ ...o, person: e.target.value }))} /></Fld>
          <Fld label="App role"><select className="select" value={chk.role} onChange={(e) => setChk((o) => ({ ...o, role: e.target.value }))}>{['analyst', 'data-engineer', 'product-owner', 'platform-ops', 'governance-lead'].map((r) => <option key={r}>{r}</option>)}</select></Fld>
          <Button variant="secondary" size="md" icon={ShieldQuestion} disabled={!chk.asset} onClick={check}>Check</Button>
        </div>
        {result && (
          <div className="gv-result">
            <header><StatusBadge s={result.effect === 'allow' ? 'allow' : 'warn'}>{result.effect === 'allow' ? 'Allowed' : 'Allowed, masked'}</StatusBadge><b>{chk.asset}</b><span className="gv-faint">{result.sens} · clearance {result.cl} · {result.granted ? 'has a grant' : 'no grant'}</span></header>
            <ol className="gv-trace">{result.steps.map(([k, t, e], i) => <li key={k}><i>{i + 1}</i><div><b>{k}</b><small>{t}</small></div><StatusBadge s={e === 'allow' ? 'allow' : e === 'deny' ? 'deny' : 'warn'}>{e}</StatusBadge></li>)}</ol>
            <Note>Every source is evaluated and any deny wins; a mask from any step hides the sensitive columns.</Note>
          </div>
        )}
      </Card>
    </>
  );
}

/* ------------------------------------------------------------------ roles & people */
const sees = (r, s) => {
  if (s === 'Public' || s === 'Internal') return ['Full', 'ok'];
  if (s === 'Confidential') return r.clearance >= 'L2' ? ['Full', 'ok'] : ['Masked', 'warn'];
  if (r.may.includes('read_sensitive')) return ['Full', 'ok'];
  return r.clearance >= 'L2' ? ['Request', 'warn'] : ['Masked · request', 'fail'];
};
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
      <Card icon={Eye} tone="violet" title="Who can see what" sub="Each role's clearance decides what it sees at every sensitivity level before any grant. Like a persona: one row, one view of the estate.">
        <div className="table-wrap"><table className="tbl">
          <thead><tr><th>Role</th><th>Clearance</th>{['Public', 'Internal', 'Confidential', 'Restricted'].map((s) => <th key={s}>{s}</th>)}</tr></thead>
          <tbody>{ROLES.map((r) => (
            <tr key={r.key}><td className="gv-strong">{r.name}</td><td><span className="tag">{r.clearance}</span></td>
              {['Public', 'Internal', 'Confidential', 'Restricted'].map((s) => { const [v, tone] = sees(r, s); return <td key={s}><StatusBadge s={tone}>{v}</StatusBadge></td>; })}</tr>
          ))}</tbody>
        </table></div>
        <Note>Full: columns and profiles shown. Masked: PII and FINANCIAL columns hidden. Request: visible in the catalogue, detail needs a grant from the owner.</Note>
      </Card>
      <Card icon={Users} tone="info" title="Roles">
        <div className="table-wrap"><table className="tbl">
          <thead><tr><th>Role</th><th>Clearance</th><th>May do</th><th>Held by</th></tr></thead>
          <tbody>{ROLES.map((r) => { const who = assign.filter((a) => a.role === r.key).map((a) => a.person); return (
            <tr key={r.key}><td><span className="gv-strong">{r.name}</span><span className="gv-sub mono">{r.key}</span></td><td><span className="tag">{r.clearance}</span></td>
              <td><div className="gv-tags">{r.may.map((m) => <span key={m} className="tag mono">{m}</span>)}</div></td><td>{who.join(', ') || <span className="gv-faint">nobody yet</span>}</td></tr>
          ); })}</tbody>
        </table></div>
      </Card>
      <Card icon={UserPlus} tone="ok" title="Assign a role">
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
      <Card icon={Layers} tone="teal" title="Permissions by level">
        <div className="table-wrap"><table className="tbl">
          <thead><tr><th>Role</th><th>Level</th><th>Target</th><th>Actions</th><th>Set by</th><th /></tr></thead>
          <tbody>
            {scopes.map((s, i) => <tr key={i}><td>{ROLES.find((r) => r.key === s.role).name}</td><td><span className="tag">{s.level}</span></td><td><Mono>{s.target}</Mono></td><td><div className="gv-tags">{s.actions.map((a) => <span key={a} className="tag mono">{a}</span>)}</div></td><td>{ME}</td>
              <td><Button variant="subtle" size="sm" onClick={() => setScopes((all) => all.filter((_, k) => k !== i))}>Remove</Button></td></tr>)}
            {!scopes.length && <tr><td colSpan={6}><Empty>No scope set yet — roles carry only their own permissions.</Empty></td></tr>}
          </tbody>
        </table></div>
      </Card>
      <Card icon={Plus} tone="ok" title="Set a scope">
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
    <Card icon={Split} tone="warn" title="Separation of duties" sub="Duties that may not be held by one person. Conflicts are refused when they would happen, not reported afterwards.">
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
      <Card icon={Gavel} tone="bad" title="Access rules" sub="Evaluated on every view, in order; any deny wins.">
        <div className="table-wrap"><table className="tbl">
          <thead><tr><th className="num">#</th><th>Rule</th><th>Applies when</th><th>Effect</th></tr></thead>
          <tbody>{ACCESS_RULES.map((r) => <tr key={r.id}><td className="num">{r.n}</td><td><span className="gv-strong">{r.name}</span><span className="gv-sub mono">{r.id}</span></td><td><Mono>{r.when}</Mono></td><td><StatusBadge s={r.effect === 'deny' ? 'deny' : 'warn'}>{r.effect}</StatusBadge></td></tr>)}</tbody>
        </table></div>
      </Card>
      <Card icon={ShieldQuestion} tone="teal" title="Ask the decision point">
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
    <Card icon={Fingerprint} tone="warn" title="AWS IAM Identity Center" sub="not configured in this environment" actions={<Button variant="secondary" size="md" icon={RefreshCw} onClick={onSync}>Synchronise now</Button>}>
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
    <Card icon={RefreshCw} tone="teal" title="Platform consistency" sub={`Last reconciled ${last} · 0 scope(s) checked, 0 missing in the platform, 0 not checkable · platform roles follow GENMETA_<ROLE>`}
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

/* ------------------------------------------------------------------ access reviews
   v2: Microsoft Entra access reviews — a recurring campaign, the owner decides keep or revoke for each
   grant, with a recommendation from last use; results are applied in one step. */
function Reviews() {
  const [dec, setDec] = useState({});
  const [applied, setApplied] = useState(false);
  const [f, setF] = useState('all');
  const done = Object.keys(dec).length;
  const rows = REVIEW_ITEMS.filter((r) => f === 'all' || (f === 'pending' ? !dec[r.id] : dec[r.id]));
  const acceptAll = () => setDec(Object.fromEntries(REVIEW_ITEMS.map((r) => [r.id, recommend(r)[0] === 'Keep' ? 'Approve' : 'Deny'])));
  const DEC_TONE = { Approve: 'ok', Deny: 'fail', "Don't know": 'warn' };
  return (
    <>
      <Card icon={CalendarCheck} tone="violet" title="Quarterly review — Restricted data, Q4 2026" sub="Started 1 Oct 2026 · ends 31 Oct 2026 · reviewers: each asset's owner · repeats every 3 months · if a reviewer does not respond: keep access and flag it"
        actions={<>
          <Button variant="secondary" size="md" onClick={acceptAll} disabled={applied}>Accept recommendations</Button>
          <Button variant="primary" size="md" disabled={!done || applied} onClick={() => { setApplied(true); toast(`Applied: ${Object.values(dec).filter((d) => d === 'Deny').length} grant(s) revoked, written to the audit trail`); }}>Apply results</Button>
        </>}>
        <div className="gv-bars" style={{ marginBottom: 6 }}><div><span>{done} of {REVIEW_ITEMS.length} reviewed</span><Meter pct={done / REVIEW_ITEMS.length} tone="info" /><b>{Math.round((done / REVIEW_ITEMS.length) * 100)}%</b></div></div>
        {applied && <Note>Results applied on {new Date().toLocaleDateString('en-GB')}. Revoked grants are removed from the platforms that publish their grants (Rplus_DWH); the others get the statement to run.</Note>}
      </Card>
      <Card icon={ListChecks} tone="info" title="Grants to review" count={rows.length} actions={<Segmented size="sm" value={f} onChange={setF} options={[{ value: 'all', label: 'All' }, { value: 'pending', label: 'Not reviewed' }, { value: 'done', label: 'Reviewed' }]} />}>
        <div className="table-wrap"><table className="tbl">
          <thead><tr><th>Person</th><th>Asset</th><th>Granted</th><th>Last used</th><th>Recommendation</th><th>Decision</th></tr></thead>
          <tbody>{rows.map((r) => { const [rec, why] = recommend(r); return (
            <tr key={r.id}>
              <td><span className="gv-strong">{r.person}</span><span className="gv-sub">{r.role} · {r.why}</span></td>
              <td><Mono>{r.asset}</Mono><span className="gv-sub">{r.sens} · owner {ownerOf(r.asset) || '—'}</span></td>
              <td>{r.granted}</td><td>{r.lastUsed}</td>
              <td><StatusBadge s={rec === 'Keep' ? 'ok' : 'fail'}>{rec}</StatusBadge><span className="gv-sub">{why}</span></td>
              <td style={{ whiteSpace: 'nowrap' }}>{dec[r.id] ? <><StatusBadge s={DEC_TONE[dec[r.id]]}>{dec[r.id]}</StatusBadge> {!applied && <Button variant="link" onClick={() => setDec((d) => { const n = { ...d }; delete n[r.id]; return n; })}>Change</Button>}</> : (
                <span className="gv-actions">
                  <Button variant="secondary" size="sm" icon={Check} onClick={() => setDec((d) => ({ ...d, [r.id]: 'Approve' }))}>Approve</Button>
                  <Button variant="secondary" size="sm" icon={X} onClick={() => setDec((d) => ({ ...d, [r.id]: 'Deny' }))}>Deny</Button>
                  <Button variant="subtle" size="sm" icon={HelpCircle} onClick={() => setDec((d) => ({ ...d, [r.id]: "Don't know" }))}>Don't know</Button>
                </span>
              )}</td>
            </tr>
          ); })}</tbody>
        </table></div>
      </Card>
    </>
  );
}
