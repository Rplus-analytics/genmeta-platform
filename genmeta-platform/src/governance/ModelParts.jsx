import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Minus, Maximize, Maximize2, Minimize2, Info, X, ChevronDown, Search, Check, ArrowUpRight, Sparkles, ChevronRight, BadgeCheck, CircleDashed,
  Database, Table2, Wrench, FlaskConical, GitBranch, Rocket, Activity, MonitorSmartphone, Send, Cpu, FileOutput, Layers, Gauge, CheckCircle2,
} from 'lucide-react';
import { BY_KEY } from '../catalogue/model.js';
import { RISK_TIERS, MODEL_ALERTS, MODEL_MONITORING } from './data.js';
import { StatusBadge, Fld } from './kit.jsx';
import { WORKFLOW_STAGES, templateFor, useTemplates } from './tiers.js';
import { ETHICS } from './RegisterModel.jsx';

/* Pieces of the AI model page:
   - Overview, laid out like a Data assets asset page (summary card + side panel)
   - the Lineage tab's filter bar (searchable dropdowns, no search box)
   - the model lineage graph, drawn with the same look as the Data assets lineage graph */

const riskTone = (r) => (r === 'High risk' ? 'bad' : r === 'Low risk' ? 'ok' : 'warn');
const stageTone = (s) => (s === 'In production' ? 'ok' : s === 'Retired' || s === 'Rejected' ? 'bad' : s === 'Deprecated' ? 'warn' : 'info');
const latest = (m) => m.versionRows[m.versionRows.length - 1];

/* ---------------------------------------------------------------- governance checklist (from the old UI's workflow) */
/* the checklist comes from the workflow template of the model's risk tier (MLG-06), so editing a
   template in "Risk tiers & review policy" changes every model page straight away */
const STAGE_LABEL = { Registered: 'Registration' };
export const checklistFor = (risk) => {
  const t = templateFor(risk);
  return WORKFLOW_STAGES.map((s) => [STAGE_LABEL[s] || s, t.stages[s].evidence, t.stages[s].roles]);
};
const REQUIRED_STAGES = ['Registration', 'Validation', 'Approval'];
/* a check counts as done when its latest event is "Completed" (a later "Reopened" undoes it) */
export function checkState(ver) {
  const st = {};
  [...ver.history].reverse().forEach((h) => {
    const mm = /^(Completed|Reopened): (.+)$/.exec(h.what);
    if (mm) st[mm[2]] = { done: mm[1] === 'Completed', at: h.at, who: h.who };
  });
  return st;
}
const validatorOf = (m) => m.versionRows.flatMap((r) => r.history).find((h) => /validator/i.test(h.who))?.who.replace(/\s*\(validator\)/, '');

