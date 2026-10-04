import { useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams, Navigate } from 'react-router-dom';
import {
  Plus, Upload, Link2, FolderSearch, Check, X, Search, AlertTriangle, Library as LibraryIcon, FileSearch, FileText, Network, SlidersHorizontal, Layers, Database,
  Building2, Flame, GitFork, UserX, Unlink, FileQuestion, Sparkles, Trash2, ArrowLeft, Shapes, CircleDot, UserRound, Scale, Gauge, CalendarClock, ShieldCheck,
  Landmark, Ruler, Archive, BookMarked, Server, Workflow as WorkflowIcon, History as HistoryIcon,
} from 'lucide-react';
import { PageHead, Tabs, Button, Segmented } from '../components/ui.jsx';
import {
  POLICY_TYPES, POLICY_TYPE_LABEL, APPLY_OPTIONS, APPLY_LABELS, BASE,
  ASSET_NAMES, PD_MAP, systemOf, LIFECYCLE, REVIEW_DUE, REG_GROUP, REPO_SCAN,
} from './data.js';
import { applicability, interpret, sensitivityLine, domainOf, hasCriteria, BUSINESS, PROFILES, productsOf, modelsOf, TAX_SHORT, DOWNSTREAM } from './applicability.js';
import { Card, Tiles, StatusBadge, Empty, Note, Mono, Fld, Drawer, ChipPick, KV, toast, Meter } from './kit.jsx';
import { usePolicies, setItems, setPending, setDocs, updateItem, defaultHistory, controlChecks, controlsUnder } from './policies-store.js';
import { useFacets, ResultsHead } from './catalog.jsx';
import RelGraph from './relgraph.jsx';

export const POLICIES_BASE = `${BASE}/policies`;
const TABS = [
  { value: 'library', label: 'Library', icon: LibraryIcon },
  { value: 'documents', label: 'Documents & extraction', icon: FileSearch },
  { value: 'map', label: 'Relationship map', icon: Network },
  { value: 'compliance', label: 'Compliance', icon: SlidersHorizontal },
];
const srcLabel = (s) => (s ? `${s[0]} · p${s[1]}` : 'Manual');
const TYPE_ICON = { policy: Landmark, standard: Ruler, control: SlidersHorizontal, obligation: Scale, retention: Archive };
const TYPE_ONE = { policy: 'Policy', standard: 'Standard', control: 'Control', obligation: 'Regulatory obligation', retention: 'Retention requirement' };
const statusTone = (s) => (s === 'active' ? 'active' : s === 'retired' ? 'retired' : 'warn');

/* ---------------------------------------------------------------- catalogue filters (inner menu + list) */
const P_FACETS = [
  { key: 'type', label: 'Type', icon: Shapes, open: true, of: (i) => [POLICY_TYPE_LABEL[i.type]] },
  { key: 'status', label: 'Status', icon: CircleDot, open: true, of: (i) => [i.status] },
  { key: 'reg', label: 'Regulation or source', icon: BookMarked, drop: true, all: 'All regulations and sources', of: (i) => [REG_GROUP(i)] },
  { key: 'owner', label: 'Owner', icon: UserRound, of: (i) => [i.owner || 'No owner yet'] },
  { key: 'severity', label: 'Severity', icon: Gauge, of: (i) => [i.severity] },
  { key: 'gaps', label: 'Gaps', icon: AlertTriangle, of: (i) => i.gaps },
];
const P_SORTS = {
  type: ['Type', (a, b) => POLICY_TYPES.indexOf(a.type) - POLICY_TYPES.indexOf(b.type) || a.title.localeCompare(b.title)],
  name: ['Name (A–Z)', (a, b) => a.title.localeCompare(b.title)],
  status: ['Status', (a, b) => LIFECYCLE.indexOf(a.status) - LIFECYCLE.indexOf(b.status)],
  severity: ['Severity', (a, b) => ['high', 'medium', 'low'].indexOf(a.severity) - ['high', 'medium', 'low'].indexOf(b.severity)],
};
const withGaps = (items) => items.map((i) => ({
  ...i,
  gaps: [
    ...(i.status !== 'retired' && !i.owner ? ['No owner'] : []),
    ...(i.status !== 'retired' && !i.links.length && !items.some((x) => x.links.some(([, to]) => to === i.id)) ? ['Not linked'] : []),
    ...(i.status !== 'retired' && !i.regulation && !i.source ? ['No regulation or source'] : []),
  ],
}));
export function usePolicyFilters() {
  const { items } = usePolicies();
  const list = useMemo(() => withGaps(items), [items]);
  return useFacets('policies', list, P_FACETS, (i) => `${i.title} ${i.statement} ${i.regulation} ${i.id} ${i.owner}`, P_SORTS);
}

/* ---------------------------------------------------------------- landing page */
export default function Policies({ filters }) {
  const { items, pending, docs } = usePolicies();
  const [sp, setSp] = useSearchParams();
  const tab = sp.get('tab') || 'library';
  const setTab = (t) => setSp(t === 'library' ? {} : { tab: t });
  const counts = Object.fromEntries(POLICY_TYPES.map((t) => [t, items.filter((i) => i.type === t && i.status !== 'retired').length]));
  const accept = (p) => {
    const id = `${p.type.slice(0, 3)}-${p.req.toLowerCase().replace(/[^a-z]+/g, '-').slice(0, 40)}`;
    setItems((a) => [...a, { id, type: p.type, title: p.req.split(' ').slice(0, 7).join(' ').replace(/[.,]$/, ''), statement: p.req, regulation: '', owner: '', severity: 'medium', status: 'draft', source: p.src, applies: {}, inherit: false, links: [], ...(p.retention ? { retention: p.retention } : {}), history: [[new Date().toLocaleString('en-GB'), 'Admin', `Accepted from ${p.src ? p.src[0] : 'a document'} — created as a draft`]] }]);
    setPending((x) => x.filter((y) => y !== p)); toast('Accepted into the library as a draft — submit it for review from its page');
  };
  return (
    <div className="page gv">
      <PageHead eyebrow="Govern" title="Policies"
        sub="Create and extract policies, standards, controls, regulatory obligations and retention requirements; see where each applies across tax regimes, processes, systems and data; track coverage, compliance, exceptions and risk." />
      <Tiles items={[
        ...POLICY_TYPES.map((t) => ({ l: POLICY_TYPE_LABEL[t], v: counts[t], s: `${items.filter((i) => i.type === t && i.status === 'active').length} active` })),
        { l: 'Extracted, awaiting review', v: pending.length, s: `from ${docs.length} document(s)` },
      ]} />
      <Tabs items={TABS} value={tab} onChange={setTab} />
      {tab === 'library' && <LibraryCatalogue state={filters} items={items} />}
      {tab === 'documents' && <Documents docs={docs} setDocs={setDocs} pending={pending} setPending={setPending} onAccept={accept} />}
      {tab === 'map' && <RelationshipMap items={items} />}
      {tab === 'compliance' && <Compliance items={items} />}
    </div>
  );
}

