import { Fragment, useEffect, useRef, useState } from 'react';
import {
  Send, KeyRound, ShieldQuestion, RefreshCw, Plus, Check, X, HelpCircle, Inbox, ShieldCheck, Eye, Users, UserPlus, Layers, Split, Gavel, Fingerprint,
  CalendarCheck, ListChecks, Lock, AlertTriangle, BadgePlus, Terminal, Search,
} from 'lucide-react';
import { PageHead, Tabs, Button, Segmented } from '../components/ui.jsx';
import { Switch } from '../pages/admin/kit.jsx';
import { recommend, ASSET_NAMES, PERMISSIONS, APPROVERS, DIRECTORY, PLATFORMS, ownerOf, ACCESS_RULES, colClass, systemOf } from './data.js';
import { PEOPLE_DIR, GROUP_LIST, rolesFor } from './people.js';
import { Card, Tiles, StatusBadge, Empty, Note, Mono, Fld, ChipPick, toast, Meter } from './kit.jsx';
import {
  useAccess, setViewRole, ACCESS_VIEW, me, roleOf, assignRole, unassign, defineRole, toggleSod, combinationsHeld, saveScope, removeScope, TARGETS, LEVELS, syncSummary, findPerson, rolesHeld,
  evaluate, columnsOf, requestAccess, approveRequest, rejectRequest, grantDirect, revokeGrant, policyFor, setPolicies, setReviewDecision, clearReviewDecision,
  applyReview, syncDirectory, reconcile, statementFor, DIRECTORY_MEMBERS, CLEAR_RANK,
} from './access-store.js';

const TABS = ['Requests & grants', 'Access reviews', 'Roles & people', 'Permissions', 'Separation of duties', 'Access rules', 'Directory', 'Platforms']
  .map((label, i) => ({ value: ['requests', 'reviews', 'roles', 'scopes', 'sod', 'rules', 'directory', 'platforms'][i], label, icon: [Inbox, CalendarCheck, Users, Layers, Split, Gavel, Fingerprint, RefreshCw][i] }));
export const AssetSelect = ({ value, onChange, label = 'Asset' }) => <select className="select" aria-label={label} value={value} onChange={onChange}><option value="">Choose…</option>{ASSET_NAMES.map((a) => <option key={a}>{a}</option>)}</select>;
export const EFFECT_TONE = { allow: 'allow', mask: 'warn', deny: 'deny' };
const EFFECT_WORD = { allow: 'Allowed', mask: 'Allowed, masked', deny: 'Denied' };

/* type-ahead over the 3,000-person directory — never a 3,000-entry drop-down */
export function PersonPicker({ value, onChange, onType, placeholder = 'Type a name', groups = false }) {
  const [q, setQ] = useState(value || '');
  const [open, setOpen] = useState(false);
  useEffect(() => { if (!value) setQ(''); else setQ(value); }, [value]);
  const t = q.trim().toLowerCase();
  const hits = t.length >= 2 ? [
    ...(groups ? GROUP_LIST.filter((g) => g.toLowerCase().includes(t)).slice(0, 3).map((g) => ({ id: g, name: g, sub: `directory group · ${PEOPLE_DIR.filter((p) => p.groups.includes(g)).length.toLocaleString('en-GB')} people` })) : []),
    ...PEOPLE_DIR.filter((p) => p.name.toLowerCase().includes(t)).slice(0, 8).map((p) => ({ id: p.id, name: p.name, sub: `${p.dept} · ${p.groups[0]}` })),
  ] : [];
  return (
    <div className="ac-pp">
      <input className="input" value={q} placeholder={placeholder} onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 150)}
        onChange={(e) => { setQ(e.target.value); setOpen(true); if (onType) onType(e.target.value); else if (!e.target.value) onChange(''); }} aria-label="Person" />
      {open && hits.length > 0 && <ul>{hits.map((p) => <li key={p.id}><button type="button" onMouseDown={() => { setQ(p.name); onChange(p.name); setOpen(false); }}><b>{p.name}</b><small>{p.sub}</small></button></li>)}</ul>}
    </div>
  );
}

/* run an action; a refusal shows inline (and as a toast) with its reason */
export function useAct() {
  const [msg, setMsg] = useState(null);
  const run = (res, okText) => { if (!res.ok) { setMsg(res.why); toast(`Refused — ${res.why}`); return false; } setMsg(null); if (okText) toast(okText); return true; };
  const Refusal = () => (msg ? <div className="gv-callout bad ac-refuse"><Lock size={15} /><span><b>Refused.</b> {msg} <span className="gv-faint">Written to the audit log.</span></span><button type="button" className="ib" aria-label="Dismiss" onClick={() => setMsg(null)}><X size={13} /></button></div> : null);
  return { run, Refusal };
}
export function RoleNote({ st, need, what }) {
  const r = roleOf(st.role);
  const ok = need.some((n) => n === st.role || r?.may.includes(n));
  if (ok) return null;
  return <div className="gv-callout warn" style={{ marginBottom: 12 }}><Lock size={15} /><span>Viewing as {st.role} ({me()}): {what} is refused for this role — switch “Viewing as (test)” to try it.</span></div>;
}

