import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Search, X, ChevronDown, ShieldCheck, Plus, Flag, Lock, CircleSlash, Zap, UserCheck, Bell, ListChecks, Sparkles } from 'lucide-react';
import { Button } from '../components/ui.jsx';
import { MODELS, RISK_TIERS } from './data.js';
import { PEOPLE } from './stewardship-data.js';
import { toast } from './kit.jsx';
import { pathFor, startRequest, stateOf, approverText, condText, useWorkflowStore } from './workflows.js';

/* Register an externally provided AI model — one page with a live verdict (option A, Oct 2026).
   Four short sections (About this use · The model · Data & decisions · Ethical AI) on one page; a panel on
   the right keeps the suggested risk tier, the approval path from Governance › Workflows and what is still
   needed up to date as you answer. Submitting adds the model at "Registered" and starts its approval. */

export const ETHICS = [
  { key: 'privacy', label: 'Privacy', desc: 'Sensitive data is protected from unauthorised access, use or disclosure.',
    opts: [['No personal data', 'ok', 'Only metadata or non-personal data is sent.'], ['Pseudonymised data', 'warn', 'Identifiers are removed or tokenised before data is sent.'], ['Personal data', 'bad', 'The model receives personal data.']] },
  { key: 'fairness', label: 'Fairness', desc: 'Outputs do not treat groups of people unequally.',
    opts: [['Low risk', 'ok', 'Outputs do not affect individuals differently.'], ['Medium risk', 'warn', 'Some outputs could affect groups differently; monitored.'], ['High risk', 'bad', 'Outputs could treat groups of people unequally.']] },
  { key: 'bias', label: 'Bias mitigation', desc: 'How well bias in the training data and the model is addressed.',
    opts: [['Effective', 'ok', 'Effective measures identify and mitigate bias.'], ['Partial', 'warn', 'Some efforts made; room for improvement.'], ['Ineffective', 'bad', 'Limited or no measures in place.']] },
  { key: 'reliability', label: 'Reliability and safety', desc: 'It performs its intended function accurately, consistently and securely.',
    opts: [['High', 'ok', 'Tested against the intended use; failures are rare and contained.'], ['Moderate', 'warn', 'Generally reliable; known failure modes are documented.'], ['Low', 'bad', 'Unpredictable outputs or untested for this use.']] },
  { key: 'transparency', label: 'Transparency', desc: 'How it works and the data it uses are explained to stakeholders.',
    opts: [['Full disclosure', 'ok', 'Model card, data use and limitations are published.'], ['Partial disclosure', 'warn', 'Some provider documentation; gaps remain.'], ['Black box', 'bad', 'No meaningful explanation of how outputs are produced.']] },
  { key: 'accountability', label: 'Accountability', desc: 'A named person is answerable for the model, its use and its outcomes.',
    opts: [['Has owner', 'ok', 'An accountable owner is named and has accepted the role.'], ['Shared ownership', 'warn', 'Shared across a team without a single owner.'], ['No owner', 'bad', 'Nobody is accountable yet.']] },
  { key: 'environment', label: 'Environment', desc: 'The energy and carbon cost is understood and proportionate to the benefit.',
    opts: [['Low risk', 'ok', 'Small or efficient model, low call volume.'], ['Medium risk', 'warn', 'Large model or high call volume; reviewed.'], ['High risk', 'bad', 'Very high compute use with no offsetting measures.']] },
];