/* ------------------------------------------------------------------ Library — catalogue look (like Data assets / AI models) */
const STEP_NEXT = { draft: ['Submit for review', 'in review'], 'in review': ['Approve', 'approved'], approved: ['Activate', 'active'] };
function LibraryCatalogue({ state, items }) {
  const nav = useNavigate();
  const [creating, setCreating] = useState(false);
  const [view, setView] = useState('list');
  const { results, toggle, sel } = state;
  const all = withGaps(items);
  const gap = (g) => all.filter((i) => i.gaps.includes(g)).length;
  const checks = useMemo(() => controlChecks(items), [items]);
  const rate = (c) => { const x = checks.filter((k) => k.c.id === c.id); return x.length ? [x.filter((k) => k.ok).length, x.length] : null; };
  const groups = [...new Set(results.map(REG_GROUP))].sort();
  const row = (i) => {
    const res = applicability(i); const I = TYPE_ICON[i.type]; const r = i.type === 'control' ? rate(i) : null;
    const linkedFrom = items.filter((x) => x.links.some(([, to]) => to === i.id)).length;
    return (
      <article key={i.id} className="arow" onClick={() => nav(`${POLICIES_BASE}/${i.id}`)} onKeyDown={(e) => e.key === 'Enter' && nav(`${POLICIES_BASE}/${i.id}`)} tabIndex={0} role="link" aria-label={`Open ${i.title}`}>
        <div className="arow-main">
          <div className="arow-t">
            <span className={`gv-chip sm ${{ policy: 'violet', standard: 'info', control: 'teal', obligation: 'warn', retention: 'ok' }[i.type]}`}><I size={13} /></span>
            <b>{i.title}</b>
            <StatusBadge s={statusTone(i.status)}>{i.status}</StatusBadge>
            {i.gaps.map((g) => <span key={g} className="gv-badge warn"><i />{g.toLowerCase()}</span>)}
          </div>
          <div className="arow-path">
            <span className={`gv-type t-${i.type}`}>{i.type}</span><span className="sep">·</span><span>{REG_GROUP(i)}</span>
            <span className="sep">·</span><span className="mono">{i.id}</span>
          </div>
          <p className="arow-d">{i.statement}</p>
          <div className="arow-meta">
            <span>Owner <b>{i.owner || '—'}</b></span>
            <span>Severity <b>{i.severity}</b></span>
            <span>Applies to <b>{res.all ? 'every asset' : `${res.rows.length} asset(s)`}</b></span>
            <span>Links <b>{i.links.length + linkedFrom}</b></span>
            <span>Next review <b>{i.status === 'retired' ? '—' : REVIEW_DUE[i.type]}</b></span>
            {i.retention && <span className="term">{i.retention.split(' · ')[0]}</span>}
            {i.source && <span className="term">{srcLabel(i.source)}</span>}
          </div>
        </div>
        <div className="arow-side">
          <span className={`gv-riskband ${i.severity === 'high' ? 'bad' : i.severity === 'low' ? 'ok' : 'warn'}`}>{i.severity} severity</span>
          {r ? <><span className="trust"><i style={{ width: `${Math.round((r[0] / r[1]) * 100)}%` }} /></span><small>{r[0]} of {r[1]} checks pass</small></> : <small>{i.type === 'control' ? 'No automated check' : `${controlsUnder(items, i.id).length} control(s) under it`}</small>}
        </div>
      </article>
    );
  };
  return (
    <div className="cat gv fade-in">
      <div className="pl-gaps">
        {[['No owner', 'Items with no owner', UserX], ['Not linked', 'Items not linked to anything', Unlink], ['No regulation or source', 'Items with no regulation or source', FileQuestion]].map(([g, t, I]) => {
          const n = gap(g); const on = (sel.gaps || []).includes(g);
          return (
            <button key={g} type="button" className={`pl-gap ${n > 5 ? 'bad' : n ? 'warn' : 'ok'} ${on ? 'on' : ''}`} onClick={() => toggle('gaps', g)}>
              <span className={`gv-chip sm ${n > 5 ? 'bad' : n ? 'warn' : 'ok'}`}><I size={14} /></span><span><b>{n}</b> {t}</span><small>{on ? 'showing — click to clear' : 'show them'}</small>
            </button>
          );
        })}
        <span style={{ flex: 1 }} />
        <Segmented size="sm" value={view} onChange={setView} options={[{ value: 'list', label: 'List' }, { value: 'regulation', label: 'By regulation' }]} />
        <Button variant="primary" size="md" icon={Plus} onClick={() => setCreating(true)}>New item</Button>
      </div>
      <section className="results">
        <ResultsHead state={state} noun="items" placeholder="Search titles, statements, regulations, owners…" />
        {!results.length ? (
          <div className="empty card"><Search size={20} /><b>Nothing matches</b><p>Remove a filter, or create an item or extract one from a document.</p></div>
        ) : view === 'list' ? <div className="arows">{results.map(row)}</div> : groups.map((g) => {
          const list = results.filter((i) => REG_GROUP(i) === g);
          return (
            <div key={g} style={{ marginBottom: 18 }}>
              <div className="gv-inline" style={{ alignItems: 'center', justifyContent: 'space-between', margin: '6px 0' }}><span className="gv-strong">{g}</span><span className="gv-faint">{list.length} requirement(s) · {list.filter((i) => i.status === 'active').length} active</span></div>
              <div className="arows">{list.map(row)}</div>
            </div>
          );
        })}
      </section>
      {creating && <ItemForm onClose={() => setCreating(false)} onSave={(it) => { setItems((a) => [{ ...it, history: [[new Date().toLocaleString('en-GB'), 'Admin', 'Created as draft']] }, ...a]); setCreating(false); toast(`Created “${it.title}” as a draft`); nav(`${POLICIES_BASE}/${it.id}`); }} items={items} />}
    </div>
  );
}

function ItemForm({ onClose, onSave, items, initial }) {
  const [f, setF] = useState(initial || { type: 'policy', title: '', regulation: '', owner: '', severity: 'medium', statement: '', applies: {}, inherit: false, link: '' });
  const set = (k) => (e) => setF((o) => ({ ...o, [k]: e.target.value }));
  const setApply = (k) => (v) => setF((o) => ({ ...o, applies: { ...o.applies, [k]: v } }));
  const save = () => onSave({
    ...f, id: initial?.id || `${f.type.slice(0, 3)}-${f.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40)}`,
    status: initial?.status || 'draft', source: initial?.source || null, links: f.link ? [[f.type === 'control' ? 'implements' : 'supports', f.link]] : (initial?.links || []),
  });
  return (
    <Drawer wide title={initial ? 'Edit item' : 'New policy, standard, control, obligation or retention requirement'} onClose={onClose}
      footer={<><Button variant="secondary" size="md" onClick={onClose}>Cancel</Button><Button variant="primary" size="md" disabled={!f.title.trim()} onClick={save}>Save</Button></>}>
      <div className="gv-form">
        <Fld label="Type"><select className="select" value={f.type} onChange={set('type')}>{POLICY_TYPES.map((t) => <option key={t}>{t}</option>)}</select></Fld>
        <Fld label="Severity"><select className="select" value={f.severity} onChange={set('severity')}>{['high', 'medium', 'low'].map((t) => <option key={t}>{t}</option>)}</select></Fld>
        <div className="full"><Fld label="Title"><input className="input" value={f.title} onChange={set('title')} autoFocus /></Fld></div>
        <Fld label="Regulation or source"><input className="input" value={f.regulation} onChange={set('regulation')} placeholder="e.g. UK GDPR Article 5(1)(e)" /></Fld>
        <Fld label="Owner"><input className="input" value={f.owner} onChange={set('owner')} /></Fld>
        <div className="full"><Fld label="Statement"><textarea className="input" rows={3} value={f.statement} onChange={set('statement')} /></Fld></div>
        <div className="full"><Fld label="Implements or supports (optional)"><select className="select" value={f.link || ''} onChange={set('link')}><option value="">None</option>{items.map((i) => <option key={i.id} value={i.id}>{i.title}</option>)}</select></Fld></div>
      </div>
      <div className="gl-group-label">Applies to</div>
      {Object.keys(APPLY_OPTIONS).map((k) => (
        <Fld key={k} label={APPLY_LABELS[k]}><ChipPick options={APPLY_OPTIONS[k]} value={f.applies[k] || []} onChange={setApply(k)} /></Fld>
      ))}
      <label className="gv-check"><input type="checkbox" checked={f.inherit} onChange={(e) => setF((o) => ({ ...o, inherit: e.target.checked }))} />Also applies to assets derived from these (lineage)</label>
      <Note>Business processes and organisational units are labelled examples until HMRC supplies its own lists.</Note>
    </Drawer>
  );
}

