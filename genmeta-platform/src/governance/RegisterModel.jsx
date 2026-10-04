import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, ArrowRight, ArrowLeft, Search, X, Cpu, BadgeCheck, ChevronDown, ShieldCheck, Server, Sparkles, UserCheck, Zap, ListChecks, Bell, CircleSlash, Lock, Workflow as WorkflowIcon } from 'lucide-react';
import { Button } from '../components/ui.jsx';
import { MODELS, RISK_TIERS } from './data.js';
import { PEOPLE } from './stewardship-data.js';
import { Fld, toast } from './kit.jsx';
import { workflowFor, pathFor, startRequest, stateOf, approverText, condText, useWorkflowStore } from './workflows.js';

/* Register an externally provided AI model — a guided six-step flow (Atlan's "New AI application"
   pattern): Overview → Select the AI model → Additional details → Ethical AI → Approval → Review.
   The Approval step attaches the workflow from Governance › Workflows that starts on "External model
   registered" and shows exactly which steps this model will go through. Submitting adds the model at
   "Registered" and starts the approval request. */

export const ETHICS = [
  { key: 'privacy', label: 'Privacy', desc: 'Sensitive data such as personal identifiers, health information and financial records is protected from unauthorised access, use or disclosure.',
    opts: [['Personal data', 'bad', 'The model receives personal data.'], ['Pseudonymised data', 'warn', 'Identifiers are removed or tokenised before data is sent.'], ['No personal data', 'ok', 'Only metadata or non-personal data is sent.']] },
  { key: 'fairness', label: 'Fairness', desc: 'Fairness criteria account for user experience and cultural, social, historical, political, legal and ethical considerations, several of which may trade off.',
    opts: [['Low risk', 'ok', 'Outputs do not affect individuals differently.'], ['Medium risk', 'warn', 'Some outputs could affect groups differently; monitored.'], ['High risk', 'bad', 'Outputs could treat groups of people unequally.']] },
  { key: 'bias', label: 'Bias mitigation', desc: 'How effective the measures are that address bias in the training data and in the model.',
    opts: [['Effective', 'ok', 'Effective measures in place to identify and mitigate biases in training data and algorithms.'], ['Partial', 'warn', 'Some efforts made to address biases, but potential for improvement.'], ['Ineffective', 'bad', 'Limited or no measures in place to address biases.']] },
  { key: 'reliability', label: 'Reliability and safety', desc: 'The model performs its intended function accurately and consistently, and operates securely without putting users at risk.',
    opts: [['High', 'ok', 'Tested against the intended use; failures are rare and contained.'], ['Moderate', 'warn', 'Generally reliable; known failure modes are documented.'], ['Low', 'bad', 'Unpredictable outputs or untested for this use.']] },
  { key: 'transparency', label: 'Transparency', desc: 'How the model works, the factors behind its decisions and the data it uses are explained to stakeholders.',
    opts: [['Full disclosure', 'ok', 'Model card, data use and limitations are published.'], ['Partial disclosure', 'warn', 'Some documentation from the provider; gaps remain.'], ['Black box', 'bad', 'No meaningful explanation of how outputs are produced.']] },
  { key: 'accountability', label: 'Accountability', desc: 'A named person is answerable for the model, its use and its outcomes.',
    opts: [['Has owner', 'ok', 'An accountable owner is named and has accepted the role.'], ['Shared ownership', 'warn', 'Responsibility is shared across a team without a single owner.'], ['No owner', 'bad', 'Nobody is accountable yet.']] },
  { key: 'environment', label: 'Environmental consciousness', desc: 'The energy and carbon cost of using the model is understood and proportionate to the benefit.',
    opts: [['Low risk', 'ok', 'Small or efficient model, low call volume.'], ['Medium risk', 'warn', 'Large model or high call volume; reviewed.'], ['High risk', 'bad', 'Very high compute use with no offsetting measures.']] },
];
const toneOf = (k, v) => ETHICS.find((e) => e.key === k)?.opts.find(([o]) => o === v)?.[1] || 'neutral';

