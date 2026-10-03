import { useMemo, useRef, useState } from 'react';
import { Plus, Upload, Link2, FolderSearch, Check, X, Search } from 'lucide-react';
import { PageHead, Tabs, Button, Segmented } from '../components/ui.jsx';
import {
  POLICY_ITEMS, POLICY_TYPES, POLICY_TYPE_LABEL, DOCUMENTS, EXTRACTED_PENDING, APPLY_OPTIONS, APPLY_LABELS,
  ASSET_NAMES, PD_MAP, systemOf, LIFECYCLE, REVIEW_DUE, REG_GROUP,
} from './data.js';
import { Card, Tiles, StatusBadge, Empty, Note, Mono, Fld, Drawer, ChipPick, KV, toast } from './kit.jsx';

const TABS = [
  { value: 'library', label: 'Library & applicability' },
  { value: 'documents', label: 'Documents & extraction' },
  { value: 'map', label: 'Relationship map' },
  { value: 'compliance', label: 'Compliance' },
];
const srcLabel = (s) => (s ? `${s[0]} · p${s[1]}` : 'Manual');
const domainOf = (a) => PD_MAP.find((r) => r.asset === a)?.domain
  || (/LINEITEM|ORDERS|orders|Revenue/.test(a) ? 'Orders' : /PART/.test(a) ? 'Product' : /NATION/.test(a) ? 'Reference' : /SUPPLIER|Supplier/.test(a) ? 'Supplier' : 'Customer');

