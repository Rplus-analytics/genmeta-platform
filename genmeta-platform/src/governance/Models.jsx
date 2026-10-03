import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, Navigate } from 'react-router-dom';
import {
  Search, X, ChevronDown, ChevronUp, ChevronsUpDown, ArrowUpDown, Sparkles, Boxes, ShieldAlert, Workflow as WorkflowIcon, UserRound, Activity, Building2,
  ArrowLeft, RefreshCw, MessagesSquare, Plus, Shield, GitBranch, Network, History, Database, Table2, Wrench, FlaskConical, Rocket, Cpu, Send,
  MonitorSmartphone, FileOutput, ChevronRight, Check, CheckCircle2, Mail, Bell, BarChart3, SlidersHorizontal, AlertTriangle,
} from 'lucide-react';
import { Section as RailSection } from '../components/Rail.jsx';
import { Button, Segmented } from '../components/ui.jsx';
import { MODELS, MODEL_ALERTS, MODEL_MONITORING, ALERT_RECIPIENTS, RISK_TIERS, DISCOVERY, BASE } from './data.js';
import { Card, StatusBadge, Empty, Note, Mono, Fld, Drawer, Collapse, toast } from './kit.jsx';

/* Govern › Governance › AI model governance.
   Built like the Data catalogue: KPIs, an "ask in plain English" box, one line per model, and the
   filters in the inner menu. Opening a model shows its page (like an asset page) with three tabs:
   Overview (versions, lineage, workflow, history), Monitoring & guardrails, and Alerts. */

export const MODELS_BASE = `${BASE}/models`;
const riskTone = (r) => (r === 'High risk' ? 'bad' : r === 'Low risk' ? 'ok' : 'warn');
const stageTone = (s) => (s === 'In production' ? 'ok' : s === 'Retired' || s === 'Rejected' ? 'bad' : s === 'Deprecated' ? 'warn' : 'info');
const latest = (m) => m.versionRows[m.versionRows.length - 1];
const regIni = (m) => (m.foundIn.includes('MLflow') ? 'ML' : m.foundIn.includes('SageMaker') ? 'SM' : (m.provider || 'EX').slice(0, 2).toUpperCase());
const openAlerts = (id) => MODEL_ALERTS.filter((a) => a.model === id && a.state === 'open').length;

/* ---------------------------------------------------------------- filter state (shared by menu + list) */
const FACETS = [
  { key: 'registry', label: 'Registry', icon: Database, drop: true, all: 'All registries', of: (m) => m.foundIn },
  { key: 'provider', label: 'Provider', icon: Building2, drop: true, all: 'All providers', of: (m) => [m.hosted ? 'Hosted in-house' : m.provider || '—'] },
  { key: 'risk', label: 'Risk tier', icon: ShieldAlert, of: (m) => [m.risk] },
  { key: 'stage', label: 'Stage', icon: WorkflowIcon, of: (m) => [m.stage] },
  { key: 'owner', label: 'Owner', icon: UserRound, of: (m) => [m.owner || 'No owner yet'] },
  { key: 'monitoring', label: 'Monitoring', icon: Activity, of: (m) => [m.monitoring] },
];
const FACET_LABEL = Object.fromEntries(FACETS.map((f) => [f.key, f.label]));
const EXAMPLES = ['high risk models', 'models in production', 'models with open alerts', 'external models from OpenAI', 'retired models'];
const SORTS = { relevance: 'Relevance', name: 'Name (A–Z)', alerts: 'Open alerts', risk: 'Risk tier' };
const RISK_ORDER = { 'High risk': 0, 'Medium risk': 1, 'Low risk': 2 };
const SAVED = { sel: {}, words: [], asked: '', q: '', sort: 'relevance' };

const matches = (m, sel) => Object.entries(sel).every(([k, vs]) => !vs.length || FACETS.find((f) => f.key === k).of(m).some((v) => vs.includes(v)));
const text = (m) => [m.name, m.provider, m.purpose, m.owner, m.risk, m.stage, m.monitoring, m.usedBy, ...m.foundIn, ...m.versionRows.map((v) => v.v)].join(' ').toLowerCase();
/* turn a plain-English question into filters plus leftover words */
function parse(q) {
  const t = q.toLowerCase();
  const sel = {};
  const add = (k, v) => { sel[k] = [...(sel[k] || []), v]; };
  if (/high risk/.test(t)) add('risk', 'High risk');
  if (/medium risk/.test(t)) add('risk', 'Medium risk');
  if (/low risk/.test(t)) add('risk', 'Low risk');
  if (/production/.test(t)) add('stage', 'In production');
  if (/retired/.test(t)) add('stage', 'Retired');
  if (/rejected/.test(t)) add('stage', 'Rejected');
  if (/external/.test(t)) add('registry', 'External');
  if (/mlflow/.test(t)) add('registry', 'MLflow');
  if (/sagemaker|hosted/.test(t)) add('registry', 'SageMaker');
  if (/breach/.test(t)) add('monitoring', 'breach');
  ['OpenAI', 'Anthropic', 'Google'].forEach((p) => { if (t.includes(p.toLowerCase())) add('provider', p); });
  const alerts = /alert/.test(t);
  const stop = /^(high|medium|low|risk|models?|in|production|retired|rejected|external|from|with|open|alerts?|the|show|me|all|mlflow|sagemaker|hosted|breach|openai|anthropic|google|and|of)$/;
  const words = t.split(/\s+/).filter((w) => w && !stop.test(w));
  return { sel, words, alerts };
}