/* externally provided models the organisation can call */
const CATALOGUE = [
  { id: 'anthropic-claude-sonnet-5', name: 'Claude Sonnet 5', provider: 'Anthropic', host: 'Anthropic API', desc: 'General-purpose large language model for reasoning, writing and question answering over documents and metadata.' },
  { id: 'anthropic-claude-haiku', name: 'Claude Haiku 4.5', provider: 'Anthropic', host: 'Amazon Bedrock (eu-west-2)', desc: 'Small, fast language model suited to classification, extraction and high-volume summarisation.' },
  { id: 'openai-gpt-41', name: 'GPT-4.1', provider: 'OpenAI', host: 'OpenAI API', desc: 'Large language model for drafting, extraction and conversational assistants.' },
  { id: 'azure-gpt-41', name: 'GPT-4.1 (Azure OpenAI)', provider: 'Microsoft', host: 'Azure OpenAI (UK South)', desc: 'GPT-4.1 hosted in an Azure region under the organisation’s own tenancy and data-processing terms.' },
  { id: 'google-gemini-flash', name: 'Gemini 2.5 Flash', provider: 'Google', host: 'Google Vertex AI (europe-west2)', desc: 'Fast multimodal model for summarisation, image and document understanding.' },
  { id: 'mistral-large', name: 'Mistral Large', provider: 'Mistral AI', host: 'Mistral API (EU)', desc: 'Large language model hosted in the EU, with open-weight smaller variants available.' },
  { id: 'meta-llama-70b', name: 'Llama 3.1 70B', provider: 'Meta', host: 'Amazon Bedrock (eu-west-2)', desc: 'Open-weight language model run through a managed cloud service.' },
  { id: 'aws-titan-embed', name: 'Titan Text Embeddings', provider: 'Amazon', host: 'Amazon Bedrock (eu-west-2)', desc: 'Embedding model that turns text into vectors for semantic search and retrieval.' },
];
const registeredName = (c) => MODELS.some((m) => m.name.toLowerCase() === c.name.toLowerCase() && !/test entry/i.test(m.name));

const STEPS = ['Overview', 'Select the AI model', 'Additional details', 'Ethical AI', 'Approval', 'Review'];
const EVENT = 'External model registered';
const ctxOf = (f) => ({ 'Risk tier': f.risk, 'Data sent': f.dataSent, 'Data held in': f.residency, 'Decisions about individuals': f.article22, 'Model source': 'External' });
const STAGES = ['Ideation', 'Proof of concept', 'Development', 'Pilot', 'Ready for production'];

