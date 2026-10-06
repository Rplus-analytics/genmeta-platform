import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Check, Search, Send, Flag, Lock, CircleSlash, Zap, UserCheck, Bell, ListChecks, FileText, Book, X, Sparkles } from 'lucide-react';
import { Button } from '../components/ui.jsx';
import { Fl } from '../governance/RegisterModel.jsx';
import { PEOPLE } from '../governance/stewardship-data.js';
import { pathFor, startRequest, stateOf, approverText, condText, useWorkflowStore } from '../governance/workflows.js';
import { TERMS, GLOSSARIES, ASSET, T, assetInfo, createTerm, setStatus, linkAssets, toast } from '../glossary-data.js';

/* Business glossary › New term — one page with a live panel, the same pattern as Data products › Create a data
   product and Governance › Register an external AI model (Oct 2026). Four sections (About · Definition · People ·
   Linked assets); the panel keeps a preview of the term, its review path from Governance › Workflows
   (“Glossary term approval”) and what is still needed. Save as draft, or submit it for review. */

const SECTIONS = [['nt-about', 'About this term'], ['nt-def', 'Definition'], ['nt-people', 'People'], ['nt-assets', 'Linked assets']];
const EVENT = 'Glossary term proposed';
const KIND_ICON = { approval: UserCheck, automated: Zap, task: ListChecks, notify: Bell };
const slug = (n) => n.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
const ROLES = [['owner', 'Owner', 'Accountable for the meaning; approves changes'], ['steward', 'Steward', 'Keeps the definition and links up to date'], ['custodian', 'Custodian', 'Looks after the data that carries it']];

function draftDefinition(f) {
  const n = f.name.trim() || 'This term';
  const sample = f.assets.slice(0, 3).join(', ');
  return `${n} is a ${f.g.toLowerCase()} concept shared across the estate${f.parent ? `, a kind of ${T(f.parent)?.name || f.parent}` : ''}. ${f.assets.length ? `It is carried by ${f.assets.length} asset(s), including ${sample}. ` : ''}It gives teams a single, agreed meaning for “${n}”.`;
}