export default function Access() {
  const st = useAccess();
  const [tab, setTab] = useState('requests');
  const active = st.grants.filter((g) => g.status === 'active');
  const directoryN = st.assign.filter((a) => a.source === 'directory').length;
  const top = tab === 'reviews'
    ? [{ l: 'Reviews open', v: st.review.applied ? 0 : 1, s: 'quarterly · Restricted data' }, { l: 'Grants to review', v: active.filter((g) => g.sens === 'Restricted').length + Object.keys(st.review.dec).filter((id) => st.grants.find((g) => g.id === id)?.status === 'revoked').length, s: 'the same grants as Requests & grants' }, { l: 'Recommended to revoke', v: active.filter((g) => g.sens === 'Restricted' && recommend(g)[0] === 'Revoke').length, s: 'not used in 30 days' }]
    : tab === 'requests'
      ? [{ l: 'Requests pending', v: st.requests.filter((r) => r.status === 'pending').length, s: 'routed to owners and stewards' }, { l: 'Active grants', v: active.length, s: 'each with an expiry — the same grants Access reviews checks' }, { l: 'Access policies', v: st.policies.length, s: 'one per sensitivity level' }]
      : [{ l: 'Roles', v: st.roles.length, s: `${st.roles.filter((r) => !r.builtIn).length} defined here` }, { l: 'Role assignments', v: st.assign.length, s: `${directoryN} from the directory · ${st.assign.length - directoryN} manual` }, { l: 'Scopes', v: st.scopes.length, s: `${new Set(st.scopes.map((s) => s.level)).size} level(s) in use` }, { l: 'Identities synchronised', v: st.sync ? new Set(st.sync.results.map((r) => r.person)).size : 0, s: st.sync ? `last ${st.sync.at}` : 'not yet synchronised' }];
  return (
    <div className="page gv">
      <PageHead eyebrow="Govern" title="Access & RBAC"
        sub="Who may see what, and why: roles carrying a clearance, permissions held at system, dataset, table, column or report level, duties that may not be combined, and decisions made from the data's classification and the context of the request.">
        <Fld label="Viewing as (test)">
          <select className="select" value={st.role} onChange={(e) => setViewRole(e.target.value)} aria-label="Viewing as">{ACCESS_VIEW.map(([r, p]) => <option key={r} value={r}>{r} · {p}</option>)}</select>
        </Fld>
      </PageHead>
      <Tabs items={TABS} value={tab} onChange={setTab} />
      <Tiles items={top} />
      {tab === 'requests' && <Requests st={st} />}
      {tab === 'reviews' && <Reviews st={st} />}
      {tab === 'roles' && <RolesMatrix st={st} />}
      {tab === 'scopes' && <Scopes st={st} />}
      {tab === 'sod' && <Sod st={st} />}
      {tab === 'rules' && <Rules st={st} />}
      {tab === 'directory' && <Directory st={st} />}
      {tab === 'platforms' && <Platforms st={st} />}
    </div>
  );
}

/* ------------------------------------------------------------------ the result of a decision */
export function Decision({ res, title }) {
  return (
    <div className="gv-result">
      <header><StatusBadge s={EFFECT_TONE[res.effect]}>{res.effect === 'allow' && res.granted ? 'Allowed, full (grant held)' : EFFECT_WORD[res.effect]}</StatusBadge><b>{title}</b>
        <span className="gv-faint">asked by {res.asker.person} · {res.asker.role.name} · clearance {res.asker.cl}{res.known ? ` · ${res.sens}${res.granted ? ' · has a grant' : ''}` : ' · not in the catalogue'}</span></header>
      <ol className="gv-trace">{res.steps.map(([k, t, e], i) => <li key={k}><i>{i + 1}</i><div><b>{k}</b><small>{t}</small></div><StatusBadge s={EFFECT_TONE[e]}>{e}</StatusBadge></li>)}</ol>
      {res.cols.length > 0 && (<>
        <div className="gv-section-label">Column by column</div>
        <div className="table-wrap"><table className="tbl">
          <thead><tr><th>Column</th><th>Class</th><th>Result</th><th>Why</th></tr></thead>
          <tbody>{res.cols.map((c) => <tr key={c.col}><td><Mono>{c.col}</Mono></td><td><span className="tag mono">{c.cls}</span></td><td><StatusBadge s={EFFECT_TONE[c.effect]}>{c.effect}</StatusBadge></td><td className="gv-muted">{c.why}</td></tr>)}</tbody>
        </table></div>
      </>)}
      <Note>Every source is evaluated and any deny wins; the most specific scope decides; a mask hides the affected columns. Written to the audit log.</Note>
    </div>
  );
}