export default function RegisterModel({ onRegistered, base }) {
  const nav = useNavigate();
  const [step, setStep] = useState(0);
  const [f, setF] = useState({
    name: '', description: '', owners: ['Admin'], devStage: '', version: '',
    pick: '', custom: false, cProvider: '', cModel: '', cHost: '',
    usedBy: '', dataSent: '', dataDetail: '', residency: '', risk: '', article22: '', sunset: '',
    ethics: {}, wfId: workflowFor('ai-models', EVENT)[0]?.id || '', approvalNote: '',
  });
  const set = (k) => (e) => setF((o) => ({ ...o, [k]: e?.target ? e.target.value : e }));
  const model = f.custom ? { name: f.cModel, provider: f.cProvider, host: f.cHost || `${f.cProvider} API` } : CATALOGUE.find((c) => c.id === f.pick);
  const ok = [
    f.name.trim() && f.devStage && f.version.trim(),
    f.custom ? f.cProvider.trim() && f.cModel.trim() : !!f.pick,
    f.usedBy.trim() && f.dataSent && f.residency && f.risk && f.article22,
    ETHICS.every((e) => f.ethics[e.key]),
    !!f.wfId,
    true,
  ];
  const go = (n) => { if (n <= step || ok.slice(0, n).every(Boolean)) setStep(n); };

  const submit = () => {
    const id = `${model.provider}-${f.name}`.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const v = f.version.trim();
    const at = new Date().toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).replace(' at', ',');
    const req = startRequest(f.wfId, { kind: 'model', id, label: `${f.name.trim()} · ${v}`, owners: f.owners, note: f.approvalNote.trim() }, ctxOf(f), 'Admin');
    const st = stateOf(req);
    const wf = st.wf;
    const first = st.cur ? st.cur.step.name : 'nothing — approved';
    MODELS.unshift({
      id, name: f.name.trim(), provider: model.provider, foundIn: ['External'], risk: f.risk, owner: f.owners.join(', '), monitoring: 'not monitored', alerts: 0,
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
        /* the registration flow captures the model card, owner and intended use, so those checks are recorded as done */
        history: [
          { at, who: 'Admin', what: `Approval requested — ${wf.name} v${wf.version} (${req.id}); waiting on ${first}` },
          { at, who: 'Admin', what: 'Completed: Model card completed' },
          ...(f.owners.length ? [{ at, who: 'Admin', what: 'Completed: Accountable owner named' }] : []),
          ...(f.description.trim() ? [{ at, who: 'Admin', what: 'Completed: Intended use and limits stated' }] : []),
          { at, who: 'Admin', what: `Registered as an external model (${f.risk.toLowerCase()}); ethical AI assessment recorded` },
        ],
      }],
      versions: 1, stage: 'Registered',
    });
    onRegistered?.();
    toast(`${f.name.trim()} registered — approval ${req.id} started; waiting on ${first}`);
    nav(`${base}/${id}`);
  };

  return (
    <div className="page gv gv-wiz">
      <div className="gv-wiz-top">
        <div><span className="gv-eyebrow">AI model governance</span><h1>Register an external AI model</h1></div>
        <div className="gv-inline" style={{ gap: 8 }}>
          <Button variant="secondary" onClick={() => nav(base)}>Cancel</Button>
          {step > 0 && <Button variant="secondary" icon={ArrowLeft} onClick={() => setStep(step - 1)}>Back</Button>}
          {step < 5
            ? <Button variant="primary" disabled={!ok[step]} onClick={() => setStep(step + 1)}>Continue<ArrowRight size={15} /></Button>
            : <Button variant="primary" icon={ShieldCheck} onClick={submit}>Submit for approval</Button>}
        </div>
      </div>
      <div className="gv-wiz-bar"><i style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} /></div>

      <div className="gv-wiz-body">
        <ol className="gv-wiz-steps">
          {STEPS.map((s, i) => (
            <li key={s} className={i < step ? 'done' : i === step ? 'cur' : ''}>
              <button type="button" onClick={() => go(i)} disabled={i > step && !ok.slice(0, i).every(Boolean)}>
                <i>{i < step ? <Check size={14} strokeWidth={2.5} /> : i + 1}</i><span>{s}</span>
              </button>
            </li>
          ))}
        </ol>

        <div className="dash-card gv-wiz-card">
          {step === 0 && (
            <div className="gv-wiz-form">
              <Fld label="Name *"><input className="input" value={f.name} onChange={set('name')} placeholder="e.g. Glossary drafting assistant" autoFocus /></Fld>
              <Fld label="Description"><textarea className="input gv-ta" rows={3} value={f.description} onChange={set('description')} placeholder="What the model is used for, and by whom" /></Fld>
              <Fld label="Owners">
                <OwnerPicker value={f.owners} onChange={set('owners')} />
              </Fld>
              <Fld label="Development stage *">
                <select className="select" value={f.devStage} onChange={set('devStage')}><option value="">Select</option>{STAGES.map((s) => <option key={s}>{s}</option>)}</select>
              </Fld>
              <Fld label="Version *"><input className="input" value={f.version} onChange={set('version')} placeholder="e.g. v1.0 or the provider’s model version" /></Fld>
            </div>
          )}

          {step === 1 && <PickModel f={f} setF={setF} />}

          {step === 2 && (
            <div className="gv-wiz-form">
              <Fld label="Used by *"><input className="input" value={f.usedBy} onChange={set('usedBy')} placeholder="System or team that calls the model, e.g. GenMeta · Ask GenMeta" /></Fld>
              <div className="gv-wiz-two">
                <Fld label="Data sent to the model *">
                  <select className="select" value={f.dataSent} onChange={set('dataSent')}><option value="">Select</option>
                    {['Metadata only', 'Pseudonymised data', 'Personal data', 'No organisational data'].map((o) => <option key={o}>{o}</option>)}</select>
                </Fld>
                <Fld label="Where the provider holds the data *">
                  <select className="select" value={f.residency} onChange={set('residency')}><option value="">Select</option>
                    {['United Kingdom', 'EU data boundary', 'Outside the UK and EU', 'Not stated by the provider'].map((o) => <option key={o}>{o}</option>)}</select>
                </Fld>
              </div>
              <Fld label="Data details"><input className="input" value={f.dataDetail} onChange={set('dataDetail')} placeholder="e.g. catalogue metadata; sensitive columns withheld by role" /></Fld>
              <div className="gv-wiz-two">
                <Fld label="Risk tier *">
                  <select className="select" value={f.risk} onChange={set('risk')}><option value="">Select</option>{RISK_TIERS.map(([r]) => <option key={r}>{r}</option>)}</select>
                </Fld>
                <Fld label="Makes or supports decisions about individuals? (UK GDPR Article 22) *">
                  <select className="select" value={f.article22} onChange={set('article22')}><option value="">Select</option>
                    {['No', 'Supports a human decision', 'Makes an automated decision'].map((o) => <option key={o}>{o}</option>)}</select>
                </Fld>
              </div>
              {f.risk && <p className="gv-wiz-hint">{RISK_TIERS.find(([r]) => r === f.risk)[1]} Reviewed every {RISK_TIERS.find(([r]) => r === f.risk)[2]} days.</p>}
              <Fld label="Sunset date (optional)"><input className="input" type="date" value={f.sunset} onChange={set('sunset')} /></Fld>
            </div>
          )}

          {step === 3 && (
            <div className="gv-ethics">
              <h2>Ethical AI</h2>
              <p className="gv-muted">Ethical AI puts fairness, accountability, transparency and respect for people’s rights first: it limits bias, protects privacy and aims for fair outcomes. Choose the option that best describes this model.</p>
              {ETHICS.map((e) => (
                <div key={e.key} className="gv-ethic">
                  <div><b>{e.label}</b><p>{e.desc}</p></div>
                  <EthicSelect e={e} value={f.ethics[e.key]} onChange={(v) => setF((o) => ({ ...o, ethics: { ...o.ethics, [e.key]: v } }))} />
                </div>
              ))}
              <p className="gv-faint" style={{ margin: 0, fontSize: 12 }}>{Object.keys(f.ethics).length} of {ETHICS.length} answered</p>
            </div>
          )}

          {step === 4 && <Approval f={f} setF={setF} />}

          {step === 5 && <Review f={f} model={model} />}
        </div>
      </div>
    </div>
  );
}

