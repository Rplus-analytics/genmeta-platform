import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Check, Search, Send, Flag, Lock, CircleSlash, Zap, UserCheck, Bell, ListChecks, Box, Layers, X } from 'lucide-react';
import { ASSET, DOMAINS, CRIT, SENS, D, ainfo } from '../../data/products.js';
import { Button, Segmented } from '../../components/ui.jsx';
import { Fl, Tiles, OwnerPicker } from '../../governance/RegisterModel.jsx';
import { sensitivityOf } from '../../governance/data.js';
import { pathFor, startRequest, stateOf, approverText, condText, useWorkflowStore } from '../../governance/workflows.js';
import { getQuarantine } from '../../catalogue/quality/store.js';
import { useProducts, paths } from './shared.jsx';

/* Create a data product — one page with a live panel, the same pattern as Governance › AI model governance ›
   Register an external AI model (Oct 2026). Four sections (About · Classification · Assets · Output ports);
   the panel keeps a preview of the product, its publication path from Governance › Workflows
   (“Data product publication”) and what is still needed up to date as you answer.
   Editing a product's assets opens the same page with only the Assets and Output ports sections. */

const SECTIONS = [['cp-about', 'About this product'], ['cp-class', 'Classification'], ['cp-assets', 'Assets'], ['cp-ports', 'Output ports']];
const CRIT_OPTS = [['high', 'High', 'Outages stop a business process', 'bad'], ['medium', 'Medium', 'Used in regular reporting', 'warn'], ['low', 'Low', 'Exploratory or nice to have', 'ok']];
const SENS_OPTS = [['public', 'Public', 'Anyone in the organisation', 'ok'], ['internal', 'Internal', 'Staff with a business need', 'ok'], ['confidential', 'Confidential', 'Named consumers only', 'warn']];
const VIS = [['Private to domain members', 'Domain members'], ['Private to selected members', 'Selected members'], ['Public', 'Everyone']];
const EVENT = 'Data product published';
const KIND_ICON = { approval: UserCheck, automated: Zap, task: ListChecks, notify: Bell };
const ruleMatch = (r) => { if (!r.val) return []; const v = r.val.toLowerCase(); return Object.keys(ASSET).filter((a) => { const x = ASSET[a]; const f = r.attr === 'Connection' ? x[0] : r.attr === 'Asset type' ? x[1] : a; return r.op === 'is' ? f.toLowerCase() === v : f.toLowerCase().includes(v); }); };