export default function GlossaryNewTerm() {
  const nav = useNavigate();
  const { state } = useLocation();
  const { workflows } = useWorkflowStore();
  const init = state || {};
  const [f, setF] = useState({ name: '', g: init.g || GLOSSARIES[0], parent: init.parent || '', syn: [], def: '', rules: '', owner: '', steward: '', custodian: '', assets: [] });
  const [synQ, setSynQ] = useState('');
  const [q, setQ] = useState('');
  const [src, setSrc] = useState('');
  const [onlySel, setOnlySel] = useState(false);
  const [active, setActive] = useState('nt-about');
  const up = (patch) => setF((o) => ({ ...o, ...patch }));
  const set = (k) => (e) => up({ [k]: e?.target ? e.target.value : e });

  const id = slug(f.name.trim());
  const taken = !!(f.name.trim() && (T(id) || id === 'new'));
  const done = [!!(f.name.trim() && !taken && f.g), f.def.trim().length >= 20, !!f.owner.trim(), f.assets.length > 0];
  const fields = [f.name.trim() && !taken, f.def.trim().length >= 20, f.owner.trim(), f.steward.trim(), f.syn.length || f.rules.trim(), f.assets.length];
  const pct = Math.round((fields.filter(Boolean).length / fields.length) * 100);
  const canDraft = !!(f.name.trim() && !taken);
  const canSubmit = done[0] && done[1] && done[2];

  /* review path, live from Governance › Workflows */
  const wf = workflows.find((w) => w.module === 'metadata' && w.event === EVENT && w.status === 'active');
  const ctx = {};
  const path = wf ? pathFor(wf, ctx) : [];
  const approvals = path.filter((p) => p.applies && (p.step.kind === 'approval' || p.step.kind === 'task'));
  const days = approvals.reduce((x, p) => x + p.step.sla, 0);

  useEffect(() => {
    const io = new IntersectionObserver((es) => es.forEach((e) => e.isIntersecting && setActive(e.target.id)), { rootMargin: '-35% 0px -60% 0px' });
    SECTIONS.forEach(([sid]) => { const el = document.getElementById(sid); if (el) io.observe(el); });
    return () => io.disconnect();
  }, []);
  const jump = (sid) => document.getElementById(sid)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  const addSyn = () => { const v = synQ.trim().replace(/;$/, ''); if (v && !f.syn.includes(v)) up({ syn: [...f.syn, v] }); setSynQ(''); };
  const toggleAsset = (a) => up({ assets: f.assets.includes(a) ? f.assets.filter((x) => x !== a) : [...f.assets, a] });
  const cancel = () => nav(init.from || (init.g ? `/app/glossary/g/${init.g}` : '/app/glossary'));
  const create = (submit) => {
    const tid = createTerm({ name: f.name.trim(), g: f.g, parent: f.parent || null, def: f.def.trim(), owner: f.owner.trim(), steward: f.steward.trim(), custodian: f.custodian.trim(), syn: f.syn });
    const t = T(tid);
    if (t && f.rules.trim()) t.rules = f.rules.split('\n').map((s) => s.trim()).filter(Boolean);
    if (f.assets.length) linkAssets(tid, f.assets);
    if (submit && wf) {
      setStatus(tid, 'review');
      const req = startRequest(wf.id, { kind: 'term', id: tid, label: f.name.trim(), owners: [f.owner.trim()] }, ctx, 'Admin');
      const st = stateOf(req);
      toast(`“${f.name.trim()}” sent for review — ${req.id}; waiting on ${st.cur ? st.cur.step.name : 'nobody'}`);
    } else toast(`Created “${f.name.trim()}” as a draft`);
    nav(`/app/glossary/${tid}`);
  };

  /* asset browser */
  const all = Object.keys(ASSET);
  const sources = [...new Set(all.map((a) => ASSET[a][0]))];
  const list = all.filter((a) => (!src || ASSET[a][0] === src) && (!onlySel || f.assets.includes(a)) && `${a} ${ASSET[a][0]} ${ASSET[a][1]}`.toLowerCase().includes(q.trim().toLowerCase()));
  const parents = TERMS.filter((t) => t.g === f.g && !t.parent);
  const similar = f.name.trim().length >= 3 ? TERMS.filter((t) => t.id !== id && (t.name.toLowerCase().includes(f.name.trim().toLowerCase()) || t.syn.some((s) => s.toLowerCase() === f.name.trim().toLowerCase()))).slice(0, 3) : [];
  const people = [...new Set([...PEOPLE, ...TERMS.flatMap((t) => [t.owner, t.steward, t.custodian]).filter(Boolean)])].sort();
  const missing = [
    !done[0] && ['nt-about', taken ? 'About — a term with this name already exists' : 'About — a name and a glossary'],
    !done[1] && ['nt-def', 'Definition — at least a sentence (20 characters)'],
    !done[2] && ['nt-people', 'People — name an owner (they approve it)'],
    !done[3] && ['nt-assets', 'Linked assets — optional, but terms with assets are easier to find'],
  ].filter(Boolean);
  const blocking = missing.filter(([sid]) => sid !== 'nt-assets');

  return (
    <div className="page gv rg cp nt">
      <div className="rg-top">
        <div>
          <span className="gv-eyebrow">Business glossary</span>
          <h1>New term</h1>
        </div>
        <div className="gv-inline" style={{ gap: 8, alignItems: 'center' }}>
          <span className="gv-faint" style={{ fontSize: 12 }}>New terms start as Draft</span>
          <Button variant="secondary" onClick={cancel}>Cancel</Button>
          <Button variant="secondary" disabled={!canDraft} onClick={() => create(false)}>Save as draft</Button>
          <Button variant="primary" icon={Send} disabled={!canSubmit || !wf} onClick={() => create(true)}>Submit for review</Button>
        </div>
      </div>
      <div className="rg-toc">
        {SECTIONS.map(([sid, l], k) => <button key={sid} type="button" className={`${active === sid ? 'on' : ''} ${done[k] ? 'done' : ''}`} onClick={() => jump(sid)}><i>{done[k] ? <Check size={11} strokeWidth={3} /> : k + 1}</i>{l}</button>)}
        <span className="rg-pct"><b>{pct}%</b> complete<span className="rg-bar"><i style={{ width: `${pct}%` }} /></span></span>
      </div>

      <div className="rg-grid">
        <main>
          <section className="dash-card rg-sec" id="nt-about">
            <h2><span>01</span>About this term</h2>
            <p className="rg-lead">A business term gives one agreed meaning to a word the business uses, and points to the data that carries it.</p>
            <Fl label="Name" req hint={taken ? 'A term with this name already exists — open it instead, or choose another name.' : similar.length ? `Similar terms already exist: ${similar.map((t) => `${t.name} (${t.g})`).join(', ')}` : ''}>
              <input className="input" value={f.name} onChange={set('name')} placeholder="e.g. Active Claim" autoFocus />
            </Fl>
            <div className="rg-two">
              <Fl label="Glossary" req><select className="select" value={f.g} onChange={(e) => up({ g: e.target.value, parent: '' })}>{GLOSSARIES.map((x) => <option key={x}>{x}</option>)}</select></Fl>
              <Fl label="Parent term" hint="Optional — the broader term this one belongs under."><select className="select" value={f.parent} onChange={set('parent')}><option value="">None — a top-level term</option>{parents.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></Fl>
            </div>
            <Fl label="Synonyms" hint="Other words people use for it. Press Enter after each one.">
              <div className="gv-owners" role="presentation">
                {f.syn.map((s) => <span key={s} className="gv-ownchip">{s}<button type="button" aria-label={`Remove ${s}`} onClick={() => up({ syn: f.syn.filter((x) => x !== s) })}><X size={12} /></button></span>)}
                <input value={synQ} onChange={(e) => setSynQ(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ';') { e.preventDefault(); addSyn(); } }} onBlur={() => synQ && addSyn()} placeholder={f.syn.length ? 'Add another' : 'e.g. Open claim'} />
              </div>
            </Fl>
          </section>

          <section className="dash-card rg-sec" id="nt-def">
            <h2><span>02</span>Definition</h2>
            <p className="rg-lead">Write it so someone outside the team understands it. Reviewers check this first.</p>
            <Fl label="Definition" req hint={`${f.def.trim().length} characters${f.def.trim().length < 20 ? ' — at least 20' : ''}`}>
              <textarea className="input" rows={4} value={f.def} onChange={set('def')} placeholder="e.g. A claim that has been opened and not yet closed, paid or withdrawn." />
            </Fl>
            <div className="nt-ai"><Sparkles size={15} /><span>Not sure where to start? GenMeta can draft one from the name, glossary and linked assets.</span><Button variant="secondary" size="sm" disabled={!f.name.trim()} onClick={() => up({ def: draftDefinition(f) })}>Draft with AI</Button></div>
            <Fl label="Business rules" hint="Optional — one per line."><textarea className="input" rows={2} value={f.rules} onChange={set('rules')} placeholder="e.g. A claim stays active until its closing date is recorded." /></Fl>
          </section>

          <section className="dash-card rg-sec" id="nt-people">
            <h2><span>03</span>People</h2>
            <p className="rg-lead">The owner approves the term; the steward reviews it first.</p>
            <div className="nt-people">
              {ROLES.map(([k, l, d]) => (
                <Fl key={k} label={l} req={k === 'owner'} hint={d}>
                  <input className="input" list="nt-people" value={f[k]} onChange={set(k)} placeholder="Type a name" />
                </Fl>
              ))}
              <datalist id="nt-people">{people.map((p) => <option key={p} value={p} />)}</datalist>
            </div>
          </section>

          <section className="dash-card rg-sec" id="nt-assets">
            <h2><span>04</span>Linked assets</h2>
            <p className="rg-lead">Link the tables, views and reports that carry this term. You can add more later from the term page.</p>
            <div className="rg-mfilter">
              <label className="gv-search" style={{ flex: 1, margin: 0 }}><Search size={15} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Search ${all.length} assets by name, type or source`} /></label>
            </div>
            <div className="gv-chips" style={{ marginBottom: 10 }}>
              <button type="button" className={`chip ${!src && !onlySel ? 'on' : ''}`} onClick={() => { setSrc(''); setOnlySel(false); }}>All sources</button>
              {sources.map((s) => <button key={s} type="button" className={`chip ${src === s ? 'on' : ''}`} onClick={() => setSrc(src === s ? '' : s)}>{s}</button>)}
              <button type="button" className={`chip ${onlySel ? 'on' : ''}`} onClick={() => setOnlySel((v) => !v)}>Selected ({f.assets.length})</button>
            </div>
            <div className="table-wrap cp-pick"><table className="tbl">
              <thead><tr><th style={{ width: 36 }} /><th>Asset</th><th>Type</th><th>Source</th><th>Already linked to</th></tr></thead>
              <tbody>
                {list.map((a) => {
                  const on = f.assets.includes(a); const terms = TERMS.filter((t) => t.linked.includes(a));
                  return (
                    <tr key={a} className={on ? 'on' : ''} onClick={() => toggleAsset(a)}>
                      <td><input type="checkbox" checked={on} readOnly aria-label={`Link ${a}`} /></td>
                      <td><span className="mono">{a}</span></td>
                      <td className="gv-muted">{assetInfo(a).type}</td><td className="gv-muted">{assetInfo(a).src}</td>
                      <td className="gv-muted">{terms.length ? `${terms.slice(0, 2).map((t) => t.name).join(', ')}${terms.length > 2 ? ` +${terms.length - 2}` : ''}` : '—'}</td>
                    </tr>
                  );
                })}
                {!list.length && <tr><td colSpan={5} className="gv-muted" style={{ textAlign: 'center', padding: 18 }}>No assets match.</td></tr>}
              </tbody>
            </table></div>
            <div className="cp-selected">
              <b>{f.assets.length} selected</b>
              {f.assets.slice(0, 8).map((a) => <span key={a} className="gv-ownchip mono">{a}<button type="button" aria-label={`Remove ${a}`} onClick={() => toggleAsset(a)}><X size={12} /></button></span>)}
              {f.assets.length > 8 && <button type="button" className="chip" onClick={() => setOnlySel(true)}>+{f.assets.length - 8} more</button>}
              {f.assets.length > 0 && <Button variant="link" size="sm" onClick={() => up({ assets: [] })}>Clear</Button>}
            </div>
          </section>
        </main>

        <aside className="rg-live">
          <div className="dash-card rg-panel">
            <h3>Preview</h3>
            <div className="cp-prev">
              <span className="cp-prev-i"><FileText size={18} strokeWidth={1.7} /></span>
              <div><b>{f.name.trim() || 'Untitled term'}</b><small><Book size={12} /> {f.g}{f.parent ? ` › ${T(f.parent)?.name}` : ''} · Draft</small></div>
            </div>
            <p className="cp-prev-d">{f.def.trim() || 'No definition yet.'}</p>
            {f.syn.length > 0 && <p className="cp-prev-d">Also called {f.syn.join(', ')}</p>}
            <div className="cp-prev-n"><div><b>{f.assets.length}</b><small>Linked assets</small></div><div><b>{f.syn.length}</b><small>Synonyms</small></div><div><b>{[f.owner, f.steward, f.custodian].filter((x) => x.trim()).length}</b><small>People</small></div></div>
          </div>

          <div className="dash-card rg-panel">
            <h3>Review path</h3>
            {wf ? (<>
              <ol className="wf-tl" style={{ marginBottom: 6 }}>
                <li className={canSubmit ? 'done' : 'not-reached'}><i>{canSubmit ? <Check size={11} strokeWidth={3} /> : <FileText size={11} />}</i><div><b>Draft</b><small>{canSubmit ? 'Ready to submit' : 'Name, definition and owner needed to submit'}</small></div></li>
                {path.map(({ step: s, applies }) => {
                  const I = KIND_ICON[s.kind];
                  return (
                    <li key={s.id} className={!applies ? 'skipped' : 'not-reached'}>
                      <i>{!applies ? <CircleSlash size={11} /> : <I size={11} />}</i>
                      <div><b>{s.name}</b>
                        <small>
                          {!applies && `Not needed — only if ${condText(s.runIf)}`}
                          {applies && s.kind !== 'notify' && <>{approverText(s, { subject: { owners: f.owner.trim() ? [f.owner.trim()] : [] } })} · {s.sla} day{s.sla === 1 ? '' : 's'}{s.sod && <> · <Lock size={10} /> not the requester</>}</>}
                          {applies && s.kind === 'notify' && 'People are told'}
                        </small>
                      </div>
                    </li>
                  );
                })}
                <li className="not-reached"><i><Flag size={11} /></i><div><b>Approved</b><small>{wf.outcome.approved}</small></div></li>
              </ol>
              <p className="rg-eta">{approvals.length} approval{approvals.length === 1 ? '' : 's'} · up to {days} working days · workflow <b>{wf.name} v{wf.version}</b> from Governance › Workflows</p>
            </>) : <p className="gv-muted" style={{ fontSize: 13, margin: 0 }}>No active workflow starts on “{EVENT}”. You can still save it as a draft.</p>}
          </div>

          <div className="dash-card rg-panel">
            <h3>Still needed</h3>
            {missing.length ? <ul className="rg-missing">{missing.map(([sid, t]) => <li key={sid}><button type="button" onClick={() => jump(sid)}>{t}</button></li>)}</ul> : null}
            {!blocking.length && (<>
              <p className="rg-ready"><Check size={14} strokeWidth={3} /> Everything needed is in — ready to submit.</p>
              <Button variant="primary" icon={Send} disabled={!wf} onClick={() => create(true)} style={{ marginTop: 10, width: '100%', justifyContent: 'center' }}>Submit for review</Button>
            </>)}
          </div>
        </aside>
      </div>
    </div>
  );
}
