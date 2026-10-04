import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Plus, X, ArrowUp, ArrowDown, Lock, LayoutTemplate, FileText, Copy, ExternalLink, Workflow as WorkflowIcon } from 'lucide-react';
import { Button } from '../components/ui.jsx';
import { toast } from './kit.jsx';
import { useDpia, createTemplate, parseField } from './dpia-store.js';
import { BASE } from './data.js';
import { useWorkflowStore, dpiaStagesOf, STEP_KINDS, ROLE_LABEL, condText } from './workflows.js';

/* DPIA & GDPR › Templates › New template — one page: basics, sections and fields, workflow stages, review.
   On create the template is added to the list (v1) and the audit log. Test data only. */

const TPL_LIST = `${BASE}/dpia?tab=templates`;
const FIELD_TYPES = [['longtext', 'Long text'], ['text', 'Short text'], ['choice', 'Choice'], ['date', 'Date'], ['risk_table', 'Risk table'], ['measure_table', 'Measures table']];
const PREFILL = [
  ['', 'No pre-fill'], ['summary', 'Record — purpose'], ['triggers', 'Screening — indicators'], ['nature', 'Lineage and models'], ['scope', 'Classifier — data and people'],
  ['context', 'Systems, regions and sharing'], ['purposes', 'Record — purpose and lawful basis'], ['consulted', 'Ownership register'], ['lawful', 'Record — lawful basis and Article 9'],
  ['minimisation', 'Usage logs'], ['retention', 'Retention requirements'], ['rights', 'Standard wording'],
];
const ROLES = [['assessor', 'Assessor'], ['dpo', 'Data protection officer'], ['governance-lead', 'Governance lead'], ['data-engineer', 'Data engineer']];
const STEPS = [['tb-basics', 'Basics'], ['tb-sections', 'Sections & fields'], ['tb-stages', 'Workflow'], ['tb-review', 'Review']];

const toField = (f) => { const p = parseField(f); const type = (FIELD_TYPES.find(([k]) => p.meta.includes(k)) || ['longtext'])[0]; return { label: p.label, type, req: p.req, key: p.key || '' }; };
const fromField = (f) => `${f.label.trim()} (${[f.type, f.req && 'required', f.key && `pre-filled from ${f.key}`].filter(Boolean).join(', ')})`;
const fromTpl = (t) => t.sections.map(([h, d, fields]) => ({ h, d, fields: fields.map(toField) }));
const BLANK = [
  { h: 'Describe the processing', d: 'What the processing is, why it is needed and who it affects.', fields: [{ label: 'What is the processing and why', type: 'longtext', req: true, key: 'summary' }] },
  { h: 'Identify and assess risks', d: 'Each risk to individuals, with likelihood and severity.', fields: [{ label: 'Risks to individuals', type: 'risk_table', req: true, key: '' }] },
  { h: 'Identify measures to reduce risk', d: 'The measure against each risk and the residual rating.', fields: [{ label: 'Measures and residual risk', type: 'measure_table', req: true, key: '' }] },
  { h: 'Sign off and record outcomes', d: 'DPO advice and acceptance of residual risk.', fields: [{ label: 'DPO advice', type: 'longtext', req: true, key: '' }, { label: 'Residual risk accepted by', type: 'text', req: true, key: '' }] },
];

function Fl({ label, req, hint, children }) {
  return <div className="rg-f"><label>{label}{req && <em> *</em>}</label>{children}{hint && <small>{hint}</small>}</div>;
}
const move = (arr, i, d) => { const j = i + d; if (j < 0 || j >= arr.length) return arr; const n = [...arr]; [n[i], n[j]] = [n[j], n[i]]; return n; };