/* externally provided models the organisation can call; region = where the provider holds the data by default */
const CATALOGUE = [
  { id: 'anthropic-claude-sonnet-5', name: 'Claude Sonnet 5', provider: 'Anthropic', host: 'Anthropic API', region: 'Outside the UK and EU', kind: 'Language model', mono: 'An', col: '#C96A3B', desc: 'Reasoning, writing and question answering over documents and metadata.' },
  { id: 'anthropic-claude-haiku', name: 'Claude Haiku 4.5', provider: 'Anthropic', host: 'Amazon Bedrock · eu-west-2', region: 'United Kingdom', kind: 'Language model', mono: 'An', col: '#C96A3B', desc: 'Small, fast model for classification, extraction and summarisation.' },
  { id: 'openai-gpt-41', name: 'GPT-4.1', provider: 'OpenAI', host: 'OpenAI API', region: 'Outside the UK and EU', kind: 'Language model', mono: 'Oa', col: '#10A37F', desc: 'Drafting, extraction and conversational assistants.' },
  { id: 'azure-gpt-41', name: 'GPT-4.1 (Azure OpenAI)', provider: 'Microsoft', host: 'Azure OpenAI · UK South', region: 'United Kingdom', kind: 'Language model', mono: 'Ms', col: '#2F6FE4', desc: 'GPT-4.1 in your own Azure tenancy and data-processing terms.' },
  { id: 'google-gemini-flash', name: 'Gemini 2.5 Flash', provider: 'Google', host: 'Vertex AI · europe-west2', region: 'United Kingdom', kind: 'Multimodal', mono: 'Go', col: '#C99400', desc: 'Fast multimodal model for documents and images.' },
  { id: 'mistral-large', name: 'Mistral Large', provider: 'Mistral AI', host: 'Mistral API · EU', region: 'EU data boundary', kind: 'Language model', mono: 'Mi', col: '#E5532D', desc: 'EU-hosted model with open-weight smaller variants.' },
  { id: 'meta-llama-70b', name: 'Llama 3.1 70B', provider: 'Meta', host: 'Amazon Bedrock · eu-west-2', region: 'United Kingdom', kind: 'Open weights', mono: 'Me', col: '#6B46D9', desc: 'Open-weight model run through a managed service.' },
  { id: 'aws-titan-embed', name: 'Titan Text Embeddings', provider: 'Amazon', host: 'Amazon Bedrock · eu-west-2', region: 'United Kingdom', kind: 'Embeddings', mono: 'Am', col: '#D9730D', desc: 'Turns text into vectors for semantic search.' },
];
const registeredName = (c) => MODELS.some((m) => m.name.toLowerCase() === c.name.toLowerCase() && !/test entry/i.test(m.name));

const STAGES = ['Ideation', 'Proof of concept', 'Development', 'Pilot', 'Ready for production'];
const DATA = [['No organisational data', 'Nothing of ours', 'Public prompts only', 'ok', 0], ['Metadata only', 'Metadata only', 'Names, descriptions, lineage', 'ok', 1], ['Pseudonymised data', 'Pseudonymised', 'Identifiers tokenised first', 'warn', 2], ['Personal data', 'Personal data', 'People can be identified', 'bad', 3]];
const RESIDENCY = [['United Kingdom', 'United Kingdom', 'No transfer', 'ok', 0], ['EU data boundary', 'EU', 'Adequacy decision', 'warn', 1], ['Outside the UK and EU', 'Outside UK & EU', 'Needs transfer safeguards', 'bad', 2], ['Not stated by the provider', 'Not stated', 'Ask the supplier', 'bad', 2]];
const ART22 = [['No', 'No', 'No effect on individuals', 'ok', 0], ['Supports a human decision', 'Supports a person', 'A human makes the call', 'warn', 2], ['Makes an automated decision', 'Decides automatically', 'Article 22 applies in full', 'bad', 3]];
const EVENT = 'External model registered';
const SECTIONS = [['rg-about', 'About this use'], ['rg-model', 'The model'], ['rg-data', 'Data & decisions'], ['rg-ethics', 'Ethical AI']];
const TONE_COL = { ok: 'var(--gv-ok)', warn: 'var(--gv-warn)', bad: 'var(--gv-bad, #C0362C)' };
const KIND_ICON = { approval: UserCheck, automated: Zap, task: ListChecks, notify: Bell };

/* suggested risk tier: data sent + where it is held + decisions about people + red ethical answers */
function suggestRisk(f) {
  const d = DATA.find((x) => x[0] === f.dataSent)?.[4] ?? 0;
  const r = RESIDENCY.find((x) => x[0] === f.residency)?.[4] ?? 0;
  const a = ART22.find((x) => x[0] === f.article22)?.[4] ?? 0;
  const red = ETHICS.filter((e) => e.opts.find(([o]) => o === f.ethics[e.key])?.[1] === 'bad').length;
  const score = d + r + a + red;
  const why = [];
  if (d >= 2) why.push(d === 3 ? 'sends personal data' : 'sends pseudonymised data');
  if (r === 1) why.push('data held in the EU'); else if (r === 2) why.push('data held outside the UK or location unknown');
  if (a >= 2) why.push(a === 3 ? 'makes automated decisions about people' : 'supports decisions about people');
  if (red) why.push(`${red} ethical AI answer${red > 1 ? 's' : ''} rated red`);
  return { score, tier: score >= 6 ? 'High risk' : score >= 3 ? 'Medium risk' : 'Low risk', why };
}

