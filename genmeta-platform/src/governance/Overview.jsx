import { useMemo, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Landmark, Bot, Scale, ScrollText, Globe2, Play, RefreshCw, ExternalLink, Plus, ArrowRight, Gauge, Lightbulb, Compass, ShieldCheck, FileText, KeyRound,
  ListTodo, Layers, History, CheckCircle2, AlertTriangle, AlertOctagon, GitBranch, Workflow, ClipboardCheck, Network, Activity, Bell, Settings2,
  MonitorSmartphone, Send, Cpu, FileOutput, Table2, Grid3x3, SlidersHorizontal, TrendingUp, ListChecks, Wrench, Archive, Boxes as Boxes2, Info as Info2, Mail, Shield, Tags as Tags2, Target as Target2,
} from 'lucide-react';
import { PageHead, Ring, Tabs, Button, Segmented, Badge } from '../components/ui.jsx';
import {
  OVERVIEW_TILES, CONTROLS, TIER_LABEL, TIERS, AUDIT, EXPORTS, fmtTs, BASE, POLICY_ITEMS,
  IMPROVEMENT_ACTIONS, ACTION_STATUSES, CONTROL_TYPE, scoreOf,
  MODEL_TILES, DISCOVERY, MODELS, RISK_TIERS,
  EVAL_METRICS, EVAL_CONFUSION, EVAL_CATEGORIES, EVAL_BANDS, EVAL_THRESHOLDS, EVAL_RUNS, REVIEW_ROWS, REVIEW_SOURCE, LABELS, DRIFT_NOTE,
} from './data.js';
import { Card, Tiles, StatusBadge, Empty, Note, Mono, Drawer, Modal, MenuButton, Fld, KV, downloadText, toast, Meter, meterTone, Section, SubNav, useWidth } from './kit.jsx';
import { AuditTab, ResidencyTab } from './AuditResidency.jsx';

export const OVERVIEW_TABS = [
  { value: 'overview', label: 'Overview', icon: Landmark },
  { value: 'models', label: 'Model governance', icon: Bot },
  { value: 'ai', label: 'AI evaluation', icon: Scale },
  { value: 'audit', label: 'Audit & reporting', icon: ScrollText },
  { value: 'residency', label: 'Residency & sovereignty', icon: Globe2 },
];

export default function GovernanceOverview() {
  const [sp, setSp] = useSearchParams();
  const tab = sp.get('tab') || 'overview';
  const setTab = (t) => setSp(t === 'overview' ? {} : { tab: t });
  const exportGraph = (fmt) => () => downloadText(`genmeta-graph.${fmt === 'jsonld' ? 'jsonld' : fmt === 'turtle' ? 'ttl' : 'okf.json'}`,
    fmt === 'turtle' ? '@prefix gm: <https://genmeta.rplusanalytics.co.uk/ns#> .\n# controls, tiers and sources exported from Governance\n'
      : JSON.stringify({ '@context': 'https://schema.org', controls: CONTROLS, tiers: TIERS }, null, 2));
  return (
    <div className="page gv">
      <PageHead eyebrow="Govern" title="Governance"
        sub="The three-tier constitution and cross-cutting security, privacy and compliance controls — each verified against the running system. Unavailable controls are shown honestly, not as proof of compliance.">
        <MenuButton label="Export" items={EXPORTS.map(([l, f]) => [`Export ${l}`, exportGraph(f)])} />
      </PageHead>
      <Tabs items={OVERVIEW_TABS} value={tab} onChange={setTab} />
      {tab === 'overview' && <OverviewTab />}
      {tab === 'models' && <ModelTab />}
      {tab === 'ai' && <AiEvalTab />}
      {tab === 'audit' && <AuditTab />}
      {tab === 'residency' && <ResidencyTab />}
    </div>
  );
}

/* ------------------------------------------------------------------ Overview
   v2 patterns: Microsoft Purview Compliance Manager (points-weighted score, score per framework,
   improvement actions you can assign, track and evidence) and Collibra (one view across policies,
   privacy and access, with the gaps to close). */
const STATUS_TONE = { 'Not started': 'fail', 'In progress': 'warn', Implemented: 'warn', Passed: 'ok' };
export const catClass = (c) => ({ 'Ownership and access': 'cat-own', 'Policy actions': 'cat-pol', Other: 'cat-oth', 'Metadata changes': 'cat-meta' }[c] || '');
/* Lean, single-row health strip (closer to the old UI): status counts with coloured icons and a meter. */
function HealthStrip({ pass, warn, total }) {
  const pct = pass / total;
  return (
    <div className="gv-strip">
      <div className="gv-strip-t"><span className="gv-chip ok"><ShieldCheck size={17} /></span><div><b>Governance health</b><small>Overall status across all governance controls and domains · {total - pass - warn} not connected, shown as unavailable.</small></div></div>
      <div className="gv-pill"><span className="gv-chip sm ok"><CheckCircle2 size={14} /></span><div><b>{pass}</b><span>Passing</span></div></div>
      <div className="gv-pill"><span className="gv-chip sm warn"><AlertTriangle size={14} /></span><div><b>{warn}</b><span>Warnings</span></div></div>
      <div className="gv-pill"><span className="gv-chip sm bad"><AlertOctagon size={14} /></span><div><b>0</b><span>Critical</span></div></div>
      <div className="gv-strip-score"><b>{Math.round(pct * 100)}%</b><span>controls passing</span><Meter pct={pct} /></div>
    </div>
  );
}
const FRAMEWORKS_SCORED = ['UK GDPR', 'DPA 2018', 'ISO/IEC 27001:2022', 'NCSC CAF', 'HMRC residency'];