export default function Policies() {
  const [tab, setTab] = useState('library');
  const [items, setItems] = useState(POLICY_ITEMS);
  const [pending, setPending] = useState(EXTRACTED_PENDING);
  const [docs, setDocs] = useState(DOCUMENTS);
  const counts = Object.fromEntries(POLICY_TYPES.map((t) => [t, items.filter((i) => i.type === t && i.status !== 'retired').length]));
  const accept = (p) => {
    const id = `${p.type.slice(0, 3)}-${p.req.toLowerCase().replace(/[^a-z]+/g, '-').slice(0, 40)}`;
    setItems((a) => [...a, { id, type: p.type, title: p.req.split(' ').slice(0, 7).join(' ').replace(/[.,]$/, ''), statement: p.req, regulation: '', owner: '', severity: 'medium', status: 'active', source: p.src, applies: {}, inherit: false, links: [] }]);
    setPending((x) => x.filter((y) => y !== p)); toast('Accepted into the library');
  };
  return (
    <div className="page gv">
      <PageHead eyebrow="Govern" title="Policies"
        sub="Create and extract policies, standards, controls, regulatory obligations and retention requirements; see where each applies across tax regimes, processes, systems and data; track coverage, compliance, exceptions and risk." />
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
      <td><span className="tag">{i.type}</span></td>
      <td>{i.owner || <StatusBadge s="warn">no owner</StatusBadge>}</td>
      <td><StatusBadge s={i.status === 'active' ? 'active' : i.status === 'retired' ? 'retired' : 'warn'}>{i.status}</StatusBadge></td>
      <td className="gv-muted">{i.status === 'retired' ? '—' : REVIEW_DUE[i.type]}</td>
      <td className="gv-muted">{srcLabel(i.source)}</td>
    </tr>
  );
  const head = <thead><tr><th>Item</th><th>Type</th><th>Owner</th><th>Status</th><th>Next review</th><th>Source</th></tr></thead>;
  return (
    <>
      <Card title="Gaps to close" sub="Library hygiene, checked continuously — each gap weakens the evidence an auditor will ask for.">
        <div className="gv-three">
          {[[noOwner, 'Items with no owner', 'Nobody is accountable for keeping these current.'], [orphan, 'Items not linked to anything', 'Not implemented by a control and not supporting a policy.'], [noReg, 'Items with no regulation or source', 'The legal basis for these is not recorded.']].map(([list, t, d]) => (
            <div key={t} className="gv-tier">
              <header><b>{t}</b><span className="gv-count">{list.length}</span></header>
              <p>{d}</p>
              {list.length > 0 && <Button variant="link" onClick={() => { setQ(''); setType('all'); setStatus('all'); setView('list'); setOpen(list[0]); }}>Fix the first: {list[0].title.slice(0, 40)}{list[0].title.length > 40 ? '…' : ''}</Button>}
            </div>
          ))}
        </div>
      </Card>
      <Card title="Library" count={rows.length} actions={<>
        <Segmented size="sm" value={view} onChange={setView} options={[{ value: 'list', label: 'List' }, { value: 'regulation', label: 'By regulation' }]} />
        <Button variant="primary" size="md" icon={Plus} onClick={() => setCreating(true)}>New item</Button>
      </>}>
        <div className="gv-toolbar" style={{ alignItems: 'center' }}>
          <div className="gl-msearch" style={{ minWidth: 280 }}><Search size={14} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search titles, statements, regulations…" aria-label="Search the library" /></div>
          <div className="gv-chips">
            <button type="button" className={`chip ${type === 'all' ? 'on' : ''}`} onClick={() => setType('all')}>All {items.length}</button>
            {POLICY_TYPES.map((t) => <button type="button" key={t} className={`chip ${type === t ? 'on' : ''}`} onClick={() => setType(t)}>{t} {items.filter((i) => i.type === t).length}</button>)}
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

function ItemDrawer({ i, items, onClose, onUpdate }) {
  const [edit, setEdit] = useState(false);
  const [t, setT] = useState('detail');
  const title = (id) => items.find((x) => x.id === id)?.title || id;
  const linkedFrom = items.filter((x) => x.links.some(([, to]) => to === i.id));
  const applies = Object.entries(i.applies || {}).filter(([, v]) => v && v.length);
  const stepIdx = LIFECYCLE.indexOf(i.status);
  const next = STEP_NEXT[i.status];
  const history = i.history || [['23 Sept 2026, 07:50', 'Admin', i.source ? 'Created from a document' : 'Created'], ['23 Sept 2026, 07:51', 'Admin', 'Status set to active']];
  if (edit) return <ItemForm initial={{ ...i, link: i.links[0]?.[1] || '' }} items={items} onClose={() => setEdit(false)} onSave={(it) => { onUpdate(i.id, it, 'Saved a new version'); setEdit(false); }} />;
  return (
    <Drawer wide title={i.title} onClose={onClose} footer={<>
      {i.status !== 'retired' && <Button variant="secondary" size="md" onClick={() => onUpdate(i.id, { status: 'retired' }, 'Status set to retired')}>Retire</Button>}
      <Button variant="secondary" size="md" onClick={() => setEdit(true)}>Edit</Button>
      {next && <Button variant="primary" size="md" onClick={() => onUpdate(i.id, { status: next[1] }, `${next[0]} — status set to ${next[1]}`)}>{next[0]}</Button>}
      {i.status === 'retired' && <Button variant="primary" size="md" onClick={() => onUpdate(i.id, { status: 'draft' }, 'Restored as a draft')}>Restore as draft</Button>}
    </>}>
      <div className="gv-inline" style={{ marginBottom: 12, alignItems: 'center' }}><span className="tag">{i.type}</span><span className="gv-faint mono">{i.id}</span><span className="gv-faint">· version {history.filter((h) => /version|Edited/.test(h[2])).length + 1}</span></div>
      <div className="gv-steps" style={{ marginBottom: 16 }}>
        {LIFECYCLE.slice(0, 4).map((s, k) => <div key={s} className={i.status === 'retired' ? '' : k < stepIdx ? 'done' : k === stepIdx ? 'cur' : ''}><i>{k + 1}</i>{s}</div>)}
      </div>
      <Tabs items={[{ value: 'detail', label: 'Detail' }, { value: 'trace', label: 'Traceability' }, { value: 'history', label: `History (${history.length})` }]} value={t} onChange={setT} />
      {t === 'detail' && (<>
        <p style={{ fontSize: 14, margin: '0 0 16px', lineHeight: 1.6 }}>{i.statement || <span className="gv-faint">No statement.</span>}</p>
        <KV rows={[
          ['Regulation', i.regulation || '—'], ['Owner', i.owner || <StatusBadge key="o" s="warn">no owner — assign one</StatusBadge>], ['Severity', i.severity],
          ['Next review', i.status === 'retired' ? '—' : REVIEW_DUE[i.type]],
          ...(i.retention ? [['Retention', i.retention]] : []), ...(i.check ? [['Automated check', <Mono key="c">{i.check}</Mono>]] : []),
          ['Source', srcLabel(i.source)],
        ]} />
        <div className="gv-section-label">Applies to</div>
        {applies.length ? <KV rows={applies.map(([k, v]) => [APPLY_LABELS[k], <div key={k} className="gv-tags">{v.map((x) => <span key={x} className="tag">{x}</span>)}</div>])} /> : <p className="gv-muted" style={{ fontSize: 13, margin: 0 }}>Every data asset in the estate{i.inherit ? ', and what is derived from it' : ''}.</p>}
      </>)}
      {t === 'trace' && (<>
        <div className="gv-flow" style={{ gridTemplateColumns: 'repeat(3, minmax(0,1fr))', marginBottom: 14 }}>
          <div><span>Comes from</span><b>{REG_GROUP(i)}</b>{i.source && <small>{srcLabel(i.source)}</small>}</div>
          <div><span>This {i.type}</span><b>{i.title}</b></div>
          <div><span>Governs</span><b>{applies.length ? applies.map(([k, v]) => `${v.length} ${APPLY_LABELS[k].toLowerCase()}`).join(', ') : 'all 37 data assets'}</b></div>
        </div>
        <div className="gv-section-label">Relationships</div>
        {i.links.length || linkedFrom.length ? (
          <ul className="gv-lines">
            {i.links.map(([rel, to]) => <li key={to}>{rel.replace('_', ' ')} <b>{title(to)}</b></li>)}
            {linkedFrom.map((x) => <li key={x.id}><b>{x.title}</b> {x.links.find(([, to]) => to === i.id)[0].replace('_', ' ')} this</li>)}
          </ul>
        ) : <Empty>Not linked to other items yet — edit it to say what it implements or supports.</Empty>}
      </>)}
      {t === 'history' && <ul className="gv-lines">{history.map(([at, who, what], k) => <li key={k}><b>{who}</b> · {what} <span className="gv-faint">· {at}</span></li>)}</ul>}
    </Drawer>
  );
}

/* ------------------------------------------------------------------ Documents */
function Documents({ docs, setDocs, pending, setPending, onAccept }) {
  const [url, setUrl] = useState('');
  const fileRef = useRef();
  const read = (name, from, pages) => {
    setDocs((d) => [{ name, from, pages, extracted: 1, added: '3 Oct 2026' }, ...d]);
    setPending((p) => [{ req: `Requirements extracted from ${name} are reviewed before they enter the library.`, type: 'policy', src: [name, 1] }, ...p]);
    toast(`Read ${name} — 1 requirement extracted for review`);
  };
  return (
    <>
      <Card title="Add a document" sub="PDF, Word, web page or text. Claude reads it and extracts policies, standards, controls, obligations and retention requirements with the page and sentence they came from; you accept or reject each one.">
        <div className="gv-inline">
          <input ref={fileRef} type="file" hidden accept=".pdf,.doc,.docx,.txt,.html" onChange={(e) => { const f = e.target.files[0]; if (f) read(f.name, 'upload', 1); e.target.value = ''; }} />
          <Button variant="secondary" size="md" icon={Upload} onClick={() => fileRef.current.click()}>Upload file</Button>
          <Fld label="Address"><input className="input" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://www.gov.uk/…" /></Fld>
          <Button variant="secondary" size="md" icon={Link2} disabled={!/^https?:\/\//.test(url)} onClick={() => { read(url.split('/').filter(Boolean).pop() || url, url, 1); setUrl(''); }}>Import from address</Button>
          <Button variant="secondary" size="md" icon={FolderSearch} onClick={() => toast('Scanned the document repository — no new documents')}>Scan document repository</Button>
        </div>
      </Card>
      <Card title="Extracted — awaiting review" count={pending.length}>
        <div className="table-wrap">
          <table className="tbl">
            <thead><tr><th>Requirement</th><th>Type</th><th>Source</th><th /></tr></thead>
            <tbody>
              {pending.map((p, k) => (
                <tr key={k}>
                  <td>{p.req}</td><td><span className="tag">{p.type}</span></td><td className="gv-muted">{srcLabel(p.src)}</td>
                  <td style={{ whiteSpace: 'nowrap' }}><Button variant="secondary" size="sm" icon={Check} onClick={() => onAccept(p)}>Accept</Button> <Button variant="subtle" size="sm" icon={X} onClick={() => { setPending((x) => x.filter((y) => y !== p)); toast('Rejected'); }}>Reject</Button></td>
                </tr>
              ))}
              {!pending.length && <tr><td colSpan={4}><Empty>Nothing waiting.</Empty></td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
      <Card title="Documents read" count={docs.length}>
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
const COLS = ['policy', 'standard', 'control', 'obligation', 'retention'];
function RelationshipMap({ items }) {
  const [showAssets, setShowAssets] = useState(false);
  const [sel, setSel] = useState(null);
  const live = items.filter((i) => i.status !== 'retired');
  const W = 1100, colW = W / (COLS.length + (showAssets ? 1 : 0));
  const nodes = [];
  COLS.forEach((t, ci) => {
    const list = live.filter((i) => i.type === t);
    list.forEach((i, k) => nodes.push({ id: i.id, label: i.title, type: t, x: colW * ci + colW / 2, y: 60 + k * (420 / Math.max(list.length, 1)) + 20 }));
  });
  const edges = live.flatMap((i) => i.links.map(([rel, to]) => ({ from: i.id, to, rel }))).filter((e) => nodes.some((n) => n.id === e.to));
  if (showAssets) {
    const controls = live.filter((i) => i.type === 'control');
    const shown = ASSET_NAMES.filter((a) => PD_MAP.some((r) => r.asset === a)).slice(0, 12);
    shown.forEach((a, k) => { nodes.push({ id: a, label: a, type: 'asset', x: colW * COLS.length + colW / 2, y: 40 + k * 38 }); controls.forEach((c) => edges.push({ from: c.id, to: a, rel: 'governs' })); });
  }
  const pos = Object.fromEntries(nodes.map((n) => [n.id, n]));
  const touch = (e) => sel && (e.from === sel || e.to === sel);
  const near = new Set(sel ? edges.filter(touch).flatMap((e) => [e.from, e.to]) : []);
  const trunc = (s, n = 26) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);
  return (
    <Card title="How policies, standards, controls, obligations and retention connect to what they govern"
      actions={<label className="gv-check"><input type="checkbox" checked={showAssets} onChange={(e) => setShowAssets(e.target.checked)} />Show data assets</label>}>
      <p className="gv-muted" style={{ fontSize: 13, margin: '0 0 10px' }}>Click a node to trace its connections.</p>
      {live.length ? (
        <svg className="gv-map" viewBox={`0 0 ${W} 520`} role="img" aria-label="Relationship map">
          {[...COLS, ...(showAssets ? ['asset'] : [])].map((t, ci) => <text key={t} x={colW * ci + colW / 2} y={26} textAnchor="middle" fontSize="12" fontWeight="600" fill="var(--muted)">{t === 'asset' ? 'Data assets' : POLICY_TYPE_LABEL[t]}</text>)}
          {edges.map((e, k) => { const a = pos[e.from], b = pos[e.to]; if (!a || !b) return null; const on = touch(e); return <path key={k} d={`M${a.x},${a.y} C${(a.x + b.x) / 2},${a.y} ${(a.x + b.x) / 2},${b.y} ${b.x},${b.y}`} fill="none" stroke={on ? 'var(--royal)' : 'var(--line2)'} strokeWidth={on ? 2 : 1} opacity={sel && !on ? 0.35 : 1} />; })}
          {nodes.map((n) => {
            const dim = sel && n.id !== sel && !near.has(n.id);
            return (
              <g key={n.id} className="node" transform={`translate(${n.x},${n.y})`} opacity={dim ? 0.35 : 1} onClick={() => setSel(sel === n.id ? null : n.id)}>
                <rect x={-colW / 2 + 10} y={-14} width={colW - 20} height={28} rx="7" fill={n.id === sel ? 'var(--ice)' : 'var(--white)'} stroke={n.id === sel ? 'var(--royal)' : 'var(--line)'} />
                <text textAnchor="middle" y="4" fontSize="11.5" fill="var(--navy)">{trunc(n.label)}</text>
                <title>{n.label}</title>
              </g>
            );
          })}
        </svg>
      ) : <Empty>Add items to the library to see the map.</Empty>}
      <Note>* labelled example (business processes and organisational units until HMRC supplies its own).</Note>
    </Card>
  );
}

/* ------------------------------------------------------------------ Compliance */
const QUALITY_FAIL = { 'BI.Customer 360 Dashboard': 13, 'BI.Supplier Performance': 10 };
function Compliance({ items }) {
  const [exceptions, setExceptions] = useState({});
  const active = items.filter((i) => i.status === 'active');
  const controls = active.filter((i) => i.type === 'control');
  const sensitive = PD_MAP.map((r) => r.asset);
  const checks = useMemo(() => controls.flatMap((c) => {
    if (c.check === 'description_present') return ASSET_NAMES.map((a) => ({ c, a, ok: a !== 'STG.CUSTOMER_ORDER_LIVE_RPLUS', finding: 'no business description' }));
    if (c.check === 'retention_defined') return sensitive.map((a) => ({ c, a, ok: false, finding: 'no active retention requirement applies' }));
    if (c.check?.startsWith('quality_min')) return sensitive.map((a) => ({ c, a, ok: !QUALITY_FAIL[a], finding: `quality ${QUALITY_FAIL[a]}% is below 60` }));
    return [];
  }), [controls.length]); // eslint-disable-line react-hooks/exhaustive-deps
  const failing = checks.filter((x) => !x.ok);
  const excepted = failing.filter((x) => exceptions[`${x.c.id}|${x.a}`] === 'approved');
  const pct = checks.length ? Math.round(((checks.length - failing.length) / checks.length) * 100) : null;
  const group = (fn) => Object.entries(checks.reduce((m, x) => { const k = fn(x); m[k] = m[k] || { n: 0, f: 0 }; m[k].n++; if (!x.ok) m[k].f++; return m; }, {}));
  const sev = (x) => (x.c.severity === 'high' ? 3 : 2) * 3;
  const feeds = (a) => PD_MAP.find((r) => r.asset === a)?.shared || [];
  const failedAssets = [...new Set(failing.map((x) => x.a))];
  return (
    <>
      <Tiles items={[
        { l: 'Compliance', v: pct == null ? '—%' : `${pct}%`, s: `${checks.length - failing.length} pass · ${failing.length} fail · ${excepted.length} excepted of ${checks.length} checks` },
        { l: 'Policy coverage', v: active.length ? '100%' : '0%', s: `${active.length ? 37 : 0} of 37 data assets governed by an active item` },
        { l: 'Sensitive data with retention', v: '0%', s: '0 of 36 sensitive assets' },
        { l: 'Open risks', v: failing.length - excepted.length, s: 'failing controls, weighted by sensitivity and severity' },
        { l: 'Exceptions to decide', v: Object.values(exceptions).filter((v) => v === 'requested').length, s: `${excepted.length} approved` },
      ]} />
      <Card title="By control">
        {controls.length ? (
          <div className="table-wrap"><table className="tbl"><thead><tr><th>Control</th><th className="num">Checks</th><th className="num">Failing</th><th className="num">Compliance</th></tr></thead>
            <tbody>{group((x) => x.c.title).map(([k, v]) => <tr key={k}><td className="gv-strong">{k}</td><td className="num">{v.n}</td><td className="num">{v.f}</td><td className="num">{Math.round(((v.n - v.f) / v.n) * 100)}%</td></tr>)}</tbody></table></div>
        ) : <Empty>No automated controls are active.</Empty>}
      </Card>
      <div className="gv-two">
        <Card title="Information — by domain">
          <div className="table-wrap"><table className="tbl"><thead><tr><th>Domain</th><th className="num">Checks</th><th className="num">Failing</th><th className="num">Compliance</th></tr></thead>
            <tbody>{group((x) => domainOf(x.a)).map(([k, v]) => <tr key={k}><td>{k}</td><td className="num">{v.n}</td><td className="num">{v.f}</td><td className="num">{Math.round(((v.n - v.f) / v.n) * 100)}%</td></tr>)}</tbody></table></div>
        </Card>
        <Card title="Technology — by system">
          <div className="table-wrap"><table className="tbl"><thead><tr><th>System</th><th className="num">Checks</th><th className="num">Failing</th><th className="num">Compliance</th></tr></thead>
            <tbody>{group((x) => systemOf(x.a)).map(([k, v]) => <tr key={k}><td>{k}</td><td className="num">{v.n}</td><td className="num">{v.f}</td><td className="num">{Math.round(((v.n - v.f) / v.n) * 100)}%</td></tr>)}</tbody></table></div>
        </Card>
      </div>
      <Card title="Operational and organisational">
        <div className="gv-two">
          {[['Business process *', APPLY_OPTIONS.processes], ['Organisational unit *', APPLY_OPTIONS.org_units]].map(([h, list]) => (
            <div key={h} className="table-wrap"><table className="tbl"><thead><tr><th>{h}</th><th className="num">Checks</th><th className="num">Failing</th><th className="num">Compliance</th></tr></thead>
              <tbody>{list.map((p) => <tr key={p}><td>{p}</td><td className="num">0</td><td className="num">0</td><td className="num">—%</td></tr>)}</tbody></table></div>
          ))}
        </div>
        <Note>* labelled examples.</Note>
      </Card>
      <Card title="Risks and exceptions" count={failing.length}>
        <div className="table-wrap gv-scroll">
          <table className="tbl"><thead><tr><th className="num">Risk</th><th>Control</th><th>Asset</th><th>Finding</th><th>Owner</th><th /></tr></thead>
            <tbody>
              {failing.map((x) => {
                const k = `${x.c.id}|${x.a}`; const st = exceptions[k];
                return (
                  <tr key={k}>
                    <td className="num gv-strong">{sev(x)}</td><td>{x.c.title}</td><td><Mono>{x.a}</Mono></td><td className="gv-muted">{x.finding}</td>
                    <td>{(PD_MAP.find((r) => r.asset === x.a)?.owner || '—').split(' / ')[0]}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      {!st && <Button variant="secondary" size="sm" onClick={() => setExceptions((e) => ({ ...e, [k]: 'requested' }))}>Request exception</Button>}
                      {st === 'requested' && <><Button variant="secondary" size="sm" onClick={() => { setExceptions((e) => ({ ...e, [k]: 'approved' })); toast('Exception approved'); }}>Approve</Button> <Button variant="subtle" size="sm" onClick={() => setExceptions((e) => { const n = { ...e }; delete n[k]; return n; })}>Decline</Button></>}
                      {st === 'approved' && <StatusBadge s="approved">Excepted</StatusBadge>}
                    </td>
                  </tr>
                );
              })}
              {!failing.length && <tr><td colSpan={6}><Empty>No failing controls.</Empty></td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
      <Card title="Dependencies and potential impact of non-compliant assets">
        <div className="table-wrap gv-scroll">
          <table className="tbl"><thead><tr><th>Non-compliant asset</th><th>Feeds</th><th>Data products</th><th>ML models</th><th>People to tell</th></tr></thead>
            <tbody>
              {failedAssets.map((a) => <tr key={a}><td><Mono>{a}</Mono></td><td>{feeds(a).join(', ') || '—'}</td><td>—</td><td>—</td><td>{PD_MAP.find((r) => r.asset === a)?.owner || '—'}</td></tr>)}
              {!failedAssets.length && <tr><td colSpan={5}><Empty>No non-compliant assets.</Empty></td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