/* ---------------------------------------------------------------- Overview (asset-page look) */
export function ModelOverview({ m, onChange, goLineage }) {
  const nav = useNavigate();
  const ver = latest(m);
  useTemplates();
  const CHECKLIST = checklistFor(m.risk);
  const st = checkState(ver);
  const required = CHECKLIST.filter(([s]) => REQUIRED_STAGES.includes(s)).flatMap(([, xs]) => xs);
  const done = required.filter((c) => st[c]?.done).length;
  const score = Math.round((done / required.length) * 100);
  const [pane, setPane] = useState('checklist');
  const validator = validatorOf(m);
  const src = ver.lineage.find((c) => c.stage === 'Source data');
  const feat = ver.lineage.find((c) => c.stage === 'Feature engineering')?.items[0];
  const item = (stage) => ver.lineage.find((c) => c.stage === stage)?.items[0];
  const metric = (v) => (v === '—' ? '—' : v);
  const cert = ver.stage === 'In production' ? ['ok', BadgeCheck, 'Approved for production'] : ver.stage === 'Rejected' ? ['bad', X, 'Rejected at validation'] : ver.stage === 'Retired' ? ['bad', CircleDashed, 'Retired'] : ['info', CircleDashed, ver.stage];
  const CertI = cert[1];
  return (
    <div className="asset-grid">
      <div className="asset-main">
        <div className="card pad-lg">
          <h3 className="sec-h">Model summary</h3>
          <div className="sum-row">
            <span className="enrich"><b>{score}%</b> Governance checklist · {done} of {required.length} recorded</span>
            <button className="btn ghost sm" onClick={goLineage}><Sparkles size={14} />See lineage, workflow and history<ChevronRight size={14} /></button>
          </div>
          <div className="sum-figs">
            <div><span>Accuracy</span><b>{metric(ver.acc)}</b></div>
            <div><span>ROC AUC</span><b>{metric(ver.auc)}</b></div>
            <div><span>F1 (HIGH)</span><b>{metric(ver.f1)}</b></div>
            <div><span>Latest version</span><b className="mono">{ver.v}</b></div>
          </div>
          <div className="sum-desc"><span>Purpose</span><p>{m.purpose}</p></div>
          <div className="sum-cert">
            <div><span>Certificate</span><p className={`cert ${cert[0] === 'ok' ? 'ok' : ''} gv-cert-${cert[0]}`}><CertI size={15} />{cert[2]}</p></div>
            <div><span>Owner</span><p>{m.owner || 'Not named yet'}</p></div>
            <div><span>Validator</span><p>{validator || 'Not assigned'}</p></div>
          </div>
          <div className="seg2" role="tablist">
            {[['checklist', 'Governance checklist'], ['data', m.hosted ? 'Training data' : 'Data sent'], ['card', 'Model card']].map(([k, l]) => (
              <button key={k} role="tab" aria-selected={pane === k} className={pane === k ? 'on' : ''} onClick={() => setPane(k)}>{l}</button>
            ))}
          </div>

          {pane === 'checklist' && (
            <div className="gv-cl">
              {CHECKLIST.map(([stage, items, roles]) => {
                const n = items.filter((c) => st[c]?.done).length;
                return (
                  <div key={stage} className="gv-cl-g">
                    <div className="gv-cl-h"><b>{stage} <small className="gv-faint" style={{ fontWeight: 400 }}>· signed off by {roles.join(', ') || '—'}</small></b><span className={n === items.length ? 'ok' : n ? 'warn' : ''}>{n} of {items.length}</span></div>
                    <ul className="checks">
                      {items.map((c) => (
                        <li key={c} className={st[c]?.done ? 'ok' : ''}>
                          {st[c]?.done ? <Check size={14} /> : <X size={14} />}<b>{c}</b>
                          <span>{st[c] ? `${st[c].done ? 'Completed' : 'Reopened'} by ${st[c].who} · ${st[c].at}` : 'Not recorded'}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
              <p className="gv-faint" style={{ margin: 0, fontSize: 12 }}>Evidence comes from the {m.risk.toLowerCase()} workflow template (Risk tiers & review policy); completions come from the history of {ver.v}. In production and periodic review checks do not count towards the score.</p>
            </div>
          )}

          {pane === 'data' && m.hosted && (
            <>
              <div className="table-wrap">
                <table className="tbl">
                  <thead><tr><th>Source asset</th><th>Source</th><th>Sensitivity</th><th>Classifications</th><th>Owner</th><th /></tr></thead>
                  <tbody>{src.items.map((it) => {
                    const a = BY_KEY[it.b];
                    return (
                      <tr key={it.b} className="static">
                        <td><code className="colname">{it.b}</code></td>
                        <td>{a?.source || '—'}</td>
                        <td>{a ? <span className={`sens sens-${a.sensitivity.toLowerCase()}`}>{a.sensitivity}</span> : '—'}</td>
                        <td><div className="chips">{a?.cls.length ? a.cls.map((c) => <span key={c} className="cls">{c}</span>) : <span className="muted">None</span>}</div></td>
                        <td>{a?.owner || '—'}</td>
                        <td>{a && <button className="btn link" onClick={() => nav(`/app/catalogue/${a.id}`)}>Open<ArrowUpRight size={13} /></button>}</td>
                      </tr>
                    );
                  })}</tbody>
                </table>
              </div>
              <h4 className="gv-subhead">{feat.b}</h4>
              <ul className="gv-feats">{feat.s.split('; ').map((f) => {
                const [name, rest] = f.split(' ← ');
                return <li key={f}><code>{name}</code><span>← {rest}</span></li>;
              })}</ul>
            </>
          )}
          {pane === 'data' && !m.hosted && (
            <div className="gv-kvs">
              <div><span>Data sent</span><p>{item('Data sent')?.muted ? 'Not recorded' : item('Data sent')?.b}</p></div>
              <div><span>Consumer</span><p>{item('Consumer')?.b}{item('Consumer')?.s && <span className="muted"> · {item('Consumer').s}</span>}</p></div>
              <div><span>Output</span><p>{item('Output')?.muted ? 'Not recorded' : item('Output')?.b}</p></div>
            </div>
          )}

          {pane === 'card' && (
            <div className="gv-kvs">
              {m.hosted ? (
                <>
                  <div><span>Algorithm</span><p>{item('Model development')?.s.split(';')[0]}</p></div>
                  <div><span>Training run</span><p className="mono">{item('Model development')?.b.replace('training run ', '')}</p></div>
                  <div><span>Training data</span><p className="mono gv-wrap">{item('Training data')?.b}</p></div>
                  <div><span>Training rows</span><p>{/(\d+) training rows/.exec(item('Training data')?.s || '')?.[1] || '—'}</p></div>
                  <div><span>Artefact</span><p className="mono gv-wrap">{(item('Model version')?.s.split('artefact ')[1]) || '—'}</p></div>
                  <div><span>Deployment</span><p>{item('Deployment')?.b} <span className="muted mono">{item('Deployment')?.s}</span></p></div>
                  <div><span>Inference</span><p>{item('Inference')?.b} · {item('Inference')?.s}</p></div>
                </>
              ) : (
                <>
                  <div><span>Provider</span><p>{m.provider}</p></div>
                  <div><span>Hosting</span><p>{item('External model')?.s || 'Not recorded'}</p></div>
                  <div><span>Version</span><p className="mono">{ver.v}</p></div>
                </>
              )}
              <div><span>Intended use</span><p>{m.purpose}</p></div>
              <div><span>Used by</span><p>{m.usedBy}</p></div>
            </div>
          )}
        </div>
      </div>
      <ModelSide m={m} ver={ver} st={st} validator={validator} onChange={onChange} />
    </div>
  );
}

function ModelSide({ m, ver, st, validator, onChange }) {
  useTemplates();
  const tier = RISK_TIERS.find(([r]) => r === m.risk);
  const approval = templateFor(m.risk).stages.Approval.evidence;
  const open = MODEL_ALERTS.filter((a) => a.model === m.id && a.state === 'open').length;
  const mon = MODEL_MONITORING[m.id];
  const src = ver.lineage.find((c) => c.stage === 'Source data');
  const cls = [...new Set((src?.items || []).flatMap((it) => BY_KEY[it.b]?.cls || []))];
  const ini = (s) => s.split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  return (
    <aside className="asset-side card">
      <section><h4>Description</h4><p>{m.purpose}</p></section>
      <section>
        <h4>Risk tier</h4>
        <select className="select gv-side-sel" value={m.risk} onChange={(e) => onChange({ risk: e.target.value })}>{RISK_TIERS.map(([r]) => <option key={r}>{r}</option>)}</select>
        {tier && <p className="muted" style={{ marginTop: 6 }}>Reviewed every {tier[2]} days · {tier[3]} approver{tier[3] > 1 ? 's' : ''}. {tier[1]}</p>}
      </section>
      <section className="side-figs">
        <div><h4>Versions</h4><p>{m.versions}</p></div>
        <div><h4>Open alerts</h4><p className={open ? 'gv-bad-t' : ''}>{open}</p></div>
        <div><h4>Batches</h4><p>{mon ? mon.batches.length : '—'}</p></div>
      </section>
      <section><h4>Usage</h4><p>{m.usedBy}{mon && <span className="muted"> · {mon.batches.reduce((t, b) => t + b[1], 0).toLocaleString('en-GB')} rows scored</span>}</p></section>
      <section>
        <h4>Owners</h4>
        <input className="input gv-side-sel" value={m.owner} placeholder="Name the accountable owner" onChange={(e) => onChange({ owner: e.target.value })} />
        {validator && <p className="people" style={{ marginTop: 8 }}><span className="avatar xs">{ini(validator)}</span>{validator}<span className="muted"> · validator</span></p>}
      </section>
      <section><h4>AI model registry</h4><div className="chips">{m.foundIn.map((r) => <span key={r} className="term">{r}</span>)}</div></section>
      <section>
        <h4>Assessments</h4>
        {approval.map((c) => (
          <p key={c} className="termrow"><span className={`gv-badge ${st[c]?.done ? 'ok' : 'neutral'}`}><i />{c.replace(' completed', '')}</span><small>{st[c]?.done ? 'done' : 'not recorded'}</small></p>
        ))}
      </section>
      <section><h4>Personal data in training</h4><div className="chips">{cls.length ? cls.map((c) => <span key={c} className="cls">{c}</span>) : <span className="muted">{m.hosted ? 'None classified' : 'Not applicable'}</span>}</div></section>
      {m.ethical && (
        <section>
          <h4>Ethical AI</h4>
          {ETHICS.map((e) => { const v = m.ethical[e.key]; const tn = e.opts.find(([o]) => o === v)?.[1] || 'neutral'; return <p key={e.key} className="termrow"><small style={{ minWidth: 120 }}>{e.label}</small><b className={`gv-etone ${tn}`}><i />{v || '—'}</b></p>; })}
        </section>
      )}
      <section><h4>Tags</h4><div className="chips">{[m.hosted ? 'hosted' : 'external', m.stage.toLowerCase().replace(/\s+/g, '-'), m.risk.split(' ')[0].toLowerCase() + '-risk', ...(mon ? ['batch-scoring', 'bias-monitored'] : [])].map((t) => <span key={t} className="tagx">#{t}</span>)}</div></section>
    </aside>
  );
}

/* ---------------------------------------------------------------- searchable dropdown (search box at the top of the menu) */
export function SearchSelect({ icon: I, label, allLabel, value, options, onChange, wide }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const off = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    const esc = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', off); document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', off); document.removeEventListener('keydown', esc); };
  }, [open]);
  const shown = options.filter((o) => o.label.toLowerCase().includes(q.toLowerCase()));
  const cur = options.find((o) => o.v === value);
  const pick = (v) => { onChange(v); setOpen(false); setQ(''); };
  return (
    <div ref={ref} className={`gv-sdrop ${wide ? 'wide' : ''}`}>
      <button type="button" className={`fdrop ${value ? 'set' : ''}`} onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label={label}>
        {I && <I size={15} strokeWidth={1.75} />}
        <span className="gv-sdrop-l"><em>{label}</em>{cur ? cur.label : allLabel}</span>
        <ChevronDown size={15} className="fdrop-c" />
      </button>
      {open && (
        <div className="gv-sdrop-menu" role="listbox">
          <label className="gv-sdrop-search"><Search size={13} /><input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Search ${label.toLowerCase()}…`} /></label>
          <ul>
            {allLabel && <li><button type="button" className={!value ? 'on' : ''} onClick={() => pick('')}><span>{allLabel}</span>{!value && <Check size={13} />}</button></li>}
            {shown.map((o) => (
              <li key={o.v}><button type="button" className={o.v === value ? 'on' : ''} disabled={o.n === 0 && o.v !== value} onClick={() => pick(o.v)}>
                <span>{o.label}</span>{o.n != null && <small>{o.n}</small>}{o.v === value && <Check size={13} />}
              </button></li>
            ))}
            {!shown.length && <li className="gv-sdrop-none">No matches</li>}
          </ul>
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- Lineage tab filter bar */
export const ACC_BANDS = [['high', '0.90 and above', (a) => a >= 0.9], ['mid', '0.80 – 0.89', (a) => a >= 0.8 && a < 0.9], ['low', 'Below 0.80', (a) => a < 0.8], ['none', 'Not measured', (a) => Number.isNaN(a)]];
const regsOf = (r) => r.reg.map((g) => g.split(' ')[0]).filter(Boolean);
export function filterVersions(m, f) {
  return m.versionRows.filter((r) => (!f.registry || regsOf(r).includes(f.registry))
    && (!f.acc || ACC_BANDS.find(([k]) => k === f.acc)[2](parseFloat(r.acc)))
    && (!f.stage || r.stage === f.stage));
}
export function LineageFilterBar({ m, f, setF, ver }) {
  const base = (k) => filterVersions(m, { ...f, [k]: '' });
  const count = (k, test) => base(k).filter(test).length;
  const regs = [...new Set(m.versionRows.flatMap(regsOf))];
  const stages = [...new Set(m.versionRows.map((r) => r.stage))];
  const vis = filterVersions(m, f);
  return (
    <div className="card lin-filterbar gv-linbar">
      <SearchSelect icon={GitBranch} label="Version" value={vis.some((r) => r.v === ver?.v) ? ver.v : ''} allLabel={vis.length ? `Latest (${vis[vis.length - 1].v})` : 'No versions match'}
        options={vis.map((r) => ({ v: r.v, label: `${r.v} · ${r.stage}` }))} onChange={(v) => setF({ ...f, version: v })} wide />
      <SearchSelect icon={Database} label="AI model registry" allLabel="All" value={f.registry}
        options={regs.map((g) => ({ v: g, label: g, n: count('registry', (r) => regsOf(r).includes(g)) }))} onChange={(v) => setF({ ...f, registry: v, version: '' })} />
      <SearchSelect icon={Gauge} label="Accuracy" allLabel="Any" value={f.acc}
        options={ACC_BANDS.map(([k, l, t]) => ({ v: k, label: l, n: count('acc', (r) => t(parseFloat(r.acc))) }))} onChange={(v) => setF({ ...f, acc: v, version: '' })} />
      <SearchSelect icon={Layers} label="Stage" allLabel="All" value={f.stage}
        options={stages.map((s) => ({ v: s, label: s, n: count('stage', (r) => r.stage === s) }))} onChange={(v) => setF({ ...f, stage: v, version: '' })} />
      {(f.registry || f.acc || f.stage || f.version) && <button className="btn link" onClick={() => setF({ version: '', registry: '', acc: '', stage: '' })}>Clear</button>}
    </div>
  );
}

/* ---------------------------------------------------------------- model lineage graph (Data assets graph look) */
const NW = 232, NH = 88, GX = 86, GY = 22, PAD = 24;
const STAGE_ICON = {
  'Source data': Database, 'Training data': Table2, 'Feature engineering': Wrench, 'Model development': FlaskConical,
  'Model version': GitBranch, Deployment: Rocket, Inference: Activity, Consumer: MonitorSmartphone, 'Data sent': Send, 'External model': Cpu, Output: FileOutput,
};
const REL = { 'Training data': 'extracted', 'Feature engineering': 'features', 'Model development': 'trains', 'Model version': 'registers', Deployment: 'deploys', Inference: 'scores', 'Data sent': 'sends', 'External model': 'calls', Output: 'returns' };
const tagOf = (stage, it) => (BY_KEY[it.b] ? BY_KEY[it.b].source : stage === 'Training data' ? 'Amazon S3' : stage === 'Model version' ? 'SageMaker · MLflow' : stage === 'Deployment' ? 'Batch' : stage === 'External model' ? 'External' : stage === 'Model development' ? 'scikit-learn' : '');

export function ModelLineageGraph({ m, ver }) {
  const nav = useNavigate();
  const { nodes, edges, box } = useMemo(() => {
    const ns = []; const es = [];
    ver.lineage.forEach((col, i) => {
      const total = col.items.length * NH + (col.items.length - 1) * GY;
      col.items.forEach((it, j) => ns.push({ id: `${i}-${j}`, i, stage: col.stage, it, x: i * (NW + GX), y: -total / 2 + j * (NH + GY) }));
    });
    ns.forEach((a) => ns.filter((b) => b.i === a.i + 1).forEach((b) => es.push({ s: a, t: b, rel: REL[b.stage] || '' })));
    const b = { x0: Math.min(...ns.map((n) => n.x)), x1: Math.max(...ns.map((n) => n.x + NW)), y0: Math.min(...ns.map((n) => n.y)), y1: Math.max(...ns.map((n) => n.y + NH)) };
    return { nodes: ns, edges: es, box: b };
  }, [ver]);
  const last = nodes.find((n) => n.stage === 'Model version' || n.stage === 'External model') || nodes[nodes.length - 1];
  const [sel, setSel] = useState(last.id);
  const [panel, setPanel] = useState(false);
  const [hover, setHover] = useState(null);
  const [view, setView] = useState({ s: 1, x: 0, y: 0 });
  const [h, setH] = useState(420);
  const [expanded, setExpanded] = useState(false);
  const wrap = useRef(null); const drag = useRef(null);
  useEffect(() => { setSel((nodes.find((n) => n.stage === 'Model version' || n.stage === 'External model') || nodes[nodes.length - 1]).id); }, [nodes]);

  const fit = () => {
    const el = wrap.current; if (!el) return;
    const pw = el.clientWidth || 1;
    const bw = box.x1 - box.x0, bh = box.y1 - box.y0;
    /* keep nodes readable: never shrink below 80%; a long lineage pans sideways instead */
    let s = Math.min(1, (pw - PAD * 2) / bw);
    s = Math.max(0.8, s);
    const desired = expanded ? Math.max(420, window.innerHeight - 150) : Math.max(250, Math.round(bh * s) + PAD * 2 + 56);
    setH(desired);
    setView({ s, x: Math.max(PAD, (pw - bw * s) / 2) - box.x0 * s, y: Math.max(PAD, (desired - 48 - bh * s) / 2) - box.y0 * s });
  };
  useEffect(fit, [box, expanded]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const el = wrap.current; if (!el) return undefined;
    const ro = new ResizeObserver(() => fit()); ro.observe(el); return () => ro.disconnect();
  }, [box, expanded]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const esc = (e) => { if (e.key === 'Escape') { if (expanded) setExpanded(false); else setPanel(false); } };
    document.addEventListener('keydown', esc); return () => document.removeEventListener('keydown', esc);
  }, [expanded]);
  const zoom = (f) => {
    const el = wrap.current; const cx = el.clientWidth / 2, cy = el.clientHeight / 2;
    setView((v) => { const s = Math.max(0.35, Math.min(2, v.s * f)); return { s, x: cx - (cx - v.x) * (s / v.s), y: cy - (cy - v.y) * (s / v.s) }; });
  };
  const down = (e) => { if (e.button !== 0) return; drag.current = { x: e.clientX, y: e.clientY, v: view }; };
  const move = (e) => { const d = drag.current; if (!d) return; setView({ ...d.v, x: d.v.x + e.clientX - d.x, y: d.v.y + e.clientY - d.y }); };
  const up = () => { drag.current = null; };
  useEffect(() => {
    const el = wrap.current;
    const wheel = (e) => { if (!e.ctrlKey && !e.metaKey) return; e.preventDefault(); zoom(e.deltaY < 0 ? 1.1 : 0.9); };
    el?.addEventListener('wheel', wheel, { passive: false }); return () => el?.removeEventListener('wheel', wheel);
  });

  const lit = (e) => hover && (e.s.id === hover || e.t.id === hover);
  const dim = (n) => hover && n.id !== hover && !edges.some((e) => (e.s.id === hover && e.t.id === n.id) || (e.t.id === hover && e.s.id === n.id));
  const sn = nodes.find((n) => n.id === sel) || last;
  const asset = BY_KEY[sn.it.b];
  const srcN = nodes.filter((n) => n.stage === 'Source data' || n.stage === 'Consumer').length;
  const featN = parseInt(ver.lineage.find((c) => c.stage === 'Feature engineering')?.items[0].b, 10);
  const batchN = parseInt(ver.lineage.find((c) => c.stage === 'Inference')?.items[0].b, 10);

  return (
    <div className={`lineage gv-mlin ${panel ? 'details-open' : ''} ${expanded ? 'is-fs' : ''}`}>
      <div className="lin-stats">
        <div><b>{ver.lineage.length}</b><span>Lineage stages</span><small>{ver.lineage[0].stage} to {ver.lineage[ver.lineage.length - 1].stage.toLowerCase()}</small></div>
        <div><b>{srcN}</b><span>{m.hosted ? 'Source assets' : 'Consumers'}</span><small>{m.hosted ? 'in the Data catalogue' : 'systems calling the model'}</small></div>
        <div><b>{edges.length}</b><span>Lineage edges</span><small>Recorded steps for {ver.v}</small></div>
        <div><b>{Number.isFinite(featN) ? featN : '—'}</b><span>Features</span><small>{Number.isFinite(featN) ? 'engineered from source columns' : 'not applicable'}</small></div>
        <div><b>{Number.isFinite(batchN) ? batchN : '—'}</b><span>Scoring batches</span><small>{Number.isFinite(batchN) ? 'daily batch inference' : 'external service'}</small></div>
      </div>
      <div className="lin-body">
        <div className={`card lin-canvas-card ${panel ? 'with-panel' : ''} ${expanded ? 'expanded' : ''}`}>
          <div className="lin-h">
            <div><h3>Model lineage graph — {ver.v}</h3><p>Click a step for details · hover to highlight its links · drag sideways to follow the lineage</p></div>
            <div className="lin-h-actions">
              <button className={`lin-details-toggle ${panel ? 'on' : ''}`} aria-expanded={panel} aria-label="Step details" title="Step details" onClick={() => setPanel((o) => !o)}><Info size={16} /></button>
            </div>
          </div>
          <div className="lin-main">
            <div ref={wrap} className="lin-canvas" style={{ height: h }} onMouseDown={down} onMouseMove={move} onMouseUp={up} onMouseLeave={up}>
              <div className="lin-world" style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.s})` }}>
                <svg className="lin-edges" style={{ left: box.x0 - 40, top: box.y0 - 40, width: box.x1 - box.x0 + 80, height: box.y1 - box.y0 + 80 }}
                  viewBox={`${box.x0 - 40} ${box.y0 - 40} ${box.x1 - box.x0 + 80} ${box.y1 - box.y0 + 80}`}>
                  <defs>
                    <marker id="mlin-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="#447DE6" /></marker>
                    <marker id="mlin-arrow-dim" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="#B6C6DC" /></marker>
                  </defs>
                  {edges.map((e) => {
                    const x1 = e.s.x + NW, y1 = e.s.y + NH / 2, x2 = e.t.x - 2, y2 = e.t.y + NH / 2, mx = (x1 + x2) / 2;
                    const on = lit(e), off = hover && !on;
                    return (
                      <g key={e.s.id + e.t.id} className={`ledge ${on ? 'on' : ''} ${off ? 'off' : ''}`}>
                        <path d={`M${x1} ${y1} C${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`} markerEnd={`url(#${off ? 'mlin-arrow-dim' : 'mlin-arrow'})`} />
                        <g transform={`translate(${mx} ${(y1 + y2) / 2})`}><rect x="-38" y="-9" width="76" height="18" rx="9" /><text y="4">{e.rel}</text></g>
                      </g>
                    );
                  })}
                </svg>
                {nodes.map((n) => {
                  const I = STAGE_ICON[n.stage] || Cpu;
                  const tag = tagOf(n.stage, n.it);
                  const isModel = n.stage === 'Model version' || n.stage === 'External model';
                  return (
                    <div key={n.id} className={`lnode gv-lnode ${isModel ? 'focus' : ''} ${sel === n.id ? 'sel' : ''} ${dim(n) ? 'dim' : ''} ${n.it.muted ? 'gv-muted-node' : ''}`}
                      style={{ left: n.x, top: n.y, width: NW, minHeight: NH }} onMouseEnter={() => setHover(n.id)} onMouseLeave={() => setHover(null)}
                      onMouseDown={(e) => e.stopPropagation()} onClick={() => { setSel(n.id); setPanel(true); }}>
                      {isModel && <span className="lnode-flag">Model</span>}
                      <div className="lnode-top"><I size={14} strokeWidth={1.75} /><span className="lnode-schema">{n.stage}</span>{tag && <span className="lnode-src" title={tag}>{tag}</span>}</div>
                      <b className="lnode-name" title={n.it.b}>{n.it.b}</b>
                      <div className="lnode-foot">
                        <span className="lnode-kind gv-lnode-sub" title={n.it.s || ''}>{n.it.ok ? <><CheckCircle2 size={11} /> in Data catalogue</> : (n.it.s || '—')}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="lin-zoom" onMouseDown={(e) => e.stopPropagation()}>
                <button onClick={() => zoom(1.2)} aria-label="Zoom in"><Plus size={15} /></button>
                <button onClick={() => zoom(1 / 1.2)} aria-label="Zoom out"><Minus size={15} /></button>
                <button onClick={fit} aria-label="Fit to view"><Maximize size={14} /></button>
                <button onClick={() => setExpanded((x) => !x)} aria-label={expanded ? 'Exit full screen' : 'Full screen'}>{expanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}</button>
              </div>
              <div className="lin-legend"><span><i className="lg-focus" />Model</span><span><i className="lg-edge" />Recorded lineage</span><span>Ctrl + scroll to zoom · drag to pan</span></div>
            </div>
            <aside className={`lin-side ${panel ? 'open' : ''}`} aria-hidden={!panel} aria-label="Step details">
              <div className="ls-top"><h3>Step details</h3><button className="ls-close" aria-label="Close step details" onClick={() => setPanel(false)}><X size={16} /></button></div>
              <div className="ls-head"><b className="gv-wrap">{sn.it.b}</b><small>{sn.stage} · {ver.v}</small>{tagOf(sn.stage, sn.it) && <span className="lnode-src">{tagOf(sn.stage, sn.it)}</span>}</div>
              <dl className="ls-dl">
                <div><dt>Stage</dt><dd>{sn.stage}</dd></div>
                <div><dt>Detail</dt><dd className="gv-wrap">{sn.it.s || '—'}</dd></div>
                {asset && <>
                  <div><dt>Full name</dt><dd className="mono">{asset.fqn}</dd></div>
                  <div><dt>Sensitivity</dt><dd>{asset.sensitivity}{asset.cls.length ? ` · ${asset.cls.join(', ')}` : ''}</dd></div>
                  <div><dt>Owner</dt><dd>{asset.owner}</dd></div>
                  <div><dt>Columns</dt><dd>{asset.cols}</dd></div>
                </>}
                <div><dt>Model</dt><dd>{m.name} · {ver.v} · {ver.stage}</dd></div>
              </dl>
              {asset && <button className="btn ghost wide-sm" onClick={() => nav(`/app/catalogue/${asset.id}?lineage=graph`)}><ArrowUpRight size={14} />Open {asset.name} in Data assets</button>}
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}