const RELATIONS = [['implements', 'implements'], ['supports', 'supports'], ['satisfies', 'satisfies'], ['derived_from', 'derived from']];
const relLabel = (r) => r.replace('_', ' ');
const critText = (applies, inherit) => {
  const c = Object.entries(applies || {}).filter(([, v]) => v && v.length);
  return `${c.length ? c.map(([k, v]) => `${APPLY_LABELS[k].toLowerCase()}: ${v.join(', ')}`).join(' · ') : 'every data asset (no narrowing criteria)'}${inherit ? ' · inherited by derived assets' : ''}`;
};

function Applicability({ i, onUpdate }) {
  const [proposal, setProposal] = useState(null);
  const [thinking, setThinking] = useState(false);
  const [all, setAll] = useState(false);
  const res = useMemo(() => applicability(i), [i]);
  const prop = useMemo(() => (proposal ? applicability({ applies: proposal.applies, inherit: proposal.inherit }) : null), [proposal]);
  const ask = () => { setThinking(true); setProposal(null); setTimeout(() => { setProposal(interpret(i)); setThinking(false); }, 700); };
  const use = () => { onUpdate(i.id, { applies: proposal.applies, inherit: proposal.inherit }, 'Applicability set from Claude’s interpretation'); setProposal(null); };
  const list = (k, label, fmt = (x) => x) => res[k].length ? <span key={k}> · {label} <b>{res[k].map(fmt).join(', ')}</b></span> : null;
  /* show each lineage-derived asset straight after the asset it came from */
  const ordered = useMemo(() => {
    const out = []; const put = (r) => { out.push(r); res.rows.filter((x) => x.lineage && x.from === r.asset).forEach(put); };
    res.rows.filter((r) => !r.lineage).forEach(put);
    return out;
  }, [res]);
  const shown = all ? ordered : ordered.slice(0, 12);
  return (
    <>
      <div className="gv-inline" style={{ alignItems: 'center', justifyContent: 'space-between', margin: '20px 0 8px' }}>
        <div className="gv-section-label" style={{ margin: 0 }}>Applicability</div>
        <Button variant="secondary" size="sm" icon={Sparkles} disabled={thinking} onClick={ask}>{thinking ? 'Claude is reading the statement…' : 'Interpret with Claude'}</Button>
      </div>
      {proposal && (
        <div className="gv-proposal">
          <p style={{ margin: '0 0 8px' }}><b>Claude suggests:</b> {proposal.why}</p>
          <p className="mono" style={{ margin: '0 0 8px', fontSize: 12 }}>{critText(proposal.applies, proposal.inherit)}</p>
          <p className="gv-muted" style={{ margin: '0 0 10px', fontSize: 13 }}>Would apply to {prop.rows.length} asset(s){prop.viaLineage ? ` (${prop.viaLineage} through lineage)` : ''}, {prop.processes.length} process(es), {prop.tax_regimes.length} tax regime(s), {prop.org_units.length} unit(s).</p>
          <div className="gv-inline"><Button variant="primary" size="sm" icon={Check} onClick={use}>Use this</Button><Button variant="subtle" size="sm" icon={X} onClick={() => setProposal(null)}>Discard</Button></div>
        </div>
      )}
      <KV rows={[['Criteria', <span key="c" className="mono" style={{ fontSize: 12 }}>{critText(i.applies, i.inherit)}</span>]]} />
      <p style={{ fontSize: 13, lineHeight: 1.6, margin: '10px 0' }}>
        Applies to <b>{res.rows.length} data asset(s)</b>{res.viaLineage ? ` (${res.viaLineage} through lineage)` : ''}
        {list('systems', 'systems')}{list('domains', 'information assets')}{list('processes', 'processes')}{list('tax_regimes', 'tax regimes', (t) => TAX_SHORT[t] || t)}{list('org_units', 'units')}
      </p>
      <div className="table-wrap">
        <table className="tbl" style={{ tableLayout: 'fixed', width: '100%' }}>
          <colgroup><col style={{ width: '31%' }} /><col style={{ width: '22%' }} /><col style={{ width: '16%' }} /><col style={{ width: '31%' }} /></colgroup>
          <thead><tr><th>Data asset</th><th>Why it applies</th><th>System</th><th>Sensitivity</th></tr></thead>
          <tbody>
            {shown.map((r) => (
              <tr key={r.asset}>
                <td style={{ paddingLeft: r.lineage ? 20 : undefined, whiteSpace: 'normal', wordBreak: 'break-word' }}><Mono>{r.asset}</Mono>{r.lineage && <span className="gv-badge info" style={{ display: 'inline-flex', marginTop: 4 }}><i />via lineage</span>}</td>
                <td className="gv-muted" style={{ whiteSpace: 'normal' }}>{r.why}</td>
                <td style={{ whiteSpace: 'normal' }}>{r.profile.system}</td>
                <td style={{ whiteSpace: 'normal' }}><StatusBadge s={r.profile.sensitivity === 'Restricted' ? 'bad' : r.profile.sensitivity === 'Confidential' ? 'warn' : 'info'}>{r.profile.sensitivity}</StatusBadge><span className="gv-sub">{sensitivityLine(r.profile)}</span></td>
              </tr>
            ))}
            {!res.rows.length && <tr><td colSpan={4}><Empty>No data asset matches these criteria.</Empty></td></tr>}
          </tbody>
        </table>
      </div>
      {res.rows.length > 12 && <Button variant="link" onClick={() => setAll((v) => !v)}>{all ? 'Show fewer' : `Show all ${res.rows.length}`}</Button>}
    </>
  );
}