export default function RegisterModel({ onRegistered, base }) {
  const nav = useNavigate();
  const { workflows } = useWorkflowStore();
  const [f, setF] = useState({
    name: '', description: '', owners: ['Admin'], devStage: '', version: '',
    pick: '', custom: false, cProvider: '', cModel: '', cHost: '',
    usedBy: '', dataSent: '', dataDetail: '', residency: '', riskOverride: '', article22: '', sunset: '',
    ethics: {}, approvalNote: '',
  });
  const [kind, setKind] = useState('All');
  const [q, setQ] = useState('');
  const [active, setActive] = useState('rg-about');
  const [saved, setSaved] = useState(null);
  const [resHint, setResHint] = useState('');
  const set = (k) => (e) => setF((o) => ({ ...o, [k]: e?.target ? e.target.value : e }));
  const model = f.custom ? { name: f.cModel, provider: f.cProvider, host: f.cHost || `${f.cProvider} API` } : CATALOGUE.find((c) => c.id === f.pick);

  const done = [
    !!(f.name.trim() && f.owners.length && f.version.trim() && f.devStage),
    f.custom ? !!(f.cProvider.trim() && f.cModel.trim()) : !!f.pick,
    !!(f.usedBy.trim() && f.dataSent && f.residency && f.article22),
    ETHICS.every((e) => f.ethics[e.key]),
  ];
  const fields = [f.name.trim(), f.owners.length, f.version.trim(), f.devStage, done[1], f.usedBy.trim(), f.dataSent, f.residency, f.article22, ...ETHICS.map((e) => f.ethics[e.key])];
  const pct = Math.round((fields.filter(Boolean).length / fields.length) * 100);
  const ready = done.every(Boolean);
  const answered3 = !!(f.dataSent && f.residency && f.article22);
  const sug = suggestRisk(f);
  const risk = f.riskOverride || sug.tier;
  const tierRow = RISK_TIERS.find(([r]) => r === risk);
  const riskTone = risk === 'High risk' ? 'bad' : risk === 'Medium risk' ? 'warn' : 'ok';
  const ctx = { 'Risk tier': answered3 ? risk : undefined, 'Data sent': f.dataSent || undefined, 'Data held in': f.residency || undefined, 'Decisions about individuals': f.article22 || undefined, 'Model source': 'External' };
  const wf = workflows.find((w) => w.module === 'ai-models' && w.event === EVENT && w.status === 'active');
  const path = wf ? pathFor(wf, ctx) : [];
  const approvals = path.filter((p) => p.applies && !(p.step.runIf && ctx[p.step.runIf.field] == null) && (p.step.kind === 'approval' || p.step.kind === 'task'));
  const days = approvals.reduce((n, p) => n + p.step.sla, 0);

  /* highlight the section in view */
  useEffect(() => {
    const io = new IntersectionObserver((es) => es.forEach((e) => e.isIntersecting && setActive(e.target.id)), { rootMargin: '-35% 0px -60% 0px' });
    SECTIONS.forEach(([id]) => { const el = document.getElementById(id); if (el) io.observe(el); });
    return () => io.disconnect();
  }, []);
  const jump = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  const pickModel = (c) => {
    if (!f.residency) setResHint(`Filled in from ${c.host}. Change it if your contract says otherwise.`);
    setF((o) => ({ ...o, pick: c.id, custom: false, residency: o.residency || c.region }));
  };

  const submit = () => {
    const id = `${model.provider}-${f.name}`.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const v = f.version.trim();
    const at = new Date().toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).replace(' at', ',');
    const req = startRequest(wf.id, { kind: 'model', id, label: `${f.name.trim()} · ${v}`, owners: f.owners, note: f.approvalNote.trim() }, { ...ctx, 'Risk tier': risk }, 'Admin');
    const st = stateOf(req);
    const first = st.cur ? st.cur.step.name : 'nothing — approved';
    MODELS.unshift({
      id, name: f.name.trim(), provider: model.provider, foundIn: ['External'], risk, owner: f.owners.join(', '), monitoring: 'not monitored', alerts: 0,
      purpose: f.description.trim() || `Uses ${model.name}`, usedBy: f.usedBy.trim(), ethical: f.ethics, devStage: f.devStage, residency: f.residency, article22: f.article22, baseModel: model.name,
      checks: ['Drift and bias results reviewed', 'Performance still acceptable', 'Continued business need confirmed'],
      versionRows: [{
        v, reg: [`External · ${model.host}`], acc: '—', auc: '—', f1: '—', stage: 'Registered', review: '—', path: ['Registered'],
        note: `Registered ${at} — awaiting approval (${req.id}, ${wf.name}): next step ${first}. Development stage: ${f.devStage}.${f.sunset ? ` Sunset date ${f.sunset}.` : ''}`,
        lineage: [
          { stage: 'Consumer', items: [{ b: f.usedBy.trim(), s: f.description.trim() }] },
          { stage: 'Data sent', items: [{ b: f.dataSent, s: f.dataDetail.trim() }] },
          { stage: 'External model', items: [{ b: `${model.provider} · ${model.name}`, s: `${model.host} · data held in ${f.residency}` }] },
          { stage: 'Output', items: [{ b: 'Not recorded', muted: true }] },
        ],
        history: [
          { at, who: 'Admin', what: `Approval requested — ${wf.name} v${wf.version} (${req.id}); waiting on ${first}` },
          { at, who: 'Admin', what: 'Completed: Model card completed' },
          ...(f.owners.length ? [{ at, who: 'Admin', what: 'Completed: Accountable owner named' }] : []),
          ...(f.description.trim() ? [{ at, who: 'Admin', what: 'Completed: Intended use and limits stated' }] : []),
          { at, who: 'Admin', what: `Registered as an external model (${risk.toLowerCase()}${f.riskOverride ? `, GenMeta suggested ${sug.tier.toLowerCase()}` : ''}); ethical AI assessment recorded` },
        ],
      }],
      versions: 1, stage: 'Registered',
    });
    onRegistered?.();
    toast(`${f.name.trim()} registered — approval ${req.id} started; waiting on ${first}`);
    nav(`${base}/${id}`);
  };

  const kinds = ['All', ...new Set(CATALOGUE.map((c) => c.kind))];
  const list = CATALOGUE.filter((c) => (kind === 'All' || c.kind === kind) && `${c.name} ${c.provider} ${c.host}`.toLowerCase().includes(q.toLowerCase()));
  const missing = [
    !done[0] && ['rg-about', 'About this use — name, owner, version and stage'],
    !done[1] && ['rg-model', 'Pick the model'],
    !done[2] && ['rg-data', 'Data & decisions — four answers'],
    !done[3] && ['rg-ethics', `Ethical AI — ${ETHICS.filter((e) => !f.ethics[e.key]).length} ratings left`],
  ].filter(Boolean);

  return (
    <div className="page gv rg">
      <div className="rg-top">
        <div>
          <span className="gv-eyebrow">AI model governance</span>
          <h1>Register an external AI model</h1>
        </div>
        <div className="gv-inline" style={{ gap: 8, alignItems: 'center' }}>
          <span className="gv-faint" style={{ fontSize: 12 }}>{saved ? `Draft saved ${saved}` : 'Draft · not saved yet'}</span>
          <Button variant="secondary" onClick={() => nav(base)}>Cancel</Button>
          <Button variant="secondary" onClick={() => setSaved(new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }))}>Save draft</Button>
          <Button variant="primary" icon={ShieldCheck} disabled={!ready || !wf} onClick={submit}>Submit for approval</Button>
        </div>
      </div>
      <div className="rg-toc">
        {SECTIONS.map(([id, l], k) => (
          <button key={id} type="button" className={`${active === id ? 'on' : ''} ${done[k] ? 'done' : ''}`} onClick={() => jump(id)}>
            <i>{done[k] ? <Check size={11} strokeWidth={3} /> : k + 1}</i>{l}
          </button>
        ))}
        <span className="rg-pct"><b>{pct}%</b> complete<span className="rg-bar"><i style={{ width: `${pct}%` }} /></span></span>
      </div>

      <div className="rg-grid">
        <main>
          <section className="dash-card rg-sec" id="rg-about">
            <h2><span>01</span>About this use</h2>
            <p className="rg-lead">Register the use of a model, not just the model — the same provider model can be safe in one place and risky in another.</p>
            <Fl label="What will you call it?" req><input className="input" value={f.name} onChange={set('name')} placeholder="e.g. Glossary drafting assistant" /></Fl>
            <Fl label="What does it do, and for whom?"><textarea className="input" rows={2} value={f.description} onChange={set('description')} placeholder="Drafts business glossary definitions for stewards to review in GenMeta" /></Fl>
            <div className="rg-two">
              <Fl label="Accountable owners" req><OwnerPicker value={f.owners} onChange={set('owners')} /></Fl>
              <Fl label="Version" req><input className="input" value={f.version} onChange={set('version')} placeholder="e.g. v1.0 or the provider’s model version" /></Fl>
            </div>
            <Fl label="Where is it in its life?" req>
              <div className="gv-chips">{STAGES.map((s) => <button key={s} type="button" className={`chip ${f.devStage === s ? 'on' : ''}`} onClick={() => setF((o) => ({ ...o, devStage: s }))}>{s}</button>)}</div>
            </Fl>
          </section>

          <section className="dash-card rg-sec" id="rg-model">
            <h2><span>02</span>The model</h2>
            <p className="rg-lead">Pick the provider model you will call. Where the provider holds the data is shown on each, because it decides the reviews you need.</p>
            <div className="rg-mfilter">
              <label className="gv-search" style={{ flex: 1, margin: 0 }}><Search size={15} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search models, providers and hosting" /></label>
              <div className="gv-chips">{kinds.map((k) => <button key={k} type="button" className={`chip ${kind === k ? 'on' : ''}`} onClick={() => setKind(k)}>{k}</button>)}</div>
            </div>
            <div className="rg-models">
              {list.map((c) => {
                const rr = RESIDENCY.find((x) => x[0] === c.region);
                return (
                  <button key={c.id} type="button" className={`rg-m ${!f.custom && f.pick === c.id ? 'on' : ''}`} onClick={() => pickModel(c)}>
                    <span className="rg-lg" style={{ background: c.col }}>{c.mono}</span>
                    <b>{c.name}</b>
                    <small>{c.provider} · {c.host}</small>
                    <p>{c.desc}</p>
                    <span className="rg-tags"><span className={`rg-rg ${rr[3]}`}>Data held: {rr[1]}</span>{registeredName(c) && <span className="rg-rg info">in the inventory</span>}</span>
                  </button>
                );
              })}
              <div className={`rg-m add ${f.custom ? 'on' : ''}`} role="button" tabIndex={0} onClick={() => !f.custom && setF((o) => ({ ...o, custom: true, pick: '' }))} onKeyDown={(e) => e.key === 'Enter' && setF((o) => ({ ...o, custom: true, pick: '' }))}>
                {!f.custom ? <><Plus size={18} /><b>Model not listed</b><small>Add provider, model and endpoint</small></> : (
                  <div className="rg-custom">
                    <b>Model not listed</b>
                    <input className="input" value={f.cProvider} onChange={set('cProvider')} placeholder="Provider, e.g. Cohere" autoFocus />
                    <input className="input" value={f.cModel} onChange={set('cModel')} placeholder="Model, e.g. Command R+" />
                    <input className="input" value={f.cHost} onChange={set('cHost')} placeholder="Hosting / endpoint (optional)" />
                  </div>
                )}
              </div>
            </div>
          </section>

          <section className="dash-card rg-sec" id="rg-data">
            <h2><span>03</span>Data & decisions</h2>
            <p className="rg-lead">Three answers decide most of the risk.</p>
            <Fl label="Which system or team calls it?" req><input className="input" value={f.usedBy} onChange={set('usedBy')} placeholder="e.g. GenMeta · Glossary" /></Fl>
            <Fl label="What data is sent to the model?" req><Tiles opts={DATA} value={f.dataSent} onChange={set('dataSent')} /></Fl>
            <Fl label="Data details"><input className="input" value={f.dataDetail} onChange={set('dataDetail')} placeholder="e.g. catalogue metadata; sensitive columns withheld by role" /></Fl>
            <Fl label="Where does the provider hold it?" req hint={resHint}><Tiles opts={RESIDENCY} value={f.residency} onChange={(v) => { setResHint(''); setF((o) => ({ ...o, residency: v })); }} /></Fl>
            <Fl label="Does it make or support decisions about individuals? (UK GDPR Article 22)" req><Tiles opts={ART22} value={f.article22} onChange={set('article22')} three /></Fl>
            <div className="rg-suggest">
              {answered3 ? (<>
                <Sparkles size={15} /><span>GenMeta suggests</span><b style={{ color: TONE_COL[sug.tier === 'High risk' ? 'bad' : sug.tier === 'Medium risk' ? 'warn' : 'ok'] }}>{sug.tier}</b>
                <span className="gv-muted" style={{ flex: 1 }}>{sug.why.join(' · ') || 'no risk factors found'}</span>
                <select className="select" style={{ width: 'auto', height: 32 }} value={f.riskOverride} onChange={set('riskOverride')} aria-label="Risk tier">
                  <option value="">Accept</option>{RISK_TIERS.map(([r]) => <option key={r} value={r}>Use {r.toLowerCase()}</option>)}
                </select>
              </>) : <span className="gv-muted">Answer the three questions above and GenMeta will suggest a risk tier.</span>}
            </div>
            <Fl label="Sunset date (optional)"><input className="input" type="date" style={{ maxWidth: 220 }} value={f.sunset} onChange={set('sunset')} /></Fl>
          </section>

          <section className="dash-card rg-sec" id="rg-ethics">
            <h2><span>04</span>Ethical AI</h2>
            <p className="rg-lead">Seven quick ratings. Anything red adds to the risk score and is shown to approvers.</p>
            <div className="rg-eth">
              {ETHICS.map((e) => (
                <div key={e.key} className="rg-erow">
                  <div><b>{e.label}</b><small>{e.desc}</small></div>
                  <div className="rg-seg">
                    {e.opts.map(([o, tn, d]) => (
                      <button key={o} type="button" title={d} className={`${tn} ${f.ethics[e.key] === o ? 'on' : ''}`} onClick={() => setF((x) => ({ ...x, ethics: { ...x.ethics, [e.key]: o } }))}>
                        <i style={{ background: TONE_COL[tn] }} />{o}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <Fl label="Note to the approvers (optional)"><textarea className="input" rows={2} value={f.approvalNote} onChange={set('approvalNote')} placeholder="e.g. Needed for the glossary pilot by 1 November" /></Fl>
          </section>
        </main>

        <aside className="rg-live">
          <div className="dash-card rg-panel">
            <h3>Live verdict</h3>
            <div className="rg-verdict">
              <svg viewBox="0 0 100 60" className="rg-gauge" aria-hidden="true">
                <path d="M10 55 A40 40 0 0 1 90 55" fill="none" stroke="var(--line)" strokeWidth="10" strokeLinecap="round" />
                <path d="M10 55 A40 40 0 0 1 90 55" fill="none" stroke={answered3 ? TONE_COL[riskTone] : 'transparent'} strokeWidth="10" strokeLinecap="round" strokeDasharray="126" strokeDashoffset={answered3 ? 126 - Math.min(sug.score / 12, 1) * 126 : 126} style={{ transition: 'stroke-dashoffset .4s, stroke .4s' }} />
              </svg>
              <div>
                <b style={{ color: answered3 ? TONE_COL[riskTone] : undefined }}>{answered3 ? risk : '—'}</b>
                <small>{answered3 ? `Score ${sug.score} of 12 · reviewed every ${tierRow?.[2]} days${f.riskOverride ? ' · set by you' : ''}` : 'Answer Data & decisions to see the risk tier'}</small>
              </div>
            </div>
            {answered3 && <ul className="rg-why">{(sug.why.length ? sug.why : ['no risk factors found']).map((w) => <li key={w}>{w}</li>)}</ul>}
          </div>

          <div className="dash-card rg-panel">
            <h3>Approval path</h3>
            {wf ? (<>
              <ol className="wf-tl" style={{ marginBottom: 6 }}>
                {path.map(({ step: s, applies }) => {
                  const I = KIND_ICON[s.kind];
                  const isAuto = s.kind === 'automated';
                  const open = s.runIf && ctx[s.runIf.field] == null;
                  if (open) return <li key={s.id} className="skipped"><i><I size={11} /></i><div><b>{s.name}</b><small>Depends on your answers — only if {condText(s.runIf)}</small></div></li>;
                  return (
                    <li key={s.id} className={!applies ? 'skipped' : isAuto && ready ? 'done' : 'not-reached'}>
                      <i>{!applies ? <CircleSlash size={11} /> : isAuto && ready ? <Check size={11} strokeWidth={3} /> : <I size={11} />}</i>
                      <div>
                        <b>{s.name}</b>
                        <small>
                          {!applies && `Not needed — only if ${condText(s.runIf)}`}
                          {applies && isAuto && (ready ? 'Passes — everything it checks is answered' : 'Passes once every section is complete')}
                          {applies && !isAuto && s.kind !== 'notify' && <>{approverText(s, { subject: { owners: f.owners } })} · {s.sla} day{s.sla === 1 ? '' : 's'}{s.sod && <> · <Lock size={10} /> not the requester</>}{s.runIf && ` · because ${condText(s.runIf)}`}</>}
                          {applies && s.kind === 'notify' && 'Owners and requester are told'}
                        </small>
                      </div>
                    </li>
                  );
                })}
                <li className="not-reached"><i><Flag size={11} /></i><div><b>Approved for use</b><small>{wf.outcome.approved}</small></div></li>
              </ol>
              <p className="rg-eta">{approvals.length} approval{approvals.length === 1 ? '' : 's'} · up to {days} working days · workflow <b>{wf.name} v{wf.version}</b> from Governance › Workflows{!answered3 && ' so far — more may be added once Data & decisions is answered'}</p>
            </>) : <p className="gv-muted" style={{ fontSize: 13, margin: 0 }}>No active workflow starts on “{EVENT}”. Publish one in Governance › Workflows.</p>}
          </div>

          <div className="dash-card rg-panel">
            <h3>Still needed</h3>
            {missing.length ? (
              <ul className="rg-missing">{missing.map(([id, t]) => <li key={id}><button type="button" onClick={() => jump(id)}>{t}</button></li>)}</ul>
            ) : <><p className="rg-ready"><Check size={14} strokeWidth={3} /> Everything is in — ready to submit.</p><Button variant="primary" icon={ShieldCheck} disabled={!wf} onClick={submit} style={{ marginTop: 10, width: '100%', justifyContent: 'center' }}>Submit for approval</Button></>}
          </div>
        </aside>
      </div>
    </div>
  );
}

export function Fl({ label, req, hint, children }) {
  return <div className="rg-f"><label>{label}{req && <em> *</em>}</label>{children}{hint && <small>{hint}</small>}</div>;
}

export function Tiles({ opts, value, onChange, three }) {
  return (
    <div className={`rg-tiles ${three ? 'three' : ''}`}>
      {opts.map(([v, l, s, tn]) => (
        <button key={v} type="button" className={`rg-tile ${value === v ? 'on' : ''}`} onClick={() => onChange(v)}>
          <b><i style={{ background: TONE_COL[tn] }} />{l}</b>{s && <small>{s}</small>}
        </button>
      ))}
    </div>
  );
}

export function OwnerPicker({ value, onChange }) {
  const [q, setQ] = useState('');
  const ref = useRef();
  const add = (p) => { const v = p.trim(); if (v && !value.includes(v)) onChange([...value, v]); setQ(''); };
  const opts = useMemo(() => PEOPLE.filter((p) => !value.includes(p)), [value]);
  return (
    <div className="gv-owners" onClick={() => ref.current?.focus()} role="presentation">
      {value.map((o) => <span key={o} className="gv-ownchip">{o}<button type="button" aria-label={`Remove ${o}`} onClick={() => onChange(value.filter((x) => x !== o))}><X size={12} /></button></span>)}
      <input ref={ref} list="rg-owner-people" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(q); } }} onBlur={() => q && add(q)} placeholder={value.length ? 'Add another owner' : 'Name an accountable owner'} />
      <datalist id="rg-owner-people">{opts.map((p) => <option key={p} value={p} />)}</datalist>
      <ChevronDown size={15} className="gv-owners-c" />
    </div>
  );
}