function OwnerPicker({ value, onChange }) {
  const [q, setQ] = useState('');
  const add = (p) => { const v = p.trim(); if (v && !value.includes(v)) onChange([...value, v]); setQ(''); };
  return (
    <div className="gv-owners">
      {value.map((o) => <span key={o} className="gv-ownchip">{o}<button type="button" aria-label={`Remove ${o}`} onClick={() => onChange(value.filter((x) => x !== o))}><X size={12} /></button></span>)}
      <input list="gv-owner-people" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(q); } }} onBlur={() => q && add(q)} placeholder={value.length ? 'Add another owner' : 'Name an accountable owner'} />
      <datalist id="gv-owner-people">{PEOPLE.filter((p) => !value.includes(p)).map((p) => <option key={p} value={p} />)}</datalist>
      <ChevronDown size={15} className="gv-owners-c" />
    </div>
  );
}

function PickModel({ f, setF }) {
  const [q, setQ] = useState('');
  const list = CATALOGUE.filter((c) => `${c.name} ${c.provider} ${c.desc}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <div>
      <h2 className="gv-wiz-h">Pick the AI model from the list *</h2>
      <p className="gv-muted" style={{ marginTop: 0 }}>The model the organisation calls as an external service. Models already in the inventory are marked.</p>
      <label className="gv-search"><Search size={15} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search all models and providers" /></label>
      <div className="gv-inline" style={{ gap: 6, marginBottom: 10 }}><span className="chip on"><Cpu size={13} /> AI model <b>{list.length}</b></span></div>
      <div className="gv-picklist">
        {list.map((c) => {
          const dup = registeredName(c);
          const on = !f.custom && f.pick === c.id;
          return (
            <label key={c.id} className={`gv-pick ${on ? 'on' : ''}`}>
              <input type="radio" name="gv-pick" checked={on} onChange={() => setF((o) => ({ ...o, pick: c.id, custom: false }))} />
              <div>
                <div className="gv-pick-t"><Cpu size={14} /><b>{c.name}</b><BadgeCheck size={14} className="gv-pick-v" /><span className="gv-faint">· {c.provider}</span>{dup && <span className="gv-tag info">already in the inventory</span>}</div>
                <small className="gv-faint">AI model · {c.host}</small>
                <p>{c.desc}</p>
              </div>
            </label>
          );
        })}
        <label className={`gv-pick ${f.custom ? 'on' : ''}`}>
          <input type="radio" name="gv-pick" checked={f.custom} onChange={() => setF((o) => ({ ...o, custom: true, pick: '' }))} />
          <div>
            <div className="gv-pick-t"><Sparkles size={14} /><b>Register a model that is not listed</b></div>
            {f.custom && (
              <div className="gv-wiz-two" style={{ marginTop: 10 }}>
                <Fld label="Provider *"><input className="input" value={f.cProvider} onChange={(e) => setF((o) => ({ ...o, cProvider: e.target.value }))} placeholder="e.g. Cohere" /></Fld>
                <Fld label="Model *"><input className="input" value={f.cModel} onChange={(e) => setF((o) => ({ ...o, cModel: e.target.value }))} placeholder="e.g. Command R+" /></Fld>
                <Fld label="Hosting / endpoint"><input className="input" value={f.cHost} onChange={(e) => setF((o) => ({ ...o, cHost: e.target.value }))} placeholder="e.g. Cohere API (EU)" /></Fld>
              </div>
            )}
          </div>
        </label>
      </div>
    </div>
  );
}

function EthicSelect({ e, value, onChange }) {
  const [open, setOpen] = useState(false);
  const cur = e.opts.find(([o]) => o === value);
  return (
    <div className="gv-esel" onBlur={(ev) => { if (!ev.currentTarget.contains(ev.relatedTarget)) setOpen(false); }}>
      <button type="button" className={`gv-esel-b ${open ? 'open' : ''}`} onClick={() => setOpen((o) => !o)}>
        {cur ? <span className={`gv-etone ${cur[1]}`}>{cur[0]}</span> : <span className="gv-faint">Select</span>}<ChevronDown size={15} />
      </button>
      {open && (
        <ul className="gv-esel-m">
          {e.opts.map(([o, tn, d]) => (
            <li key={o}><button type="button" onClick={() => { onChange(o); setOpen(false); }} className={o === value ? 'on' : ''}>
              <b className={`gv-etone ${tn}`}>{o}</b><small>{d}</small>
            </button></li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Review({ f, model }) {
  const [tab, setTab] = useState('overview');
  const [openMeta, setOpenMeta] = useState({ risk: true, data: false });
  return (
    <div>
      <div className="subtabs gv-subtabs" style={{ marginBottom: 14 }}>
        {[['overview', 'Overview'], ['model', 'Model']].map(([k, l]) => <button key={k} type="button" className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}</button>)}
      </div>
      {tab === 'overview' ? (
        <div className="gv-rev">
          <div className="gv-rev-sum">
            <h3>Summary</h3>
            <div className="gv-rev-big"><span className="gv-chip violet"><Cpu size={18} /></span><div><b>{f.name}</b><small>{model.provider} · {model.name} · {f.version}</small></div></div>
            <div className="gv-rev-row"><span>Description</span><p>{f.description || '—'}</p></div>
            <div className="gv-rev-row"><span>Owners</span><p>{f.owners.join(', ') || '—'}</p></div>
            <div className="gv-rev-row"><span>Development stage</span><p>{f.devStage}</p></div>
            <span className="gv-rev-lbl">Custom metadata</span>
            {[['risk', 'AI risk classification', [['Risk tier', f.risk], ['Decisions about individuals', f.article22], ['Review every', `${RISK_TIERS.find(([r]) => r === f.risk)?.[2]} days`]]],
              ['data', 'Data and hosting', [['Used by', f.usedBy], ['Data sent', `${f.dataSent}${f.dataDetail ? ` — ${f.dataDetail}` : ''}`], ['Hosting', model.host], ['Data held in', f.residency], ['Sunset date', f.sunset || '—']]]].map(([k, l, rows]) => (
              <div key={k} className={`gv-rev-meta ${openMeta[k] ? 'open' : ''}`}>
                <button type="button" onClick={() => setOpenMeta((o) => ({ ...o, [k]: !o[k] }))}>{k === 'risk' ? <ShieldCheck size={14} /> : <Server size={14} />}<span>{l}</span><ChevronDown size={15} /></button>
                {openMeta[k] && <dl>{rows.map(([a, b]) => [<dt key={`${a}k`}>{a}</dt>, <dd key={`${a}v`}>{b}</dd>])}</dl>}
              </div>
            ))}
          </div>
          <div className="gv-rev-eth">
            <h3>Ethical AI</h3>
            {ETHICS.map((e) => <div key={e.key}><span>{e.label}</span><b className={`gv-etone ${toneOf(e.key, f.ethics[e.key])}`}><i />{f.ethics[e.key]}</b></div>)}
          </div>
        </div>
      ) : (
        <div className="gv-pick on" style={{ cursor: 'default' }}>
          <div>
            <div className="gv-pick-t"><Cpu size={14} /><b>{model.name}</b><span className="gv-faint">· {model.provider}</span></div>
            <small className="gv-faint">AI model · {model.host}</small>
            {model.desc && <p>{model.desc}</p>}
          </div>
        </div>
      )}
      <ApprovalSummary f={f} />
      <p className="gv-wiz-hint" style={{ marginTop: 14 }}>On submit the model joins the AI model inventory at <b>Registered</b> and its approval request starts. Nobody may call the model until the workflow approves it. Every answer here is recorded in its history and audit trail.</p>
    </div>
  );
}

/* ---------------------------------------------------------------- approval step */
const KIND_ICON = { approval: UserCheck, automated: Zap, task: ListChecks, notify: Bell };
function ApprovalPath({ wf, f }) {
  const path = pathFor(wf, ctxOf(f));
  const req = { subject: { owners: f.owners } };
  return (
    <ol className="wf-tl">
      {path.map(({ step: s, applies }) => {
        const I = KIND_ICON[s.kind];
        return (
          <li key={s.id} className={applies ? (s.kind === 'automated' ? 'done' : 'not-reached') : 'skipped'}>
            <i>{applies ? (s.kind === 'automated' ? <Check size={11} strokeWidth={3} /> : <I size={11} />) : <CircleSlash size={11} />}</i>
            <div>
              <b>{s.name}</b>
              <small>
                {!applies && `Not needed — only runs if ${condText(s.runIf)}`}
                {applies && s.kind === 'automated' && 'Passes automatically — everything it checks was answered in this form'}
                {applies && (s.kind === 'approval' || s.kind === 'task') && <>{approverText(s, req)} · within {s.sla} day{s.sla === 1 ? '' : 's'}{s.sod && <> · <Lock size={10} /> not the requester</>}{s.runIf && ` · runs because ${condText(s.runIf)}`}</>}
                {applies && s.kind === 'notify' && s.message}
              </small>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function Approval({ f, setF }) {
  const { workflows } = useWorkflowStore();
  const list = workflows.filter((w) => w.module === 'ai-models' && w.event === EVENT && w.status === 'active');
  const wf = list.find((w) => w.id === f.wfId) || list[0];
  const n = wf ? pathFor(wf, ctxOf(f)).filter((p) => p.applies && p.step.kind === 'approval').length : 0;
  return (
    <div className="gv-wiz-approval">
      <h2 className="gv-wiz-h">Approval</h2>
      <p className="gv-muted" style={{ marginTop: 0 }}>Every external model is approved before anyone may call it. The workflow comes from <b>Governance › Workflows</b>; the steps below are worked out from your answers, so a model that sends personal data or holds it outside the UK gets the extra reviews.</p>
      {list.length > 1 && (
        <Fld label="Approval workflow *">
          <select className="select" value={f.wfId} onChange={(e) => setF((o) => ({ ...o, wfId: e.target.value }))}>{list.map((w) => <option key={w.id} value={w.id}>{w.name} · v{w.version}</option>)}</select>
        </Fld>
      )}
      {wf ? (
        <div className="gv-pick on" style={{ cursor: 'default', display: 'block' }}>
          <div className="gv-pick-t"><WorkflowIcon size={14} /><b>{wf.name}</b><span className="gv-faint">· version {wf.version} · AI model governance</span></div>
          <p style={{ margin: '4px 0 0' }}>{wf.desc}</p>
          <ApprovalPath wf={wf} f={f} />
          <small className="gv-faint">{n} approval step{n === 1 ? '' : 's'} for this model · requested by Admin · approved → {wf.outcome.approved.toLowerCase()}</small>
        </div>
      ) : <p className="gv-wiz-hint">No active workflow starts on “{EVENT}”. Publish one in Governance › Workflows first.</p>}
      <div style={{ marginTop: 14 }}><Fld label="Note to the approvers (optional)"><textarea className="input gv-ta" rows={2} value={f.approvalNote} onChange={(e) => setF((o) => ({ ...o, approvalNote: e.target.value }))} placeholder="e.g. Needed for the glossary pilot by 1 November" /></Fld></div>
    </div>
  );
}

function ApprovalSummary({ f }) {
  const { workflows } = useWorkflowStore();
  const wf = workflows.find((w) => w.id === f.wfId);
  if (!wf) return null;
  const steps = pathFor(wf, ctxOf(f)).filter((p) => p.applies && (p.step.kind === 'approval' || p.step.kind === 'task'));
  return (
    <div className="gv-rev-meta open" style={{ marginTop: 14 }}>
      <button type="button" style={{ cursor: 'default' }}><WorkflowIcon size={14} /><span>Approval — {wf.name} · v{wf.version}</span></button>
      <dl>{steps.map((p, k) => [<dt key={`${p.step.id}k`}>{k + 1}. {p.step.name}</dt>, <dd key={`${p.step.id}v`}>{approverText(p.step, { subject: { owners: f.owners } })} · {p.step.sla} day(s)</dd>])}</dl>
    </div>
  );
}