export default function Create() {
  const nav = useNavigate();
  const loc = useLocation();
  const store = useProducts();
  const { workflows } = useWorkflowStore();
  const init = loc.state || {};
  const editing = init.edit ? store.PR(init.edit) : null;

  const [n, setN] = useState(() => (editing
    ? { name: editing.name, desc: editing.desc, domain: editing.domain, crit: editing.crit, sens: editing.sens, owners: [editing.owner, ...editing.experts], vis: editing.vis, assets: editing.assets.slice(), outputs: editing.outputs.slice() }
    : { name: '', desc: '', domain: 'customer', crit: '', sens: '', owners: ['Admin'], vis: 'Private to domain members', assets: [], outputs: [], ...(init.prefill || {}) }));
  const [mode, setMode] = useState('browse');
  const [rule, setRule] = useState({ attr: 'Connection', op: 'is', val: '' });
  const [q, setQ] = useState('');
  const [src, setSrc] = useState('');
  const [onlySel, setOnlySel] = useState(false);
  const [active, setActive] = useState(editing ? 'cp-assets' : 'cp-about');
  const [saved, setSaved] = useState(null);
  const up = (patch) => setN((o) => ({ ...o, ...patch }));
  const set = (k) => (e) => up({ [k]: e?.target ? e.target.value : e });
  const sections = editing ? SECTIONS.slice(2) : SECTIONS;

  /* what the page knows from the answers */
  const outputs = n.outputs.filter((a) => n.assets.includes(a));
  const restricted = n.assets.filter((a) => sensitivityOf(a) === 'Restricted');
  const quarantined = (() => { const qs = new Set(getQuarantine().map((x) => x.asset)); return n.assets.filter((a) => qs.has(a)); })();
  const inputs = n.assets.filter((a) => store.products.some((p) => p.id !== editing?.id && p.outputs.includes(a)));
  const taken = !editing && n.name.trim() && store.PR(n.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''));
  const done = [!!(n.name.trim() && !taken && n.owners.length && n.domain), !!(n.crit && n.sens), n.assets.length > 0, outputs.length > 0];
  const fields = [n.name.trim() && !taken, n.desc.trim(), n.owners.length, n.crit, n.sens, n.assets.length, outputs.length];
  const pct = editing ? (done[2] && done[3] ? 100 : done[2] ? 50 : 0) : Math.round((fields.filter(Boolean).length / fields.length) * 100);
  const ready = editing ? done[2] : done[0] && done[1] && done[2];

  /* publication path, live from Governance › Workflows */
  const wf = workflows.find((w) => w.module === 'data-products' && w.event === EVENT && w.status === 'active');
  const ctx = { Sensitivity: restricted.length ? 'Restricted' : (n.sens ? SENS[n.sens][0] : undefined), Criticality: n.crit ? CRIT[n.crit][0] : undefined };
  const path = wf ? pathFor(wf, ctx) : [];
  const approvals = path.filter((p) => p.applies && (p.step.kind === 'approval' || p.step.kind === 'task'));
  const days = approvals.reduce((x, p) => x + p.step.sla, 0);

  useEffect(() => {
    const io = new IntersectionObserver((es) => es.forEach((e) => e.isIntersecting && setActive(e.target.id)), { rootMargin: '-35% 0px -60% 0px' });
    sections.forEach(([id]) => { const el = document.getElementById(id); if (el) io.observe(el); });
    if (editing && init.step === 2) setTimeout(() => jump('cp-ports'), 50);
    return () => io.disconnect();
  }, []);
  const jump = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  const toggleAsset = (a) => up({ assets: n.assets.includes(a) ? n.assets.filter((x) => x !== a) : [...n.assets, a] });
  const toggleOutput = (a) => up({ outputs: outputs.includes(a) ? outputs.filter((x) => x !== a) : [...outputs, a] });
  const addRule = () => { const add = ruleMatch(rule).filter((a) => !n.assets.includes(a)); up({ assets: [...n.assets, ...add] }); store.toast(`${add.length} asset${add.length === 1 ? '' : 's'} added from the rule`); };

  const cancel = () => nav(editing ? paths.product(editing.id) : paths.home);
  const finish = (status) => {
    if (editing) { store.updateAssets(editing.id, n.assets, outputs); nav(paths.product(editing.id)); return; }
    const id = store.createProduct({ ...n, outputs }, status);
    if (!id) return;
    if (status === 'published' && wf) {
      const req = startRequest(wf.id, { kind: 'product', id, label: n.name.trim(), owners: n.owners }, ctx, 'Admin');
      const st = stateOf(req);
      store.toast(`${n.name.trim()} published — publication check ${req.id} started; next: ${st.cur ? st.cur.step.name : 'done'}`);
    }
    nav(paths.product(id));
  };

  /* asset browser */
  const all = Object.keys(ASSET);
  const sources = [...new Set(all.map((a) => ASSET[a][0]))];
  const list = all.filter((a) => (!src || ASSET[a][0] === src) && (!onlySel || n.assets.includes(a)) && `${a} ${ASSET[a][0]} ${ASSET[a][1]}`.toLowerCase().includes(q.trim().toLowerCase()));
  const d = D(n.domain);
  const missing = [
    !editing && !done[0] && ['cp-about', taken ? 'About — a product with this name already exists' : 'About — name, domain and an owner'],
    !editing && !done[1] && ['cp-class', 'Classification — criticality and sensitivity'],
    !done[2] && ['cp-assets', 'Assets — add at least one'],
    !done[3] && ['cp-ports', 'Output ports — optional; the first asset is used if none'],
  ].filter(Boolean);
  const blocking = missing.filter(([id]) => id !== 'cp-ports');

  return (
    <div className="page gv rg cp">
      <div className="rg-top">
        <div>
          <span className="gv-eyebrow">Data products</span>
          <h1>{editing ? `Edit assets — ${editing.name}` : 'Create a data product'}</h1>
        </div>
        <div className="gv-inline" style={{ gap: 8, alignItems: 'center' }}>
          {!editing && <span className="gv-faint" style={{ fontSize: 12 }}>{saved ? `Draft saved ${saved}` : 'Draft · not saved yet'}</span>}
          <Button variant="secondary" onClick={cancel}>Cancel</Button>
          {editing ? <Button variant="primary" icon={Check} disabled={!ready} onClick={() => finish()}>Save changes</Button> : (<>
            <Button variant="secondary" disabled={!n.name.trim() || taken} onClick={() => { setSaved(new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })); finish('draft'); }}>Save as draft</Button>
            <Button variant="primary" icon={Send} disabled={!ready || quarantined.length > 0} title={quarantined.length ? `${quarantined[0]} is quarantined by Data quality` : undefined} onClick={() => finish('published')}>Publish</Button>
          </>)}
        </div>
      </div>
      <div className="rg-toc">
        {sections.map(([id, l], k) => {
          const i = editing ? k + 2 : k;
          return <button key={id} type="button" className={`${active === id ? 'on' : ''} ${done[i] ? 'done' : ''}`} onClick={() => jump(id)}><i>{done[i] ? <Check size={11} strokeWidth={3} /> : k + 1}</i>{l}</button>;
        })}
        <span className="rg-pct"><b>{pct}%</b> complete<span className="rg-bar"><i style={{ width: `${pct}%` }} /></span></span>
      </div>

      <div className="rg-grid">
        <main>
          {!editing && (
            <section className="dash-card rg-sec" id="cp-about">
              <h2><span>01</span>About this product</h2>
              <p className="rg-lead">A data product is a curated set of assets with a named owner and a promise to its consumers.</p>
              <Fl label="Name" req hint={taken ? 'A product with this name already exists — choose another.' : `${n.name.length}/80 characters`}><input className="input" maxLength={80} value={n.name} onChange={set('name')} placeholder="e.g. Customer Payments" /></Fl>
              <Fl label="What is it for, and who uses it?"><textarea className="input" rows={2} value={n.desc} onChange={set('desc')} placeholder="e.g. One record per payment, for reconciliation and month-end reporting" /></Fl>
              <div className="rg-two">
                <Fl label="Domain" req>
                  <select className="select" value={n.domain} onChange={set('domain')}>{DOMAINS.map((x) => <option key={x.id} value={x.id}>{x.parent ? `${D(x.parent).name} › ${x.name}` : x.name}</option>)}</select>
                </Fl>
                <Fl label="Owners" req hint="Owners can edit the product and approve access."><OwnerPicker value={n.owners} onChange={set('owners')} /></Fl>
              </div>
              <Fl label="Who can find it?">
                <div className="gv-chips">{VIS.map(([v, l]) => <button key={v} type="button" className={`chip ${n.vis === v ? 'on' : ''}`} onClick={() => up({ vis: v })}>{l}</button>)}</div>
              </Fl>
            </section>
          )}

          {!editing && (
            <section className="dash-card rg-sec" id="cp-class">
              <h2><span>02</span>Classification</h2>
              <p className="rg-lead">Two answers. Sensitivity, together with the assets you add, decides who must approve publication.</p>
              <Fl label="Criticality" req><Tiles opts={CRIT_OPTS} value={n.crit} onChange={set('crit')} three /></Fl>
              <Fl label="Sensitivity" req hint={restricted.length ? `${restricted.length} asset${restricted.length > 1 ? 's hold' : ' holds'} Restricted personal data (${restricted.slice(0, 2).join(', ')}${restricted.length > 2 ? '…' : ''}) — the data protection review is added.` : ''}><Tiles opts={SENS_OPTS} value={n.sens} onChange={set('sens')} three /></Fl>
            </section>
          )}

          <section className="dash-card rg-sec" id="cp-assets">
            <h2><span>{editing ? '01' : '03'}</span>Assets</h2>
            <p className="rg-lead">Pick catalogue assets, or add every asset that matches a rule.</p>
            <div className="rg-mfilter">
              <Segmented options={[{ value: 'browse', label: 'Browse' }, { value: 'rule', label: 'Add by rule' }]} value={mode} onChange={setMode} ariaLabel="How to add assets" />
              {mode === 'browse' && <label className="gv-search" style={{ flex: 1, margin: 0 }}><Search size={15} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Search ${all.length} assets by name, type or source`} /></label>}
            </div>
            {mode === 'browse' ? (<>
              <div className="gv-chips" style={{ marginBottom: 10 }}>
                <button type="button" className={`chip ${!src && !onlySel ? 'on' : ''}`} onClick={() => { setSrc(''); setOnlySel(false); }}>All sources</button>
                {sources.map((s) => <button key={s} type="button" className={`chip ${src === s ? 'on' : ''}`} onClick={() => setSrc(src === s ? '' : s)}>{s}</button>)}
                <button type="button" className={`chip ${onlySel ? 'on' : ''}`} onClick={() => setOnlySel((v) => !v)}>Selected ({n.assets.length})</button>
              </div>
              <div className="table-wrap cp-pick"><table className="tbl">
                <thead><tr><th style={{ width: 36 }} /><th>Asset</th><th>Type</th><th>Source</th><th>Sensitivity</th></tr></thead>
                <tbody>
                  {list.map((a) => {
                    const on = n.assets.includes(a); const s = sensitivityOf(a);
                    const from = store.products.find((p) => p.id !== editing?.id && p.outputs.includes(a));
                    return (
                      <tr key={a} className={on ? 'on' : ''} onClick={() => toggleAsset(a)}>
                        <td><input type="checkbox" checked={on} readOnly aria-label={`Add ${a}`} /></td>
                        <td><span className="mono">{a}</span>{from && <span className="gv-sub">output port of {from.name} — becomes an input</span>}</td>
                        <td className="gv-muted">{ASSET[a][1]}</td><td className="gv-muted">{ASSET[a][0]}</td>
                        <td><span className={`rg-rg ${s === 'Restricted' ? 'bad' : s === 'Confidential' ? 'warn' : 'ok'}`}>{s}</span></td>
                      </tr>
                    );
                  })}
                  {!list.length && <tr><td colSpan={5} className="gv-muted" style={{ textAlign: 'center', padding: 18 }}>No assets match.</td></tr>}
                </tbody>
              </table></div>
            </>) : (
              <div className="cp-rule">
                <div className="cp-rule-row">
                  <select className="select" value={rule.attr} onChange={(e) => setRule((o) => ({ ...o, attr: e.target.value }))} aria-label="Attribute">{['Connection', 'Asset type', 'Name'].map((x) => <option key={x}>{x}</option>)}</select>
                  <select className="select" value={rule.op} onChange={(e) => setRule((o) => ({ ...o, op: e.target.value }))} aria-label="Operator">{['is', 'contains'].map((x) => <option key={x}>{x}</option>)}</select>
                  <input className="input" value={rule.val} onChange={(e) => setRule((o) => ({ ...o, val: e.target.value }))} placeholder={rule.attr === 'Connection' ? 'e.g. Rplus Amazon S3' : rule.attr === 'Asset type' ? 'e.g. view' : 'e.g. CUSTOMER'} />
                  <Button variant="secondary" disabled={!ruleMatch(rule).length} onClick={addRule}>Add {ruleMatch(rule).length || ''} asset{ruleMatch(rule).length === 1 ? '' : 's'}</Button>
                </div>
                {rule.val && <p className="gv-muted" style={{ fontSize: 12.5, margin: '8px 0 0' }}>{ruleMatch(rule).length ? `Matches ${ruleMatch(rule).slice(0, 4).join(', ')}${ruleMatch(rule).length > 4 ? ` and ${ruleMatch(rule).length - 4} more` : ''}` : 'Nothing matches yet.'}</p>}
              </div>
            )}
            <div className="cp-selected">
              <b>{n.assets.length} selected</b>
              {n.assets.slice(0, 8).map((a) => <span key={a} className="gv-ownchip mono">{a}<button type="button" aria-label={`Remove ${a}`} onClick={() => toggleAsset(a)}><X size={12} /></button></span>)}
              {n.assets.length > 8 && <button type="button" className="chip" onClick={() => setOnlySel(true)}>+{n.assets.length - 8} more</button>}
              {n.assets.length > 0 && <Button variant="link" size="sm" onClick={() => up({ assets: [], outputs: [] })}>Clear</Button>}
            </div>
          </section>

          <section className="dash-card rg-sec" id="cp-ports">
            <h2><span>{editing ? '02' : '04'}</span>Output ports</h2>
            <p className="rg-lead">Output ports are the assets consumers use. Input ports are other products' output ports you added as assets.</p>
            {n.assets.length ? (
              <div className="gv-chips">{n.assets.map((a) => <button key={a} type="button" className={`chip mono ${outputs.includes(a) ? 'on' : ''}`} onClick={() => toggleOutput(a)}>{outputs.includes(a) && <Check size={12} />}{a} <small>{ainfo(a).type}</small></button>)}</div>
            ) : <p className="gv-muted" style={{ margin: 0, fontSize: 13 }}>Add assets first.</p>}
            <div className="rg-f" style={{ marginTop: 16, marginBottom: 0 }}>
              <label>Input ports ({inputs.length})</label>
              {inputs.length ? <div className="gv-chips">{inputs.map((a) => <span key={a} className="tag mono">{a} · from {store.products.find((p) => p.outputs.includes(a)).name}</span>)}</div> : <small style={{ marginTop: 0 }}>None — none of the assets is another product's output port.</small>}
            </div>
          </section>
        </main>

        <aside className="rg-live">
          <div className="dash-card rg-panel">
            <h3>Preview</h3>
            <div className="cp-prev">
              <span className="cp-prev-i"><Box size={18} strokeWidth={1.7} /></span>
              <div><b>{n.name.trim() || 'Untitled product'}</b><small><Layers size={12} /> {d?.name}{n.sens ? ` · ${SENS[n.sens][0]}` : ''}{n.crit ? ` · ${CRIT[n.crit][0]} criticality` : ''}</small></div>
            </div>
            {n.desc.trim() && <p className="cp-prev-d">{n.desc.trim()}</p>}
            <div className="cp-prev-n"><div><b>{n.assets.length}</b><small>Assets</small></div><div><b>{outputs.length || (n.assets.length ? 1 : 0)}</b><small>Output ports</small></div><div><b>{inputs.length}</b><small>Input ports</small></div></div>
            <p className="rg-eta" style={{ marginTop: 12 }}>{VIS.find(([v]) => v === n.vis)?.[1]} can find it · owners {n.owners.join(', ') || '—'}</p>
          </div>

          {!editing && <div className="dash-card rg-panel">
            <h3>Publication path</h3>
            {wf ? (<>
              <ol className="wf-tl" style={{ marginBottom: 6 }}>
                {path.map(({ step: s, applies }) => {
                  const I = KIND_ICON[s.kind];
                  const open = s.runIf && ctx[s.runIf.field] == null;
                  if (open) return <li key={s.id} className="skipped"><i><I size={11} /></i><div><b>{s.name}</b><small>Depends on your answers — only if {condText(s.runIf)}</small></div></li>;
                  const isAuto = s.kind === 'automated';
                  return (
                    <li key={s.id} className={!applies ? 'skipped' : isAuto && ready && !quarantined.length ? 'done' : 'not-reached'}>
                      <i>{!applies ? <CircleSlash size={11} /> : isAuto && ready && !quarantined.length ? <Check size={11} strokeWidth={3} /> : <I size={11} />}</i>
                      <div>
                        <b>{s.name}</b>
                        <small>
                          {!applies && `Not needed — only if ${condText(s.runIf)}`}
                          {applies && isAuto && (quarantined.length ? `Blocked — ${quarantined[0]} is quarantined by Data quality` : ready ? 'Passes — contract and quality checks are met' : 'Runs when you publish')}
                          {applies && !isAuto && s.kind !== 'notify' && <>{approverText(s, { subject: { owners: n.owners } })} · {s.sla} day{s.sla === 1 ? '' : 's'}{s.sod && <> · <Lock size={10} /> not the requester</>}{s.runIf && ` · because ${restricted.length ? 'it holds Restricted data' : condText(s.runIf)}`}</>}
                          {applies && s.kind === 'notify' && 'Subscribers are told'}
                        </small>
                      </div>
                    </li>
                  );
                })}
                <li className="not-reached"><i><Flag size={11} /></i><div><b>Live in the marketplace</b><small>{wf.outcome.approved}</small></div></li>
              </ol>
              <p className="rg-eta">{approvals.length} approval{approvals.length === 1 ? '' : 's'} · up to {days} working days · workflow <b>{wf.name} v{wf.version}</b> from Governance › Workflows</p>
            </>) : <p className="gv-muted" style={{ fontSize: 13, margin: 0 }}>No active workflow starts on “{EVENT}”. Publish one in Governance › Workflows.</p>}
          </div>}

          <div className="dash-card rg-panel">
            <h3>Still needed</h3>
            {quarantined.length > 0 && <p className="cp-block"><Lock size={13} /> Publishing is blocked: <span className="mono">{quarantined[0]}</span> is quarantined by Data quality. You can still save a draft.</p>}
            {missing.length ? <ul className="rg-missing">{missing.map(([id, t]) => <li key={id}><button type="button" onClick={() => jump(id)}>{t}</button></li>)}</ul> : null}
            {!blocking.length && (<>
              <p className="rg-ready"><Check size={14} strokeWidth={3} /> {editing ? 'Ready to save.' : 'Everything needed is in — ready to publish.'}</p>
              <Button variant="primary" icon={editing ? Check : Send} disabled={!editing && quarantined.length > 0} onClick={() => finish(editing ? undefined : 'published')} style={{ marginTop: 10, width: '100%', justifyContent: 'center' }}>{editing ? 'Save changes' : 'Publish'}</Button>
            </>)}
          </div>
        </aside>
      </div>
    </div>
  );
}