/* ------------------------------------------------------------------ item page (asset-page look) */
const I_TABS = [['overview', 'Overview'], ['applicability', 'Applicability'], ['relationships', 'Relationships'], ['compliance', 'Compliance'], ['history', 'History']];
export function PolicyItemPage() {
  const { itemId } = useParams();
  const nav = useNavigate();
  const { items } = usePolicies();
  const i = items.find((x) => x.id === itemId);
  const [tab, setTab] = useState('overview');
  const [edit, setEdit] = useState(false);
  const [lastId, setLastId] = useState(itemId);
  if (lastId !== itemId) { setLastId(itemId); setTab('overview'); }
  if (!i) return <Navigate to={POLICIES_BASE} replace />;
  const onUpdate = (id, patch, what) => { updateItem(id, patch, what); if (what) toast(what); };
  const res = applicability(i);
  const linkedFrom = items.filter((x) => x.links.some(([, t2]) => t2 === i.id));
  const history = i.history || defaultHistory(i);
  const stepIdx = LIFECYCLE.indexOf(i.status);
  const next = STEP_NEXT[i.status];
  const I = TYPE_ICON[i.type];
  return (
    <div className="page asset gv fade-in" key={i.id}>
      <div className="asset-head">
        <button type="button" className="icon-btn back" onClick={() => nav(POLICIES_BASE)} aria-label="Back to the library"><ArrowLeft size={17} /></button>
        <div className="asset-title">
          <div className="at-row">
            <h1>{i.title}</h1>
            <StatusBadge s={statusTone(i.status)}>{i.status}</StatusBadge>
            <span className={`gv-riskband ${i.severity === 'high' ? 'bad' : i.severity === 'low' ? 'ok' : 'warn'}`}>{i.severity} severity</span>
          </div>
          <div className="at-path">
            <span><I size={13} strokeWidth={1.75} />{TYPE_ONE[i.type]}</span>
            <span className="sep">·</span><span>{REG_GROUP(i)}</span>
            <span className="sep">·</span><span className="mono">{i.id}</span>
            <span className="sep">·</span><span>version {history.filter((h) => /version|Edited/.test(h[2])).length + 1}</span>
          </div>
        </div>
        <div className="head-actions">
          {i.status !== 'retired' && <button type="button" className="btn ghost" onClick={() => onUpdate(i.id, { status: 'retired' }, 'Status set to retired')}>Retire</button>}
          <button type="button" className="btn ghost" onClick={() => setEdit(true)}>Edit</button>
          {next && <button type="button" className="btn primary" onClick={() => onUpdate(i.id, { status: next[1] }, `${next[0]} — status set to ${next[1]}`)}>{next[0]}</button>}
          {i.status === 'retired' && <button type="button" className="btn primary" onClick={() => onUpdate(i.id, { status: 'draft' }, 'Restored as a draft')}>Restore as draft</button>}
        </div>
      </div>
      <nav className="asset-tabs" role="tablist">
        {I_TABS.map(([k, l]) => (
          <button type="button" key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>
            {l}{k === 'relationships' && <em>{i.links.length + linkedFrom.length}</em>}{k === 'history' && <em>{history.length}</em>}
          </button>
        ))}
      </nav>

      {tab === 'overview' && (
        <div className="gv-two wide-l">
          <Card icon={I} tone="violet" title="Statement">
            <p style={{ fontSize: 14.5, margin: '0 0 16px', lineHeight: 1.65 }}>{i.statement || <span className="gv-faint">No statement.</span>}</p>
            <div className="gv-steps" style={{ marginBottom: 16 }}>
              {LIFECYCLE.slice(0, 4).map((s, k) => <div key={s} className={i.status === 'retired' ? '' : k < stepIdx ? 'done' : k === stepIdx ? 'cur' : ''}><i>{k + 1}</i>{s}</div>)}
            </div>
            <KV rows={[
              ['Regulation', i.regulation || '—'], ['Owner', i.owner || <StatusBadge key="o" s="warn">no owner — assign one</StatusBadge>], ['Severity', i.severity],
              ['Next review', i.status === 'retired' ? '—' : REVIEW_DUE[i.type]],
              ...(i.retention ? [['Retention', i.retention]] : []), ...(i.check ? [['Automated check', <Mono key="c">{i.check}</Mono>]] : []),
              ['Source', srcLabel(i.source)],
            ]} />
          </Card>
          <Card icon={Network} tone="teal" title="At a glance">
            <div className="gv-flow" style={{ gridTemplateColumns: '1fr', gap: 8 }}>
              <div><span>Comes from</span><b>{REG_GROUP(i)}</b>{i.source && <small>{srcLabel(i.source)}</small>}</div>
              <div><span>Relationships</span><b>{i.links.length} outgoing · {linkedFrom.length} incoming</b><small>{[...i.links.map(([r, t]) => `${r.replace('_', ' ')} ${items.find((x) => x.id === t)?.title || t}`), ...linkedFrom.map((x) => `${x.title} → this`)].slice(0, 3).join(' · ') || 'not linked yet'}</small></div>
              <div><span>Governs</span><b>{res.all ? 'every data asset' : `${res.rows.length} data asset(s)`}{res.viaLineage ? `, ${res.viaLineage} through lineage` : ''}</b><small>{res.systems.length} system(s) · {res.processes.length} process(es) · {res.tax_regimes.length} tax regime(s)</small></div>
            </div>
            <div className="gv-inline" style={{ marginTop: 12, gap: 8 }}>
              <Button variant="secondary" size="sm" onClick={() => setTab('applicability')}>Applicability</Button>
              <Button variant="secondary" size="sm" onClick={() => setTab('relationships')}>Relationships</Button>
              <Button variant="secondary" size="sm" onClick={() => setTab('compliance')}>Compliance</Button>
            </div>
          </Card>
        </div>
      )}
      {tab === 'applicability' && <Card icon={Database} tone="info" title="Applicability" sub="Which data assets, systems, information assets, processes, tax regimes and units this item applies to."><Applicability i={i} onUpdate={onUpdate} /></Card>}
      {tab === 'relationships' && <Relationships i={i} items={items} onUpdate={onUpdate} />}
      {tab === 'compliance' && <ItemCompliance i={i} items={items} />}
      {tab === 'history' && <Card icon={HistoryIcon} tone="info" title="History" count={history.length}><ul className="gv-lines">{history.map(([at, who, what], k) => <li key={k}><b>{who}</b> · {what} <span className="gv-faint">· {at}</span></li>)}</ul></Card>}
      {edit && <ItemForm initial={{ ...i, link: i.links[0]?.[1] || '' }} items={items} onClose={() => setEdit(false)} onSave={(it) => { onUpdate(i.id, it, 'Saved a new version'); setEdit(false); }} />}
    </div>
  );
}

