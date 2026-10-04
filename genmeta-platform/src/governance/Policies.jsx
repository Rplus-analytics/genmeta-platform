import { useMemo, useRef, useState } from 'react';
import {
  Plus, Upload, Link2, FolderSearch, Check, X, Search, AlertTriangle, Library as LibraryIcon, FileSearch, FileText, Network, SlidersHorizontal, Layers, Database,
  Building2, Flame, GitFork, UserX, Unlink, FileQuestion, Sparkles, Trash2,
} from 'lucide-react';
import { PageHead, Tabs, Button, Segmented } from '../components/ui.jsx';
import {
  POLICY_ITEMS, POLICY_TYPES, POLICY_TYPE_LABEL, DOCUMENTS, EXTRACTED_PENDING, APPLY_OPTIONS, APPLY_LABELS,
  ASSET_NAMES, PD_MAP, systemOf, LIFECYCLE, REVIEW_DUE, REG_GROUP, REPO_SCAN,
} from './data.js';
import { applicability, interpret, sensitivityLine, domainOf, hasCriteria, BUSINESS, PROFILES, productsOf, modelsOf, TAX_SHORT, DOWNSTREAM } from './applicability.js';
import { Card, Tiles, StatusBadge, Empty, Note, Mono, Fld, Drawer, ChipPick, KV, toast, Meter } from './kit.jsx';

const TABS = [
  { value: 'library', label: 'Library & applicability', icon: LibraryIcon },
  { value: 'documents', label: 'Documents & extraction', icon: FileSearch },
  { value: 'map', label: 'Relationship map', icon: Network },
  { value: 'compliance', label: 'Compliance', icon: SlidersHorizontal },
];
const srcLabel = (s) => (s ? `${s[0]} · p${s[1]}` : 'Manual');
export default function Policies({ switcher }) {
  const [tab, setTab] = useState('library');
  const [items, setItems] = useState(POLICY_ITEMS);
  const [pending, setPending] = useState(EXTRACTED_PENDING);
  const [docs, setDocs] = useState(DOCUMENTS);
  const counts = Object.fromEntries(POLICY_TYPES.map((t) => [t, items.filter((i) => i.type === t && i.status !== 'retired').length]));
  const accept = (p) => {
    const id = `${p.type.slice(0, 3)}-${p.req.toLowerCase().replace(/[^a-z]+/g, '-').slice(0, 40)}`;
    setItems((a) => [...a, { id, type: p.type, title: p.req.split(' ').slice(0, 7).join(' ').replace(/[.,]$/, ''), statement: p.req, regulation: '', owner: '', severity: 'medium', status: 'draft', source: p.src, applies: {}, inherit: false, links: [], ...(p.retention ? { retention: p.retention } : {}), history: [[new Date().toLocaleString('en-GB'), 'Admin', `Accepted from ${p.src ? p.src[0] : 'a document'} — created as a draft`]] }]);
    setPending((x) => x.filter((y) => y !== p)); toast('Accepted into the library as a draft — submit it for review from the Library');
  };
  return (
    <div className="page gv">
      <PageHead eyebrow="Govern" title="Policies"
        sub="Create and extract policies, standards, controls, regulatory obligations and retention requirements; see where each applies across tax regimes, processes, systems and data; track coverage, compliance, exceptions and risk." />
      {switcher}
      <Tiles items={[
        ...POLICY_TYPES.map((t) => ({ l: POLICY_TYPE_LABEL[t], v: counts[t], s: 'in the library' })),
        { l: 'Extracted, awaiting review', v: pending.length, s: `from ${docs.length} document(s)` },
      ]} />
      <Tabs items={TABS} value={tab} onChange={setTab} />
      {tab === 'library' && <Library items={items} setItems={setItems} />}
      {tab === 'documents' && <Documents docs={docs} setDocs={setDocs} pending={pending} setPending={setPending} onAccept={accept} />}
      {tab === 'map' && <RelationshipMap items={items} />}
      {tab === 'compliance' && <Compliance items={items} />}
    </div>
  );
}

/* ------------------------------------------------------------------ Library
   v2 patterns: Collibra Policy Manager (regulation → requirement traceability, lifecycle with
   approval) and Alation Policy Center (search, type facets, owners and review dates up front). */