/* ------------------------------------------------------------------ requests & grants */
export function Requests({ st, show = ['request', 'requests', 'grants', 'policies', 'check'] }) {
  const has = (k) => show.includes(k);
  const [rq, setRq] = useState({ asset: '', days: 30, why: '' });
  const [gr, setGr] = useState({ asset: '', person: '', days: 30 });
  const [pol, setPol] = useState(st.policies);
  const [chk, setChk] = useState({ asset: '', column: '', person: 'Priya Shah', role: 'analyst', loc: 'uk', purpose: '' });
  const [result, setResult] = useState(null);
  const [openReq, setOpenReq] = useState(null);
  const a1 = useAct(); const a2 = useAct(); const a3 = useAct(); const a4 = useAct();
  const people = [...new Set([...st.assign.map((a) => a.person), ...st.grants.map((g) => g.person)])].sort();
  const p = rq.asset && policyFor(rq.asset);
  return (
    <>
      {has('request') && <div className="gv-two">
        <Card icon={Send} tone="info" title="Request access" sub={`You are asking as ${me()} (${st.role}, clearance ${roleOf(st.role).clearance}). Routed to the asset's owner or steward under the policy for its sensitivity.`}>
          <a1.Refusal />
          <Fld label="Asset"><AssetSelect value={rq.asset} onChange={(e) => setRq((o) => ({ ...o, asset: e.target.value }))} /></Fld>
          <div className="gv-inline">
            <Fld label="Days"><input className="input" type="number" min={1} value={rq.days} onChange={(e) => setRq((o) => ({ ...o, days: e.target.value }))} style={p && +rq.days > p.days ? { borderColor: 'var(--gv-bad)' } : undefined} /></Fld>
            <Fld label="Business justification"><input className="input" placeholder="What you need it for" value={rq.why} onChange={(e) => setRq((o) => ({ ...o, why: e.target.value }))} /></Fld>
          </div>
          <div style={{ marginTop: 12 }}><Button variant="primary" size="md" icon={Send} disabled={!rq.asset} onClick={() => { if (a1.run(requestAccess(rq), 'Request sent — written to the audit log')) setRq({ asset: '', days: 30, why: '' }); }}>Send request</Button></div>
          {p && <Note>{p.s} · approved by {p.ap.toLowerCase()} · up to {p.days} days{p.just ? ' · justification required' : ''}</Note>}
        </Card>
        <Card icon={KeyRound} tone="ok" title="Grant directly" sub="Asset owner, steward or governance lead — owners and stewards come from the Ownership register and need “Grant and revoke access directly” in the governance model.">
          <a2.Refusal />
          <Fld label="Asset"><AssetSelect value={gr.asset} onChange={(e) => setGr((o) => ({ ...o, asset: e.target.value }))} /></Fld>
          <div className="gv-inline">
            <Fld label="Person"><PersonPicker value={gr.person} onChange={(v) => setGr((o) => ({ ...o, person: v }))} /></Fld>
            <Fld label="Days"><input className="input" type="number" min={1} value={gr.days} onChange={(e) => setGr((o) => ({ ...o, days: e.target.value }))} /></Fld>
          </div>
          <div style={{ marginTop: 12 }}><Button variant="secondary" size="md" icon={KeyRound} disabled={!gr.asset || !gr.person} onClick={() => { if (a2.run(grantDirect(gr), 'Access granted — written to the audit log')) setGr({ asset: '', person: '', days: 30 }); }}>Grant</Button></div>
        </Card>
      </div>}
      {has('requests') && <Card icon={Inbox} tone="warn" title="Requests" count={st.requests.length}>
        <a3.Refusal />
        <div className="table-wrap"><table className="tbl">
          <thead><tr><th>Asset</th><th>Requested by</th><th>When</th><th>Days</th><th>Justification</th><th>Approvers</th><th>Status</th><th /></tr></thead>
          <tbody>
            {st.requests.map((r) => (<Fragment key={r.id}>
              <tr className={r.provision ? 'click' : ''} onClick={() => r.provision && setOpenReq(openReq === r.id ? null : r.id)}>
                <td><Mono>{r.asset}</Mono></td><td>{r.by}<span className="gv-sub">{r.role} · {r.clearance}</span></td><td className="gv-muted" style={{ whiteSpace: 'nowrap' }}>{r.at}</td><td>{r.days}</td><td>{r.why || '—'}</td><td>{r.approvers}</td>
                <td><StatusBadge s={r.status === 'approved' ? 'approved' : r.status === 'rejected' ? 'refused' : 'pending'}>{r.status}</StatusBadge>{r.decidedBy && <span className="gv-sub">{r.decidedBy} · {r.decidedAt}</span>}</td>
                <td style={{ whiteSpace: 'nowrap' }} onClick={(e) => e.stopPropagation()}>{r.status === 'pending' && <><Button variant="secondary" size="sm" onClick={() => a3.run(approveRequest(r.id), 'Approved and provisioned — written to the audit log')}>Approve</Button> <Button variant="subtle" size="sm" onClick={() => a3.run(rejectRequest(r.id), 'Request rejected')}>Reject</Button></>}{r.provision && <Button variant="link" onClick={() => setOpenReq(openReq === r.id ? null : r.id)}>{openReq === r.id ? 'Hide' : 'Provision'}</Button>}</td>
              </tr>
              {openReq === r.id && r.provision && <tr className="ac-prov-row"><td colSpan={8}><Provision p={r.provision} /></td></tr>}
            </Fragment>))}
            {!st.requests.length && <tr><td colSpan={8}><Empty>No requests yet — send one above (switch “Viewing as” to approve it as someone else).</Empty></td></tr>}
          </tbody>
        </table></div>
      </Card>}
      {has('grants') && <Card icon={KeyRound} tone="ok" title="Grants" count={st.grants.filter((g) => g.status === 'active').length} sub="The same grants Access reviews works on — revoking here or there changes both.">
        <a4.Refusal />
        <div className="table-wrap"><table className="tbl">
          <thead><tr><th>Asset</th><th>Person</th><th>Granted</th><th>Granted by</th><th>Expires</th><th>Last used</th><th>Status</th><th /></tr></thead>
          <tbody>
            {st.grants.map((g) => <tr key={g.id}><td><Mono>{g.asset}</Mono><span className="gv-sub">{g.sens}</span></td><td>{g.person}<span className="gv-sub">{g.role}</span></td><td>{g.granted}</td><td>{g.by}</td><td>{g.expires}</td><td>{g.lastUsed}</td><td><StatusBadge s={g.status === 'active' ? 'active' : 'refused'}>{g.status}</StatusBadge></td>
              <td>{g.status === 'active' && <Button variant="subtle" size="sm" onClick={() => a4.run(revokeGrant(g.id), 'Grant revoked — written to the audit log')}>Revoke</Button>}</td></tr>)}
          </tbody>
        </table></div>
      </Card>}
      {has('policies') && <Card icon={ShieldCheck} tone="violet" title="Access policies by sensitivity" sub="Enforced on every request and view." actions={<Button variant="secondary" size="md" onClick={() => a4.run(setPolicies(pol), 'Access policies saved — written to the audit log')}>Save policies</Button>}>
        <div className="table-wrap"><table className="tbl">
          <thead><tr><th>Sensitivity</th><th>Who approves</th><th>Max days</th><th>Justification</th><th>Mask sensitive detail without a grant</th></tr></thead>
          <tbody>{pol.map((x, i) => {
            const set = (k, v) => setPol((all) => all.map((y, j) => (j === i ? { ...y, [k]: v } : y)));
            return (
              <tr key={x.s}><td className="gv-strong">{x.s}</td>
                <td><select className="select" value={x.ap} onChange={(e) => set('ap', e.target.value)}>{APPROVERS.map((a) => <option key={a}>{a}</option>)}</select></td>
                <td><input className="input" type="number" style={{ width: 90 }} value={x.days} onChange={(e) => set('days', +e.target.value)} /></td>
                <td><label className="gv-check"><input type="checkbox" checked={x.just} onChange={(e) => set('just', e.target.checked)} />required</label></td>
                <td><label className="gv-check"><input type="checkbox" checked={x.mask} onChange={(e) => set('mask', e.target.checked)} />mask</label></td></tr>
            );
          })}</tbody>
        </table></div>
      </Card>}
      {has('check') && <Card icon={ShieldQuestion} tone="teal" title="Check access — see an asset as someone else would" sub="Uses the same decision point: scopes (most specific wins), grants, and every access rule including special-category data.">
        <div className="gv-inline">
          <Fld label="Asset"><AssetSelect value={chk.asset} onChange={(e) => setChk((o) => ({ ...o, asset: e.target.value, column: '' }))} /></Fld>
          <Fld label="Column"><select className="select" value={chk.column} onChange={(e) => setChk((o) => ({ ...o, column: e.target.value }))} disabled={!columnsOf(chk.asset).length}><option value="">All columns</option>{columnsOf(chk.asset).map((c) => <option key={c}>{c}</option>)}</select></Fld>
          <Fld label="Person"><PersonPicker value={chk.person} onType={(v) => { setChk((o) => ({ ...o, person: v })); setResult(null); }} onChange={(v) => { const pr = findPerson(v); const held = pr ? rolesFor(pr, st.assign) : []; setChk((o) => ({ ...o, person: v, role: held[0] || o.role })); setResult(null); }} /></Fld>
          <Fld label="Access role"><select className="select" value={chk.role} onChange={(e) => setChk((o) => ({ ...o, role: e.target.value }))}>{st.roles.map((r) => <option key={r.key} value={r.key}>{r.key}</option>)}</select></Fld>
          <Fld label="Location"><select className="select" value={chk.loc} onChange={(e) => setChk((o) => ({ ...o, loc: e.target.value }))}><option value="uk">United Kingdom</option><option value="non-uk">Outside the UK</option></select></Fld>
          <Fld label="Purpose"><input className="input" placeholder="optional" value={chk.purpose} onChange={(e) => setChk((o) => ({ ...o, purpose: e.target.value }))} /></Fld>
          <Button variant="secondary" size="md" icon={ShieldQuestion} disabled={!chk.asset || !chk.person.trim()} onClick={() => { const pr = findPerson(chk.person); setResult(pr ? { ...evaluate({ ...chk, person: pr.name }, 'check'), who: pr.name } : { missing: chk.person.trim() }); }}>Check</Button>
        </div>
        {result?.missing && <div className="gv-callout warn ac-refuse"><AlertTriangle size={15} /><span><b>Not found in the directory.</b> “{result.missing}” is not in AWS IAM Identity Center — pick a name from the list.</span></div>}
        {result && !result.missing && <Decision res={result} title={`${result.who} · ${chk.asset}${chk.column ? `.${chk.column}` : ''}`} />}
      </Card>}
    </>
  );
}
export function Provision({ p }) {
  return (
    <div className="ac-prov">
      <div><b><Terminal size={13} /> Provision on {p.platform}</b> <span className="gv-faint">{p.auto ? `recorded — run this statement on ${p.platform}; it publishes its grants, so the next reconciliation confirms it` : `recorded — run this statement on ${p.platform}; it does not publish its grants, so this cannot be confirmed`}</span></div>
      <code>{p.grant}</code>
      <div className="gv-faint" style={{ margin: '6px 0 2px' }}>Due to expire <b>{p.due}</b> — revoke with:</div>
      <code>{p.revoke}</code>
    </div>
  );
}