/* relationships as a lineage graph: sources → what it implements → this item → what implements it → systems → data assets */
function Relationships({ i, items, onUpdate }) {
  const nav = useNavigate();
  const [rel, setRel] = useState('implements');
  const [to, setTo] = useState('');
  const title = (id) => items.find((x) => x.id === id)?.title || id;
  const byId = (id) => items.find((x) => x.id === id);
  const linkedFrom = items.filter((x) => x.links.some(([, t2]) => t2 === i.id));
  const res = applicability(i);
  const { columns, edges } = useMemo(() => {
    const node = (it, extra = {}) => ({ id: it.id, label: it.title, kind: it.type, tag: it.status, icon: TYPE_ICON[it.type], sub: it.owner ? `owner ${it.owner}` : 'no owner', item: it.id, ...extra });
    const up1 = i.links.map(([r, t]) => byId(t)).filter(Boolean);
    const up2 = [...new Map(up1.flatMap((u) => u.links.map(([, t]) => byId(t)).filter(Boolean)).filter((x) => x.id !== i.id).map((x) => [x.id, x])).values()].filter((x) => !up1.some((u) => u.id === x.id));
    const down = linkedFrom;
    const leftmost = [...up2, ...up1, i];
    const srcs = [...new Set(leftmost.map(REG_GROUP))];
    const sys = res.all ? [] : res.systems.slice(0, 6);
    const assets = res.all ? [] : res.rows.slice(0, 7);
    const more = res.all ? 0 : res.rows.length - assets.length;
    const cols = [
      { title: 'Sources & regulations', nodes: srcs.map((g) => ({ id: `src:${g}`, label: g, kind: 'source', icon: BookMarked, sub: `${leftmost.filter((x) => REG_GROUP(x) === g).length} item(s) here` })) },
      { title: 'Further upstream', nodes: up2.map((x) => node(x)) },
      { title: 'Implements, supports or satisfies', nodes: up1.map((x) => node(x)) },
      { title: 'This item', nodes: [node(i, { focus: true, flag: TYPE_ONE[i.type] })] },
      { title: 'Implemented or supported by', nodes: down.map((x) => node(x)) },
      { title: 'Applies to — systems', nodes: res.all ? [{ id: 'sys:all', label: 'Every system', kind: 'scope', icon: Server, sub: 'no narrowing criteria' }] : sys.map((s) => ({ id: `sys:${s}`, label: s, kind: 'system', icon: Server, sub: `${res.rows.filter((r) => r.profile.system === s).length} asset(s)` })) },
      { title: 'Data assets', nodes: res.all ? [{ id: 'as:all', label: `All ${ASSET_NAMES.length} data assets`, kind: 'data assets', icon: Database, sub: 'the whole estate' }] : [...assets.map((r) => ({ id: `as:${r.asset}`, label: r.asset, kind: r.lineage ? 'via lineage' : 'data asset', icon: Database, sub: r.why, muted: r.lineage })), ...(more > 0 ? [{ id: 'as:more', label: `+ ${more} more`, kind: 'data assets', icon: Database, sub: 'see Applicability' }] : [])] },
    ];
    const es = [];
    srcs.forEach((g) => leftmost.filter((x) => REG_GROUP(x) === g).forEach((x) => es.push({ s: `src:${g}`, t: x.id, rel: x.source ? 'extracted' : 'source' })));
    up1.forEach((u) => u.links.forEach(([r, t]) => { if (up2.some((x) => x.id === t)) es.push({ s: t, t: u.id, rel: r.replace('_', ' ') }); }));
    i.links.forEach(([r, t]) => es.push({ s: t, t: i.id, rel: r.replace('_', ' ') }));
    down.forEach((x) => es.push({ s: i.id, t: x.id, rel: x.links.find(([, t2]) => t2 === i.id)[0].replace('_', ' ') }));
    if (res.all) { es.push({ s: i.id, t: 'sys:all', rel: 'applies to' }); es.push({ s: 'sys:all', t: 'as:all', rel: '' }); }
    else {
      sys.forEach((s) => es.push({ s: i.id, t: `sys:${s}`, rel: 'applies to' }));
      assets.forEach((r) => es.push({ s: `sys:${r.profile.system}`, t: `as:${r.asset}`, rel: r.lineage ? 'lineage' : '' }));
      if (more > 0) es.push({ s: `sys:${sys[0]}`, t: 'as:more', rel: '' });
    }
    return { columns: cols, edges: es };
  }, [i, items]); // eslint-disable-line react-hooks/exhaustive-deps
  const addRel = () => { onUpdate(i.id, { links: [...i.links, [rel, to]] }, `Relationship added — ${relLabel(rel)} ${title(to)}`); setTo(''); };
  const dropRel = (k) => { const [r, x] = i.links[k]; onUpdate(i.id, { links: i.links.filter((_, n) => n !== k) }, `Relationship removed — ${relLabel(r)} ${title(x)}`); };
  return (
    <>
      <RelGraph columns={columns} edges={edges} title={`Relationship lineage — ${i.title}`} hint="From the regulation it comes from, through the items it implements and the items that implement it, to the systems and data it governs. Click an item to open it · hover to highlight · drag to pan."
        onSelect={(n) => { if (n.item && n.item !== i.id) nav(`${POLICIES_BASE}/${n.item}`); }} />
      <div className="gv-two" style={{ marginTop: 16 }}>
        <Card icon={Link2} tone="violet" title="Relationships" count={i.links.length + linkedFrom.length}>
          {i.links.length || linkedFrom.length ? (
            <ul className="gv-lines">
              {i.links.map(([r, x], k) => <li key={`${r}${x}`}><span className="gv-faint">This</span> {relLabel(r)} <button type="button" className="gl-tlink" onClick={() => nav(`${POLICIES_BASE}/${x}`)}><b>{title(x)}</b></button> <button type="button" className="gv-x" aria-label="Remove relationship" onClick={() => dropRel(k)}><Trash2 size={13} /></button></li>)}
              {linkedFrom.map((x) => <li key={x.id}><button type="button" className="gl-tlink" onClick={() => nav(`${POLICIES_BASE}/${x.id}`)}><b>{x.title}</b></button> {relLabel(x.links.find(([, t2]) => t2 === i.id)[0])} this</li>)}
            </ul>
          ) : <Empty>Not linked to other items yet — add a relationship.</Empty>}
        </Card>
        <Card icon={Plus} tone="info" title="Add relationship">
          <div className="gv-form" style={{ margin: 0 }}>
            <Fld label="This item"><select className="select" value={rel} onChange={(e) => setRel(e.target.value)}>{RELATIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Fld>
            <Fld label="Item"><select className="select" value={to} onChange={(e) => setTo(e.target.value)}><option value="">Choose item…</option>{POLICY_TYPES.map((ty) => <optgroup key={ty} label={POLICY_TYPE_LABEL[ty]}>{items.filter((x) => x.type === ty && x.id !== i.id && !i.links.some(([r, y]) => r === rel && y === x.id)).map((x) => <option key={x.id} value={x.id}>{x.type}: {x.title}</option>)}</optgroup>)}</select></Fld>
          </div>
          <Button variant="primary" size="md" icon={Plus} disabled={!to} onClick={addRel}>Add relationship</Button>
        </Card>
      </div>
    </>
  );
}

/* compliance for one item: a control's own checks, or the controls beneath a policy, standard or obligation */
function ItemCompliance({ i, items }) {
  const nav = useNavigate();
  const checks = useMemo(() => controlChecks(items), [items]);
  if (i.type === 'control') {
    const mine = checks.filter((x) => x.c.id === i.id);
    const pass = mine.filter((x) => x.ok).length;
    return (
      <Card icon={SlidersHorizontal} tone="teal" title="Automated checks" count={mine.length} sub={i.check ? `Check ${i.check} run against every asset this control applies to.` : 'This control has no automated check.'}>
        {mine.length > 0 && <div className="gv-inbar" style={{ marginBottom: 12 }}><Meter pct={pass / mine.length} /><b>{pass} of {mine.length} pass ({Math.round((pass / mine.length) * 100)}%)</b></div>}
        <div className="table-wrap gv-scroll"><table className="tbl"><thead><tr><th>Asset</th><th>System</th><th>Result</th><th>Finding</th></tr></thead>
          <tbody>{[...mine].sort((a, b) => a.ok - b.ok).map((x) => <tr key={x.a}><td><Mono>{x.a}</Mono></td><td>{systemOf(x.a)}</td><td><StatusBadge s={x.ok ? 'pass' : 'fail'} /></td><td className="gv-muted">{x.ok ? '—' : x.finding}</td></tr>)}
            {!mine.length && <tr><td colSpan={4}><Empty>{i.status !== 'active' ? 'Checks run once the control is active.' : 'No checks for this control.'}</Empty></td></tr>}</tbody></table></div>
      </Card>
    );
  }
  const under = controlsUnder(items, i.id);
  return (
    <Card icon={SlidersHorizontal} tone="teal" title="Controls that evidence this item" count={under.length} sub="Every control that implements, supports or satisfies this item — directly or through other items — and how its checks are doing.">
      <div className="table-wrap"><table className="tbl"><thead><tr><th>Control</th><th>Status</th><th className="num">Checks</th><th>Compliance</th></tr></thead>
        <tbody>{under.map((c) => { const m = checks.filter((x) => x.c.id === c.id); const p = m.filter((x) => x.ok).length; return (
          <tr key={c.id} className="click" onClick={() => nav(`${POLICIES_BASE}/${c.id}`)}><td className="gv-strong">{c.title}</td><td><StatusBadge s={statusTone(c.status)}>{c.status}</StatusBadge></td><td className="num">{m.length}</td>
            <td style={{ width: '34%' }}>{m.length ? <div className="gv-inbar"><Meter pct={p / m.length} /><b>{Math.round((p / m.length) * 100)}%</b></div> : <span className="gv-faint">no automated check</span>}</td></tr>
        ); })}
          {!under.length && <tr><td colSpan={4}><Empty>No control implements this item yet — add one under Relationships.</Empty></td></tr>}</tbody></table></div>
    </Card>
  );
}

/* ------------------------------------------------------------------ Documents */
function Documents({ docs, setDocs, pending, setPending, onAccept }) {
  const [url, setUrl] = useState('');
  const [scanMsg, setScanMsg] = useState(null);
  const fileRef = useRef();
  const scan = () => {
    if (docs.some((d) => d.name === REPO_SCAN.doc.name)) {
      const m = `Scanned the document repository at ${new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })} — no new or changed documents since the last scan.`;
      setScanMsg(['info', m]); toast('Scanned the document repository — no new documents'); return;
    }
    setDocs((d) => [REPO_SCAN.doc, ...d]);
    setPending((x) => [...REPO_SCAN.rows, ...x]);
    const m = `Scanned the document repository — found 1 new document (${REPO_SCAN.doc.name}, ${REPO_SCAN.doc.from}) and extracted ${REPO_SCAN.rows.length} requirements. They are listed below for review.`;
    setScanMsg(['ok', m]); toast(`Scan complete — 1 new document, ${REPO_SCAN.rows.length} requirements extracted`);
  };
  const read = (name, from, pages) => {
    setDocs((d) => [{ name, from, pages, extracted: 1, added: '3 Oct 2026' }, ...d]);
    setPending((p) => [{ req: `Requirements extracted from ${name} are reviewed before they enter the library.`, type: 'policy', src: [name, 1], retention: '' }, ...p]);
    toast(`Read ${name} — 1 requirement extracted for review`);
  };
  return (
    <>
      <Card icon={Upload} tone="info" title="Add a document" sub="PDF, Word, web page or text. Claude reads it and extracts policies, standards, controls, obligations and retention requirements with the page and sentence they came from; you accept or reject each one.">
        <div className="gv-inline">
          <input ref={fileRef} type="file" hidden accept=".pdf,.doc,.docx,.txt,.html" onChange={(e) => { const f = e.target.files[0]; if (f) read(f.name, 'upload', 1); e.target.value = ''; }} />
          <Button variant="secondary" size="md" icon={Upload} onClick={() => fileRef.current.click()}>Upload file</Button>
          <Fld label="Address"><input className="input" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://www.gov.uk/…" /></Fld>
          <Button variant="secondary" size="md" icon={Link2} disabled={!/^https?:\/\//.test(url)} onClick={() => { read(url.split('/').filter(Boolean).pop() || url, url, 1); setUrl(''); }}>Import from address</Button>
          <Button variant="secondary" size="md" icon={FolderSearch} onClick={scan}>Scan document repository</Button>
        </div>
        {scanMsg && <div className={`gv-banner ${scanMsg[0]}`} role="status">{scanMsg[0] === 'ok' ? <Check size={15} /> : <FolderSearch size={15} />}<span>{scanMsg[1]}</span></div>}
      </Card>
      <Card icon={FileSearch} tone="warn" title="Extracted — awaiting review" count={pending.length} sub="Accepted items enter the library as drafts, then go through review and approval before they become active.">
        <div className="table-wrap">
          <table className="tbl">
            <thead><tr><th>Requirement</th><th>Type</th><th>Retention period</th><th>Source</th><th /></tr></thead>
            <tbody>
              {pending.map((p, k) => (
                <tr key={k}>
                  <td>{p.req}</td><td><span className={`gv-type t-${p.type}`}>{p.type}</span></td><td>{p.retention || <span className="gv-faint">none stated</span>}</td><td className="gv-muted">{srcLabel(p.src)} · Claude</td>
                  <td style={{ whiteSpace: 'nowrap' }}><Button variant="secondary" size="sm" icon={Check} onClick={() => onAccept(p)}>Accept</Button> <Button variant="subtle" size="sm" icon={X} onClick={() => { setPending((x) => x.filter((y) => y !== p)); toast('Rejected'); }}>Reject</Button></td>
                </tr>
              ))}
              {!pending.length && <tr><td colSpan={5}><Empty>Nothing waiting.</Empty></td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
      <Card icon={FileText} tone="teal" title="Documents read" count={docs.length}>
        <div className="table-wrap">
          <table className="tbl">
            <thead><tr><th>Document</th><th>From</th><th className="num">Pages</th><th className="num">Extracted</th><th>Added</th></tr></thead>
            <tbody>{docs.map((d) => <tr key={d.name}><td><Mono>{d.name}</Mono></td><td className="gv-muted" style={{ wordBreak: 'break-all' }}>{d.from}</td><td className="num">{d.pages}</td><td className="num">{d.extracted}</td><td>{d.added}</td></tr>)}</tbody>
          </table>
        </div>
      </Card>
    </>
  );
}

/* ------------------------------------------------------------------ Relationship map */
const MAP_COLS = ['Sources & regulations', 'Policies', 'Standards', 'Controls', 'Obligations & retention', 'Tax regimes, processes, units', 'Systems & information assets', 'Data assets'];
const MAP_HEAD = { 'Sources & regulations': ['Sources &', 'regulations'], 'Obligations & retention': ['Obligations &', 'retention'], 'Tax regimes, processes, units': ['Tax regimes,', 'processes, units'], 'Systems & information assets': ['Systems &', 'information assets'] };
const COL_OF = { policy: 1, standard: 2, control: 3, obligation: 4, retention: 4 };
const TYPE_TONE = { source: 'violet', policy: 'violet', standard: 'info', control: 'teal', obligation: 'warn', retention: 'ok', process: 'teal', tax: 'warn', unit: 'info', system: 'violet', domain: 'teal', asset: 'info', more: 'info' };
function RelationshipMap({ items }) {
  const [showAssets, setShowAssets] = useState(true);
  const [sel, setSel] = useState(null);
  const live = items.filter((i) => i.status !== 'retired');
  const { nodes, edges, H, colW, W } = useMemo(() => {
    const W2 = 1180, cw = W2 / MAP_COLS.length;
    const cols = MAP_COLS.map(() => []);
    const edgeList = [];
    const add = (c, n) => { if (!cols[c].some((x) => x.id === n.id)) cols[c].push(n); };
    live.forEach((i) => {
      const g = REG_GROUP(i);
      add(0, { id: `src:${g}`, label: g, type: 'source' });
      add(COL_OF[i.type], { id: i.id, label: i.title, type: i.type });
      edgeList.push({ from: `src:${g}`, to: i.id });
    });
    live.forEach((i) => i.links.forEach(([, to]) => live.some((x) => x.id === to) && edgeList.push({ from: i.id, to })));
    const governed = new Set();
    live.filter((i) => hasCriteria(i.applies)).forEach((i) => {
      const r = applicability(i);
      r.tax_regimes.forEach((x) => { add(5, { id: `tax:${x}`, label: `Tax · ${x}`, type: 'tax' }); edgeList.push({ from: i.id, to: `tax:${x}` }); });
      r.processes.forEach((x) => { add(5, { id: `pro:${x}`, label: `Process · ${x} *`, type: 'process' }); edgeList.push({ from: i.id, to: `pro:${x}` }); });
      r.org_units.forEach((x) => { add(5, { id: `unit:${x}`, label: `Unit · ${x} *`, type: 'unit' }); edgeList.push({ from: i.id, to: `unit:${x}` }); });
      r.rows.forEach((row) => governed.add(row.asset));
    });
    Object.entries(BUSINESS).forEach(([d, b]) => {
      const keys = [...b.tax_regimes.map((x) => `tax:${x}`), ...b.processes.map((x) => `pro:${x}`), ...b.org_units.map((x) => `unit:${x}`)].filter((k) => cols[5].some((n) => n.id === k));
      if (!keys.length) return;
      add(6, { id: `dom:${d}`, label: `Info asset · ${d}`, type: 'domain' });
      keys.forEach((k) => edgeList.push({ from: k, to: `dom:${d}` }));
    });
    const assets = [...governed].sort((a, b) => (PROFILES[a].domain + a).localeCompare(PROFILES[b].domain + b));
    assets.forEach((a) => {
      const p = PROFILES[a];
      add(6, { id: `sys:${p.system}`, label: `System · ${p.system}`, type: 'system' });
      edgeList.push({ from: `dom:${p.domain}`, to: `sys:${p.system}` });
    });
    if (showAssets) {
      const cap = 16;
      assets.slice(0, cap).forEach((a) => {
        const p = PROFILES[a];
        add(7, { id: `as:${a}`, label: a, type: 'asset' });
        edgeList.push({ from: `sys:${p.system}`, to: `as:${a}` });
      });
      if (assets.length > cap) add(7, { id: 'as:more', label: `+ ${assets.length - cap} more data assets`, type: 'more' });
    }
    cols[6].sort((a, b) => a.type.localeCompare(b.type));
    const pitch = 32;
    const maxN = Math.max(...cols.map((c) => c.length), 1);
    const h = 56 + maxN * pitch + 10;
    const list = cols.flatMap((c, ci) => { const off = 50 + ((maxN - c.length) * pitch) / 2; return c.map((n, k) => ({ ...n, col: ci, x: cw * ci + cw / 2, y: off + k * pitch + pitch / 2 })); });
    const ids = new Set(list.map((n) => n.id));
    const seen = new Set();
    const es = edgeList.filter((e) => ids.has(e.from) && ids.has(e.to) && !seen.has(`${e.from}>${e.to}`) && seen.add(`${e.from}>${e.to}`));
    return { nodes: list, edges: es, H: h, colW: cw, W: W2 };
  }, [items, showAssets]); // eslint-disable-line react-hooks/exhaustive-deps
  const pos = Object.fromEntries(nodes.map((n) => [n.id, n]));
  /* trace: walk outwards from the selected node, leftwards to its sources and rightwards to what it governs */
  const lit = useMemo(() => {
    if (!sel) return null;
    const on = new Set([sel]);
    const walk = (dir) => { const q = [sel]; const seenW = new Set([sel]); while (q.length) { const id = q.shift(); const c = pos[id].col; edges.forEach((e) => { [[e.from, e.to], [e.to, e.from]].forEach(([a, b]) => { if (a !== id || seenW.has(b) || !pos[b]) return; if (dir > 0 ? pos[b].col > c : pos[b].col < c) { seenW.add(b); on.add(b); q.push(b); } }); }); } };
    walk(1); walk(-1);
    return on;
  }, [sel, edges]); // eslint-disable-line react-hooks/exhaustive-deps
  const trunc = (s, n = 20) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);
  return (
    <Card icon={Network} tone="violet" title="How sources, policies, controls and obligations reach the business, systems and data"
      actions={<label className="gv-check"><input type="checkbox" checked={showAssets} onChange={(e) => setShowAssets(e.target.checked)} />Show data assets</label>}>
      <p className="gv-muted" style={{ fontSize: 13, margin: '0 0 10px' }}>Click a node to trace it back to its sources and forward to the tax regimes, processes, units, systems and data it governs. Items with no applicability criteria apply to the whole estate and are not drawn beyond column 5.</p>
      {live.length ? (
        <div className="gv-mapwrap">
          <svg className="gv-map gv" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Relationship map">
            {MAP_COLS.map((t, ci) => { const ln = MAP_HEAD[t] || [t]; return <text key={t} x={colW * ci + colW / 2} y={ln.length > 1 ? 16 : 24} textAnchor="middle" fontSize="11" fontWeight="600" fill="var(--muted)">{ln.map((x, k) => <tspan key={k} x={colW * ci + colW / 2} dy={k ? 14 : 0}>{x}</tspan>)}</text>; })}
            {edges.map((e, k) => { const a = pos[e.from], b = pos[e.to]; const on = lit && lit.has(e.from) && lit.has(e.to); const [l, r] = a.x <= b.x ? [a, b] : [b, a]; const x1 = l.x + colW / 2 - 6, x2 = r.x - colW / 2 + 6; return <path key={k} d={l.col === r.col ? `M${l.x},${l.y} L${r.x},${r.y}` : `M${x1},${l.y} C${(x1 + x2) / 2},${l.y} ${(x1 + x2) / 2},${r.y} ${x2},${r.y}`} fill="none" stroke={on ? 'var(--royal)' : 'var(--line2)'} strokeWidth={on ? 1.8 : 1} opacity={lit && !on ? 0.2 : 0.9} />; })}
            {nodes.map((n) => {
              const dim = lit && !lit.has(n.id);
              return (
                <g key={n.id} className="node" transform={`translate(${n.x},${n.y})`} opacity={dim ? 0.3 : 1} onClick={() => n.type !== 'more' && setSel(sel === n.id ? null : n.id)}>
                  <rect x={-colW / 2 + 6} y={-13} width={colW - 12} height={26} rx="6" fill={n.id === sel ? 'var(--ice)' : `var(--gv-${TYPE_TONE[n.type]}-bg)`} stroke={n.id === sel ? 'var(--royal)' : `var(--gv-${TYPE_TONE[n.type]}-line)`} strokeDasharray={n.type === 'more' ? '3 3' : undefined} />
                  <text textAnchor="middle" y="4" fontSize="11.5" fill="var(--navy)">{trunc(n.label)}</text>
                  <title>{n.label}</title>
                </g>
              );
            })}
          </svg>
        </div>
      ) : <Empty>Add items to the library to see the map.</Empty>}
      <Note>* labelled example (business processes and organisational units until HMRC supplies its own).</Note>
    </Card>
  );
}

/* ------------------------------------------------------------------ Compliance */
const QUALITY_FAIL = { 'BI.Customer 360 Dashboard': 13, 'BI.Supplier Performance': 10 };
const ACTORS = [['Admin', 'governance-lead'], ['Priya Shah', 'governance-lead'], ['Rajesh Kumar', 'data owner']];
const SENS_W = { Restricted: 3, Confidential: 2, Internal: 1 };
function GroupTable({ head, rows }) {
  return (
    <div className="table-wrap"><table className="tbl"><thead><tr><th>{head}</th><th className="num">Checks</th><th className="num">Pass</th><th className="num">Failing</th><th className="num">Excepted</th><th>Compliance</th></tr></thead>
      <tbody>{rows.map(([k, v]) => <tr key={k}><td>{k}</td><td className="num">{v.n}</td><td className="num">{v.p}</td><td className="num">{v.f}</td><td className="num">{v.e}</td><td style={{ width: '28%' }}>{v.n ? <div className="gv-inbar"><Meter pct={v.p / v.n} /><b>{Math.round((v.p / v.n) * 100)}%</b></div> : <span className="gv-faint">no checks</span>}</td></tr>)}</tbody></table></div>
  );
}
function Compliance({ items }) {
  const [exceptions, setExceptions] = useState({});
  const [actor, setActor] = useState('Admin');
  const [asking, setAsking] = useState(null);
  const [reason, setReason] = useState('');
  const active = items.filter((i) => i.status === 'active');
  const controls = active.filter((i) => i.type === 'control');
  const retentionCovered = useMemo(() => new Set(active.filter((i) => i.type === 'retention' && hasCriteria(i.applies)).flatMap((i) => applicability(i).rows.map((r) => r.asset))), [items]); // eslint-disable-line react-hooks/exhaustive-deps
  const checks = useMemo(() => controls.flatMap((c) => {
    const assets = applicability(c).rows.map((r) => r.asset);
    if (c.check === 'description_present') return assets.map((a) => ({ c, a, ok: a !== 'STG.CUSTOMER_ORDER_LIVE_RPLUS', finding: 'no business description' }));
    if (c.check === 'retention_defined') return assets.map((a) => ({ c, a, ok: retentionCovered.has(a), finding: 'no active retention requirement applies' }));
    if (c.check?.startsWith('quality_min')) return assets.map((a) => ({ c, a, ok: !QUALITY_FAIL[a], finding: `quality ${QUALITY_FAIL[a]}% is below 60` }));
    return [];
  }), [items, retentionCovered]); // eslint-disable-line react-hooks/exhaustive-deps
  const keyOf = (x) => `${x.c.id}|${x.a}`;
  const stateOf = (x) => (x.ok ? 'pass' : exceptions[keyOf(x)]?.status === 'approved' ? 'excepted' : 'fail');
  const nPass = checks.filter((x) => stateOf(x) === 'pass').length;
  const nExc = checks.filter((x) => stateOf(x) === 'excepted').length;
  const nFail = checks.length - nPass - nExc;
  const pct = checks.length ? Math.round((nPass / checks.length) * 100) : null;
  const group = (fn) => Object.entries(checks.reduce((m, x) => { [].concat(fn(x)).forEach((k) => { m[k] = m[k] || { n: 0, p: 0, f: 0, e: 0 }; m[k].n++; const st = stateOf(x); m[k][st === 'pass' ? 'p' : st === 'fail' ? 'f' : 'e']++; }); return m; }, {}));
  const groupAll = (fn, list) => { const g = Object.fromEntries(group(fn)); return list.map((k) => [k, g[k] || { n: 0, p: 0, f: 0, e: 0 }]); };
  const sev = (x) => (x.c.severity === 'high' ? 3 : 2) * SENS_W[PROFILES[x.a]?.sensitivity || 'Internal'];
  const notPassing = checks.filter((x) => !x.ok).sort((a, b) => sev(b) - sev(a));
  const open = checks.filter((x) => stateOf(x) === 'fail');
  const failedAssets = [...new Set(open.map((x) => x.a))];
  const governed = new Set(active.flatMap((i) => applicability(i).rows.map((r) => r.asset)));
  const sensitive = ASSET_NAMES.filter((a) => PROFILES[a].sensitivity === 'Restricted');
  const sensRet = sensitive.filter((a) => retentionCovered.has(a)).length;
  const role = ACTORS.find(([n]) => n === actor)[1];
  const requested = Object.values(exceptions).filter((v) => v.status === 'requested').length;
  const submit = () => { setExceptions((e) => ({ ...e, [keyOf(asking)]: { status: 'requested', reason: reason.trim(), by: actor, at: new Date().toLocaleString('en-GB') } })); toast(`Exception requested by ${actor} — a different governance lead must approve it`); setAsking(null); setReason(''); };
  const decide = (x, ok) => { const k = keyOf(x); setExceptions((e) => { const n = { ...e }; if (ok) n[k] = { ...e[k], status: 'approved', decidedBy: actor }; else delete n[k]; return n; }); toast(ok ? `Exception approved by ${actor}` : `Exception declined by ${actor}`); };
  return (
    <>
      <Tiles items={[
        { l: 'Compliance', v: pct == null ? '—%' : `${pct}%`, s: `${nPass} pass + ${nFail} fail + ${nExc} excepted = ${checks.length} checks` },
        { l: 'Policy coverage', v: `${Math.round((governed.size / ASSET_NAMES.length) * 100)}%`, s: `${governed.size} of ${ASSET_NAMES.length} data assets governed by an active item` },
        { l: 'Sensitive data with retention', v: `${sensitive.length ? Math.round((sensRet / sensitive.length) * 100) : 0}%`, s: `${sensRet} of ${sensitive.length} sensitive assets` },
        { l: 'Open risks', v: nFail, s: 'failing checks without an approved exception' },
        { l: 'Exceptions to decide', v: requested, s: `${nExc} approved` },
      ]} />
      <Card icon={SlidersHorizontal} tone="teal" title="By control" sub="Each automated control, checked against every asset it applies to. Pass + failing + excepted always equals the number of checks.">
        {controls.length ? <GroupTable head="Control" rows={group((x) => x.c.title)} /> : <Empty>No automated controls are active.</Empty>}
      </Card>
      <div className="gv-two">
        <Card icon={Layers} tone="info" title="Information — by domain"><GroupTable head="Domain" rows={group((x) => domainOf(x.a))} /></Card>
        <Card icon={Database} tone="violet" title="Technology — by system"><GroupTable head="System" rows={group((x) => systemOf(x.a))} /></Card>
      </div>
      <Card icon={Building2} tone="teal" title="Operational and organisational" sub="Each check counts towards every business process and unit that uses the asset, so these columns can add up to more than the total.">
        <div className="gv-two">
          <GroupTable head="Business process *" rows={groupAll((x) => PROFILES[x.a].processes, APPLY_OPTIONS.processes)} />
          <GroupTable head="Organisational unit *" rows={groupAll((x) => PROFILES[x.a].org_units, APPLY_OPTIONS.org_units)} />
        </div>
        <Note>* labelled examples until HMRC supplies its own lists.</Note>
      </Card>
      <Card icon={Flame} tone="bad" title="Risks and exceptions" count={notPassing.length} sub="An exception needs a reason, and must be approved by a governance lead other than the person who asked for it."
        actions={<label className="gv-inline" style={{ alignItems: 'center', gap: 6, fontSize: 13 }}><span className="gv-muted">Deciding as</span><select className="select" value={actor} onChange={(e) => setActor(e.target.value)} aria-label="Deciding as">{ACTORS.map(([n, r]) => <option key={n} value={n}>{n} ({r})</option>)}</select></label>}>
        <div className="table-wrap gv-scroll">
          <table className="tbl"><thead><tr><th className="num">Risk</th><th>Control</th><th>Asset</th><th>Finding</th><th>Owner</th><th>Exception</th></tr></thead>
            <tbody>
              {notPassing.map((x) => {
                const k = keyOf(x); const ex = exceptions[k];
                const blocked = role !== 'governance-lead' ? 'needs a governance lead' : ex?.by === actor ? 'needs a different governance lead' : null;
                return (
                  <tr key={k}>
                    <td className="num"><span className={`gv-badge ${sev(x) >= 9 ? 'bad' : 'warn'}`}><i />{sev(x)}</span></td><td>{x.c.title}</td><td><Mono>{x.a}</Mono></td><td className="gv-muted">{x.finding}</td>
                    <td>{(PD_MAP.find((r) => r.asset === x.a)?.owner || '—').split(' / ')[0]}</td>
                    <td style={{ minWidth: 230 }}>
                      {!ex && <Button variant="secondary" size="sm" onClick={() => { setAsking(x); setReason(''); }}>Request exception</Button>}
                      {ex?.status === 'requested' && (<>
                        <StatusBadge s="warn">requested by {ex.by}</StatusBadge>
                        <span className="gv-why" style={{ display: 'block', margin: '4px 0 6px' }}>“{ex.reason}”</span>
                        <span className="gv-inline" style={{ alignItems: 'center', gap: 6 }}>
                          <Button variant="secondary" size="sm" icon={Check} disabled={!!blocked} onClick={() => decide(x, true)}>Approve</Button>
                          <Button variant="subtle" size="sm" disabled={role !== 'governance-lead'} onClick={() => decide(x, false)}>Decline</Button>
                        </span>
                        {blocked && <span className="gv-why" style={{ display: 'block', marginTop: 4, color: 'var(--gv-warn)' }}>{blocked}</span>}
                      </>)}
                      {ex?.status === 'approved' && (<><StatusBadge s="approved">excepted</StatusBadge><span className="gv-why" style={{ display: 'block', marginTop: 4 }}>asked by {ex.by} · approved by {ex.decidedBy} — “{ex.reason}”</span></>)}
                    </td>
                  </tr>
                );
              })}
              {!notPassing.length && <tr><td colSpan={6}><Empty>No failing controls.</Empty></td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
      <Card icon={GitFork} tone="warn" title="Dependencies and potential impact of non-compliant assets" count={failedAssets.length}>
        <div className="table-wrap gv-scroll">
          <table className="tbl"><thead><tr><th>Non-compliant asset</th><th>Feeds</th><th>Data products</th><th>ML models</th><th>People to tell</th></tr></thead>
            <tbody>
              {failedAssets.map((a) => {
                const prods = productsOf(a); const models = modelsOf(a);
                return (
                  <tr key={a}><td><Mono>{a}</Mono></td><td>{(DOWNSTREAM[a] || []).join(', ') || '—'}</td>
                    <td>{prods.length ? <div className="gv-tags">{prods.map((p) => <span key={p} className="tag">{p}</span>)}</div> : '—'}</td>
                    <td>{models.length ? models.map((m) => <Mono key={m}>{m}</Mono>) : '—'}</td>
                    <td>{[PD_MAP.find((r) => r.asset === a)?.owner, models.length ? 'Customer Analytics Lead' : null].filter(Boolean).join(' · ') || '—'}</td></tr>
                );
              })}
              {!failedAssets.length && <tr><td colSpan={5}><Empty>No non-compliant assets.</Empty></td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
      {asking && (
        <Drawer title="Request an exception" onClose={() => setAsking(null)}
          footer={<><Button variant="secondary" size="md" onClick={() => setAsking(null)}>Cancel</Button><Button variant="primary" size="md" disabled={reason.trim().length < 10} onClick={submit}>Request exception</Button></>}>
          <KV rows={[['Control', asking.c.title], ['Asset', <Mono key="a">{asking.a}</Mono>], ['Finding', asking.finding], ['Requested by', `${actor} (${role})`]]} />
          <div style={{ marginTop: 14 }}><Fld label="Reason (required)"><textarea className="input" rows={4} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why this asset should be excepted, for how long, and what reduces the risk meanwhile…" autoFocus /></Fld></div>
          <Note>A governance lead other than you must approve it. You can’t approve your own request.</Note>
        </Drawer>
      )}
    </>
  );
}