const STEP_NEXT = { draft: ['Submit for review', 'in review'], 'in review': ['Approve', 'approved'], approved: ['Activate', 'active'] };
function Library({ items, setItems }) {
  const [type, setType] = useState('all');
  const [q, setQ] = useState('');
  const [view, setView] = useState('list');
  const [status, setStatus] = useState('all');
  const [open, setOpen] = useState(null);
  const [creating, setCreating] = useState(false);
  const rows = items.filter((i) => (type === 'all' || i.type === type) && (status === 'all' || i.status === status)
    && (!q || `${i.title} ${i.statement} ${i.regulation} ${i.id}`.toLowerCase().includes(q.toLowerCase())));
  const update = (id, patch, what) => { setItems((a) => a.map((i) => (i.id === id ? { ...i, ...patch, history: [[new Date().toLocaleString('en-GB'), 'Admin', what || 'Edited'], ...(i.history || [])] } : i))); setOpen((o) => (o && o.id === id ? { ...o, ...patch } : o)); if (what) toast(what); };
  const noOwner = items.filter((i) => i.status !== 'retired' && !i.owner);
  const orphan = items.filter((i) => i.status !== 'retired' && !i.links.length && !items.some((x) => x.links.some(([, to]) => to === i.id)));
  const noReg = items.filter((i) => i.status !== 'retired' && !i.regulation && !i.source);
  const groups = [...new Set(rows.map(REG_GROUP))].sort();
  const row = (i) => (
    <tr key={i.id} className="click" onClick={() => setOpen(i)}>
      <td><span className="gv-strong">{i.title}</span><span className="gv-sub mono">{i.id}</span></td>
      <td><span className={`gv-type t-${i.type}`}>{i.type}</span></td>
      <td>{i.owner || <StatusBadge s="warn">no owner</StatusBadge>}</td>
      <td><StatusBadge s={i.status === 'active' ? 'active' : i.status === 'retired' ? 'retired' : 'warn'}>{i.status}</StatusBadge></td>
      <td className="gv-muted">{i.status === 'retired' ? '—' : REVIEW_DUE[i.type]}</td>
      <td className="gv-muted">{srcLabel(i.source)}</td>
    </tr>
  );
  const head = <thead><tr><th>Item</th><th>Type</th><th>Owner</th><th>Status</th><th>Next review</th><th>Source</th></tr></thead>;
  return (
    <>
      <Card icon={AlertTriangle} tone="warn" title="Gaps to close" sub="Library hygiene, checked continuously — each gap weakens the evidence an auditor will ask for.">
        <div className="gv-three">
          {[[noOwner, 'Items with no owner', 'Nobody is accountable for keeping these current.', UserX], [orphan, 'Items not linked to anything', 'Not implemented by a control and not supporting a policy.', Unlink], [noReg, 'Items with no regulation or source', 'The legal basis for these is not recorded.', FileQuestion]].map(([list, t, d, I]) => (
            <div key={t} className={`gv-tier ${list.length > 5 ? 'gap-bad' : list.length ? 'gap-warn' : ''}`}>
              <header><span className="gv-inline" style={{ alignItems: 'center', gap: 8 }}><span className={`gv-chip sm ${list.length > 5 ? 'bad' : list.length ? 'warn' : 'ok'}`}><I size={14} /></span><b>{t}</b></span><span className={`gv-badge ${list.length > 5 ? 'bad' : list.length ? 'warn' : 'ok'}`}><i />{list.length}</span></header>
              <p>{d}</p>
              {list.length > 0 && <Button variant="link" onClick={() => { setQ(''); setType('all'); setStatus('all'); setView('list'); setOpen(list[0]); }}>Fix the first: {list[0].title.slice(0, 40)}{list[0].title.length > 40 ? '…' : ''}</Button>}
            </div>
          ))}
        </div>
      </Card>
      <Card icon={LibraryIcon} tone="violet" title="Library" count={rows.length} actions={<>
        <Segmented size="sm" value={view} onChange={setView} options={[{ value: 'list', label: 'List' }, { value: 'regulation', label: 'By regulation' }]} />
        <Button variant="primary" size="md" icon={Plus} onClick={() => setCreating(true)}>New item</Button>
      </>}>
        <div className="gv-toolbar" style={{ alignItems: 'center' }}>
          <div className="gl-msearch" style={{ minWidth: 280 }}><Search size={14} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search titles, statements, regulations…" aria-label="Search the library" /></div>
          <div className="gv-chips">
            <button type="button" className={`chip ${type === 'all' ? 'on' : ''}`} onClick={() => setType('all')}>All {items.length}</button>
            {POLICY_TYPES.map((t) => <button type="button" key={t} className={`chip gv-tchip t-${t} ${type === t ? 'on' : ''}`} onClick={() => setType(t)}><i />{t} <b>{items.filter((i) => i.type === t).length}</b></button>)}
          </div>
          <select className="select" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status"><option value="all">Any status</option>{LIFECYCLE.map((s) => <option key={s}>{s}</option>)}</select>
        </div>
        {view === 'list' ? (
          <div className="table-wrap"><table className="tbl">{head}<tbody>
            {rows.map(row)}
            {!rows.length && <tr><td colSpan={6}><Empty>Nothing matches — create an item or extract from a document.</Empty></td></tr>}
          </tbody></table></div>
        ) : (
          groups.map((g) => { const list = rows.filter((i) => REG_GROUP(i) === g); const act = list.filter((i) => i.status === 'active').length; return (
            <div key={g} style={{ marginBottom: 18 }}>
              <div className="gv-inline" style={{ alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <span className="gv-strong">{g}</span><span className="gv-faint">{list.length} requirement(s) · {act} active</span>
              </div>
              <div className="table-wrap"><table className="tbl">{head}<tbody>{list.map(row)}</tbody></table></div>
            </div>
          ); })
        )}
      </Card>
      {creating && <ItemForm onClose={() => setCreating(false)} onSave={(it) => { setItems((a) => [{ ...it, history: [[new Date().toLocaleString('en-GB'), 'Admin', 'Created as draft']] }, ...a]); setCreating(false); toast(`Created “${it.title}” as a draft`); }} items={items} />}
      {open && <ItemDrawer i={items.find((x) => x.id === open.id) || open} items={items} onClose={() => setOpen(null)} onUpdate={update} />}
    </>
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

function ItemDrawer({ i, items, onClose, onUpdate }) {
  const [edit, setEdit] = useState(false);
  const [t, setT] = useState('detail');
  const [rel, setRel] = useState('implements');
  const [to, setTo] = useState('');
  const title = (id) => items.find((x) => x.id === id)?.title || id;
  const linkedFrom = items.filter((x) => x.links.some(([, t2]) => t2 === i.id));
  const res = useMemo(() => applicability(i), [i]);
  const stepIdx = LIFECYCLE.indexOf(i.status);
  const next = STEP_NEXT[i.status];
  const history = i.history || [['23 Sept 2026, 07:50', 'Admin', i.source ? 'Created from a document' : 'Created'], ['23 Sept 2026, 07:51', 'Admin', 'Status set to active']];
  const addRel = () => { onUpdate(i.id, { links: [...i.links, [rel, to]] }, `Relationship added — ${relLabel(rel)} ${title(to)}`); setTo(''); };
  const dropRel = (k) => { const [r, x] = i.links[k]; onUpdate(i.id, { links: i.links.filter((_, n) => n !== k) }, `Relationship removed — ${relLabel(r)} ${title(x)}`); };
  const relBlock = (<>
        <div className="gv-section-label">Relationships</div>
        {i.links.length || linkedFrom.length ? (
          <ul className="gv-lines">
            {i.links.map(([r, x], k) => <li key={`${r}${x}`}><span className="gv-faint">This</span> {relLabel(r)} <b>{title(x)}</b> <button type="button" className="gv-x" aria-label="Remove relationship" onClick={() => dropRel(k)}><Trash2 size={13} /></button></li>)}
            {linkedFrom.map((x) => <li key={x.id}><b>{x.title}</b> {relLabel(x.links.find(([, t2]) => t2 === i.id)[0])} this</li>)}
          </ul>
        ) : <Empty>Not linked to other items yet — add a relationship below.</Empty>}
        <div className="gv-section-label" style={{ marginTop: 16 }}>Add relationship</div>
        <div className="gv-inline" style={{ alignItems: 'flex-end' }}>
          <Fld label="This item"><select className="select" value={rel} onChange={(e) => setRel(e.target.value)}>{RELATIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Fld>
          <div style={{ flex: 1, minWidth: 260 }}><Fld label="Item"><select className="select" value={to} onChange={(e) => setTo(e.target.value)}><option value="">Choose item…</option>{POLICY_TYPES.map((ty) => <optgroup key={ty} label={POLICY_TYPE_LABEL[ty]}>{items.filter((x) => x.type === ty && x.id !== i.id && !i.links.some(([r, y]) => r === rel && y === x.id)).map((x) => <option key={x.id} value={x.id}>{x.type}: {x.title}</option>)}</optgroup>)}</select></Fld></div>
          <Button variant="primary" size="md" icon={Plus} disabled={!to} onClick={addRel}>Add relationship</Button>
        </div>
  </>);
  if (edit) return <ItemForm initial={{ ...i, link: i.links[0]?.[1] || '' }} items={items} onClose={() => setEdit(false)} onSave={(it) => { onUpdate(i.id, it, 'Saved a new version'); setEdit(false); }} />;
  return (
    <Drawer wide title={i.title} onClose={onClose} footer={<>
      {i.status !== 'retired' && <Button variant="secondary" size="md" onClick={() => onUpdate(i.id, { status: 'retired' }, 'Status set to retired')}>Retire</Button>}
      <Button variant="secondary" size="md" onClick={() => setEdit(true)}>Edit</Button>
      {next && <Button variant="primary" size="md" onClick={() => onUpdate(i.id, { status: next[1] }, `${next[0]} — status set to ${next[1]}`)}>{next[0]}</Button>}
      {i.status === 'retired' && <Button variant="primary" size="md" onClick={() => onUpdate(i.id, { status: 'draft' }, 'Restored as a draft')}>Restore as draft</Button>}
    </>}>
      <div className="gv-inline" style={{ marginBottom: 12, alignItems: 'center' }}><span className={`gv-type t-${i.type}`}>{i.type}</span><span className="gv-faint mono">{i.id}</span><span className="gv-faint">· version {history.filter((h) => /version|Edited/.test(h[2])).length + 1}</span></div>
      <div className="gv-steps" style={{ marginBottom: 16 }}>
        {LIFECYCLE.slice(0, 4).map((s, k) => <div key={s} className={i.status === 'retired' ? '' : k < stepIdx ? 'done' : k === stepIdx ? 'cur' : ''}><i>{k + 1}</i>{s}</div>)}
      </div>
      <Tabs items={[{ value: 'detail', label: 'Detail' }, { value: 'trace', label: `Relationships (${i.links.length + linkedFrom.length})` }, { value: 'history', label: `History (${history.length})` }]} value={t} onChange={setT} />
      {t === 'detail' && (<>
        <p style={{ fontSize: 14, margin: '0 0 16px', lineHeight: 1.6 }}>{i.statement || <span className="gv-faint">No statement.</span>}</p>
        <KV rows={[
          ['Regulation', i.regulation || '—'], ['Owner', i.owner || <StatusBadge key="o" s="warn">no owner — assign one</StatusBadge>], ['Severity', i.severity],
          ['Next review', i.status === 'retired' ? '—' : REVIEW_DUE[i.type]],
          ...(i.retention ? [['Retention', i.retention]] : []), ...(i.check ? [['Automated check', <Mono key="c">{i.check}</Mono>]] : []),
          ['Source', srcLabel(i.source)],
        ]} />
        <Applicability i={i} onUpdate={onUpdate} />
        <div style={{ marginTop: 22 }}>{relBlock}</div>
      </>)}
      {t === 'trace' && (<>
        <div className="gv-flow" style={{ gridTemplateColumns: 'repeat(3, minmax(0,1fr))', marginBottom: 14 }}>
          <div><span>Comes from</span><b>{REG_GROUP(i)}</b>{i.source && <small>{srcLabel(i.source)}</small>}</div>
          <div><span>This {i.type}</span><b>{i.title}</b></div>
          <div><span>Governs</span><b>{res.rows.length} data asset(s){res.viaLineage ? `, ${res.viaLineage} through lineage` : ''}</b><small>{res.systems.length} system(s) · {res.processes.length} process(es)</small></div>
        </div>
        {relBlock}
      </>)}
      {t === 'history' && <ul className="gv-lines">{history.map(([at, who, what], k) => <li key={k}><b>{who}</b> · {what} <span className="gv-faint">· {at}</span></li>)}</ul>}
    </Drawer>
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