/* ------------------------------------------------------------------ roles & people */
export const sees = (r, s) => {
  const rank = CLEAR_RANK[r.clearance] || 1;
  if (s === 'Public' || s === 'Internal') return ['Full', 'ok'];
  if (s === 'Confidential') return rank >= 2 ? ['Full', 'ok'] : ['Masked', 'warn'];
  if (r.may.includes('read_sensitive')) return ['Full', 'ok'];
  return rank >= 2 ? ['Request', 'warn'] : ['Masked · request', 'fail'];
};
export function RolesMatrix({ st, hideTable = false }) {
  const [f, setF] = useState({ person: '', role: 'analyst' });
  const [nr, setNr] = useState({ name: '', clearance: 'L2', may: ['read_metadata'] });
  const a1 = useAct(); const a2 = useAct(); const a3 = useAct();
  const people = [...new Set(st.assign.map((a) => a.person))].sort();
  return (
    <>
      <RoleNote st={st} need={['governance-lead']} what="defining roles and assigning or removing them" />
      <Card icon={Eye} tone="violet" title="Who can see what" sub="Each access role's clearance decides what it sees at every sensitivity level before any grant. Like a persona: one row, one view of the estate.">
        <div className="table-wrap"><table className="tbl">
          <thead><tr><th>Access role</th><th>Clearance</th>{['Public', 'Internal', 'Confidential', 'Restricted'].map((s) => <th key={s}>{s}</th>)}</tr></thead>
          <tbody>{st.roles.map((r) => (
            <tr key={r.key}><td className="gv-strong">{r.name}{!r.builtIn && <span className="tag" style={{ marginLeft: 6 }}>defined here</span>}</td><td><span className="tag">{r.clearance}</span></td>
              {['Public', 'Internal', 'Confidential', 'Restricted'].map((s) => { const [v, tone] = sees(r, s); return <td key={s}><StatusBadge s={tone}>{v}</StatusBadge></td>; })}</tr>
          ))}</tbody>
        </table></div>
        <Note>Full: columns and profiles shown. Masked: PII and FINANCIAL columns hidden. Request: visible in the catalogue, detail needs a grant from the owner. Special-category columns always need L3. Roles holding read_sensitive (governance lead, DPO) see Restricted data in full without stating a purpose — the decision point applies the same rule.</Note>
      </Card>
      {!hideTable && <Card icon={Users} tone="info" title="Access roles" count={st.roles.length}>
        <a3.Refusal />
        <div className="table-wrap"><table className="tbl">
          <thead><tr><th>Access role</th><th>Clearance</th><th>May do</th><th>Held by</th></tr></thead>
          <tbody>{st.roles.map((r) => { const who = st.assign.filter((a) => a.role === r.key); return (
            <tr key={r.key}><td><span className="gv-strong">{r.name}</span><span className="gv-sub mono">{r.key}{!r.builtIn ? ` · defined by ${r.by}, ${r.at}` : ''}</span></td><td><span className="tag">{r.clearance}</span></td>
              <td><div className="gv-tags">{r.may.map((m) => <span key={m} className="tag mono">{m}</span>)}</div></td>
              <td>{who.length ? <div className="ac-held">{who.map((a) => <span key={a.person} className={`ac-person ${a.source}`} title={`${a.source} · since ${a.at}`}>{a.person}<em>{a.source}</em><button type="button" aria-label={`Remove ${r.key} from ${a.person}`} onClick={() => a3.run(unassign(a.person, r.key), `Removed ${r.key} from ${a.person}`)}><X size={11} /></button></span>)}</div> : <span className="gv-faint">nobody yet</span>}</td></tr>
          ); })}</tbody>
        </table></div>
      </Card>}
      <div className="gv-two">
        <Card icon={UserPlus} tone="ok" title="Assign an access role" sub="Checked against separation of duties when it would happen — a clash is refused with the reason.">
          <a1.Refusal />
          <div className="gv-inline">
            <Fld label="Person"><input className="input" list="ac-people" placeholder="e.g. Sarah Jones" value={f.person} onChange={(e) => setF((o) => ({ ...o, person: e.target.value }))} /><datalist id="ac-people">{people.map((x) => <option key={x} value={x} />)}</datalist></Fld>
            <Fld label="Access role"><select className="select" value={f.role} onChange={(e) => setF((o) => ({ ...o, role: e.target.value }))}>{st.roles.map((r) => <option key={r.key} value={r.key}>{r.name}</option>)}</select></Fld>
            <Button variant="primary" size="md" icon={Plus} disabled={!f.person.trim()} onClick={() => { if (a1.run(assignRole(f.person, f.role), `Assigned ${f.role} to ${f.person.trim()} — written to the audit log`)) setF((o) => ({ ...o, person: '' })); }}>Assign access role</Button>
          </div>
          <Note>Try: assign auditor to Admin (already governance-lead) — refused. {hideTable ? 'Manual assignments show on each access-role card and can be removed from its member list.' : 'Held by shows whether each assignment came from the directory or was made here (manual).'}</Note>
        </Card>
        <Card icon={BadgePlus} tone="violet" title="Define an access role" sub="Governance leads only. The access role carries a clearance and a set of permissions.">
          <a2.Refusal />
          <div className="gv-inline">
            <Fld label="Name"><input className="input" placeholder="e.g. Privacy analyst" value={nr.name} onChange={(e) => setNr((o) => ({ ...o, name: e.target.value }))} /></Fld>
            <Fld label="Clearance"><select className="select" value={nr.clearance} onChange={(e) => setNr((o) => ({ ...o, clearance: e.target.value }))}>{['L1', 'L2', 'L3'].map((c) => <option key={c}>{c}</option>)}</select></Fld>
          </div>
          <Fld label="Permissions"><ChipPick options={PERMISSIONS} value={nr.may} onChange={(v) => setNr((o) => ({ ...o, may: v }))} /></Fld>
          <Button variant="primary" size="md" icon={BadgePlus} disabled={!nr.name.trim()} onClick={() => { if (a2.run(defineRole(nr), `Defined the role “${nr.name.trim()}” — written to the audit log`)) setNr({ name: '', clearance: 'L2', may: ['read_metadata'] }); }}>Define access role</Button>
        </Card>
      </div>
    </>
  );
}