export function useModelFilters() {
  const [sel, setSel] = useState(SAVED.sel);
  const [words, setWords] = useState(SAVED.words);
  const [asked, setAsked] = useState(SAVED.asked);
  const [q, setQ] = useState(SAVED.q);
  const [sort, setSort] = useState(SAVED.sort);
  const [alertsOnly, setAlertsOnly] = useState(false);
  Object.assign(SAVED, { sel, words, asked, q, sort });
  const toggle = (k, v) => setSel((s) => { const cur = s[k] || []; return { ...s, [k]: cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v] }; });
  const setDrop = (k, v) => setSel((s) => ({ ...s, [k]: v ? [v] : [] }));
  const ask = (t) => {
    const s = t.trim();
    if (!s) { setWords([]); setAsked(''); setAlertsOnly(false); return; }
    const p = parse(s);
    setQ(s); setAsked(s); setSel(p.sel); setWords(p.words); setAlertsOnly(p.alerts);
  };
  const clearAll = () => { setSel({}); setWords([]); setAsked(''); setQ(''); setAlertsOnly(false); };
  const results = useMemo(() => {
    const r = MODELS.filter((m) => matches(m, sel) && words.every((w) => text(m).includes(w)) && (!alertsOnly || openAlerts(m.id) > 0));
    if (sort === 'name') r.sort((a, b) => a.name.localeCompare(b.name));
    if (sort === 'alerts') r.sort((a, b) => openAlerts(b.id) - openAlerts(a.id));
    if (sort === 'risk') r.sort((a, b) => RISK_ORDER[a.risk] - RISK_ORDER[b.risk]);
    return r;
  }, [sel, words, sort, alertsOnly]);
  /* counts for each option, given every other filter */
  const counts = useMemo(() => Object.fromEntries(FACETS.map((f) => {
    const others = { ...sel, [f.key]: [] };
    const base = MODELS.filter((m) => matches(m, others) && words.every((w) => text(m).includes(w)));
    const vals = [...new Set(MODELS.flatMap(f.of))];
    return [f.key, vals.map((v) => ({ v, n: base.filter((m) => f.of(m).includes(v)).length }))];
  })), [sel, words]);
  const active = Object.entries(sel).flatMap(([k, vs]) => vs.map((v) => [k, v]));
  const nActive = active.length + (words.length ? 1 : 0) + (alertsOnly ? 1 : 0);
  return { sel, words, setWords, asked, q, setQ, sort, setSort, toggle, setDrop, ask, clearAll, results, counts, active, nActive, alertsOnly, setAlertsOnly };
}

