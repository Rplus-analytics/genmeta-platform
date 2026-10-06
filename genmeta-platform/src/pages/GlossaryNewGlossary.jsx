import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Book, X, Lock, UserCheck, Zap, Bell, ListChecks, CircleSlash, Flag, Plus } from 'lucide-react';
import { Button } from '../components/ui.jsx';
import { Fl, Tiles, OwnerPicker } from '../governance/RegisterModel.jsx';
import { pathFor, approverText, useWorkflowStore } from '../governance/workflows.js';
import { TERMS, GLOSSARIES, TERM_FIELDS, createGlossary, createTerm, toast } from '../glossary-data.js';

/* Business glossary › Create glossary — the same one-page pattern as New term and Create a data product.
   Built from what the leaders ask for: name, description and owners (Atlan), a type (Microsoft Purview
   governance domains), named responsibilities (Collibra), a term template that says which fields every term needs
   (Alation), the approval new terms go through, and starter terms or categories (Atlan categories / bulk upload). */

const SECTIONS = [['ng-about', 'About this glossary'], ['ng-people', 'People'], ['ng-rules', 'Term rules'], ['ng-start', 'Starter terms']];
const KINDS = [['Business area', 'Business area', 'A team or line of business', 'ok'], ['Regulatory', 'Regulatory', 'Terms a law or regulator defines', 'warn'], ['Reference data', 'Reference data', 'Code lists and standard values', 'ok'], ['Project', 'Project', 'Short-lived, for one programme', 'ok']];
const PROPOSE = [['Everyone', 'Anyone can propose', 'Proposals go through approval'], ['Owners and stewards', 'Owners and stewards', 'Others suggest via comments']];
const EVENT = 'Glossary term proposed';
const KIND_ICON = { approval: UserCheck, automated: Zap, task: ListChecks, notify: Bell };