function OverviewTab() {
  const nav = useNavigate();
  const [open, setOpen] = useState(null);
  const [actions, setActions] = useState(IMPROVEMENT_ACTIONS);
  const [act, setAct] = useState(null);
  const [aFilter, setAFilter] = useState('todo');
  const [cStatus, setCStatus] = useState('all');
  const [cDomain, setCDomain] = useState('all');
  const pass = CONTROLS.filter((c) => c.status === 'Passing').length;
  const warn = CONTROLS.filter((c) => c.status === 'Warning').length;
  const score = scoreOf(actions);
  const byFw = FRAMEWORKS_SCORED.map((f) => [f, scoreOf(actions.filter((a) => a.fw.includes(f)))]);
  const todo = actions.filter((a) => a.status !== 'Passed').sort((a, b) => b.points - a.points);
  const shownActions = aFilter === 'todo' ? todo : aFilter === 'done' ? actions.filter((a) => a.status === 'Passed') : actions;
  const controls = CONTROLS.filter((c) => (cStatus === 'all' || c.status === cStatus) && (cDomain === 'all' || c.domain === cDomain));
  const updateAction = (id, patch) => { setActions((all) => all.map((a) => (a.id === id ? { ...a, ...patch } : a))); setAct((a) => (a && a.id === id ? { ...a, ...patch } : a)); };
  const actionFor = (c) => actions.find((a) => a.control === c.id && a.status !== 'Passed');
  return (
    <>
      <Tiles items={OVERVIEW_TILES.map((t) => (t.l === 'Compliance posture' ? { ...t, v: `${Math.round(score.pct * 100)}%`, s: `${score.got} of ${score.total} points · ${todo.length} actions open` } : t))} />
      <HealthStrip pass={pass} warn={warn} total={CONTROLS.length} />
      <div className="gv-two wide-l">
        <Card icon={Gauge} tone={meterTone(score.pct)} title="Compliance score" count={`${Math.round(score.pct * 100)}%`}
          sub="Points for every improvement action that has passed, weighted by risk (preventative 27 · detective 3).">
          <div className="gv-bars">
            {byFw.map(([f, s]) => <div key={f}><span>{f}</span><Meter pct={s.pct} /><b>{Math.round(s.pct * 100)}%</b></div>)}
          </div>
          <div className="gv-callout info" style={{ marginTop: 14 }}><Lightbulb size={15} /><span>{score.got} of {score.total} points achieved. Quickest gain: <b>{todo[0].title.toLowerCase()}</b> (+{todo[0].points} points).</span></div>
        </Card>
        <section className="dash-card gv-jumps">
          <div className="block-head gv-head"><div className="gv-head-l"><span className="gv-chip violet"><Compass size={16} /></span><div><h2>Across Governance</h2><p className="block-sub">Where to act next in each area.</p></div></div></div>
          {[
            [ShieldCheck, 'violet', 'Policies', `${POLICY_ITEMS.length} items · 16 without an owner`, '68% of automated checks passing', 'warn', 'policies'],
            [FileText, 'bad', 'DPIA & GDPR', '0 of 5 records of processing accepted', '82 of 150 handling checks failing', 'bad', 'dpia'],
            [KeyRound, 'info', 'Access', '6 grants due for quarterly review', '3 recommended to revoke', 'warn', 'access'],
          ].map(([I, tn, t, a1, b1, st, to]) => (
            <button key={t} type="button" className="gv-jump-row" onClick={() => nav(`${BASE}/${to}`)}>
              <span className={`gv-chip ${tn}`}><I size={16} /></span>
              <span className="gv-jump-t"><b>{t}</b><small>{a1}</small><span className={`gv-badge ${st}`}><i />{b1}</span></span>
              <ArrowRight size={15} className="gv-jump-go" />
            </button>
          ))}
        </section>
      </div>
      <Card icon={ListTodo} tone="warn" title="Improvement actions" count={todo.length} sub="What to do next to raise the score. Assign an owner, record progress and attach evidence; the score updates when an action passes."
        actions={<Segmented size="sm" value={aFilter} onChange={setAFilter} options={[{ value: 'todo', label: `To do (${todo.length})` }, { value: 'done', label: 'Passed' }, { value: 'all', label: 'All' }]} />}>
        <div className="table-wrap">
          <table className="tbl">
            <thead><tr><th>Action</th><th>Type</th><th className="num">Points</th><th>Frameworks</th><th>Owner</th><th>Due</th><th>Status</th></tr></thead>
            <tbody>{shownActions.map((a) => (
              <tr key={a.id} className="click" onClick={() => setAct(a)}>
                <td><span className="gv-strong">{a.title}</span><span className="gv-sub"><span className="mono">{a.id}</span> · {CONTROLS.find((c) => c.id === a.control)?.name}</span></td>
                <td className="gv-muted">{a.type}</td><td className="num gv-strong">+{a.points}</td>
                <td><div className="gv-tags">{a.fw.map((f) => <span key={f} className="tag">{f}</span>)}</div></td>
                <td>{a.owner}</td><td>{a.due}</td><td><StatusBadge s={STATUS_TONE[a.status]}>{a.status}</StatusBadge></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </Card>
      <Card icon={ShieldCheck} tone="info" title="Governance controls" count={controls.length} sub="Cross-cutting security, privacy and compliance controls checked against the running system. Click a row for evidence."
        actions={<>
          <select className="select" value={cDomain} onChange={(e) => setCDomain(e.target.value)} aria-label="Domain"><option value="all">All domains</option>{[...new Set(CONTROLS.map((c) => c.domain))].map((d) => <option key={d}>{d}</option>)}</select>
          <Segmented size="sm" value={cStatus} onChange={setCStatus} options={[{ value: 'all', label: 'All' }, { value: 'Passing', label: 'Passing' }, { value: 'Warning', label: 'Warning' }, { value: 'Not connected', label: 'Not connected' }]} />
        </>}>
        <div className="table-wrap">
          <table className="tbl">
            <thead><tr><th>Control</th><th>Domain</th><th>Tier</th><th>Type</th><th>Status</th><th>Evidence</th><th>Next action</th></tr></thead>
            <tbody>
              {controls.map((c) => { const a = actionFor(c); return (
                <tr key={c.id} className={`click ${open?.id === c.id ? 'on' : ''}`} onClick={() => setOpen(c)}>
                  <td className="gv-strong">{c.name}</td><td>{c.domain}</td><td>Tier {c.tier}</td><td className="gv-muted">{CONTROL_TYPE[c.id]}</td>
                  <td><StatusBadge s={c.status} /></td><td className="gv-muted">{c.evidence}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>{a ? <span className="gl-tlink">{a.id} · +{a.points}</span> : <span className="gv-faint">—</span>}</td>
                </tr>
              ); })}
              {!controls.length && <tr><td colSpan={7}><Empty>No controls match.</Empty></td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
      <Card icon={Layers} tone="violet" title="The constitution — three tiers">
        <div className="gv-tiers">
          {TIERS.map((t) => (
            <div key={t.n} className={`gv-tier t${t.n}`}>
              <header><b>Tier {t.n} · {t.name}</b><StatusBadge s={t.state === 'gated' ? 'warn' : 'ok'}>{t.state}</StatusBadge></header>
              <p>{t.d}</p>
            </div>
          ))}
        </div>
      </Card>
      <Card icon={History} tone="teal" title="Recent audit activity" count={50} sub="Tamper-evident, hash-chained. in-memory (no external anchor).">
        <div className="gv-feed gv-scroll" style={{ maxHeight: 380 }}>
          {AUDIT.slice(0, 50).map((r) => (
            <div key={r.seq}>
              <span className="seq">#{r.seq}</span>
              <div><span className={`act ${catClass(r.category)}`}>{r.action}<span className="tag">{r.asset}</span></span><small>{r.what} · {r.category.toLowerCase()} · {fmtTs(r.ts)}</small></div>
            </div>
          ))}
        </div>
      </Card>
      {open && <ControlDrawer c={open} action={actionFor(open)} onOpenAction={(a) => { setOpen(null); setAct(a); }} onClose={() => setOpen(null)} />}
      {act && <ActionDrawer a={act} onClose={() => setAct(null)} onUpdate={updateAction} />}
    </>
  );
}

function ActionDrawer({ a, onClose, onUpdate }) {
  const [done, setDone] = useState({});
  const [note, setNote] = useState('');
  return (
    <Drawer wide title={`${a.id} · Improvement action`} onClose={onClose}>
      <h3 className="gv-strong" style={{ margin: '0 0 6px', fontSize: 16 }}>{a.title}</h3>
      <div className="gv-inline" style={{ alignItems: 'center', marginBottom: 14 }}><StatusBadge s={STATUS_TONE[a.status]}>{a.status}</StatusBadge><span className="tag">+{a.points} points</span><span className="gv-faint">{a.type}</span></div>
      <p style={{ fontSize: 13.5, margin: '0 0 14px', lineHeight: 1.6 }}>{a.why}</p>
      <div className="gv-form">
        <Fld label="Owner"><select className="select" value={a.owner} onChange={(e) => onUpdate(a.id, { owner: e.target.value })}>{['governance-lead', 'platform-ops', 'data-engineer', 'Data Protection Officer', 'product-owner'].map((o) => <option key={o}>{o}</option>)}</select></Fld>
        <Fld label="Due"><input className="input" value={a.due} onChange={(e) => onUpdate(a.id, { due: e.target.value })} /></Fld>
        <div className="full"><Fld label="Status"><Segmented size="sm" value={a.status} onChange={(v) => { onUpdate(a.id, { status: v }); toast(v === 'Passed' ? `+${a.points} points — compliance score updated` : `Status set to ${v}`); }} options={ACTION_STATUSES.map((s) => ({ value: s, label: s }))} /></Fld></div>
      </div>
      <KV rows={[['Control', CONTROLS.find((c) => c.id === a.control)?.name], ['Frameworks', a.fw.join(', ')]]} />
      {a.steps.length > 0 && (<>
        <div className="gv-section-label">How to implement</div>
        <div className="gv-checks">{a.steps.map((s, i) => <label key={s}><input type="checkbox" checked={!!done[i]} onChange={(e) => setDone((o) => ({ ...o, [i]: e.target.checked }))} />{s}</label>)}</div>
      </>)}
      <div className="gv-section-label">Evidence and notes</div>
      <textarea className="input" rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="What was done, with a link to the change or the screenshot" />
      <div style={{ marginTop: 10 }}><Button variant="secondary" size="md" disabled={!note.trim()} onClick={() => { toast('Evidence attached and written to the audit trail'); setNote(''); onUpdate(a.id, { status: a.status === 'Not started' ? 'In progress' : a.status }); }}>Attach evidence</Button></div>
    </Drawer>
  );
}

function ControlDrawer({ c, action, onOpenAction, onClose }) {
  const [t, setT] = useState('overview');
  return (
    <Drawer title="Control detail" onClose={onClose}>
      <h3 className="gv-strong" style={{ margin: '0 0 2px', fontSize: 16 }}>{c.name}</h3>
      <p className="gv-muted" style={{ margin: '0 0 10px', fontSize: 13 }}>{c.domain} · Tier {c.tier} · {CONTROL_TYPE[c.id]}</p>
      <div style={{ marginBottom: 14 }}><StatusBadge s={c.status} /></div>
      <Tabs items={[{ value: 'overview', label: 'Overview' }, { value: 'evidence', label: 'Evidence' }]} value={t} onChange={setT} />
      {t === 'overview' ? (
        <>
          <p style={{ fontSize: 13.5, margin: '0 0 14px' }}>{c.evidence}</p>
          <KV rows={[['Domain', c.domain], ['Tier', TIER_LABEL[c.tier]], ['Status', c.status], ['Evidence', c.api ? <a className="gl-tlink" href={c.api} target="_blank" rel="noreferrer">GET {c.api.replace('/api/gm', '/api')} <ExternalLink size={12} /></a> : 'No evidence source connected']]} />
          {action && (
            <div className="gv-result">
              <header><StatusBadge s={STATUS_TONE[action.status]}>{action.status}</StatusBadge><b>To make this pass</b></header>
              <p style={{ margin: '0 0 8px' }}>{action.title} (+{action.points} points).</p>
              <Button variant="secondary" size="sm" onClick={() => onOpenAction(action)}>Open improvement action</Button>
            </div>
          )}
        </>
      ) : (
        <>
          <div className="gv-section-label">Checked against the running system</div>
          <KV rows={[['Last checked', '3 Oct 2026, 11:31'], ['Checked by', 'scheduler'], ['Method', c.api ? 'live API call' : 'not available']]} />
          <div className="gv-section-label">Response</div>
          <pre className="gv-pre">{c.api ? JSON.stringify(c.id === 'audit-log' || c.id === 'worm'
            ? { algorithm: 'sha-256 hash-chain', anchor: 'in-memory (no external anchor)', broken_links: 0, entries_checked: 128, immutable: false, verified: true }
            : { control: c.id, status: c.status.toLowerCase(), evidence: c.evidence }, null, 2) : 'No DPIA/ROPA evidence source connected in this prototype.'}</pre>
        </>
      )}
    </Drawer>
  );
}

/* ------------------------------------------------------------------ Model governance
   v3: a clear sub-navigation with icons and counts, coloured discovery status, and the model
   detail broken into titled sections (versions, lineage, workflow, periodic review, history). */
const DISC_TONE = { failed: 'bad', 'not configured': 'neutral' };
function ModelTab() {
  const [sub, setSub] = useState('registry');
  const [models, setModels] = useState(MODELS);
  const [sel, setSel] = useState(MODELS[0].id);
  const m = models.find((x) => x.id === sel) || models[0];
  return (
    <>
      <Tiles items={MODEL_TILES.map((t) => (t.l === 'Models governed' ? { ...t, v: models.length, s: `0 hosted · ${models.length} external` } : t))} />
      <div className="gv-inline" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="gv-inline" style={{ alignItems: 'center', gap: 8 }}>
          <span className="gv-muted" style={{ fontSize: 13 }}>Discovered from</span>
          {DISCOVERY.map(([k, v]) => <span key={k} className={`gv-disc ${DISC_TONE[v] || 'ok'}`}>{k}: {v}</span>)}
        </div>
        <Button variant="secondary" size="md" icon={RefreshCw} onClick={() => toast('Monitoring run started — no hosted models to monitor')}>Run monitoring now</Button>
      </div>
      <SubNav value={sub} onChange={setSub} items={[
        { value: 'registry', label: 'Registry & lineage', icon: Network, count: models.length },
        { value: 'monitoring', label: 'Monitoring & guardrails', icon: Activity, count: 0 },
        { value: 'alerts', label: 'Alerts', icon: Bell, count: 0 },
        { value: 'workflows', label: 'Workflows & policy', icon: Workflow, count: RISK_TIERS.length },
      ]} />
      {sub === 'registry' && (
        <>
          <Card icon={Boxes2} tone="info" title="Model registry" count={models.length} sub="Every model the platform uses — hosted in SageMaker or MLflow, or called as an external service.">
            <div className="table-wrap">
              <table className="tbl">
                <thead><tr><th>Model</th><th>Found in</th><th className="num">Versions</th><th>Stage of latest</th><th>Risk tier</th><th>Monitoring</th><th>Alerts</th></tr></thead>
                <tbody>{models.map((x) => (
                  <tr key={x.id} className={`click ${x.id === m.id ? 'on' : ''}`} onClick={() => setSel(x.id)}>
                    <td><span className="gv-strong">{x.name}</span><span className="gv-sub">{x.provider}</span></td><td><span className="tag">{x.foundIn}</span></td><td className="num">{x.versions}</td>
                    <td><StatusBadge s={x.stage === 'In production' ? 'ok' : x.stage === 'Retired' ? 'bad' : 'info'}>{x.stage}</StatusBadge></td>
                    <td><StatusBadge s={x.risk === 'High risk' ? 'bad' : x.risk === 'Low risk' ? 'ok' : 'warn'}>{x.risk}</StatusBadge></td>
                    <td><span className="gv-disc neutral">{x.monitoring}</span></td><td>{x.alerts}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </Card>
          <ModelDetail m={m} onChange={(patch) => setModels((all) => all.map((x) => (x.id === m.id ? { ...x, ...patch } : x)))} />
        </>
      )}
      {sub === 'monitoring' && (
        <Card icon={Activity} tone="teal" title="Monitoring & guardrails" sub="Drift, bias and performance checks run on hosted models after every deployment and on a schedule.">
          <div className="gv-callout info"><Info2 size={15} /><span>No hosted models discovered yet. SageMaker discovery failed and MLflow is not configured — connect one of them to monitor hosted models. External models such as Claude Sonnet 5 are governed through the workflow and periodic review instead.</span></div>
        </Card>
      )}
      {sub === 'alerts' && <AlertsPanel />}
      {sub === 'workflows' && <WorkflowsPanel onRegister={(x) => { setModels((a) => [...a, x]); setSel(x.id); setSub('registry'); toast(`Registered ${x.name}`); }} />}
    </>
  );
}

const LINEAGE_LOOK = { Consumer: [MonitorSmartphone, 'info'], 'Data sent': [Send, 'warn'], 'External model': [Cpu, 'violet'], Output: [FileOutput, 'ok'] };
function ModelDetail({ m, onChange }) {
  const [checks, setChecks] = useState({});
  const [hist, setHist] = useState(false);
  const [note, setNote] = useState('');
  const allTicked = m.checks.every((c) => checks[c]);
  const v = m.versionRows[0];
  const stageIdx = m.workflow.indexOf(m.stage);
  return (
    <Card icon={Cpu} tone="violet" title={m.name} sub={m.purpose}
      actions={<div className="gv-inline" style={{ alignItems: 'flex-end' }}>
        <Fld label="Risk tier"><select className="select" value={m.risk} onChange={(e) => onChange({ risk: e.target.value })}>{RISK_TIERS.map(([r]) => <option key={r}>{r}</option>)}</select></Fld>
        <Fld label="Owner"><input className="input" value={m.owner} placeholder="Accountable owner" onChange={(e) => onChange({ owner: e.target.value })} /></Fld>
      </div>}>
      <Section first icon={GitBranch} tone="info" title="Versions" meta={`${m.versionRows.length} version · next review ${v.review}`}>
        <div className="table-wrap">
          <table className="tbl">
            <thead><tr><th>Version</th><th>Registries</th><th>Accuracy</th><th>ROC AUC</th><th>F1 (HIGH)</th><th>Stage</th><th>Next review</th></tr></thead>
            <tbody>{m.versionRows.map((r) => <tr key={r.v}><td><Mono>{r.v}</Mono></td><td>{r.reg}</td><td>{r.acc}</td><td>{r.auc}</td><td>{r.f1}</td><td><StatusBadge s={m.stage === 'In production' ? 'ok' : 'info'}>{m.stage}</StatusBadge></td><td>{r.review}</td></tr>)}</tbody>
          </table>
        </div>
      </Section>
      <Section icon={Network} tone="teal" title={`Lineage — ${v.v}`} meta="what goes in, where it goes, what comes out">
        <div className="gv-flow">
          {m.lineage.map(([k, b, s]) => { const [I, tn] = LINEAGE_LOOK[k] || [Cpu, 'info']; return <div key={k} className={tn}><span><I size={13} />{k}</span><b>{b}</b>{s && <small>{s}</small>}</div>; })}
        </div>
      </Section>
      <Section icon={Workflow} tone="violet" title={`Governance workflow — ${v.v}`} meta={<StatusBadge s={m.risk === 'High risk' ? 'bad' : m.risk === 'Low risk' ? 'ok' : 'warn'}>{m.risk}</StatusBadge>}>
        <div className="gv-steps">
          {m.workflow.map((s, i) => <div key={s} className={i < stageIdx ? 'done' : i === stageIdx ? 'cur' : ''}><i>{i < stageIdx ? '✓' : i + 1}</i>{s}</div>)}
        </div>
        <Note>{m.reviewNote}</Note>
      </Section>
      <Section icon={ClipboardCheck} tone="ok" title="Periodic review" meta={`${m.checks.filter((c) => checks[c]).length} of ${m.checks.length} confirmed`}>
        <div className="gv-checks">
          {m.checks.map((c) => <label key={c}><input type="checkbox" checked={!!checks[c]} onChange={(e) => setChecks((o) => ({ ...o, [c]: e.target.checked }))} />{c}</label>)}
        </div>
        <div className="gv-inline" style={{ alignItems: 'center' }}>
          <input className="input" style={{ flex: 1, minWidth: 260, height: 32 }} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Reason or note (recorded in the audit log)" />
          <Button variant="primary" size="md" disabled={!allTicked} onClick={() => { toast('Periodic review completed — next review in 180 days'); setChecks({}); setNote(''); }}>Complete periodic review</Button>
          <Button variant="secondary" size="md" onClick={() => { onChange({ stage: 'Deprecated' }); toast(`${m.name} deprecated`); }}>Deprecate</Button>
          <Button variant="secondary" size="md" onClick={() => { onChange({ stage: 'Retired' }); toast(`${m.name} retired`); }}>Retire</Button>
        </div>
      </Section>
      <Section icon={History} tone="teal" title="History" meta={<Button variant="link" onClick={() => setHist((h) => !h)}>{hist ? 'Hide' : `Show (${m.history.length})`}</Button>}>
        {hist && <ul className="gv-lines">{m.history.map(([at, who, what]) => <li key={at}><b>{who}</b> · {what} <span className="gv-faint">· {at}</span></li>)}</ul>}
      </Section>
    </Card>
  );
}

function AlertsPanel() {
  const [f, setF] = useState('all');
  const [rcp, setRcp] = useState([]);
  const [email, setEmail] = useState('');
  return (
    <>
      <Card icon={Bell} tone="warn" title="Alerts" actions={<Segmented size="sm" value={f} onChange={setF} options={[{ value: 'all', label: 'All' }, { value: 'open', label: 'Open' }, { value: 'ack', label: 'Acknowledged' }, { value: 'resolved', label: 'Resolved' }]} />}>
        <Empty>No alerts.</Empty>
      </Card>
      <Card icon={Mail} tone="info" title="Email recipients" sub="Alerts are emailed through AWS SNS. Each recipient confirms once from the email AWS sends.">
        {rcp.length ? <ul className="gv-lines">{rcp.map((r) => <li key={r}>{r} <span className="gv-faint">· pending confirmation</span></li>)}</ul> : <Empty>No recipients yet.</Empty>}
        <div className="gv-inline" style={{ marginTop: 12 }}>
          <Fld label="Email"><input className="input" type="email" placeholder="name@hmrc.gov.uk" value={email} onChange={(e) => setEmail(e.target.value)} /></Fld>
          <Button variant="secondary" size="md" icon={Plus} disabled={!/.+@.+\..+/.test(email)} onClick={() => { setRcp((r) => [...r, email]); setEmail(''); toast('Recipient added — confirmation email sent'); }}>Add recipient</Button>
        </div>
      </Card>
    </>
  );
}

function WorkflowsPanel({ onRegister }) {
  const blank = { name: '', provider: '', version: '', purpose: '', usedBy: '', shared: '', hosting: '', risk: 'Medium risk' };
  const [f, setF] = useState(blank);
  const set = (k) => (e) => setF((o) => ({ ...o, [k]: e.target.value }));
  const ok = f.name.trim() && f.provider.trim();
  const register = () => onRegister({
    id: `${f.name}-${Date.now()}`, name: f.name, provider: f.provider, foundIn: 'External', versions: 1, stage: 'Registered', risk: f.risk, monitoring: 'not monitored', alerts: '—',
    purpose: f.purpose || 'Externally provided AI model', owner: '',
    versionRows: [{ v: f.version || 'v1', reg: `External · ${f.hosting || f.provider}`, acc: '—', auc: '—', f1: '—', stage: 'Registered', review: '—' }],
    lineage: [['Consumer', f.usedBy || '—', ''], ['Data sent', f.shared || '—', ''], ['External model', `${f.provider} · ${f.name}`, f.hosting], ['Output', '—', '']],
    workflow: ['Registered', 'Validation', 'Approval', 'In production'], reviewNote: 'Awaiting validation.', checks: ['Drift and bias results reviewed', 'Performance still acceptable', 'Continued business need confirmed'],
    history: [['now', 'governance-lead', 'Registered as an external model']],
  });
  return (
    <>
      <Card icon={Shield} tone="violet" title="Risk tiers and review policy" sub="The tier sets how often a model is reviewed and how many people must approve it.">
        <div className="table-wrap">
          <table className="tbl">
            <thead><tr><th>Risk tier</th><th>Applies to</th><th className="num">Review every</th><th className="num">Approvers</th></tr></thead>
            <tbody>{RISK_TIERS.map(([n, d, days, ap]) => <tr key={n}><td><StatusBadge s={n === 'High risk' ? 'bad' : n === 'Low risk' ? 'ok' : 'warn'}>{n}</StatusBadge></td><td>{d}</td><td className="num">{days} days</td><td className="num">{ap}</td></tr>)}</tbody>
          </table>
        </div>
      </Card>
      <Card icon={Plus} tone="ok" title="Register an externally provided AI model" sub="Third-party models the organisation calls rather than hosts — governed through the same workflow.">
        <div className="gv-form">
          <Fld label="Model"><input className="input" value={f.name} onChange={set('name')} /></Fld>
          <Fld label="Provider"><input className="input" value={f.provider} onChange={set('provider')} /></Fld>
          <Fld label="Version"><input className="input" value={f.version} onChange={set('version')} /></Fld>
          <Fld label="Purpose"><input className="input" value={f.purpose} onChange={set('purpose')} /></Fld>
          <Fld label="Used by"><input className="input" value={f.usedBy} onChange={set('usedBy')} /></Fld>
          <Fld label="Data shared"><input className="input" value={f.shared} onChange={set('shared')} /></Fld>
          <Fld label="Hosting"><input className="input" value={f.hosting} onChange={set('hosting')} /></Fld>
          <Fld label="Risk tier"><select className="select" value={f.risk} onChange={set('risk')}>{RISK_TIERS.map(([r]) => <option key={r}>{r}</option>)}</select></Fld>
        </div>
        <Button variant="primary" size="md" disabled={!ok} onClick={() => { register(); setF(blank); }}>Register model</Button>
      </Card>
    </>
  );
}

/* ------------------------------------------------------------------ AI evaluation */
const REVIEW_FILTERS = [
  { value: 'disagree', label: 'Where the classifier disagrees with the label' },
  { value: 'low', label: 'Low-confidence flags (below 0.75)' },
  { value: 'unlabelled', label: 'Columns with no reviewed label yet' },
];
function AiEvalTab() {
  const [filter, setFilter] = useState('disagree');
  const [labels, setLabels] = useState({});
  const [notes, setNotes] = useState({});
  const [log, setLog] = useState([]);
  const [logOpen, setLogOpen] = useState(false);
  const [dep, setDep] = useState(null);
  const [notice, setNotice] = useState(null);
  const rows = useMemo(() => {
    if (filter === 'low') return REVIEW_ROWS.filter((r) => r.conf != null && r.conf < 0.75);
    if (filter === 'unlabelled') return [];
    return REVIEW_ROWS;
  }, [filter]);
  const key = (r) => `${r.a}.${r.c}`;
  const save = (r) => {
    const l = labels[key(r)] || r.l;
    setLog((x) => [{ at: new Date().toLocaleString('en-GB'), col: key(r), from: r.l, to: l, note: notes[key(r)] || '' }, ...x]);
    toast(`Saved label ${l} for ${key(r)}`);
  };
  const tiles = [...EVAL_METRICS.map(([l, v]) => ({ l, v, s: 'sensitive vs not, 234 labelled columns' })), { l: 'Exact category', v: '70.5%', s: '87.6% of 267 columns labelled' }];
  return (
    <>
      <div className="gv-inline" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <p className="gv-muted" style={{ margin: 0, fontSize: 13.5, maxWidth: 820 }}>Measures GenMeta's sensitive-data classifier (built-in patterns plus approved rules) against a reviewed label set of every catalogued column. Users correct labels below; corrections become the labels and can be turned into classifier rules.</p>
        <Button variant="secondary" size="md" icon={Play} onClick={() => toast('Evaluation run recorded — results unchanged')}>Run evaluation now</Button>
      </div>
      <Tiles items={tiles} />
      <div className="gv-two">
        <Card icon={Grid3x3} tone="info" title="Confusion — sensitive vs not" sub="How the classifier's sensitive / not-sensitive calls compare with the reviewed labels.">
          <Section first icon={Grid3x3} tone="info" title="Outcomes" meta={`${EVAL_CONFUSION.tp + EVAL_CONFUSION.fn + EVAL_CONFUSION.fp + EVAL_CONFUSION.tn} labelled columns`}>
            <table className="gv-matrix">
              <thead><tr><th /><th>Predicted sensitive</th><th>Predicted not</th></tr></thead>
              <tbody>
                <tr><th>Actually sensitive</th><td className="hit ok"><b>{EVAL_CONFUSION.tp}</b><span>true positive</span></td><td className="miss"><b>{EVAL_CONFUSION.fn}</b><span>false negative · missed</span></td></tr>
                <tr><th>Actually not</th><td className="miss warn"><b>{EVAL_CONFUSION.fp}</b><span>false positive · over-flagged</span></td><td className="hit ok"><b>{EVAL_CONFUSION.tn}</b><span>true negative</span></td></tr>
              </tbody>
            </table>
          </Section>
          <Section icon={Tags2} tone="teal" title="By category" meta="precision and recall per label">
            <div className="table-wrap">
              <table className="tbl">
                <thead><tr><th>Category</th><th className="num">Labelled</th><th className="num">Predicted</th><th style={{ width: '26%' }}>Precision</th><th style={{ width: '26%' }}>Recall</th></tr></thead>
                <tbody>{EVAL_CATEGORIES.map(([c, a2, b2, p2, r2]) => <tr key={c}><td><span className="tag">{c}</span></td><td className="num">{a2}</td><td className="num">{b2}</td>
                  <td><div className="gv-inbar"><Meter pct={parseFloat(p2) / 100} /><b>{p2}</b></div></td><td><div className="gv-inbar"><Meter pct={parseFloat(r2) / 100} /><b>{r2}</b></div></td></tr>)}</tbody>
              </table>
            </div>
          </Section>
        </Card>
        <Card icon={SlidersHorizontal} tone="violet" title="Confidence scoring" sub="Mean confidence on correct flags 0.676, on wrong flags 0.675 — confidence barely separates right from wrong today.">
          <Section first icon={Table2} tone="info" title="By confidence band" meta="how often a flag in each band is right">
            <div className="table-wrap">
              <table className="tbl">
                <thead><tr><th>Confidence band</th><th className="num">Flags</th><th style={{ width: '45%' }}>Precision</th></tr></thead>
                <tbody>{EVAL_BANDS.map(([b2, n, p2]) => <tr key={b2}><td><Mono>{b2}</Mono></td><td className="num">{n}</td>
                  <td>{p2 === '—' ? <span className="gv-faint">no flags</span> : <div className="gv-inbar"><Meter pct={parseFloat(p2) / 100} /><b>{p2}</b></div>}</td></tr>)}</tbody>
              </table>
            </div>
          </Section>
          <Section icon={Target2} tone="ok" title="Choose a threshold" meta="flag a column only at or above this confidence">
            <div className="table-wrap">
              <table className="tbl">
                <thead><tr><th>Only flag at ≥</th><th className="num">Precision</th><th className="num">Recall</th><th className="num">F1</th><th className="num">FP rate</th><th className="num">FN rate</th></tr></thead>
                <tbody>{EVAL_THRESHOLDS.map((r, k) => (
                  <tr key={r[0]} className={k === 0 ? 'best' : ''}>
                    <td>{r[0].replace(' (best F1)', '')}{k === 0 && <span className="gv-badge ok" style={{ marginLeft: 8 }}><i />best F1</span>}</td>
                    <td className="num">{r[1]}</td><td className="num">{r[2]}</td><td className="num gv-strong">{r[3]}</td>
                    <td className={`num ${parseFloat(r[4]) > 20 ? 'hot' : ''}`}>{r[4]}</td><td className={`num ${parseFloat(r[5]) > 50 ? 'hot' : ''}`}>{r[5]}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
            <Note>Raising the threshold above 0.7 removes false positives but misses almost every sensitive column — keep 0.5 until more labels are reviewed.</Note>
          </Section>
        </Card>
      </div>
      <Card icon={TrendingUp} tone="teal" title="Drift monitoring" sub="Runs are recorded on every harvest that changes the estate, labels or rules; alerts go to Model governance › Alerts.">
        <div className="gv-three" style={{ marginBottom: 16 }}>
          <Monitor label="Prediction-mix PSI vs baseline" value={0} fmt={(v) => v.toFixed(2)} max={0.4} warn={0.1} breach={0.25} note="warn 0.1 · breach 0.25" />
          <Monitor label="F1 change vs previous run" value={0} fmt={(v) => (v >= 0 ? `+${v.toFixed(2)}` : v.toFixed(2))} min={-0.2} max={0.2} breachBelow={-0.05} note="alert below −0.05" />
          <Monitor label="Label coverage" value={0.876} fmt={(v) => `${(v * 100).toFixed(1)}%`} max={1} breachBelow={0.8} note="alert below 80%" />
        </div>
        <DriftChart />
        <div className="table-wrap" style={{ marginTop: 12 }}>
          <table className="tbl">
            <thead><tr><th>Run</th><th>By</th><th>Rules version</th><th>Labelled / columns</th><th className="num">Precision</th><th className="num">Recall</th><th className="num">F1</th><th className="num">PSI</th><th>Status</th></tr></thead>
            <tbody>{EVAL_RUNS.map((r) => <tr key={r[0]}><td>{r[0]}</td><td>{r[1]}</td><td><Mono>{r[2]}</Mono></td><td>{r[3]}</td><td className="num">{r[4]}</td><td className="num">{r[5]}</td><td className="num">{r[6]}</td><td className="num">{r[7]}</td><td><StatusBadge s={r[8]} /></td></tr>)}</tbody>
          </table>
        </div>
      </Card>
      <Card icon={ListChecks} tone="warn" title="Review and correct" count={`${rows.length} column(s)`} actions={<select className="select" value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Which columns">{REVIEW_FILTERS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>}>
        {rows.length ? (
          <div className="table-wrap gv-scroll">
            <table className="tbl">
              <thead><tr><th>Column</th><th>Classifier says</th><th>Current label</th><th>Your label</th><th>Note</th><th /></tr></thead>
              <tbody>{rows.map((r) => (
                <tr key={key(r)}>
                  <td><Mono>{r.c}</Mono><span className="gv-sub">{r.a}</span></td>
                  <td><span className="tag">{r.p}</span>{r.conf != null && <span className="gv-faint"> {r.conf.toFixed(2)}</span>}</td>
                  <td><span className="tag">{r.l}</span><span className="gv-sub">{REVIEW_SOURCE}</span></td>
                  <td><select className="select" value={labels[key(r)] || r.l} onChange={(e) => setLabels((o) => ({ ...o, [key(r)]: e.target.value }))}>{LABELS.map((l) => <option key={l}>{l}</option>)}</select></td>
                  <td><input className="input" value={notes[key(r)] || ''} onChange={(e) => setNotes((o) => ({ ...o, [key(r)]: e.target.value }))} aria-label="Note" /></td>
                  <td><Button variant="secondary" size="sm" onClick={() => save(r)}>Save</Button></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        ) : <Empty>Every catalogued column has a reviewed label.</Empty>}
        <div style={{ marginTop: 12 }}>
          <Button variant="link" onClick={() => setLogOpen((o) => !o)}>Correction and feedback log ({log.length}; {log.filter((x) => x.from !== x.to).length} corrections)</Button>
          {logOpen && (log.length ? <ul className="gv-lines">{log.map((x, i) => <li key={i}><Mono>{x.col}</Mono> {x.from} → <b>{x.to}</b>{x.note && ` · ${x.note}`} <span className="gv-faint">· {x.at}</span></li>)}</ul> : <Empty>No corrections yet.</Empty>)}
        </div>
      </Card>
      <Card icon={Wrench} tone="ok" title="Improvements learned from corrections" sub="Each proposal fixes columns users corrected that the classifier still gets wrong, with its measured effect. Only a governance lead can apply them.">
        <div className="table-wrap">
          <table className="tbl">
            <thead><tr><th>Proposed rule</th><th>From corrections</th><th className="num">Precision</th><th className="num">Recall</th><th className="num">F1</th><th className="num">FP rate</th><th className="num">FN rate</th><th /></tr></thead>
            <tbody><tr><td colSpan={8}><Empty>No outstanding proposals — correct a classification above to create one.</Empty></td></tr></tbody>
          </table>
        </div>
      </Card>
      <Card icon={Archive} tone="bad" title="Model deprecation — hosted and external AI models" sub="Deprecate a version with a sunset date and a named replacement. On the sunset date the scheduler retires it (SageMaker/MLflow updated for hosted models) and alerts the owners. The full workflow is on the Model governance tab.">
        <div className="table-wrap">
          <table className="tbl">
            <thead><tr><th>Model</th><th>Version</th><th>Stage</th><th>Deprecation notice</th><th /></tr></thead>
            <tbody><tr>
              <td className="gv-strong">Claude Sonnet 5 <span className="gv-faint">external · Anthropic</span></td><td><Mono>vclaude-sonnet-5</Mono></td><td>production</td>
              <td>{notice ? `Sunset ${notice.date} · replaced by ${notice.repl || '—'}` : '—'}</td>
              <td><Button variant="secondary" size="sm" onClick={() => setDep({ date: '', repl: '' })}>Deprecate…</Button></td>
            </tr></tbody>
          </table>
        </div>
      </Card>
      {dep && (
        <Modal title="Deprecate vclaude-sonnet-5" onClose={() => setDep(null)}
          actions={<><Button variant="secondary" size="md" onClick={() => setDep(null)}>Cancel</Button><Button variant="primary" size="md" disabled={!dep.date} onClick={() => { setNotice(dep); setDep(null); toast('Deprecation notice recorded'); }}>Deprecate</Button></>}>
          <p className="gv-muted">The owners are alerted now and again on the sunset date.</p>
          <Fld label="Sunset date" hint="dd/mm/yyyy"><input className="input" placeholder="31/03/2027" value={dep.date} onChange={(e) => setDep((d) => ({ ...d, date: e.target.value }))} /></Fld>
          <Fld label="Replacement"><input className="input" placeholder="e.g. Claude Sonnet 5.1" value={dep.repl} onChange={(e) => setDep((d) => ({ ...d, repl: e.target.value }))} /></Fld>
        </Modal>
      )}
    </>
  );
}

/* One monitored signal on a scale, with its warn and breach zones shaded. */
function Monitor({ label, value, fmt, min = 0, max, warn, breach, breachBelow, note }) {
  const pos = (v) => `${((v - min) / (max - min)) * 100}%`;
  const bad = (breach != null && value >= breach) || (breachBelow != null && value < breachBelow);
  const amber = !bad && warn != null && value >= warn;
  const st = bad ? 'bad' : amber ? 'warn' : 'ok';
  return (
    <div className="gv-monitor">
      <div className="gv-inline" style={{ justifyContent: 'space-between', alignItems: 'baseline' }}><span className="gv-strong" style={{ fontSize: 13 }}>{label}</span><span className={`gv-badge ${st}`}><i />{st === 'ok' ? 'ok' : st === 'warn' ? 'warning' : 'breach'}</span></div>
      <b>{fmt(value)}</b>
      <div className="gv-scale">
        {warn != null && <span className="z warn" style={{ left: pos(warn), width: `calc(${pos(breach)} - ${pos(warn)})` }} />}
        {breach != null && <span className="z bad" style={{ left: pos(breach), right: 0 }} />}
        {breachBelow != null && <span className="z bad" style={{ left: 0, width: pos(breachBelow) }} />}
        <span className="mk" style={{ left: pos(value) }} />
      </div>
      <small>{note}</small>
    </div>
  );
}

/* Classifier quality by run — drawn at the card's real width, so nothing is stretched. */
function DriftChart() {
  const [ref, w] = useWidth();
  const H = 180, pl = 40, pr = 16, pt = 12, pb = 28;
  const runs = EVAL_RUNS.map((r) => ({ label: r[0], p: parseFloat(r[4]) / 100, r: parseFloat(r[5]) / 100, f: parseFloat(r[6]) / 100 }));
  const series = [['p', 'Precision', 'var(--gv-violet)'], ['r', 'Recall', 'var(--gv-teal)'], ['f', 'F1', 'var(--royal)']];
  const x = (i) => (runs.length === 1 ? pl + (w - pl - pr) / 2 : pl + (i / (runs.length - 1)) * (w - pl - pr));
  const y = (v) => pt + (1 - v) * (H - pt - pb);
  /* spread the end labels so close values never overlap */
  const last = runs[runs.length - 1];
  const labelY = {};
  [...series].sort((a, b) => y(last[a[0]]) - y(last[b[0]])).forEach(([k], i, arr) => {
    const want = y(last[k]); const prev = i ? labelY[arr[i - 1][0]] : -Infinity;
    labelY[k] = Math.max(want, prev + 16);
  });
  const mid = (Object.values(labelY).reduce((a, b) => a + b, 0) / 3) - (series.reduce((a, [k]) => a + y(last[k]), 0) / 3);
  Object.keys(labelY).forEach((k) => { labelY[k] -= mid; });
  return (
    <div className="gv-chart" ref={ref}>
      <div className="gv-legend2">{series.map(([k, l, c]) => <span key={k}><i style={{ background: c }} />{l}</span>)}<span><i className="dash" style={{ color: 'var(--gv-bad)' }} />F1 alert line (previous run − 0.05)</span></div>
      {w > 0 && (
        <svg width={w} height={H} role="img" aria-label="Classifier precision, recall and F1 by run">
          {[0, 0.25, 0.5, 0.75, 1].map((v) => <g key={v}><line x1={pl} x2={w - pr} y1={y(v)} y2={y(v)} stroke="var(--line)" strokeDasharray={v === 0 ? '' : '2 4'} /><text x={pl - 8} y={y(v) + 4} textAnchor="end" fontSize="11" fill="var(--faint)">{Math.round(v * 100)}%</text></g>)}
          <line x1={pl} x2={w - pr} y1={y(0.439 - 0.05)} y2={y(0.439 - 0.05)} stroke="var(--gv-bad)" strokeDasharray="5 4" strokeWidth="1.2" />
          {series.map(([k, l, c]) => (
            <g key={k}>
              {runs.length > 1 && <path d={runs.map((r, i) => `${i ? 'L' : 'M'}${x(i)},${y(r[k])}`).join('')} fill="none" stroke={c} strokeWidth="2" />}
              {runs.map((r, i) => <g key={i}><circle cx={x(i)} cy={y(r[k])} r="5" fill="var(--white)" stroke={c} strokeWidth="2.5"><title>{`${r.label} · ${l} ${(r[k] * 100).toFixed(1)}%`}</title></circle>
                {i === runs.length - 1 && <><line x1={x(i) + 7} y1={y(r[k])} x2={x(i) + 26} y2={labelY[k]} stroke={c} strokeWidth="1" /><text x={x(i) + 30} y={labelY[k] + 4} fontSize="12" fill={c} fontWeight="600">{l} {(r[k] * 100).toFixed(1)}%</text></>}</g>)}
            </g>
          ))}
          {runs.map((r, i) => <text key={i} x={x(i)} y={H - 8} textAnchor="middle" fontSize="11" fill="var(--muted)">{r.label}</text>)}
        </svg>
      )}
      <Note>Only one run so far — the trend fills in as harvests change the estate, labels or rules.</Note>
    </div>
  );
}