/* ---------------------------------------------------------------- inner-menu filters (same look as the catalogue) */
function Drop({ f, opts, value, onChange }) {
  const I = f.icon;
  return (
    <label className={`fdrop ${value ? 'set' : ''}`}>
      <I size={15} strokeWidth={1.75} />
      <select value={value || ''} onChange={(e) => onChange(e.target.value || null)} aria-label={f.label}>
        <option value="">{f.all}</option>
        {opts.filter((o) => o.n > 0 || o.v === value).map(({ v, n }) => <option key={v} value={v}>{v} ({n})</option>)}
      </select>
      <ChevronsUpDown size={14} className="fdrop-c" />
    </label>
  );
}
function FacetGroup({ f, opts, sel, toggle }) {
  const I = f.icon;
  const [open, setOpen] = useState(sel.length > 0 || f.key === 'risk');
  return (
    <section className="fgroup">
      <button className={`admin-link fgroup-h ${open ? 'on' : ''}`} onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <I size={16} strokeWidth={1.6} /><span>{f.label}</span>{sel.length > 0 && <em>{sel.length}</em>}{open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>
      {open && (
        <div className="fgroup-b"><div className="fopts">
          {opts.map(({ v, n }) => (
            <label key={v} className={`fopt ${n === 0 && !sel.includes(v) ? 'zero' : ''}`}>
              <input type="checkbox" checked={sel.includes(v)} onChange={() => toggle(f.key, v)} />
              <span className="fopt-l" title={v}>{v}</span><span className="fopt-n">{n}</span>
            </label>
          ))}
        </div></div>
      )}
    </section>
  );
}
export function ModelFiltersPanel({ state }) {
  const { sel, toggle, setDrop, counts, clearAll, nActive } = state;
  return (
    <div className="cat-filters">
      <div className="inner-sep" />
      <div className="cat-filters-h">
        <span className="admin-nav-sec">Filters</span>
        {nActive > 0 && <button className="btn link cat-clear" onClick={clearAll}>Clear ({nActive})</button>}
      </div>
      <RailSection label="Source" defaultOpen>
        <div className="fsource">
          {FACETS.filter((f) => f.drop).map((f) => <Drop key={f.key} f={f} opts={counts[f.key]} value={sel[f.key]?.[0]} onChange={(v) => setDrop(f.key, v)} />)}
        </div>
      </RailSection>
      {FACETS.filter((f) => !f.drop).map((f) => <FacetGroup key={f.key} f={f} opts={counts[f.key]} sel={sel[f.key] || []} toggle={toggle} />)}
    </div>
  );
}

/* ---------------------------------------------------------------- the list (catalogue look) */
function ModelRow({ m, onOpen }) {
  const v = latest(m);
  const n = openAlerts(m.id);
  const f1 = Number(v.f1);
  return (
    <article className="arow gv-mrow" onClick={onOpen} onKeyDown={(e) => e.key === 'Enter' && onOpen()} tabIndex={0} role="link" aria-label={`Open ${m.name}`}>
      <div className="arow-main">
        <div className="arow-t">
          <span className={`srcmark gv-reg-${m.hosted ? 'hosted' : 'ext'}`} style={{ '--s': '20px' }} title={m.foundIn.join(', ')}>{regIni(m)}</span>
          <b>{m.name}</b>
          <StatusBadge s={stageTone(m.stage)}>{m.stage}</StatusBadge>
          {m.monitoring === 'breach' && <span className="gv-badge bad"><i />monitoring breach</span>}
        </div>
        <div className="arow-path">
          <span><Cpu size={13} strokeWidth={1.75} />{m.hosted ? 'Hosted model' : 'External AI model'}</span>
          <span className="sep">·</span><span>{m.foundIn.join(' + ')}</span>
          {m.provider && <><span className="sep">›</span><span>{m.provider}</span></>}
          <span className="sep">·</span><span className="mono">{v.v}</span>
        </div>
        <p className="arow-d">{m.purpose}</p>
        <div className="arow-meta">
          <span>{m.versions} {m.versions === 1 ? 'version' : 'versions'}</span>
          <span>Owner <b>{m.owner || '—'}</b></span>
          <span>Used by <b>{m.usedBy}</b></span>
          <span>Next review <b>{v.review}</b></span>
          {m.foundIn.map((r) => <span key={r} className="term">{r}</span>)}
        </div>
      </div>
      <div className="arow-side">
        <span className={`gv-riskband ${riskTone(m.risk)}`}>{m.risk}</span>
        <span className="trust"><i style={{ width: Number.isFinite(f1) ? `${Math.round(f1 * 100)}%` : '0%' }} /></span>
        <small>{Number.isFinite(f1) ? `F1 (HIGH) ${v.f1}` : 'No metrics — external'}</small>
        <small className={n ? 'gv-bad-t' : ''}>{n ? `${n} open alert${n > 1 ? 's' : ''}` : 'No open alerts'}</small>
      </div>
    </article>
  );
}

export function ModelCatalogue({ state }) {
  const nav = useNavigate();
  const { words, setWords, asked, q, setQ, sort, setSort, toggle, ask, clearAll, results, active, alertsOnly, setAlertsOnly } = state;
  const [drawer, setDrawer] = useState(null);
  const nVer = results.reduce((t, m) => t + m.versions, 0);
  const ids = results.map((m) => m.id);
  const al = MODEL_ALERTS.filter((a) => ids.includes(a.model));
  const tiles = [
    { k: 'Models governed', v: results.length, s: `${results.filter((m) => m.hosted).length} hosted · ${results.filter((m) => !m.hosted).length} external` },
    { k: 'Model versions', v: nVer, s: 'across all registries' },
    { k: 'In production', v: results.filter((m) => m.stage === 'In production').length, s: `${results.filter((m) => ['Validation', 'Approval'].includes(m.stage)).length} in validation or approval` },
    { k: 'High risk', v: results.filter((m) => m.risk === 'High risk').length, s: `${results.filter((m) => m.risk === 'Medium risk').length} medium · ${results.filter((m) => m.risk === 'Low risk').length} low` },
    { k: 'Open alerts', v: al.filter((a) => a.state === 'open').length, s: `${al.filter((a) => a.sev === 'breach').length} breach · ${al.filter((a) => a.state === 'ack').length} acknowledged` },
  ];
  return (
    <div className="cat gv fade-in">
      <div className="tiles-sm">
        {tiles.map((t) => <div key={t.k}><b>{t.v}</b><span>{t.k}</span><small>{t.s}</small></div>)}
      </div>

      <form className="askbox" onSubmit={(e) => { e.preventDefault(); ask(q); }}>
        <Sparkles size={16} strokeWidth={1.75} />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder='Ask in plain English, e.g. "high risk models in production"' aria-label="Ask in plain English" />
        {q && <button type="button" className="icon-btn" onClick={clearAll} aria-label="Clear"><X size={15} /></button>}
        <button type="submit" className="btn primary">Search</button>
      </form>
      <div className="examples">
        {EXAMPLES.map((e) => <button key={e} onClick={() => ask(e)} className={asked === e ? 'on' : ''}>{e}</button>)}
      </div>

      <div className="gv-discline">
        <span className="gv-muted">Discovered from</span>
        {DISCOVERY.map(([k, v]) => <span key={k} className="gv-disc ok">{k}: {v}</span>)}
        <span style={{ flex: 1 }} />
        <Button variant="link" icon={Shield} onClick={() => setDrawer('tiers')}>Risk tiers & review policy</Button>
        <Button variant="secondary" size="sm" icon={Plus} onClick={() => setDrawer('register')}>Register external model</Button>
      </div>

      <section className="results">
        <div className="results-h">
          <div className="applied">
            {asked && <span className="asked">Results for “{asked}”</span>}
            {active.map(([k, v]) => (
              <button key={k + v} className="achip" onClick={() => toggle(k, v)} aria-label={`Remove ${FACET_LABEL[k]} ${v}`}><span>{FACET_LABEL[k]}:</span> {v}<X size={12} /></button>
            ))}
            {alertsOnly && <button className="achip" onClick={() => setAlertsOnly(false)}><span>Alerts:</span> open<X size={12} /></button>}
            {words.length > 0 && <button className="achip" onClick={() => setWords([])}><span>Text:</span> {words.join(' ')}<X size={12} /></button>}
            {!asked && !active.length && !alertsOnly && <span className="asked">Showing all models</span>}
          </div>
          <span className="showing">Showing <b>{results.length}</b> of {MODELS.length}</span>
          <label className="sort"><ArrowUpDown size={14} />
            <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort">
              {Object.entries(SORTS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select>
          </label>
        </div>
        {results.length === 0 ? (
          <div className="empty card">
            <Search size={20} /><b>No models match</b>
            <p>Remove a filter or rephrase the question. Try a risk tier, a stage such as “in production”, or a provider.</p>
            <button className="btn ghost" onClick={clearAll}>Clear all filters</button>
          </div>
        ) : (
          <div className="arows">{results.map((m) => <ModelRow key={m.id} m={m} onOpen={() => nav(`${MODELS_BASE}/${m.id}`)} />)}</div>
        )}
      </section>

      {drawer === 'tiers' && <TiersDrawer onClose={() => setDrawer(null)} />}
      {drawer === 'register' && <RegisterDrawer onClose={() => setDrawer(null)} />}
    </div>
  );
}

function TiersDrawer({ onClose }) {
  return (
    <Drawer title="Risk tiers and review policy" onClose={onClose}>
      <p className="gv-muted" style={{ marginTop: 0 }}>The tier sets how often a model is reviewed and how many people must approve it.</p>
      <div className="table-wrap">
        <table className="tbl">
          <thead><tr><th>Risk tier</th><th>Applies to</th><th className="num">Review every</th><th className="num">Approvers</th></tr></thead>
          <tbody>{RISK_TIERS.map(([n, d, days, ap]) => <tr key={n}><td><StatusBadge s={riskTone(n)}>{n}</StatusBadge></td><td>{d}</td><td className="num">{days} days</td><td className="num">{ap}</td></tr>)}</tbody>
        </table>
      </div>
    </Drawer>
  );
}
function RegisterDrawer({ onClose }) {
  const blank = { name: '', provider: '', version: '', purpose: '', usedBy: '', shared: '', hosting: '', risk: 'Medium risk' };
  const [f, setF] = useState(blank);
  const set = (k) => (e) => setF((o) => ({ ...o, [k]: e.target.value }));
  return (
    <Drawer title="Register an externally provided AI model" onClose={onClose}
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button variant="primary" disabled={!f.name.trim() || !f.provider.trim()} onClick={() => { toast(`Registered ${f.name} — awaiting validation`); onClose(); }}>Register model</Button></>}>
      <p className="gv-muted" style={{ marginTop: 0 }}>Third-party models the organisation calls rather than hosts — governed through the same workflow.</p>
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
    </Drawer>
  );
}

/* ---------------------------------------------------------------- the model page (asset-page look) */
const TABS = [['overview', 'Overview'], ['monitoring', 'Monitoring & guardrails'], ['alerts', 'Alerts']];

export function ModelPage() {
  const { modelId } = useParams();
  const nav = useNavigate();
  const [models, setModels] = useState(MODELS);
  const m = models.find((x) => x.id === modelId);
  const [tab, setTab] = useState('overview');
  const [verId, setVerId] = useState(null);
  useEffect(() => { setTab('overview'); setVerId(null); }, [modelId]);
  if (!m) return <Navigate to={MODELS_BASE} replace />;
  const ver = m.versionRows.find((r) => r.v === verId) || latest(m);
  const nAlerts = MODEL_ALERTS.filter((a) => a.model === m.id).length;
  const patch = (p) => setModels((all) => all.map((x) => (x.id === m.id ? { ...x, ...p } : x)));
  return (
    <div className="page asset gv fade-in" key={m.id}>
      <div className="asset-head">
        <button className="icon-btn back" onClick={() => nav(MODELS_BASE)} aria-label="Back to AI models"><ArrowLeft size={17} /></button>
        <div className="asset-title">
          <div className="at-row">
            <h1>{m.name}</h1>
            <StatusBadge s={stageTone(m.stage)}>{m.stage}</StatusBadge>
            <span className={`gv-riskband ${riskTone(m.risk)}`}>{m.risk}</span>
          </div>
          <div className="at-path">
            <span><Cpu size={13} strokeWidth={1.75} />{m.hosted ? 'Hosted model' : 'External AI model'}</span>
            <span className="sep">·</span><span>{m.foundIn.join(' + ')}</span>
            {m.provider && <><span className="sep">›</span><span>{m.provider}</span></>}
            <span className="sep">·</span><span className="mono">{m.versions} version{m.versions > 1 ? 's' : ''}</span>
          </div>
        </div>
        <div className="head-actions">
          {m.hosted && <button className="btn ghost" onClick={() => toast(`Monitoring run started for ${m.name}`)}><RefreshCw size={14} />Run monitoring now</button>}
          <button className="btn primary" onClick={() => nav('/app/ask')}><MessagesSquare size={14} />Ask about this model</button>
        </div>
      </div>

      <nav className="asset-tabs" role="tablist">
        {TABS.map(([k, l]) => (
          <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>
            {l}{k === 'alerts' && nAlerts > 0 && <em>{nAlerts}</em>}
          </button>
        ))}
      </nav>

      {tab === 'overview' && <Overview m={m} ver={ver} onVersion={setVerId} onChange={patch} />}
      {tab === 'monitoring' && <Monitoring m={m} />}
      {tab === 'alerts' && <Alerts m={m} />}
    </div>
  );
}

const LINEAGE_LOOK = {
  'Source data': [Database, 'info'], 'Training data': [Table2, 'teal'], 'Feature engineering': [Wrench, 'violet'], 'Model development': [FlaskConical, 'warn'],
  'Model version': [GitBranch, 'info'], Deployment: [Rocket, 'ok'], Inference: [Activity, 'teal'],
  Consumer: [MonitorSmartphone, 'info'], 'Data sent': [Send, 'warn'], 'External model': [Cpu, 'violet'], Output: [FileOutput, 'ok'],
};
const BASE_STEPS = ['Registered', 'Validation', 'Approval', 'In production'];

function Overview({ m, ver, onVersion, onChange }) {
  const [checks, setChecks] = useState({});
  const [note, setNote] = useState('');
  const [scope, setScope] = useState('version');
  const steps = [...BASE_STEPS, ...ver.path.filter((p) => !BASE_STEPS.includes(p))];
  const live = ver.stage === 'In production';
  const allHist = m.versionRows.flatMap((r) => r.history.map((h) => ({ ...h, v: r.v })));
  const hist = scope === 'version' ? ver.history.map((h) => ({ ...h, v: ver.v })) : allHist;
  return (
    <>
      <div className="card pad-lg gv-msum">
        <div className="gv-msum-l">
          <h3 className="sec-h">Model summary</h3>
          <div className="sum-figs">
            <div><span>Versions</span><b>{m.versions}</b></div>
            <div><span>Latest stage</span><b><StatusBadge s={stageTone(m.stage)}>{m.stage}</StatusBadge></b></div>
            <div><span>Registries</span><b>{m.foundIn.join(' · ')}</b></div>
            <div><span>Next review</span><b>{latest(m).review}</b></div>
          </div>
          <div className="sum-desc"><span>Purpose</span><p>{m.purpose}</p></div>
          <div className="sum-desc"><span>Used by</span><p>{m.usedBy}</p></div>
        </div>
        <div className="gv-msum-r">
          <Fld label="Risk tier"><select className="select" value={m.risk} onChange={(e) => onChange({ risk: e.target.value })}>{RISK_TIERS.map(([r]) => <option key={r}>{r}</option>)}</select></Fld>
          <Fld label="Owner"><input className="input" value={m.owner} placeholder="Accountable owner" onChange={(e) => onChange({ owner: e.target.value })} /></Fld>
          <Fld label="Version shown below"><select className="select" value={ver.v} onChange={(e) => onVersion(e.target.value)}>{m.versionRows.map((r) => <option key={r.v} value={r.v}>{r.v} · {r.stage}</option>)}</select></Fld>
        </div>
      </div>

      <Collapse icon={GitBranch} tone="info" title="Versions" meta={`${m.versionRows.length} version${m.versionRows.length > 1 ? 's' : ''} · choose one to see its lineage, workflow and history`}>
        <div className="table-wrap">
          <table className="tbl">
            <thead><tr><th>Version</th><th>Registries</th><th className="num">Accuracy</th><th className="num">ROC AUC</th><th className="num">F1 (HIGH)</th><th>Stage</th><th>Next review</th></tr></thead>
            <tbody>{m.versionRows.map((r) => (
              <tr key={r.v} className={`click ${r.v === ver.v ? 'on' : ''}`} onClick={() => onVersion(r.v)}>
                <td><span className="gv-ver">{r.v === ver.v && <i />}<b>{r.v}</b></span></td>
                <td><div className="gv-inline" style={{ gap: 4 }}>{r.reg.map((g) => <span key={g} className={`tag ${/Rejected/.test(g) ? 'gv-tag-bad' : /@production/.test(g) ? 'gv-tag-ok' : ''}`}>{g}</span>)}</div></td>
                <td className="num">{r.acc}</td><td className="num">{r.auc}</td><td className="num">{r.f1}</td>
                <td><StatusBadge s={stageTone(r.stage)}>{r.stage}</StatusBadge></td><td>{r.review}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </Collapse>

      <Collapse icon={Network} tone="teal" title={`Lineage — ${ver.v}`} meta={`${ver.lineage.length} stages · ${ver.lineage[0].stage.toLowerCase()} to ${ver.lineage[ver.lineage.length - 1].stage.toLowerCase()}`}>
        <div className="gv-lin">
          {ver.lineage.map((col, i) => {
            const [I, tn] = LINEAGE_LOOK[col.stage] || [Cpu, 'info'];
            return (
              <div key={col.stage} className={`gv-lin-col ${tn}`}>
                <div className="gv-lin-h"><I size={13} />{col.stage}</div>
                {col.items.map((it) => (
                  <div key={it.b} className={`gv-lin-box ${it.muted ? 'muted' : ''}`} title={it.s || ''}>
                    <b>{it.b}</b>{it.s && <small>{it.s}</small>}{it.ok && <em><CheckCircle2 size={11} /> in Data Catalogue</em>}
                  </div>
                ))}
                {i < ver.lineage.length - 1 && <ChevronRight className="gv-lin-arrow" size={16} />}
              </div>
            );
          })}
        </div>
      </Collapse>

      <Collapse icon={WorkflowIcon} tone="violet" title={`Governance workflow — ${ver.v}`} meta={<StatusBadge s={riskTone(m.risk)}>{m.risk}</StatusBadge>}>
        <div className="gv-wf">
          {steps.map((s, i) => {
            const passed = ver.path.includes(s);
            const cur = s === ver.stage;
            return (
              <span key={s} className={`gv-wf-step ${cur ? `cur ${stageTone(s)}` : passed ? 'done' : 'todo'}`}>
                {passed && !cur && <Check size={12} />}{s}{i < steps.length - 1 && <i />}
              </span>
            );
          })}
        </div>
        <Note>{ver.note}</Note>
        {live && (
          <>
            <div className="gv-subhead">Periodic review <span className="gv-faint">· {m.checks.filter((c) => checks[c]).length} of {m.checks.length} confirmed</span></div>
            <div className="gv-checks">
              {m.checks.map((c) => <label key={c}><input type="checkbox" checked={!!checks[c]} onChange={(e) => setChecks((o) => ({ ...o, [c]: e.target.checked }))} />{c}</label>)}
            </div>
          </>
        )}
        <div className="gv-inline" style={{ alignItems: 'center', marginTop: 10 }}>
          <input className="input" style={{ flex: 1, minWidth: 260, height: 32 }} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Reason or note (recorded in the audit log)" />
          {live && <Button variant="primary" size="md" disabled={!m.checks.every((c) => checks[c])} onClick={() => { toast('Periodic review completed — next review in 180 days'); setChecks({}); setNote(''); }}>Complete periodic review</Button>}
          {live && <Button variant="secondary" size="md" onClick={() => toast(`${m.name} ${ver.v} deprecated`)}>Deprecate</Button>}
          {live && <Button variant="secondary" size="md" onClick={() => toast(`${m.name} ${ver.v} retired`)}>Retire</Button>}
        </div>
      </Collapse>

      <Collapse icon={History} tone="teal" title={`History (${hist.length})`} meta={scope === 'version' ? `for ${ver.v}` : 'across all versions'}
        actions={m.versionRows.length > 1 && <Segmented size="sm" value={scope} onChange={setScope} options={[{ value: 'version', label: `This version (${ver.v})` }, { value: 'all', label: `All versions (${allHist.length})` }]} />}>
        <ol className="gv-tl">{hist.map((h, i) => (
          <li key={i} className={/fail|Rejected|Retired/i.test(h.what) ? 'bad' : /Completed|Approved|→ In production|→ Approval/.test(h.what) ? 'ok' : /Reopened|Deprecated/.test(h.what) ? 'warn' : ''}>
            <time>{h.at}</time>
            <div><b>{h.who}</b> {h.what}{scope === 'all' && <span className="tag" style={{ marginLeft: 8 }}>{h.v}</span>}</div>
          </li>
        ))}</ol>
      </Collapse>
    </>
  );
}

/* ---------------------------------------------------------------- Monitoring & guardrails tab */
function Monitoring({ m }) {
  const mon = MODEL_MONITORING[m.id];
  const [g, setG] = useState(() => mon?.guardrails.map((r) => [...r]) || []);
  const [onBreach, setOnBreach] = useState(mon?.onBreach || 'alert_and_hold');
  const [email, setEmail] = useState(mon?.email || 'warn');
  const [conf, setConf] = useState(mon?.confidence || '0.05');
  const [minGroup, setMinGroup] = useState(mon?.minGroup || 100);
  if (!mon) {
    return (
      <Card icon={Activity} tone="teal" title="Monitoring & guardrails" sub="Drift and bias checks run on hosted models after every scoring batch.">
        <div className="gv-callout info"><AlertTriangle size={15} /><span>{m.name} is an external service, so GenMeta cannot see its inputs or predictions. It is governed through the workflow, the data it is sent and the periodic review instead — see Overview.</span></div>
      </Card>
    );
  }
  const latestB = mon.batches[mon.batches.length - 1];
  const breaches = mon.batches.filter((b) => b[11] === 'breach').length;
  return (
    <>
      <div className="tiles-sm gv-tiles5">
        <div><b>{mon.deployed}</b><span>Deployed version</span><small>baseline {mon.baseline} rows</small></div>
        <div><b>{mon.batches.length}</b><span>Scoring batches</span><small>{mon.batches.reduce((t, b) => t + b[1], 0).toLocaleString('en-GB')} rows scored</small></div>
        <div className={breaches ? 'gv-tile-bad' : ''}><b>{breaches}</b><span>Batches in breach</span><small>latest {latestB[0]}</small></div>
        <div><b>{Math.max(...mon.batches.map((b) => b[2])).toFixed(3)}</b><span>Worst data drift</span><small>feature PSI · breach at 0.25</small></div>
        <div><b>{Math.min(...mon.batches.map((b) => b[6])).toFixed(2)}</b><span>Lowest disparate impact</span><small>breach below 0.8</small></div>
      </div>
      <Card icon={BarChart3} tone="info" title="Drift and bias by scoring batch" sub={`Deployed version ${mon.deployed} · baseline ${mon.baseline} rows · ${mon.batches.length} scoring batch(es)`}>
        <div className="table-wrap">
          <table className="tbl">
            <thead><tr><th>Batch</th><th className="num">Rows</th><th>Data drift (max PSI)</th><th>Model drift (prediction PSI)</th><th>Predicted HIGH</th><th>Disparate impact</th><th>Equal opportunity gap</th><th>Status</th></tr></thead>
            <tbody>{mon.batches.map(([d, rows, psi, feat, ppsi, high, di, diLow, diP, eog, eogTxt, st]) => (
              <tr key={d} className={st === 'breach' ? 'gv-row-bad' : ''}>
                <td className="gv-strong">{d}</td><td className="num">{rows.toLocaleString('en-GB')}</td>
                <td className={psi >= 0.25 ? 'hot' : ''}><b>{psi.toFixed(3)}</b> <span className="gv-faint">{feat}</span></td>
                <td className={ppsi >= 0.2 ? 'hot' : ''}>{ppsi.toFixed(3)}</td>
                <td className={Math.abs(high - mon.trainingHigh) >= 20 ? 'hot' : ''}>{high}% <span className="gv-faint">(training {mon.trainingHigh}%)</span></td>
                <td className={di < 0.8 ? 'hot' : ''}>{di.toFixed(2)} <span className="gv-faint">lowest {diLow} · p {diP}</span></td>
                <td>{eog != null ? <>{eog}% <span className="gv-faint">lowest {eogTxt}</span></> : '—'}</td>
                <td><StatusBadge s={st === 'breach' ? 'bad' : 'ok'}>{st}</StatusBadge></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
        <Note>PSI compares each batch with the training data; above 0.25 is a breach. Bias checks use a chi-square test across all nation groups, so chance variation is not reported as bias.</Note>
      </Card>
      <div className="gv-two">
        <Card icon={BarChart3} tone="violet" title="Predicted HIGH by nation" sub={`Latest batch (${latestB[0]}) · training share ${mon.trainingHigh}%`}>
          <div className="gv-nation">
            {mon.byNation.map(([n, p]) => (
              <div key={n}><span>{n}</span><div className="gv-bar"><i className={p === 0 ? 'bad' : ''} style={{ width: `${Math.max(p, 1) * 2}%` }} /><s style={{ left: `${mon.trainingHigh * 2}%` }} /></div><b className={p === 0 ? 'gv-bad-t' : ''}>{p}%</b></div>
            ))}
          </div>
          <Note>The tick marks the training share ({mon.trainingHigh}%). France receives no HIGH predictions in the latest batch — raised as a bias breach in Alerts.</Note>
        </Card>
        <Card icon={SlidersHorizontal} tone="warn" title="Guardrails" sub="Thresholds checked on every scoring batch."
          actions={<Button variant="primary" size="sm" onClick={() => toast('Guardrails saved')}>Save guardrails</Button>}>
          <div className="table-wrap">
            <table className="tbl gv-guard">
              <thead><tr><th>Guardrail</th><th className="num">Warn at</th><th className="num">Breach at</th></tr></thead>
              <tbody>{g.map((r, i) => (
                <tr key={r[0]}>
                  <td>{r[0]}<span className="gv-faint"> · {r[3] === 'below' ? 'lower is worse' : 'higher is worse'}</span></td>
                  {[1, 2].map((j) => <td key={j} className="num"><input className={`input gv-num ${j === 2 ? 'b' : 'w'}`} type="number" step="0.01" value={r[j]} onChange={(e) => setG((a) => a.map((x, k) => (k === i ? x.map((y, n) => (n === j ? e.target.value : y)) : x)))} /></td>)}
                </tr>
              ))}</tbody>
            </table>
          </div>
          <div className="gv-form" style={{ marginTop: 12 }}>
            <Fld label="On breach"><select className="select" value={onBreach} onChange={(e) => setOnBreach(e.target.value)}><option value="alert">Alert only</option><option value="alert_and_hold">Alert and put the model on hold</option></select></Fld>
            <Fld label="Email"><select className="select" value={email} onChange={(e) => setEmail(e.target.value)}><option value="breach">Breaches</option><option value="warn">Breaches and warnings</option><option value="none">None</option></select></Fld>
            <Fld label="Confidence"><select className="select" value={conf} onChange={(e) => setConf(e.target.value)}><option value="0.01">99%</option><option value="0.05">95%</option></select></Fld>
            <Fld label="Minimum group size"><input className="input" type="number" value={minGroup} onChange={(e) => setMinGroup(e.target.value)} /></Fld>
          </div>
        </Card>
      </div>
    </>
  );
}

/* ---------------------------------------------------------------- Alerts tab */
function Alerts({ m }) {
  const [f, setF] = useState('all');
  const [state, setState] = useState({});
  const [rcp, setRcp] = useState(ALERT_RECIPIENTS);
  const [email, setEmail] = useState('');
  const all = MODEL_ALERTS.filter((a) => a.model === m.id);
  const st = (a) => state[a.id] || a.state;
  const list = all.filter((a) => f === 'all' || st(a) === f);
  const n = (s) => all.filter((a) => st(a) === s).length;
  return (
    <>
      <Card icon={Bell} tone="warn" title="Alerts" count={all.length}
        actions={<Segmented size="sm" value={f} onChange={setF} options={[{ value: 'all', label: `All (${all.length})` }, { value: 'open', label: `Open (${n('open')})` }, { value: 'ack', label: `Acknowledged (${n('ack')})` }, { value: 'resolved', label: `Resolved (${n('resolved')})` }]} />}>
        {list.length ? (
          <div className="gv-alerts">
            {list.map((a) => (
              <div key={a.id} className={`gv-alert ${a.sev === 'breach' ? 'bad' : 'warn'} ${st(a) === 'resolved' ? 'done' : ''}`}>
                <div className="gv-alert-h">
                  <StatusBadge s={a.sev === 'breach' ? 'bad' : 'warn'}>{a.sev}</StatusBadge>
                  <b>{a.title}</b>
                  <span className="gv-faint">{m.name} {a.v} · {a.at}</span>
                  <span style={{ flex: 1 }} />
                  <StatusBadge s={st(a) === 'open' ? 'bad' : st(a) === 'ack' ? 'warn' : 'ok'}>{st(a) === 'ack' ? 'acknowledged' : st(a)}</StatusBadge>
                </div>
                <p>{a.what}</p>
                <div className="gv-alert-f">
                  <span className="gv-faint"><Mail size={12} /> {a.extra}</span>
                  <span style={{ flex: 1 }} />
                  {st(a) === 'open' && <Button variant="secondary" size="sm" onClick={() => setState((o) => ({ ...o, [a.id]: 'ack' }))}>Acknowledge</Button>}
                  {st(a) !== 'resolved' && <Button variant="secondary" size="sm" onClick={() => setState((o) => ({ ...o, [a.id]: 'resolved' }))}>Resolve</Button>}
                </div>
              </div>
            ))}
          </div>
        ) : <Empty>{all.length ? 'No alerts in this state.' : `No alerts for ${m.name}.`}</Empty>}
      </Card>
      <Card icon={Mail} tone="info" title="Email recipients" sub="Alerts are emailed through AWS SNS. Each recipient confirms once from the email AWS sends.">
        <ul className="gv-lines">{rcp.map(([r, s]) => <li key={r}>{r} <StatusBadge s={s === 'confirmed' ? 'ok' : 'warn'}>{s}</StatusBadge></li>)}</ul>
        <div className="gv-inline" style={{ marginTop: 12 }}>
          <Fld label="Email"><input className="input" type="email" placeholder="name@hmrc.gov.uk" value={email} onChange={(e) => setEmail(e.target.value)} /></Fld>
          <Button variant="secondary" size="md" icon={Plus} disabled={!/.+@.+\..+/.test(email)} onClick={() => { setRcp((r) => [...r, [email, 'pending confirmation']]); setEmail(''); toast('Recipient added — confirmation email sent'); }}>Add recipient</Button>
        </div>
      </Card>
    </>
  );
}