export default function GlossaryNewGlossary() {
  const nav = useNavigate();
  const { workflows } = useWorkflowStore();
  const [f, setF] = useState({ name: '', desc: '', kind: 'Business area', owners: ['Admin'], stewards: [], propose: 'Everyone', required: ['def', 'owner'], approval: true, starters: [] });
  const [starter, setStarter] = useState('');
  const [active, setActive] = useState('ng-about');
  const up = (patch) => setF((o) => ({ ...o, ...patch }));
  const set = (k) => (e) => up({ [k]: e?.target ? e.target.value : e });

  const name = f.name.trim();
  const taken = !!name && GLOSSARIES.some((g) => g.toLowerCase() === name.toLowerCase());
  const clash = f.starters.filter((s) => TERMS.some((t) => t.name.toLowerCase() === s.toLowerCase()));
  const done = [!!(name && !taken && f.desc.trim().length >= 10), f.owners.length > 0 && f.stewards.length > 0, f.required.length > 0, f.starters.length > 0];
  const pct = Math.round((done.filter(Boolean).length / done.length) * 100);
  const ready = done[0] && f.owners.length > 0;

  const wf = workflows.find((w) => w.module === 'metadata' && w.event === EVENT && w.status === 'active');
  const path = wf ? pathFor(wf, {}) : [];

  useEffect(() => {
    const io = new IntersectionObserver((es) => es.forEach((e) => e.isIntersecting && setActive(e.target.id)), { rootMargin: '-35% 0px -60% 0px' });
    SECTIONS.forEach(([sid]) => { const el = document.getElementById(sid); if (el) io.observe(el); });
    return () => io.disconnect();
  }, []);
  const jump = (sid) => document.getElementById(sid)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  const addStarter = () => { const v = starter.trim(); if (v && !f.starters.some((s) => s.toLowerCase() === v.toLowerCase())) up({ starters: [...f.starters, v] }); setStarter(''); };
  const toggleReq = (k) => { if (k === 'def') return; up({ required: f.required.includes(k) ? f.required.filter((x) => x !== k) : [...f.required, k] }); };
  const create = () => {
    const g = createGlossary({ name, desc: f.desc, kind: f.kind, owners: f.owners, stewards: f.stewards, propose: f.propose, required: f.required, approval: f.approval });
    const made = f.starters.filter((s) => !clash.includes(s));
    made.forEach((s) => createTerm({ name: s, g, parent: null, def: '', owner: f.owners[0] || '', steward: f.stewards[0] || '', custodian: '', syn: [] }));
    toast(`Created the ${g} glossary${made.length ? ` with ${made.length} draft term${made.length > 1 ? 's' : ''}` : ''}`);
    nav(`/app/glossary/g/${encodeURIComponent(g)}`);
  };

  const missing = [
    !done[0] && ['ng-about', taken ? 'About — a glossary with this name already exists' : 'About — a name and a short description (10+ characters)'],
    !f.owners.length && ['ng-people', 'People — at least one owner'],
    f.owners.length > 0 && !f.stewards.length && ['ng-people', 'People — a steward (optional, but they review new terms)'],
    !done[3] && ['ng-start', 'Starter terms — optional; you can add terms later'],
  ].filter(Boolean);
  const blocking = missing.filter(([sid, t]) => sid === 'ng-about' || t.startsWith('People — at least'));

  return (
    <div className="page gv rg cp nt">
      <div className="rg-top">
        <div><span className="gv-eyebrow">Business glossary</span><h1>Create glossary</h1></div>
        <div className="gv-inline" style={{ gap: 8, alignItems: 'center' }}>
          <Button variant="secondary" onClick={() => nav('/app/glossary')}>Cancel</Button>
          <Button variant="primary" icon={Plus} disabled={!ready} onClick={create}>Create glossary</Button>
        </div>
      </div>
      <div className="rg-toc">
        {SECTIONS.map(([sid, l], k) => <button key={sid} type="button" className={`${active === sid ? 'on' : ''} ${done[k] ? 'done' : ''}`} onClick={() => jump(sid)}><i>{done[k] ? <Check size={11} strokeWidth={3} /> : k + 1}</i>{l}</button>)}
        <span className="rg-pct"><b>{pct}%</b> complete<span className="rg-bar"><i style={{ width: `${pct}%` }} /></span></span>
      </div>

      <div className="rg-grid">
        <main>
          <section className="dash-card rg-sec" id="ng-about">
            <h2><span>01</span>About this glossary</h2>
            <p className="rg-lead">A glossary groups the terms one part of the business owns. Most organisations have one per business area.</p>
            <Fl label="Name" req hint={taken ? 'A glossary with this name already exists.' : `${f.name.length}/80 characters · existing: ${GLOSSARIES.join(', ')}`}><input className="input" maxLength={80} value={f.name} onChange={set('name')} placeholder="e.g. Debt Management" autoFocus /></Fl>
            <Fl label="What does it cover?" req><textarea className="input" rows={2} value={f.desc} onChange={set('desc')} placeholder="e.g. Terms for debts, payment plans and recovery, owned by Debt Management" /></Fl>
            <Fl label="Type"><Tiles opts={KINDS} value={f.kind} onChange={set('kind')} /></Fl>
          </section>

          <section className="dash-card rg-sec" id="ng-people">
            <h2><span>02</span>People</h2>
            <p className="rg-lead">Owners are accountable for the glossary and approve its terms. Stewards keep it tidy and review proposals first.</p>
            <div className="rg-two">
              <Fl label="Owners" req><OwnerPicker value={f.owners} onChange={set('owners')} /></Fl>
              <Fl label="Stewards"><OwnerPicker value={f.stewards} onChange={set('stewards')} /></Fl>
            </div>
            <Fl label="Who can propose terms?"><Tiles opts={PROPOSE.map(([v, l, s]) => [v, l, s, 'ok'])} value={f.propose} onChange={set('propose')} /></Fl>
          </section>

          <section className="dash-card rg-sec" id="ng-rules">
            <h2><span>03</span>Term rules</h2>
            <p className="rg-lead">What every term in this glossary must have before it can be submitted, and whether new terms need approval.</p>
            <Fl label="Every term needs" hint="The definition is always required.">
              <div className="gv-chips">{TERM_FIELDS.map(([k, l]) => <button key={k} type="button" className={`chip ${f.required.includes(k) ? 'on' : ''}`} disabled={k === 'def'} onClick={() => toggleReq(k)}>{f.required.includes(k) && <Check size={12} />}{l}</button>)}</div>
            </Fl>
            <Fl label="New terms">
              <Tiles opts={[['yes', 'Need approval', wf ? `${wf.name} from Governance › Workflows` : 'No active workflow yet', 'ok'], ['no', 'Approved by the owner directly', 'For small or reference glossaries', 'warn']]} value={f.approval ? 'yes' : 'no'} onChange={(v) => up({ approval: v === 'yes' })} />
            </Fl>
          </section>

          <section className="dash-card rg-sec" id="ng-start">
            <h2><span>04</span>Starter terms</h2>
            <p className="rg-lead">Optional. Add the first few terms or top-level categories now; each is created as a draft for you to complete. You can add more later, one at a time or in bulk.</p>
            <Fl label="Terms" hint={clash.length ? `${clash.join(', ')} already exist${clash.length === 1 ? 's' : ''} in another glossary and will be skipped.` : 'Press Enter after each one.'}>
              <div className="gv-owners" role="presentation">
                {f.starters.map((s) => <span key={s} className={`gv-ownchip ${clash.includes(s) ? 'ng-clash' : ''}`}>{s}<button type="button" aria-label={`Remove ${s}`} onClick={() => up({ starters: f.starters.filter((x) => x !== s) })}><X size={12} /></button></span>)}
                <input value={starter} onChange={(e) => setStarter(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addStarter(); } }} onBlur={() => starter && addStarter()} placeholder={f.starters.length ? 'Add another' : 'e.g. Payment plan'} />
              </div>
            </Fl>
          </section>
        </main>

        <aside className="rg-live">
          <div className="dash-card rg-panel">
            <h3>Preview</h3>
            <div className="cp-prev">
              <span className="cp-prev-i"><Book size={18} strokeWidth={1.7} /></span>
              <div><b>{name || 'Untitled glossary'}</b><small>{f.kind} · {f.starters.length - clash.length} term{f.starters.length - clash.length === 1 ? '' : 's'} to start</small></div>
            </div>
            <p className="cp-prev-d">{f.desc.trim() || 'No description yet.'}</p>
            <p className="rg-eta" style={{ marginTop: 12 }}>Owners {f.owners.join(', ') || '—'}{f.stewards.length ? ` · stewards ${f.stewards.join(', ')}` : ''} · {f.propose === 'Everyone' ? 'anyone can propose terms' : 'only owners and stewards add terms'}</p>
          </div>

          <div className="dash-card rg-panel">
            <h3>How a new term gets in</h3>
            <ol className="wf-tl" style={{ marginBottom: 6 }}>
              <li className="not-reached"><i><Flag size={11} /></i><div><b>Proposed as a draft</b><small>Needs {f.required.map((k) => TERM_FIELDS.find(([x]) => x === k)[1].toLowerCase()).join(', ')}</small></div></li>
              {f.approval && wf ? path.map(({ step: s, applies }) => {
                const I = KIND_ICON[s.kind];
                return <li key={s.id} className={applies ? 'not-reached' : 'skipped'}><i>{applies ? <I size={11} /> : <CircleSlash size={11} />}</i><div><b>{s.name}</b><small>{approverText(s, { subject: { owners: f.owners } })} · {s.sla} days{s.sod && <> · <Lock size={10} /> not the proposer</>}</small></div></li>;
              }) : <li className="not-reached"><i><UserCheck size={11} /></i><div><b>Owner approves</b><small>{f.owners.join(' or ') || 'the owner'} · no workflow</small></div></li>}
              <li className="not-reached"><i><Check size={11} /></i><div><b>Published in {name || 'the glossary'}</b><small>Visible to everyone in Business glossary</small></div></li>
            </ol>
          </div>

          <div className="dash-card rg-panel">
            <h3>Still needed</h3>
            {missing.length ? <ul className="rg-missing">{missing.map(([sid, t]) => <li key={t}><button type="button" onClick={() => jump(sid)}>{t}</button></li>)}</ul> : null}
            {!blocking.length && (<>
              <p className="rg-ready"><Check size={14} strokeWidth={3} /> Ready to create.</p>
              <Button variant="primary" icon={Plus} onClick={create} style={{ marginTop: 10, width: '100%', justifyContent: 'center' }}>Create glossary</Button>
            </>)}
          </div>
        </aside>
      </div>
    </div>
  );
}