export default function TemplateBuilder() {
  const st = useDpia();
  const nav = useNavigate();
  const std = st.templates.find((t) => t.kind === 'standard') || st.templates[0];
  const [f, setF] = useState({ name: '', intro: '', basis: std.basis, review: 365, from: std.name });
  const [secs, setSecs] = useState(() => fromTpl(std));
  const [stages, setStages] = useState(() => std.stages.map((x) => [...x]));
  const wfs = useWorkflowStore().workflows.filter((w) => w.module === 'dpia');
  const [wfId, setWfId] = useState(std.workflowId || '__own');
  const wf = wfs.find((w) => w.id === wfId);
  const pickWf = (id) => { setWfId(id); const w = wfs.find((x) => x.id === id); if (w) setStages(dpiaStagesOf(w)); };
  const [active, setActive] = useState(STEPS[0][0]);
  const [open, setOpen] = useState(0);
  const isLead = st.role === 'governance-lead';

  const set = (k) => (e) => setF((o) => ({ ...o, [k]: e.target.value }));
  const startFrom = (name) => {
    setF((o) => ({ ...o, from: name }));
    if (name === '__blank') { setSecs(BLANK.map((s) => ({ ...s, fields: s.fields.map((x) => ({ ...x })) }))); setStages([['Completion', 'assessor'], ['DPO review', 'dpo'], ['Approval', 'governance-lead']]); return; }
    const t = st.templates.find((x) => x.name === name);
    setSecs(fromTpl(t)); setStages(t.stages.map((x) => [...x])); setF((o) => ({ ...o, review: t.review, basis: t.basis })); setWfId(t.workflowId || '__own');
  };
  const setSec = (i, patch) => setSecs((o) => o.map((s, k) => (k === i ? { ...s, ...patch } : s)));
  const setFld = (i, j, patch) => setSecs((o) => o.map((s, k) => (k !== i ? s : { ...s, fields: s.fields.map((x, m) => (m === j ? { ...x, ...patch } : x)) })));
  const jump = (id) => { setActive(id); document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); };

  const name = f.name.trim();
  const dup = st.templates.some((t) => t.name.toLowerCase() === name.toLowerCase());
  const allFields = secs.flatMap((s) => s.fields);
  const badSec = secs.findIndex((s) => !s.h.trim() || !s.fields.length || s.fields.some((x) => !x.label.trim()));
  const hasRisk = allFields.some((x) => x.type === 'risk_table');
  const hasMeasure = allFields.some((x) => x.type === 'measure_table');
  const done = [!!name && !dup && f.review >= 30, secs.length > 0 && badSec < 0, stages.length > 0 && stages.every(([s]) => s.trim()) && (wfId === '__own' || (wf && wf.status === 'active')), false];
  done[3] = done[0] && done[1] && done[2];
  const pct = Math.round((done.slice(0, 3).filter(Boolean).length / 3) * 100);
  const missing = [
    !name && ['tb-basics', 'Give the template a name'],
    dup && ['tb-basics', `A template called “${name}” already exists`],
    f.review < 30 && ['tb-basics', 'Review interval must be at least 30 days'],
    !secs.length && ['tb-sections', 'Add at least one section'],
    badSec >= 0 && ['tb-sections', `Section ${badSec + 1} needs a heading and named fields`],
    wfId !== '__own' && !wf && ['tb-stages', 'Pick a sign-off workflow'],
    wf && wf.status !== 'active' && ['tb-stages', `“${wf.name}” is a draft — publish it in Workflows or pick another`],
    !stages.length && ['tb-stages', 'Add at least one workflow stage'],
    stages.some(([s]) => !s.trim()) && ['tb-stages', 'Every stage needs a name'],
  ].filter(Boolean);
  const warnings = [!hasRisk && 'No risk table — assessments will have nowhere to record risks.', !hasMeasure && 'No measures table — risks will have no measures or residual rating.', !stages.some(([, r]) => r === 'dpo') && 'No DPO stage — UK GDPR Article 35(2) expects the DPO’s advice.'].filter(Boolean);

  const create = () => {
    const t = { name, kind: 'departmental', workflowId: wf ? wf.id : null, workflowName: wf ? `${wf.name} v${wf.version}` : null, basis: f.basis.trim() || std.basis, intro: f.intro.trim() || `Departmental DPIA template${f.from !== '__blank' ? `, based on ${f.from}` : ''}.`, review: +f.review, stages, sections: secs.map((s) => [s.h.trim(), s.d.trim(), s.fields.map(fromField)]) };
    if (!createTemplate(t, f.from === '__blank' ? 'blank' : f.from)) { toast('Only a governance lead can create templates — refused and logged'); return; }
    toast(`Created “${name}” v1 — added to the templates and the audit log`);
    nav(`${TPL_LIST}&tpl=${encodeURIComponent(name)}`);
  };

  if (!isLead) {
    return (
      <div className="page gv rg">
        <div className="rg-top"><div><span className="gv-eyebrow">DPIA & GDPR · Templates</span><h1>New DPIA template</h1></div><Button variant="secondary" onClick={() => nav(TPL_LIST)}>Back to templates</Button></div>
        <div className="gv-callout warn" style={{ marginTop: 16 }}><Lock size={15} /><span>Only a governance lead can create templates. You are viewing as {st.role} — switch “Viewing as (test)” on the DPIA page to try it.</span></div>
      </div>
    );
  }

  return (
    <div className="page gv rg">
      <div className="rg-top">
        <div>
          <span className="gv-eyebrow">DPIA & GDPR · Templates</span>
          <h1>New DPIA template</h1>
        </div>
        <div className="gv-inline" style={{ gap: 8, alignItems: 'center' }}>
          <Button variant="secondary" onClick={() => nav(TPL_LIST)}>Cancel</Button>
          <Button variant="primary" icon={Check} disabled={!done[3]} onClick={create}>Create template</Button>
        </div>
      </div>
      <div className="rg-toc">
        {STEPS.map(([id, l], k) => (
          <button key={id} type="button" className={`${active === id ? 'on' : ''} ${done[k] ? 'done' : ''}`} onClick={() => jump(id)}>
            <i>{done[k] ? <Check size={11} strokeWidth={3} /> : k + 1}</i>{l}
          </button>
        ))}
        <span className="rg-pct"><b>{pct}%</b> complete<span className="rg-bar"><i style={{ width: `${pct}%` }} /></span></span>
      </div>

      <div className="rg-grid">
        <main>
          <section className="dash-card rg-sec" id="tb-basics">
            <h2><span>01</span>Basics</h2>
            <p className="rg-lead">Name the template and choose what to start from. Everything can be changed below before you create it.</p>
            <Fl label="Template name" req hint={dup ? 'That name is already used — pick another.' : 'Shown when someone starts an assessment.'}>
              <input className="input" value={f.name} onChange={set('name')} placeholder="e.g. HMRC Customer Compliance DPIA" style={dup ? { borderColor: 'var(--gv-bad)' } : undefined} autoFocus />
            </Fl>
            <Fl label="What is it for?"><textarea className="input" rows={2} value={f.intro} onChange={set('intro')} placeholder="e.g. For processing that supports customer compliance casework" /></Fl>
            <Fl label="Start from">
              <div className="tb-from">
                {[...st.templates.map((t) => [t.name, `${t.kind === 'standard' ? 'ICO structure' : 'Departmental'} · ${t.sections.length} sections · ${t.version}`, t.kind === 'standard' ? LayoutTemplate : Copy]), ['__blank', 'Four core sections only — build the rest yourself', FileText]].map(([k, s, I]) => (
                  <button key={k} type="button" className={`tb-opt ${f.from === k ? 'on' : ''}`} onClick={() => startFrom(k)}>
                    <I size={16} /><b>{k === '__blank' ? 'Blank' : k}</b><small>{s}</small>
                  </button>
                ))}
              </div>
            </Fl>
            <div className="rg-two">
              <Fl label="Legal basis"><input className="input" value={f.basis} onChange={set('basis')} /></Fl>
              <Fl label="Review approved assessments every" req hint="The review date is set from this when an assessment is signed off.">
                <div className="gv-inline" style={{ alignItems: 'center', gap: 8 }}><input className="input" type="number" min={30} value={f.review} onChange={(e) => setF((o) => ({ ...o, review: +e.target.value }))} style={{ maxWidth: 120 }} /><span className="gv-muted">days</span></div>
              </Fl>
            </div>
          </section>

          <section className="dash-card rg-sec" id="tb-sections">
            <h2><span>02</span>Sections & fields</h2>
            <p className="rg-lead">The questions an assessor answers, in order. Text fields can be pre-filled from GenMeta’s metadata; the risk and measures tables power the risk heatmap.</p>
            <div className="tb-secs">
              {secs.map((s, i) => (
                <div key={i} className={`tb-sec ${open === i ? 'open' : ''}`}>
                  <div className="tb-sec-h" onClick={() => setOpen(open === i ? -1 : i)} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter') setOpen(open === i ? -1 : i); }}>
                    <span className="tb-n">{i + 1}</span>
                    <b>{s.h || <span className="gv-muted">Untitled section</span>}</b>
                    <small>{s.fields.length} field{s.fields.length === 1 ? '' : 's'}{s.fields.some((x) => x.key) ? ` · ${s.fields.filter((x) => x.key).length} pre-filled` : ''}</small>
                    <span className="tb-tools" onClick={(e) => e.stopPropagation()}>
                      <button type="button" className="ib" aria-label="Move up" disabled={i === 0} onClick={() => { setSecs((o) => move(o, i, -1)); setOpen(i - 1); }}><ArrowUp size={14} /></button>
                      <button type="button" className="ib" aria-label="Move down" disabled={i === secs.length - 1} onClick={() => { setSecs((o) => move(o, i, 1)); setOpen(i + 1); }}><ArrowDown size={14} /></button>
                      <button type="button" className="ib" aria-label="Remove section" onClick={() => { setSecs((o) => o.filter((_, k) => k !== i)); setOpen(-1); }}><X size={14} /></button>
                    </span>
                  </div>
                  {open === i && (
                    <div className="tb-sec-b">
                      <div className="rg-two">
                        <Fl label="Heading" req><input className="input" value={s.h} onChange={(e) => setSec(i, { h: e.target.value })} /></Fl>
                        <Fl label="Guidance for the assessor"><input className="input" value={s.d} onChange={(e) => setSec(i, { d: e.target.value })} /></Fl>
                      </div>
                      <table className="tbl tb-fields">
                        <thead><tr><th>Field</th><th>Type</th><th>Pre-fill from</th><th>Required</th><th /></tr></thead>
                        <tbody>{s.fields.map((x, j) => (
                          <tr key={j}>
                            <td><input className="input" value={x.label} placeholder="Field name" onChange={(e) => setFld(i, j, { label: e.target.value })} style={!x.label.trim() ? { borderColor: 'var(--gv-warn)' } : undefined} /></td>
                            <td><select className="select" value={x.type} onChange={(e) => setFld(i, j, { type: e.target.value, key: e.target.value.endsWith('_table') ? '' : x.key })}>{FIELD_TYPES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></td>
                            <td><select className="select" value={x.key} disabled={x.type.endsWith('_table')} onChange={(e) => setFld(i, j, { key: e.target.value })}>{PREFILL.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></td>
                            <td><label className="gv-check"><input type="checkbox" checked={x.req} onChange={(e) => setFld(i, j, { req: e.target.checked })} />yes</label></td>
                            <td className="tb-row-tools">
                              <button type="button" className="ib" aria-label="Move field up" disabled={j === 0} onClick={() => setSec(i, { fields: move(s.fields, j, -1) })}><ArrowUp size={13} /></button>
                              <button type="button" className="ib" aria-label="Move field down" disabled={j === s.fields.length - 1} onClick={() => setSec(i, { fields: move(s.fields, j, 1) })}><ArrowDown size={13} /></button>
                              <button type="button" className="ib" aria-label="Remove field" onClick={() => setSec(i, { fields: s.fields.filter((_, m) => m !== j) })}><X size={13} /></button>
                            </td>
                          </tr>
                        ))}</tbody>
                      </table>
                      <Button variant="link" icon={Plus} onClick={() => setSec(i, { fields: [...s.fields, { label: '', type: 'longtext', req: false, key: '' }] })}>Add a field</Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <Button variant="secondary" size="sm" icon={Plus} onClick={() => { setSecs((o) => [...o, { h: '', d: '', fields: [{ label: '', type: 'longtext', req: false, key: '' }] }]); setOpen(secs.length); }}>Add a section</Button>
          </section>

          <section className="dash-card rg-sec" id="tb-stages">
            <h2><span>03</span>Workflow</h2>
            <p className="rg-lead">Link the template to a DPIA sign-off workflow from Governance › Workflows. Assessments started from this template follow its steps — who acts, in what order, the time allowed and when the ICO must be consulted.</p>
            <div className="tb-from" style={{ marginBottom: 12 }}>
              {wfs.map((w) => (
                <button key={w.id} type="button" className={`tb-opt ${wfId === w.id ? 'on' : ''}`} onClick={() => pickWf(w.id)}>
                  <WorkflowIcon size={16} /><b>{w.name}</b>
                  <small>{w.steps.length} steps · v{w.version} · {w.status === 'active' ? 'published' : 'draft'}{w.usedBy.length ? ` · used by ${w.usedBy.length}` : ''}</small>
                </button>
              ))}
              <button type="button" className={`tb-opt ${wfId === '__own' ? 'on' : ''}`} onClick={() => setWfId('__own')}>
                <FileText size={16} /><b>Own stages</b><small>Define simple stages here, without a workflow</small>
              </button>
            </div>
            {wf ? (
              <div className="tb-wf">
                <div className="tb-wf-h">
                  <div><b>{wf.name}</b> <span className="tag">v{wf.version}</span> {wf.status !== 'active' && <span className="gv-badge warn"><i />draft</span>}<p className="gv-muted">{wf.desc}</p></div>
                  <Button variant="secondary" size="sm" icon={ExternalLink} onClick={() => nav(`${BASE}/workflows/${wf.id}`)}>Open in Workflows</Button>
                </div>
                <ol className="tb-wf-steps">
                  {wf.steps.map((x, i) => (
                    <li key={x.id}><i>{i + 1}</i><div><b>{x.name}</b>
                      <small>{STEP_KINDS[x.kind]?.label || x.kind}{x.approvers?.length ? ` · ${x.approvers.map((r) => (r === 'owner' ? 'assessor' : ROLE_LABEL[r] || r)).join(' or ')}` : ''}{x.sla ? ` · ${x.sla} days` : ''}{x.sod ? ' · not the person who submitted' : ''}{x.runIf ? ` · only if ${condText(x.runIf)}` : ''}</small></div></li>
                  ))}
                </ol>
                <small className="gv-faint">Assessment stages from this workflow: {stages.map(([s2]) => s2).join(' → ')}. Change the steps in Workflows — the template follows the published version.</small>
              </div>
            ) : (<>
              <div className="tp-stages">
                {stages.map(([s2, role], i) => (
                  <div key={i} className="tp-stage"><i>{i + 1}</i>
                    <input className="input" value={s2} onChange={(e) => setStages((o) => o.map((x, k) => (k === i ? [e.target.value, role] : x)))} aria-label="Stage name" placeholder="Stage name" />
                    <select className="select" value={role} onChange={(e) => setStages((o) => o.map((x, k) => (k === i ? [s2, e.target.value] : x)))} aria-label="Who acts">{ROLES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
                    <button type="button" className="ib" aria-label="Move stage up" disabled={i === 0} onClick={() => setStages((o) => move(o, i, -1))}><ArrowUp size={14} /></button>
                    <button type="button" className="ib" aria-label="Move stage down" disabled={i === stages.length - 1} onClick={() => setStages((o) => move(o, i, 1))}><ArrowDown size={14} /></button>
                    <button type="button" className="ib" aria-label="Remove stage" disabled={stages.length <= 1} onClick={() => setStages((o) => o.filter((_, k) => k !== i))}><X size={14} /></button>
                  </div>
                ))}
              </div>
              <Button variant="link" icon={Plus} onClick={() => setStages((o) => [...o, ['', 'assessor']])}>Add a stage</Button>
            </>)}
            <p className="gv-faint" style={{ fontSize: 12.5, margin: '10px 0 0' }}>Need a different approval path? <button type="button" className="tb-link" onClick={() => nav(`${BASE}/workflows`)}>Create a DPIA workflow in Workflows</button>, publish it, and it appears here.</p>
          </section>

          <section className="dash-card rg-sec" id="tb-review">
            <h2><span>04</span>Review</h2>
            <p className="rg-lead">This is how the template will appear in the list. It is created as v1; later changes make new versions.</p>
            <dl className="gl-kv gv-kv">
              <dt>Name</dt><dd>{name || <span className="gv-muted">—</span>}</dd>
              <dt>Based on</dt><dd>{f.from === '__blank' ? 'Blank' : f.from}</dd>
              <dt>Sections</dt><dd>{secs.length} · {allFields.length} fields · {allFields.filter((x) => x.req).length} required · {allFields.filter((x) => x.key).length} pre-filled</dd>
              <dt>Sign-off workflow</dt><dd>{wf ? <>{wf.name} v{wf.version} · <button type="button" className="tb-link" onClick={() => nav(`${BASE}/workflows/${wf.id}`)}>open</button></> : 'own stages'}</dd>
              <dt>Stages</dt><dd>{stages.map(([s, r]) => `${s || '—'} (${r})`).join(' → ')}</dd>
              <dt>Review</dt><dd>every {f.review} days</dd>
            </dl>
            {warnings.length > 0 && <ul className="tb-warn">{warnings.map((w) => <li key={w}>{w}</li>)}</ul>}
            <div style={{ marginTop: 14 }}><Button variant="primary" icon={Check} disabled={!done[3]} onClick={create}>Create template</Button></div>
          </section>
        </main>

        <aside className="rg-live">
          <div className="dash-card rg-panel">
            <h3>Outline</h3>
            <ol className="tb-outline">
              {secs.map((s, i) => (
                <li key={i}><button type="button" onClick={() => { setOpen(i); jump('tb-sections'); }}><b>{s.h || 'Untitled section'}</b></button>
                  <span>{s.fields.map((x) => x.label || '—').join(' · ')}</span></li>
              ))}
            </ol>
          </div>
          <div className="dash-card rg-panel">
            <h3>{missing.length ? 'Before you create it' : 'Ready to create'}</h3>
            {missing.length ? <ul className="rg-missing">{missing.map(([id, l]) => <li key={l}><button type="button" onClick={() => jump(id)}>{l}</button></li>)}</ul>
              : <p className="gv-muted" style={{ margin: 0, fontSize: 13 }}>Creates “{name}” v1 and writes it to the audit log.</p>}
            {warnings.length > 0 && <ul className="tb-warn">{warnings.map((w) => <li key={w}>{w}</li>)}</ul>}
          </div>
        </aside>
      </div>
    </div>
  );
}