/* Searchable catalogue picker for a scope's target (Karan, 5 Oct 2026): one search over every harvested system,
   dataset, table, column and report. Matches at the chosen level come first; a match at another level can be
   picked too and switches the level. Keyboard: ↑ ↓ to move, Enter to pick, Esc to close. */
const LEVEL_PLURAL = { system: 'Systems', dataset: 'Datasets', table: 'Tables', column: 'Columns', report: 'Reports' };
const targetText = (t) => `${t.id} ${t.system || ''} ${t.cls || ''}`.toLowerCase();
export function TargetPicker({ level, value, onPick }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [hi, setHi] = useState(0);
  const box = useRef(null); const inp = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    setQ(''); setHi(0); setTimeout(() => inp.current?.focus(), 0);
    const off = (e) => { if (box.current && !box.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', off);
    return () => document.removeEventListener('mousedown', off);
  }, [open]);
  const words = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const match = (t) => words.every((w) => targetText(t).includes(w));
  const here = TARGETS[level].filter(match);
  const other = words.length ? LEVELS.filter((l) => l !== level).map((l) => [l, TARGETS[l].filter(match)]).filter(([, xs]) => xs.length) : [];
  const flat = [...here.map((t) => [level, t]), ...other.flatMap(([l, xs]) => xs.slice(0, 5).map((t) => [l, t]))];
  const pick = ([l, t]) => { onPick(l, t.id); setOpen(false); };
  const cur = value ? TARGETS[level].find((t) => t.id === value) : null;
  const onKey = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setHi((h) => Math.min(h + 1, flat.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHi((h) => Math.max(h - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); if (flat[hi]) pick(flat[hi]); }
    else if (e.key === 'Escape') setOpen(false);
  };
  useEffect(() => { box.current?.querySelector('.ac-tp-row.hi')?.scrollIntoView({ block: 'nearest' }); }, [hi]);
  let n = -1;
  const row = (l, t) => { n += 1; const i = n; return (
    <li key={`${l}:${t.id}`}><button type="button" className={`ac-tp-row${i === hi ? ' hi' : ''}${l === level && t.id === value ? ' on' : ''}`} onMouseEnter={() => setHi(i)} onClick={() => pick([l, t])}>
      <span className="mono">{t.id}</span>
      <small>{l !== 'system' ? t.system : 'system'}{t.cls ? ` · ${t.cls}` : ''}{l !== level ? <span className="tag">{l}</span> : null}</small>
    </button></li>); };
  return (
    <div className="ac-tp" ref={box}>
      <button type="button" className="select ac-tp-trigger" aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        {cur ? <span><span className="mono">{cur.id}</span>{level !== 'system' && <small> — {cur.system}</small>}</span> : <span className="ac-tp-ph">Choose a {level}…</span>}
      </button>
      {open && (
        <div className="ac-tp-pop" role="listbox">
          <div className="ac-tp-search"><Search size={15} /><input ref={inp} className="input" value={q} placeholder="Search systems, datasets, tables, columns, reports" aria-label="Search the catalogue" onChange={(e) => { setQ(e.target.value); setHi(0); }} onKeyDown={onKey} /></div>
          <div className="ac-tp-list">
            <div className="ac-tp-group">{LEVEL_PLURAL[level]} <span>{here.length} of {TARGETS[level].length}</span></div>
            <ul>{here.map((t) => row(level, t))}</ul>
            {!here.length && <p className="ac-tp-none">No {level} matches “{q.trim()}”.</p>}
            {other.map(([l, xs]) => (
              <Fragment key={l}>
                <div className="ac-tp-group">{LEVEL_PLURAL[l]} <span>{xs.length > 5 ? `5 of ${xs.length}` : xs.length} · picking one switches the level</span></div>
                <ul>{xs.slice(0, 5).map((t) => row(l, t))}</ul>
              </Fragment>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ permissions by level */
export function Scopes({ st }) {
  const [f, setF] = useState({ role: 'analyst', level: 'table', target: '', actions: ['read_metadata'] });
  const a1 = useAct(); const a2 = useAct();
  return (
    <>
      <RoleNote st={st} need={['governance-lead']} what="setting or removing scopes" />
      <Card icon={Layers} tone="teal" title="Permissions by level" count={st.scopes.length} sub="A scope narrows or widens what an access role may do on part of the estate. When several match, the most specific wins: column, then table or report, then dataset, then system.">
        <a2.Refusal />
        <div className="table-wrap"><table className="tbl">
          <thead><tr><th>Access role</th><th>Level</th><th>Target</th><th>System</th><th>Actions</th><th>Set by</th><th /></tr></thead>
          <tbody>
            {st.scopes.map((s, i) => <tr key={i}><td>{roleOf(s.role)?.name || s.role}</td><td><span className="tag">{s.level}</span></td><td><Mono>{s.target}</Mono></td><td className="gv-muted">{statementFor(s).sys}</td><td><div className="gv-tags">{s.actions.map((a) => <span key={a} className="tag mono">{a}</span>)}</div></td><td>{s.by}<span className="gv-sub">{s.at}</span></td>
              <td><Button variant="subtle" size="sm" onClick={() => a2.run(removeScope(i), 'Scope removed — written to the audit log')}>Remove</Button></td></tr>)}
            {!st.scopes.length && <tr><td colSpan={7}><Empty>No scope set yet — access roles carry only their own permissions.</Empty></td></tr>}
          </tbody>
        </table></div>
      </Card>
      <Card icon={Plus} tone="ok" title="Set a scope" sub="Pick the target from the catalogue — systems, datasets, tables, columns or reports that GenMeta has harvested.">
        <a1.Refusal />
        <div className="gv-inline">
          <Fld label="Access role"><select className="select" value={f.role} onChange={(e) => setF((o) => ({ ...o, role: e.target.value }))}>{st.roles.map((r) => <option key={r.key} value={r.key}>{r.name}</option>)}</select></Fld>
          <Fld label="Level"><select className="select" value={f.level} onChange={(e) => setF((o) => ({ ...o, level: e.target.value, target: '' }))}>{LEVELS.map((l) => <option key={l}>{l}</option>)}</select></Fld>
          <Fld label={`Target ${f.level}`}><TargetPicker level={f.level} value={f.target} onPick={(level, target) => setF((o) => ({ ...o, level, target }))} /></Fld>
        </div>
        <Fld label="Actions"><ChipPick options={PERMISSIONS} value={f.actions} onChange={(v) => setF((o) => ({ ...o, actions: v }))} /></Fld>
        <Button variant="primary" size="md" disabled={!f.target || !f.actions.length} onClick={() => { if (a1.run(saveScope(f), 'Scope saved — written to the audit log')) setF((o) => ({ ...o, target: '', actions: ['read_metadata'] })); }}>Save scope</Button>
        <Note>The decision point and Check access show the deciding scope as its own step. A scope with read_metadata only shows the target masked; read_profile or read_sensitive shows it.</Note>
      </Card>
    </>
  );
}

/* ------------------------------------------------------------------ separation of duties */
export function Sod({ st }) {
  const a1 = useAct();
  const held = combinationsHeld(st);
  const offBuiltIn = st.sod.filter((s) => s.builtIn && !s.on);
  return (
    <Card icon={Split} tone="warn" title="Separation of duties" sub="Duties that may not be held by one person. Conflicts are refused when they would happen, with the reason — not reported afterwards.">
      <RoleNote st={st} need={['governance-lead']} what="switching rules on or off" />
      <a1.Refusal />
      {offBuiltIn.length > 0 && <div className="gv-callout bad" style={{ marginBottom: 12 }}><AlertTriangle size={15} /><span><b>Built-in rule switched off:</b> {offBuiltIn.map((s) => `${s.a} ↔ ${s.b}`).join(', ')}. Assignments that break {offBuiltIn.length === 1 ? 'it' : 'them'} are now allowed — most auditors expect {offBuiltIn.length === 1 ? 'this rule' : 'these rules'} on. The change is in the audit log.</span></div>}
      <div className="table-wrap"><table className="tbl">
        <thead><tr><th>Conflict</th><th>Kind</th><th>Why</th><th>Enforced</th><th>State</th></tr></thead>
        <tbody>{st.sod.map((s, i) => (
          <tr key={s.a + s.b} className={!s.on && s.builtIn ? 'ac-off' : ''}><td><Mono>{s.a} ↔ {s.b}</Mono>{s.builtIn && <span className="gv-sub">built in{!s.on ? ' · switched off' : ''}</span>}</td><td>{s.kind}</td><td>{s.why}</td><td className="gv-muted">{s.when}</td>
            <td><Switch on={s.on} label={`${s.a} and ${s.b}`} onChange={(v) => a1.run(toggleSod(i, v), v ? `Switched on ${s.a} ↔ ${s.b}` : `Switched off ${s.a} ↔ ${s.b}${s.builtIn ? ' — built-in rule, warning shown' : ''}`)} /></td></tr>
        ))}</tbody>
      </table></div>
      <div className="gv-section-label">Combinations held today</div>
      {held.length ? (
        <div className="table-wrap"><table className="tbl">
          <thead><tr><th>Person</th><th>Holds</th><th>Breaks</th><th>Why it matters</th></tr></thead>
          <tbody>{held.map((h) => <tr key={h.person + h.rule.a + h.rule.b}><td className="gv-strong">{h.person}</td><td><Mono>{h.detail}</Mono></td><td><Mono>{h.rule.a} ↔ {h.rule.b}</Mono>{!h.rule.on && <span className="gv-sub">rule is off</span>}</td><td className="gv-muted">{h.rule.why} Remove one of the access roles in Roles & people › Access roles.</td></tr>)}</tbody>
        </table></div>
      ) : <p style={{ fontSize: 13, margin: 0 }}>No one holds a conflicting combination ({new Set(st.assign.map((a) => a.person)).size} people checked).</p>}
    </Card>
  );
}

/* ------------------------------------------------------------------ access rules */
export function Rules({ st }) {
  const [f, setF] = useState({ asset: 'INT.CUSTOMER', column: '', loc: 'uk', purpose: '' });
  const [res, setRes] = useState(null);
  const cols = columnsOf(f.asset);
  const r = roleOf(st.role);
  return (
    <>
      <Card icon={Gavel} tone="bad" title="Access rules" sub="Evaluated on every view, in order; any deny wins.">
        <div className="table-wrap"><table className="tbl">
          <thead><tr><th className="num">#</th><th>Rule</th><th>Applies when</th><th>Effect</th></tr></thead>
          <tbody>{ACCESS_RULES.map((x) => <tr key={x.id}><td className="num">{x.n}</td><td><span className="gv-strong">{x.name}</span><span className="gv-sub mono">{x.id}</span></td><td><Mono>{x.when}</Mono></td><td><StatusBadge s={x.effect === 'deny' ? 'deny' : 'warn'}>{x.effect}</StatusBadge></td></tr>)}</tbody>
        </table></div>
      </Card>
      <Card icon={ShieldQuestion} tone="teal" title="Ask the decision point" sub={`Asking as ${me()} — ${r.name}, clearance ${r.clearance}. Change “Viewing as (test)” to ask as someone else.`}>
        <div className="gv-inline">
          <Fld label="Asset"><input className="input mono" list="ac-assets" placeholder="INT.CUSTOMER" value={f.asset} onChange={(e) => setF((o) => ({ ...o, asset: e.target.value, column: '' }))} /><datalist id="ac-assets">{ASSET_NAMES.map((a) => <option key={a} value={a} />)}</datalist></Fld>
          <Fld label="Column"><select className="select" value={f.column} onChange={(e) => setF((o) => ({ ...o, column: e.target.value }))} disabled={!cols.length}><option value="">All columns</option>{cols.map((c) => <option key={c} value={c}>{c} · {colClass(c)}</option>)}</select></Fld>
          <Fld label="Location"><select className="select" value={f.loc} onChange={(e) => setF((o) => ({ ...o, loc: e.target.value }))}><option value="uk">United Kingdom</option><option value="non-uk">Outside the UK</option></select></Fld>
          <Fld label="Purpose"><input className="input" placeholder="why you are asking" value={f.purpose} onChange={(e) => setF((o) => ({ ...o, purpose: e.target.value }))} /></Fld>
          <Button variant="primary" size="md" disabled={!f.asset.trim()} onClick={() => setRes(evaluate({ ...f, asset: f.asset.trim(), role: st.role, person: me() }))}>Evaluate</Button>
        </div>
        {res && <Decision res={res} title={`${f.asset}${f.column ? `.${f.column}` : ''}`} />}
        {!res && <Note>Try INT.CUSTOMER with column DISABILITY_FLAG as an analyst (L1) — denied by the special-category rule; as the DPO (L3) it is allowed. An asset that is not in the catalogue is refused.</Note>}
      </Card>
    </>
  );
}

/* ------------------------------------------------------------------ directory & identity */
const OUT_TONE = { applied: 'ok', unchanged: 'info', skipped: 'warn', refused: 'fail' };
export function Directory({ st, syncOnly = false }) {
  const a1 = useAct();
  const map = Object.fromEntries(DIRECTORY);
  const res = st.sync?.results || [];
  const sm = syncSummary(st.sync);
  return (
    <>
      {!syncOnly && <Card icon={Fingerprint} tone="warn" title="AWS IAM Identity Center" sub="Test directory — groups and members below. The group carries the access role, the access role carries the clearance."
        actions={<Button variant="secondary" size="md" icon={RefreshCw} onClick={() => a1.run(syncDirectory(), 'Directory synchronised — written to the audit log')}>Synchronise now</Button>}>
        <RoleNote st={st} need={['governance-lead', 'platform-ops']} what="synchronising the directory" />
        <a1.Refusal />
        <div className="table-wrap"><table className="tbl">
          <thead><tr><th>Directory group</th><th>Access role in GenMeta</th><th>Members</th></tr></thead>
          <tbody>{DIRECTORY_MEMBERS.map(([g, people]) => <tr key={g}><td><Mono>{g}</Mono></td><td>{map[g] ? <span className="tag mono">{map[g]}</span> : <StatusBadge s="warn">no mapping</StatusBadge>}</td><td>{people.join(', ')}</td></tr>)}</tbody>
        </table></div>
        <Note>Microsoft Entra ID / Active Directory: the same group → access role → clearance mapping over SCIM or OIDC group claims. Manual assignments made in Roles & people › Access roles stay and keep their “manual” label.</Note>
      </Card>}
      {st.sync && (
        <Card icon={ListChecks} tone="info" title="Last synchronisation" count={sm.total.toLocaleString('en-GB')} sub={`${st.sync.at} by ${st.sync.by} · ${sm.total.toLocaleString('en-GB')} identities · ${sm.applied} applied · ${sm.unchanged.toLocaleString('en-GB')} unchanged · ${sm.skipped} skipped: no group · ${sm.refused} refused: separation of duties`}>
          <div className="table-wrap"><table className="tbl">
            <thead><tr><th>Person</th><th>Group</th><th>Access role</th><th>Result</th><th>Why</th></tr></thead>
            <tbody>{res.map((x) => <tr key={x.person + x.group}><td className="gv-strong">{x.person}</td><td><Mono>{x.group}</Mono></td><td>{x.role !== '—' ? <span className="tag mono">{x.role}</span> : '—'}</td><td><StatusBadge s={OUT_TONE[x.outcome]}>{x.outcome === 'skipped' ? 'skipped: no group' : x.outcome === 'refused' ? 'refused: separation of duties' : x.outcome}</StatusBadge></td><td className="gv-muted">{x.why}</td></tr>)}
            {(st.sync.skippedOthers || []).map(([g, k]) => <tr key={`skip-${g}`}><td className="gv-strong">{k.toLocaleString('en-GB')} other members of {g}</td><td><Mono>{g}</Mono></td><td>—</td><td><StatusBadge s={OUT_TONE.skipped}>skipped: no group</StatusBadge></td><td className="gv-muted">no group mapping — the group carries no GenMeta role · counted, not listed (Roles & people › People, filter “Without an access role”)</td></tr>)}
            {st.sync.others > 0 && <tr><td className="gv-strong">{st.sync.others.toLocaleString('en-GB')} other people</td><td className="gv-muted">their groups</td><td>—</td><td><StatusBadge s="info">unchanged</StatusBadge></td><td className="gv-muted">already hold the access roles their groups carry — counted, not listed</td></tr>}</tbody>
          </table></div>
          <Note>Applied people now count towards each access role under Roles & people › Access roles, labelled “directory”.</Note>
        </Card>
      )}
    </>
  );
}

/* ------------------------------------------------------------------ platform consistency */
export function Platforms({ st }) {
  const a1 = useAct();
  const rc = st.recon;
  const rows = rc?.rows || [];
  const m = rows.filter((r) => r.state === 'missing').length; const nc = rows.filter((r) => r.state === 'not checkable').length;
  return (
    <>
      <Card icon={RefreshCw} tone="teal" title="Platform consistency" sub={rc ? `Last reconciled ${rc.at} by ${rc.by} · ${rows.length} scope(s) checked, ${m} missing in the platform, ${nc} not checkable · platform roles follow GENMETA_<ROLE>` : 'Not reconciled yet in this session · platform roles follow GENMETA_<ROLE>'}
        actions={<Button variant="secondary" size="md" icon={RefreshCw} onClick={() => a1.run(reconcile(), 'Reconciled — written to the audit log')}>Reconcile now</Button>}>
        <RoleNote st={st} need={['governance-lead', 'platform-ops']} what="reconciling platforms" />
        <a1.Refusal />
        <p className="gv-muted" style={{ fontSize: 13, margin: '0 0 12px' }}>Automatic correction: none — GenMeta checks each saved scope on its platform, reports drift and gives the statement to correct it.</p>
        <div className="table-wrap"><table className="tbl">
          <thead><tr><th>Platform</th><th className="num">Assets</th><th>Grants readable</th><th className="num">Scopes checked</th><th className="num">Not checkable</th><th className="num">Missing in platform</th><th>What to run</th></tr></thead>
          <tbody>{PLATFORMS.map(([p, n, ok, why]) => { const x = rc?.per[p]; return (
            <tr key={p}><td className="gv-strong">{p}</td><td className="num">{n}</td><td><StatusBadge s={ok ? 'yes' : 'warn'}>{ok ? 'yes' : 'no'}</StatusBadge><span className="gv-sub">{why}</span></td>
              <td className="num">{x ? x.checked : '—'}</td><td className="num">{x ? x.nc : '—'}</td><td className="num">{x ? (x.missing ? <b className="ac-bad">{x.missing}</b> : 0) : '—'}</td>
              <td>{x && x.sql.length ? <code className="ac-sql">{x.sql.join('\n')}</code> : <span className="gv-faint">{x ? 'nothing' : '—'}</span>}</td></tr>
          ); })}</tbody>
        </table></div>
        <Note>Where a platform cannot report its grants, it says so and why — the register is never presented as confirmed when it has not been checked.</Note>
      </Card>
      {rc && (
        <Card icon={Terminal} tone="info" title="Scope by scope" count={rows.length}>
          <div className="table-wrap"><table className="tbl">
            <thead><tr><th>Scope</th><th>Platform</th><th>In the platform</th><th>Statement</th></tr></thead>
            <tbody>{rows.map((r, i) => <tr key={i}><td><span className="tag">{r.scope.level}</span> <Mono>{r.scope.target}</Mono><span className="gv-sub">{r.scope.role} · {r.scope.actions.join(', ')}</span></td><td>{r.sys}</td>
              <td><StatusBadge s={r.state === 'present' ? 'ok' : r.state === 'missing' ? 'fail' : 'warn'}>{r.state}</StatusBadge>{r.why && <span className="gv-sub">{r.why}</span>}</td><td><code className="ac-sql">{r.sql}</code></td></tr>)}</tbody>
          </table></div>
        </Card>
      )}
    </>
  );
}

/* ------------------------------------------------------------------ access reviews (the same grants as Requests & grants) */
export function Reviews({ st }) {
  const [f, setF] = useState('all');
  const a1 = useAct();
  const dec = st.review.dec; const applied = st.review.applied;
  const items = st.grants.filter((g) => g.sens === 'Restricted' && (g.status === 'active' || dec[g.id]));
  const done = items.filter((g) => dec[g.id]).length;
  const rows = items.filter((r) => f === 'all' || (f === 'pending' ? !dec[r.id] : dec[r.id]));
  const acceptAll = () => items.forEach((r) => setReviewDecision(r.id, recommend(r)[0] === 'Keep' ? 'Approve' : 'Deny'));
  const DEC_TONE = { Approve: 'ok', Deny: 'fail', "Don't know": 'warn' };
  return (
    <>
      <Card icon={CalendarCheck} tone="violet" title="Quarterly review — Restricted data, Q4 2026" sub={`Started 1 Oct 2026 · ends 31 Oct 2026 · reviewers: each asset's owner · ${items.length} grant(s) — the same active grants listed under Requests & grants`}
        actions={<>
          <Button variant="secondary" size="md" onClick={acceptAll} disabled={!!applied}>Accept recommendations</Button>
          <Button variant="primary" size="md" disabled={!done || !!applied} onClick={() => { const before = st.grants.filter((g) => g.status === 'active').length; if (a1.run(applyReview())) toast(`Applied: ${Object.values(dec).filter((d) => d === 'Deny').length} grant(s) revoked — active grants ${before} → ${before - Object.values(dec).filter((d) => d === 'Deny').length}`); }}>Apply results</Button>
        </>}>
        <a1.Refusal />
        <div className="gv-bars" style={{ marginBottom: 6 }}><div><span>{done} of {items.length} reviewed</span><Meter pct={items.length ? done / items.length : 0} tone="info" /><b>{items.length ? Math.round((done / items.length) * 100) : 0}%</b></div></div>
        {applied && <Note>Results applied on {applied}. Revoked grants show as revoked under Requests & grants too; Rplus_DWH grants are removed in the platform, the others get the REVOKE statement.</Note>}
      </Card>
      <Card icon={ListChecks} tone="info" title="Grants to review" count={rows.length} actions={<Segmented size="sm" value={f} onChange={setF} options={[{ value: 'all', label: 'All' }, { value: 'pending', label: 'Not reviewed' }, { value: 'done', label: 'Reviewed' }]} />}>
        <div className="table-wrap"><table className="tbl">
          <thead><tr><th>Person</th><th>Asset</th><th>Granted</th><th>Last used</th><th>Recommendation</th><th>Decision</th></tr></thead>
          <tbody>{rows.map((r) => { const [rec, why] = recommend(r); return (
            <tr key={r.id}>
              <td><span className="gv-strong">{r.person}</span><span className="gv-sub">{r.role} · {r.why}</span></td>
              <td><Mono>{r.asset}</Mono><span className="gv-sub">{r.sens} · owner {ownerOf(r.asset) || '—'} · {systemOf(r.asset)}</span></td>
              <td>{r.granted}</td><td>{r.lastUsed}</td>
              <td><StatusBadge s={rec === 'Keep' ? 'ok' : 'fail'}>{rec}</StatusBadge><span className="gv-sub">{why}</span></td>
              <td style={{ whiteSpace: 'nowrap' }}>{dec[r.id] ? <><StatusBadge s={DEC_TONE[dec[r.id]]}>{dec[r.id]}</StatusBadge> {!applied && <Button variant="link" onClick={() => clearReviewDecision(r.id)}>Change</Button>}</> : (
                <span className="gv-actions">
                  <Button variant="secondary" size="sm" icon={Check} onClick={() => setReviewDecision(r.id, 'Approve')}>Approve</Button>
                  <Button variant="secondary" size="sm" icon={X} onClick={() => setReviewDecision(r.id, 'Deny')}>Deny</Button>
                  <Button variant="subtle" size="sm" icon={HelpCircle} onClick={() => setReviewDecision(r.id, "Don't know")}>Don't know</Button>
                </span>
              )}</td>
            </tr>
          ); })}
          {!rows.length && <tr><td colSpan={6}><Empty>No grants to review.</Empty></td></tr>}</tbody>
        </table></div>
      </Card>
    </>
  );
}
