import { Fragment, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import {
  Book, FileText, ChevronRight, Search, Plus, Star, Link2, Pencil, Bell, MoreHorizontal,
  Trash2, Send, X, Unlink, Download, Table2, Columns3, File, Radio, BarChart3, Check, Sparkles,
} from 'lucide-react';
import { Section } from '../components/Rail.jsx';
import GlossaryNewTerm from './GlossaryNewTerm.jsx';
import GlossaryNewGlossary from './GlossaryNewGlossary.jsx';
import {
  TERMS, ACTIVITY, GLOSSARIES, GLOSS_META, ROLE, STATUS, SDOT, ME,
  T, kids, ini, counts, uniqAssets, allLinks, matchQ, assetInfo, assetId, ASSET,
  useGlossaryData, setStatus, saveTerm, createTerm, deleteTerm, linkAssets, unlinkAsset, registerToast, toast,
} from '../glossary-data.js';

const WD = (n) => `Working definition for ${n}, pending review.`;
const TICON = { table: Table2, view: Table2, column: Columns3, file: File, topic: Radio, dashboard: BarChart3, report: BarChart3, api: Link2 };
const cap = (s) => s[0].toUpperCase() + s.slice(1);

/* ---------- small shared bits ---------- */
function Badge({ status }) {
  const [label, cls] = STATUS[status];
  return <span className={`badge ${cls}`}><i />{label}</span>;
}
function Person({ name }) {
  return name
    ? <span className="gl-person"><i>{ini(name)}</i>{name}</span>
    : <span className="gl-faint">—</span>;
}

/* ---------- UI state (menu + view controls), persisted across navigation ---------- */
const SAVED = {
  tab: 'overview', list: 'list', q: '', mq: '', seg: 'all', atype: 'all', aq: '', edit: false, menu: false,
  fstatus: new Set(), fgloss: new Set(), open: new Set(['Customer', 'Orders']), openTerm: new Set(['customer', 'orders']),
  star: new Set(), overlay: null,
};
export function useGlossaryUI() {
  const [st, setSt] = useState(SAVED);
  const update = (patch) => setSt((prev) => {
    const n = { ...prev, ...(typeof patch === 'function' ? patch(prev) : patch) };
    Object.assign(SAVED, n);
    return n;
  });
  const toggleSet = (key, val) => update((prev) => {
    const s = new Set(prev[key]);
    s.has(val) ? s.delete(val) : s.add(val);
    return { [key]: s };
  });
  return { ...st, update, toggleSet };
}

function useNav(ui) {
  const navigate = useNavigate();
  return {
    home: () => { ui.update({ edit: false, menu: false }); navigate('/app/glossary'); },
    glossary: (g) => { ui.update((prev) => ({ q: '', seg: 'all', edit: false, menu: false, open: new Set(prev.open).add(g) })); navigate(`/app/glossary/g/${g}`); },
    /* New term is its own page (like Create a data product), not a drawer */
    newGlossary: () => { ui.update({ edit: false, menu: false }); navigate('/app/glossary/new-glossary'); },
    newTerm: (g, parent) => { ui.update({ edit: false, menu: false }); navigate('/app/glossary/new', { state: { g, parent } }); },
    term: (id) => { ui.update({ tab: 'overview', edit: false, menu: false, atype: 'all', aq: '' }); navigate(`/app/glossary/${id}`); },
  };
}

/* resolve the current view from the route */
function useView() {
  const { pathname } = useLocation();
  const params = useParams();
  if (params.term === 'new') return { view: 'new' };
  if (params.term === 'new-glossary') return { view: 'new-glossary' };
  if (params.term) return { view: 'term', term: params.term };
  if (params.glossary) return { view: 'glossary', glossary: params.glossary };
  return { view: 'home' };
}

/* ------------------------------------------------------------------ inner menu */
export function GlossaryMenu({ ui }) {
  useGlossaryData();
  const nav = useNav(ui);
  const { view, glossary, term } = useView();
  const c = counts();
  const q = ui.mq;

  const termRow = (t, depth) => {
    const k = kids(t.id);
    const open = ui.openTerm.has(t.id) || !!q;
    const on = view === 'term' && term === t.id;
    return (
      <Fragment key={t.id}>
        <div className={`gl-mlink ${depth ? 'gl-tchild2' : 'gl-tchild'} ${on ? 'on' : ''}`} onClick={() => nav.term(t.id)} tabIndex={0}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), nav.term(t.id))}>
          {k.length
            ? <span onClick={(e) => { e.stopPropagation(); ui.toggleSet('openTerm', t.id); }}><ChevronRight className={`gl-chev ${open ? 'open' : ''}`} size={14} /></span>
            : <span style={{ width: 14 }} />}
          <span className="gl-sdot" style={{ background: SDOT[t.status], ...(t.status === 'deprecated' ? { border: '1.5px solid var(--faint)' } : null) }} />
          {t.name}
        </div>
        {k.length && open ? k.filter((x) => matchQ(x, q) || !q).map((x) => termRow(x, 1)) : null}
      </Fragment>
    );
  };

  const tree = GLOSSARIES.map((g) => {
    const ts = TERMS.filter((t) => t.g === g && !t.parent && (matchQ(t, q) || kids(t.id).some((k) => matchQ(k, q))));
    const n = TERMS.filter((t) => t.g === g).length;
    if (q && !ts.length) return null;
    const open = ui.open.has(g) || !!q;
    const on = view === 'glossary' && glossary === g;
    return (
      <Fragment key={g}>
        <div className={`gl-mlink ${on ? 'on' : ''}`} onClick={() => nav.glossary(g)} tabIndex={0}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), nav.glossary(g))}>
          <span onClick={(e) => { e.stopPropagation(); ui.toggleSet('open', g); }}><ChevronRight className={`gl-chev ${open ? 'open' : ''}`} size={14} /></span>
          <Book className="gl-book" size={16} strokeWidth={1.7} />{g}<span className="gl-cnt">{n}</span>
        </div>
        {open ? ts.map((t) => termRow(t, 0)) : null}
      </Fragment>
    );
  });

  const onStatus = (k) => { ui.toggleSet('fstatus', k); if (view === 'term') nav.home(); };
  const onGloss = (g) => { ui.toggleSet('fgloss', g); if (view !== 'home') nav.home(); };

  return (
    <div className="gl-menu-block">
      <div className="gl-msec gl-msec-first">Glossaries</div>
      <div className="gl-msearch">
        <Search size={14} strokeWidth={2} />
        <input value={ui.mq} onChange={(e) => ui.update({ mq: e.target.value })} placeholder="Search terms & glossaries…" aria-label="Search terms and glossaries" />
      </div>
      <div className={`gl-mlink ${view === 'home' ? 'on' : ''}`} onClick={nav.home} tabIndex={0}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), nav.home())}>
        <Book className="gl-book" size={16} strokeWidth={1.7} />All glossaries<span className="gl-cnt">{GLOSSARIES.length}</span>
      </div>
      {tree}
      <div className="inner-sep" />
      <div className="gl-msec">Filters</div>
      <Section label="Status" defaultOpen>
        <div className="fopts">
          {Object.entries(STATUS).map(([k, [label]]) => (
            <label key={k} className="fopt">
              <input type="checkbox" checked={ui.fstatus.has(k)} onChange={() => onStatus(k)} />
              <span className="fopt-l">{label}</span><span className="fopt-n">{c[k]}</span>
            </label>
          ))}
        </div>
      </Section>
      <Section label="Glossary" defaultOpen>
        <div className="fopts">
          {GLOSSARIES.map((g) => (
            <label key={g} className="fopt">
              <input type="checkbox" checked={ui.fgloss.has(g)} onChange={() => onGloss(g)} />
              <span className="fopt-l">{g}</span><span className="fopt-n">{TERMS.filter((t) => t.g === g).length}</span>
            </label>
          ))}
        </div>
      </Section>
    </div>
  );
}

/* ------------------------------------------------------------------ right-column cards */
function SideCards({ ui }) {
  const nav = useNav(ui);
  const c = counts();
  const drafts = TERMS.filter((t) => t.status === 'draft');
  const reviews = TERMS.filter((t) => t.status === 'review');
  const links = allLinks();
  const srcs = new Set(links.map((l) => l.src));
  const unlinked = TERMS.filter((t) => !t.linked.length);
  return (
    <>
      <div className="card pad">
        <h3>Glossary</h3>
        <dl className="gl-kv" style={{ margin: '10px 0 0' }}>
          <dt>Approved</dt><dd className="num">{c.approved}</dd>
          <dt>In review</dt><dd>{c.review}</dd>
          <dt>Draft</dt><dd>{c.draft}</dd>
          <dt>Deprecated</dt><dd>{c.deprecated}</dd>
          <dt>Linked assets</dt><dd>{uniqAssets().size}</dd>
        </dl>
        <div className="gl-foot">Stored in Amazon S3.</div>
      </div>

      <div className="card pad">
        <h3>Approvals &amp; notifications</h3>
        <div className="gl-plist">
          {reviews.map((t) => (
            <div key={t.id}>
              <div style={{ flex: 1 }}><button className="gl-tlink" onClick={() => nav.term(t.id)}>{t.name}</button><small>In review · awaiting approval</small></div>
              <button className="btn secondary sm" onClick={() => setStatus(t.id, 'approved')}><Check size={13} />Approve</button>
              <button className="btn subtle sm" onClick={() => setStatus(t.id, 'draft')}>Reject</button>
            </div>
          ))}
          {drafts.map((t) => (
            <div key={t.id}>
              <div style={{ flex: 1 }}><button className="gl-tlink" onClick={() => nav.term(t.id)}>{t.name}</button><small>Draft awaiting submission</small></div>
              <button className="ib" title="Submit for review" aria-label={`Submit ${t.name} for review`} onClick={() => setStatus(t.id, 'review')}><Send size={14} /></button>
            </div>
          ))}
          {!reviews.length && !drafts.length && <div className="gl-muted">Nothing waiting.</div>}
        </div>
        <div className="gl-foot">Approval needs: governance-lead or product-owner. You are {ROLE}.</div>
      </div>

      <div className="card pad">
        <h3>Traceability</h3>
        <p className="sub">{links.length} term-to-asset links across {srcs.size} source systems.</p>
        <div className="gl-plist">
          {links.slice(0, 8).map((l, i) => (
            <div key={i} style={{ display: 'block' }}>
              <button className="gl-tlink" onClick={() => nav.term(l.term.id)}>{l.term.name}</button> → <span className="gl-mono">{l.a}</span>
              <small>{l.src}</small>
            </div>
          ))}
        </div>
        <div className="gl-foot">Unlinked terms: {unlinked.length ? unlinked.map((t, i) => <Fragment key={t.id}>{i ? ', ' : ''}<button className="gl-tlink" onClick={() => nav.term(t.id)}>{t.name}</button></Fragment>) : 'none'}</div>
      </div>

      <div className="card pad">
        <h3>Recent activity</h3>
        <div className="gl-plist">
          {ACTIVITY.slice(0, 6).map((a, i) => (
            <div key={i} style={{ display: 'block' }}>
              <button className="gl-tlink" onClick={() => nav.term(a.term)}>{T(a.term)?.name || a.term}</button> <span className="gl-muted">{a.what}</span>
              <small>{a.t} · {a.who}</small>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ term table (list / tree) */
function TermTable({ ui, list, showGloss = true }) {
  const nav = useNav(ui);
  if (!list.length) return <div className="gl-empty">No terms match these filters.</div>;

  if (ui.list === 'tree') {
    const byG = GLOSSARIES.filter((g) => showGloss || g === list[0]?.g);
    const row = (t, d) => (
      <Fragment key={t.id}>
        <div className="gl-treerow" style={{ paddingLeft: 12 + d * 20 }} onClick={() => nav.term(t.id)}>
          <FileText size={15} strokeWidth={1.7} /><b style={{ fontWeight: 600 }}>{t.name}</b><Badge status={t.status} />
          <span className="gl-cnt">{t.linked.length} linked</span>
        </div>
        {list.filter((k) => k.parent === t.id).map((k) => row(k, d + 1))}
      </Fragment>
    );
    return (
      <div className="gl-treelist">
        {byG.map((g) => {
          const top = list.filter((t) => t.g === g && (!t.parent || !list.includes(T(t.parent))));
          if (!top.length) return null;
          return (
            <Fragment key={g}>
              {showGloss && <div className="gl-treerow" style={{ fontWeight: 600 }} onClick={() => nav.glossary(g)}><Book size={15} strokeWidth={1.7} />{g}</div>}
              {top.map((t) => row(t, showGloss ? 1 : 0))}
            </Fragment>
          );
        })}
      </div>
    );
  }

  return (
    <table className="tbl">
      <thead><tr><th>Term</th><th>Status</th>{showGloss && <th>Glossary</th>}<th>Owner</th><th className="num">Linked</th><th /></tr></thead>
      <tbody>
        {list.map((t) => (
          <tr key={t.id} onClick={() => nav.term(t.id)}>
            <td>
              <div className="tname"><FileText size={15} strokeWidth={1.7} />{t.name}{t.parent && <span className="gl-faint" style={{ fontWeight: 400, fontSize: 12 }}>in {T(t.parent).name}</span>}</div>
              <div className="gl-muted" style={{ fontSize: 12, maxWidth: 250, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.def}</div>
            </td>
            <td><Badge status={t.status} /></td>
            {showGloss && <td><span className="tag">{t.g}</span></td>}
            <td><Person name={t.owner} /></td>
            <td className="num">{t.linked.length}</td>
            <td style={{ width: 76 }}>
              <div style={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }} onClick={(e) => e.stopPropagation()}>
                {t.status === 'draft' && <button className="ib" title="Submit for review" aria-label={`Submit ${t.name} for review`} onClick={() => setStatus(t.id, 'review')}><Send size={14} /></button>}
                <button className="ib" title="Delete term" aria-label={`Delete ${t.name}`} onClick={() => ui.update({ overlay: { type: 'delete', id: t.id } })}><Trash2 size={15} /></button>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Toolbar({ ui, placeholder, withSeg }) {
  return (
    <div className="gl-toolbar" style={{ padding: '14px 14px 0' }}>
      <div className="gl-msearch">
        <Search size={14} strokeWidth={2} />
        <input value={ui.q} onChange={(e) => ui.update({ q: e.target.value })} placeholder={placeholder} aria-label="Search terms" />
      </div>
      <div className="gl-toolbar-segs">
        {withSeg && (
          <div className="seg2" role="group" aria-label="Status">
            {[['all', 'All'], ['approved', 'Approved'], ['review', 'In review'], ['draft', 'Draft'], ['deprecated', 'Deprecated']].map(([k, n]) => (
              <button key={k} className={ui.seg === k ? 'on' : ''} onClick={() => ui.update({ seg: k })}>{n}</button>
            ))}
          </div>
        )}
        <div className="seg2" role="group" aria-label="View">
          <button className={ui.list === 'list' ? 'on' : ''} onClick={() => ui.update({ list: 'list' })}>List</button>
          <button className={ui.list === 'tree' ? 'on' : ''} onClick={() => ui.update({ list: 'tree' })}>Tree</button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ home: all glossaries */
function Home({ ui }) {
  const nav = useNav(ui);
  const c = counts();
  const unl = TERMS.filter((t) => !t.linked.length).length;
  const list = TERMS.filter((t) => matchQ(t, ui.q) && (ui.seg === 'all' || t.status === ui.seg) && (!ui.fstatus.size || ui.fstatus.has(t.status)) && (!ui.fgloss.size || ui.fgloss.has(t.g)));
  const tiles = [
    [TERMS.length, 'Terms', `${GLOSSARIES.length} glossaries`],
    [c.approved, 'Approved', 'published to everyone'],
    [c.review, 'In review', 'waiting for approval'],
    [c.draft, 'Draft', 'awaiting submission'],
    [uniqAssets().size, 'Linked assets', `${allLinks().length} term-to-asset links`],
    [unl, 'Unlinked terms', 'no asset yet'],
  ];
  return (
    <>
      <div className="gl-phead">
        <div><span className="eyebrow">Data assets</span><h1>Business glossary</h1><p>The shared vocabulary for the estate: terms, their owners and the assets they describe.</p></div>
        <div className="gl-head-acts"><button className="btn secondary" onClick={() => nav.newGlossary()}><Book size={15} />Create glossary</button><button className="btn primary" onClick={() => nav.newTerm(GLOSSARIES[0])}><Plus size={15} />New term</button></div>
      </div>
      <div className="tiles-sm gl-tiles">
        {tiles.map(([v, k, s]) => <div key={k}><b>{v}</b><span>{k}</span><small>{s}</small></div>)}
      </div>
      <div className="gl-grid2">
        <div className="card">
          <Toolbar ui={ui} placeholder="Search terms, definitions or synonyms…" withSeg />
          <div className="gl-muted gl-count">{list.length} of {TERMS.length} terms</div>
          <TermTable ui={ui} list={list} />
        </div>
        <div className="gl-stack"><SideCards ui={ui} /></div>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ glossary page */
function GlossaryPage({ ui, g }) {
  const nav = useNav(ui);
  const ts = TERMS.filter((t) => t.g === g);
  const c = counts(ts);
  const owners = [...new Set(ts.map((t) => t.owner).filter(Boolean))];
  const links = ts.flatMap((t) => t.linked);
  const list = ts.filter((t) => matchQ(t, ui.q) && (ui.seg === 'all' || t.status === ui.seg) && (!ui.fstatus.size || ui.fstatus.has(t.status)));
  return (
    <>
      <div className="gl-thead">
        <div className="gl-ticon"><Book size={20} strokeWidth={1.7} /></div>
        <div><h1>{g}</h1><div className="gl-kind">{GLOSS_META[g]?.kind || 'Glossary'} · {ts.length} terms</div></div>
        <div className="gl-tools"><button className="btn primary md" onClick={() => nav.newTerm(g)}><Plus size={15} />New term</button></div>
      </div>
      <div className="gl-pgrid">
        <div className="gl-stack">
          <div className="card pad">
            <h3>Glossary summary</h3>
            <dl className="gl-kv" style={{ marginTop: 10 }}>
              {GLOSS_META[g]?.desc && <><dt>Covers</dt><dd>{GLOSS_META[g].desc}</dd></>}
              <dt>Terms</dt><dd>{ts.length} ({c.approved} approved · {c.review} in review · {c.draft} draft)</dd>
              <dt>Owners</dt><dd>{(GLOSS_META[g]?.owners || owners).length ? (GLOSS_META[g]?.owners || owners).map((o) => <Person key={o} name={o} />) : '—'}</dd>
              {GLOSS_META[g]?.stewards?.length > 0 && <><dt>Stewards</dt><dd>{GLOSS_META[g].stewards.map((o) => <Person key={o} name={o} />)}</dd></>}
              <dt>Linked assets</dt><dd>{new Set(links).size} assets · {links.length} links</dd>
              <dt>Top-level terms</dt><dd>{ts.filter((t) => !t.parent).map((t, i) => <Fragment key={t.id}>{i ? ', ' : ''}<button className="gl-tlink" onClick={() => nav.term(t.id)}>{t.name}</button></Fragment>)}</dd>
            </dl>
          </div>
          <div className="card">
            <div className="gl-toolbar" style={{ padding: '14px 14px 0' }}>
              <div className="gl-msearch"><Search size={14} strokeWidth={2} /><input value={ui.q} onChange={(e) => ui.update({ q: e.target.value })} placeholder={`Search in ${g}…`} aria-label={`Search in ${g}`} /></div>
              <div className="seg2 gl-viewseg" role="group" aria-label="View">
                <button className={ui.list === 'list' ? 'on' : ''} onClick={() => ui.update({ list: 'list' })}>List</button>
                <button className={ui.list === 'tree' ? 'on' : ''} onClick={() => ui.update({ list: 'tree' })}>Tree</button>
              </div>
            </div>
            <div style={{ height: 8 }} />
            <TermTable ui={ui} list={list} showGloss={false} />
          </div>
        </div>
        <aside className="gl-side">
          <div className="gl-prop"><label>Name</label><div className="v">{g}</div></div>
          <div className="gl-prop"><label>Description</label><div className="v gl-muted" style={{ fontWeight: 400 }}>{GLOSS_META[g]?.desc || `Business terms for the ${g.toLowerCase()} domain.`}</div></div>
          {GLOSS_META[g] && <div className="gl-prop"><label>Term rules</label><div className="v gl-muted" style={{ fontWeight: 400 }}>Every term needs {GLOSS_META[g].required.map((k) => ({ def: 'a definition', owner: 'an owner', steward: 'a steward', syn: 'synonyms', rules: 'business rules', linked: 'a linked asset' }[k])).join(', ')} · {GLOSS_META[g].approval ? 'new terms need approval' : 'the owner approves directly'} · {GLOSS_META[g].propose === 'Everyone' ? 'anyone can propose' : 'owners and stewards add terms'}</div></div>}
          <div className="gl-prop"><label>Owners</label><div className="v">{(GLOSS_META[g]?.owners || owners).length ? (GLOSS_META[g]?.owners || owners).map((o) => <Person key={o} name={o} />) : '—'}</div></div>
          <div className="gl-prop"><label>Status</label><div className="v">{Object.entries(c).filter(([, n]) => n).map(([k, n]) => <Fragment key={k}><Badge status={k} /><span className="gl-muted">{n}</span></Fragment>)}</div></div>
        </aside>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ term profile */
/* Demo "AI" draft built from the term's own metadata — no API call. */
function aiDraftText(field, t) {
  const domain = t.g.toLowerCase();
  const assets = t.linked.filter((a) => a.split('.').length === 2);
  const sample = assets.slice(0, 3).join(', ');
  const n = t.name;
  if (field === 'def')
    return `${n} is a ${domain} concept shared across the estate. It is represented by ${t.linked.length} linked asset(s)${sample ? `, including ${sample}` : ''}, and gives teams a single, agreed meaning for “${n}”.`;
  if (field === 'rules')
    return [
      `${n} must have a unique, stable identifier.`,
      `Each ${n} is owned by the ${t.g} domain and reviewed by its steward.`,
      `Changes to ${n} are logged and need governance-lead or product-owner approval.`,
    ].join('\n');
  if (field === 'usage')
    return [
      `“How many ${n.toLowerCase()} records are in the ${t.g} domain?”`,
      `Used to join ${sample || 'related assets'} into a single ${n.toLowerCase()} view.`,
    ].join('\n');
  if (field === 'notes')
    return `Draft generated from the ${t.g} glossary and ${t.linked.length} linked asset(s). Review and edit before marking ${n} authoritative.`;
  return '';
}

function EditForm({ ui, t }) {
  const init = { def: t.def, owner: t.owner, steward: t.steward, custodian: t.custodian, syn: t.syn.join('; '), rules: t.rules.join('\n'), usage: t.usage.join('\n'), notes: t.notes };
  const [f, setF] = useState(init);
  const [ai, setAi] = useState({});   /* field → value before AI generate, so it can be undone */
  /* Size the card so its body scrolls and the footer sits at the bottom of the visible
     area (the .content scroller has 88px of bottom padding, so a sticky footer would float
     up — a bounded flex column avoids that entirely). */
  const cardRef = useRef(null);
  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;
    const scroller = card.closest('.content');
    if (scroller) scroller.scrollTop = 0;
    const fit = () => { const top = card.getBoundingClientRect().top; card.style.maxHeight = `${Math.max(360, window.innerHeight - top - 20)}px`; };
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, []);
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));
  const genAI = (k) => { setAi((a) => ({ ...a, [k]: f[k] })); setF((p) => ({ ...p, [k]: aiDraftText(k, t) })); };
  const undoAI = (k) => { setF((p) => ({ ...p, [k]: ai[k] })); setAi((a) => { const n = { ...a }; delete n[k]; return n; }); };
  const spNL = (s) => s.split('\n').map((x) => x.trim()).filter(Boolean);
  const spSemi = (s) => s.split(';').map((x) => x.trim()).filter(Boolean);
  const upd = { def: f.def.trim(), owner: f.owner.trim(), steward: f.steward.trim(), custodian: f.custodian.trim(), syn: spSemi(f.syn), rules: spNL(f.rules), usage: spNL(f.usage), notes: f.notes.trim() };
  const dirty = JSON.stringify([upd.def, upd.owner, upd.steward, upd.custodian, upd.syn, upd.rules, upd.usage, upd.notes])
    !== JSON.stringify([t.def, t.owner, t.steward, t.custodian, t.syn, t.rules, t.usage, t.notes]);
  const save = () => { saveTerm(t.id, upd); ui.update({ edit: false }); toast('Changes saved'); };

  const compact = (k, label) => (
    <div><label htmlFor={`e_${k}`}>{label}</label><input className="input" id={`e_${k}`} value={f[k]} onChange={set(k)} /></div>
  );
  const aiField = (k, label, placeholder) => (
    <div className="gl-fld">
      <div className="gl-fld-head">
        <label htmlFor={`e_${k}`}>{label}</label>
        <div className="gl-fld-tools">
          {ai[k] !== undefined && <span className="tag gl-ai-tag">AI draft<button type="button" className="gl-undo" onClick={() => undoAI(k)}>Undo</button></span>}
          <button type="button" className="btn ghost sm" onClick={() => genAI(k)}><Sparkles size={14} strokeWidth={1.7} />AI generate</button>
        </div>
      </div>
      <textarea className="input gl-edit-ta" id={`e_${k}`} rows={5} value={f[k]} onChange={set(k)} placeholder={placeholder} />
    </div>
  );

  return (
    <div className="card gl-editcard" ref={cardRef}>
      <div className="gl-editbody">
        <h3>Edit term</h3><p className="sub">Every change is recorded in the term's history.</p>
        {aiField('def', 'Definition')}
        <div className="gl-formgrid">{compact('owner', 'Owner')}{compact('steward', 'Steward')}{compact('custodian', 'Custodian')}</div>
        <div className="gl-fld"><label htmlFor="e_syn">Synonyms (; separated)</label><input className="input" id="e_syn" value={f.syn} onChange={set('syn')} /></div>
        {aiField('rules', 'Business rules', 'One rule per line')}
        {aiField('usage', 'Usage examples', 'One example per line')}
        {aiField('notes', 'Notes')}
      </div>
      <div className="gl-editfoot">
        <button className="btn secondary md" onClick={() => ui.update({ edit: false })}>Cancel</button>
        <button className="btn primary md" disabled={!dirty} onClick={save}>Save changes</button>
      </div>
    </div>
  );
}

function OverviewTab({ ui, t }) {
  const nav = useNav(ui);
  if (ui.edit) return <EditForm ui={ui} t={t} />;
  const list = (a, empty) => (a.length ? <ul className="gl-clean">{a.map((x, i) => <li key={i}>{x}</li>)}</ul> : <div className="gl-muted">{empty}</div>);
  return (
    <>
      <div className="card pad">
        <h3>Term summary</h3>
        <dl className="gl-kv" style={{ marginTop: 10 }}>
          <dt>Glossary</dt><dd><button className="gl-tlink" onClick={() => nav.glossary(t.g)}>{t.g}</button></dd>
          <dt>Parent term</dt><dd>{t.parent ? <button className="gl-tlink" onClick={() => nav.term(t.parent)}>{T(t.parent).name}</button> : '—'}</dd>
          <dt>Definition</dt><dd style={{ fontWeight: 400 }}>{t.def}</dd>
          <dt>Status</dt><dd><Badge status={t.status} /></dd>
          <dt>Linked</dt><dd>{t.linked.length} assets and columns</dd>
        </dl>
      </div>
      <div className="card pad"><h3>Business rules</h3>{list(t.rules, 'No business rules yet. Edit the term to add them.')}</div>
      <div className="card pad"><h3>Usage examples</h3>{list(t.usage, 'No usage examples yet.')}</div>
      <div className="card pad"><h3>Notes</h3><div className={t.notes ? '' : 'gl-muted'}>{t.notes || 'No notes.'}</div></div>
    </>
  );
}

function LinkedTab({ ui, t }) {
  const nav = useNavigate();
  const rows = t.linked.map((a) => ({ a, ...assetInfo(a) }));
  const types = {};
  rows.forEach((r) => { types[r.type] = (types[r.type] || 0) + 1; });
  const shown = rows.filter((r) => (ui.atype === 'all' || r.type === ui.atype) && (!ui.aq || r.a.toLowerCase().includes(ui.aq.toLowerCase())));
  const exportCsv = () => {
    const csv = 'asset,type,source\n' + t.linked.map((a) => { const i = assetInfo(a); return `${a},${i.type},${i.src}`; }).join('\n');
    const b = new Blob([csv], { type: 'text/csv' });
    const el = document.createElement('a'); el.href = URL.createObjectURL(b); el.download = `${t.id}-linked-assets.csv`; el.click();
    toast('Exported linked assets');
  };
  return (
    <div className="card">
      <div className="gl-toolbar" style={{ padding: '14px 14px 0' }}>
        <div className="gl-msearch"><Search size={14} strokeWidth={2} /><input value={ui.aq} onChange={(e) => ui.update({ aq: e.target.value })} placeholder="Search linked assets…" aria-label="Search linked assets" /></div>
        <div className="gl-linked-acts">
          <button className="btn secondary md" onClick={exportCsv}><Download size={14} />Export</button>
          <button className="btn primary md" onClick={() => ui.update({ overlay: { type: 'link', id: t.id } })}><Plus size={15} />Link assets</button>
        </div>
      </div>
      <div className="gl-chiprow">
        <span className={`chip ${ui.atype === 'all' ? 'on' : ''}`} onClick={() => ui.update({ atype: 'all' })}>All <small>{rows.length}</small></span>
        {Object.entries(types).map(([k, n]) => <span key={k} className={`chip ${ui.atype === k ? 'on' : ''}`} onClick={() => ui.update({ atype: k })}>{cap(k)} <small>{n}</small></span>)}
      </div>
      {shown.length ? shown.map((r) => {
        const Ico = TICON[r.type] || Table2;
        const id = assetId(r.a);
        return (
          <div className="gl-arow" key={r.a}>
            <div className="gl-aico"><Ico size={15} strokeWidth={1.7} /></div>
            <div>
              {id ? <button className="gl-an" onClick={() => nav(`/app/catalogue/${id}`)} title={`Open ${r.a}`}>{r.a}</button> : <span className="gl-an is-static">{r.a}</span>}
              <div className="gl-am"><span>{cap(r.type)}</span><span>·</span><span>{r.src}</span></div>
            </div>
            <button className="ib" title="Unlink asset" aria-label={`Unlink ${r.a}`} onClick={() => { unlinkAsset(t.id, r.a); toast('Asset unlinked'); }}><Unlink size={15} /></button>
          </div>
        );
      }) : <div className="gl-empty">No linked assets yet. Link an asset so people can find this term from the data.</div>}
    </div>
  );
}

function RelTab({ ui, t }) {
  const nav = useNav(ui);
  const par = t.parent ? T(t.parent) : null;
  const ch = kids(t.id);
  const syn = t.syn;
  const sib = par ? kids(par.id).filter((x) => x.id !== t.id) : [];
  const W = 760, H = par ? 320 : 230, cx = 380, cy = par ? 160 : 70;
  const box = (key, x, y, label, sub, id, hl) => (
    <g key={key} className="gl-gnode" onClick={id ? () => nav.term(id) : undefined} style={{ cursor: id ? 'pointer' : 'default' }}>
      <rect x={x - 80} y={y - 22} width={160} height={44} rx={10} fill={hl ? '#EDF4FF' : '#fff'} stroke={hl ? '#4D8CFF' : '#C9D6E6'} strokeWidth={hl ? 1.6 : 1} />
      <text x={x} y={y - 2} textAnchor="middle" fontSize="12.5" fontWeight="600" fill="#0E2A57">{label.length > 20 ? label.slice(0, 19) + '…' : label}</text>
      <text x={x} y={y + 13} textAnchor="middle" fontSize="10.5" fill="#566A89">{sub}</text>
    </g>
  );
  const edges = [], nodes = [];
  if (par) {
    edges.push(<path key="pe" d={`M${cx} ${cy - 22}V${70 + 22}`} stroke="#A9D3FF" strokeWidth="1.5" fill="none" />);
    nodes.push(box('p', cx, 70, par.name, 'Parent term', par.id));
  }
  ch.forEach((k, i) => {
    const x = cx + (i - (ch.length - 1) / 2) * 180;
    edges.push(<path key={`ce${i}`} d={`M${cx} ${cy + 22}C${cx} ${cy + 50} ${x} ${cy + 50} ${x} ${cy + 102 - 22}`} fill="none" stroke="#A9D3FF" strokeWidth="1.5" />);
    nodes.push(box(`c${i}`, x, cy + 102, k.name, 'Child term', k.id));
  });
  syn.forEach((n, i) => {
    const y = cy + (i - (syn.length - 1) / 2) * 56;
    edges.push(<path key={`se${i}`} d={`M${cx + 80} ${cy}L${620 - 80} ${y}`} stroke="#A9D3FF" strokeDasharray="4 4" strokeWidth="1.5" fill="none" />);
    nodes.push(box(`s${i}`, 620, y, n, 'Synonym'));
  });
  sib.slice(0, 3).forEach((k, i) => {
    const y = cy + (i - (Math.min(3, sib.length) - 1) / 2) * 56;
    edges.push(<path key={`sib${i}`} d={`M${cx - 80} ${cy}L${140 + 80} ${y}`} stroke="#D7E1EC" strokeWidth="1.5" fill="none" />);
    nodes.push(box(`sib${i}`, 140, y, k.name, 'Sibling term', k.id));
  });
  const none = !par && !ch.length && !syn.length;
  return (
    <div className="card pad gl-graph">
      <h3>Relationships</h3><p className="sub">Parent, child and sibling terms and synonyms. Select a term to open it.</p>
      {none ? <div className="gl-empty">No related terms or synonyms yet.</div>
        : <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Relationships of ${t.name}`}>{edges}{nodes}{box('self', cx, cy, t.name, STATUS[t.status][0], null, true)}</svg>}
    </div>
  );
}

function HistTab({ t }) {
  return (
    <div className="card pad">
      <h3>History</h3><p className="sub">Every status change and edit to this term.</p>
      <div className="gl-hist">{t.hist.map((h, i) => <div key={i}><span className="dot" /><div><b>{h.what}</b><small>{h.t} · {h.who}</small></div></div>)}</div>
    </div>
  );
}

function TermActions({ ui, t }) {
  if (t.status === 'draft') return (
    <div className="gl-banner"><Send size={16} /><div><b>Draft.</b> This term is waiting to be submitted for review.</div>
      <div className="gl-banner-acts"><button className="btn primary md" onClick={() => setStatus(t.id, 'review')}>Submit for review</button></div></div>
  );
  if (t.status === 'review') return (
    <div className="gl-banner"><Bell size={16} /><div><b>In review.</b> Needs approval by governance-lead or product-owner. You are {ROLE}.</div>
      <div className="gl-banner-acts"><button className="btn subtle md" onClick={() => setStatus(t.id, 'draft')}>Reject</button><button className="btn primary md" onClick={() => setStatus(t.id, 'approved')}><Check size={14} />Approve</button></div></div>
  );
  if (t.status === 'deprecated') return (
    <div className="gl-banner gl-banner-dep"><X size={16} /><div><b>Deprecated.</b> Kept for history; don't use this term for new work.</div>
      <div className="gl-banner-acts"><button className="btn secondary md" onClick={() => setStatus(t.id, 'draft')}>Restore as draft</button></div></div>
  );
  return null;
}

function TermPage({ ui, t }) {
  const nav = useNav(ui);
  const srcs = [...new Set(t.linked.map((a) => assetInfo(a).src))];
  const ch = kids(t.id);
  const tabs = [['overview', 'Overview'], ['linked', 'Linked assets', t.linked.length], ['rel', 'Relationships'], ['hist', 'History', t.hist.length]];
  const copyLink = () => { navigator.clipboard?.writeText(window.location.origin + '/app/glossary/' + t.id).catch(() => {}); toast('Link copied'); };
  return (
    <>
      <div className="gl-thead">
        <div className="gl-ticon"><FileText size={20} strokeWidth={1.7} /></div>
        <div><h1>{t.name} <Badge status={t.status} /></h1>
          <div className="gl-kind">Term · <button className="gl-tlink" onClick={() => nav.glossary(t.g)}>{t.g}</button>{t.parent && <> / <button className="gl-tlink" onClick={() => nav.term(t.parent)}>{T(t.parent).name}</button></>}</div>
        </div>
        <div className="gl-tools">
          <button className={`ib ${ui.star.has(t.id) ? 'on' : ''}`} title="Star" aria-label="Star" onClick={() => { ui.toggleSet('star', t.id); toast(ui.star.has(t.id) ? 'Removed from starred' : 'Starred'); }}><Star size={16} fill={ui.star.has(t.id) ? 'currentColor' : 'none'} /></button>
          <button className="ib" title="Copy link" aria-label="Copy link" onClick={copyLink}><Link2 size={16} /></button>
          <button className="ib" title="Edit" aria-label="Edit term" onClick={() => ui.update({ tab: 'overview', edit: true })}><Pencil size={16} /></button>
          <button className="ib" title="Notify me of changes" aria-label="Notify me" onClick={() => toast("You'll be notified when this term changes")}><Bell size={16} /></button>
          <button className="ib" title="More" aria-label="More actions" onClick={() => ui.update({ menu: !ui.menu })}><MoreHorizontal size={16} /></button>
          {ui.menu && <>
            <div className="gl-menu-cover" onClick={() => ui.update({ menu: false })} />
            <div className="gl-menu">
              {t.status === 'approved' && <button onClick={() => { ui.update({ menu: false }); setStatus(t.id, 'deprecated'); }}><X size={15} />Deprecate term</button>}
              <button onClick={() => { ui.update({ menu: false }); exportLinked(t); }}><Download size={15} />Export linked assets</button>
              <button onClick={() => { ui.update({ menu: false }); nav.newTerm(t.g, t.id); }}><Plus size={15} />Add child term</button>
              <button onClick={() => ui.update({ menu: false, overlay: { type: 'delete', id: t.id } })}><Trash2 size={15} />Delete term</button>
            </div>
          </>}
        </div>
      </div>
      <TermActions ui={ui} t={t} />
      <div className="tabs" role="tablist">
        {tabs.map(([k, n, cnt]) => <button key={k} className={`tab ${ui.tab === k ? 'on' : ''}`} role="tab" onClick={() => ui.update({ tab: k, edit: false })}>{n}{cnt != null && <small>{cnt}</small>}</button>)}
      </div>
      <div className="gl-pgrid">
        <div className="gl-stack">
          {ui.tab === 'overview' ? <OverviewTab ui={ui} t={t} /> : ui.tab === 'linked' ? <LinkedTab ui={ui} t={t} /> : ui.tab === 'rel' ? <RelTab ui={ui} t={t} /> : <HistTab t={t} />}
        </div>
        <aside className="gl-side">
          <div className="gl-prop"><label>Name</label><div className="v">{t.name}</div></div>
          <div className="gl-prop"><label>Definition</label><div className="v" style={{ fontWeight: 400 }}>{t.def}</div></div>
          <div className="gl-prop"><label>Glossary</label><div className="v"><button className="gl-tlink" onClick={() => nav.glossary(t.g)}><Book size={14} strokeWidth={1.7} /> {t.g}</button></div></div>
          <div className="gl-prop"><label>Status</label><div className="v"><div className="gl-cert"><b><Badge status={t.status} /></b><span>{t.hist[0]?.who || ''} · {(t.hist[0]?.t || '').split(',')[0]}</span></div></div></div>
          <div className="gl-prop"><label>Owner</label><div className="v"><Person name={t.owner} /></div></div>
          <div className="gl-prop"><label>Steward</label><div className="v"><Person name={t.steward} /></div></div>
          <div className="gl-prop"><label>Custodian</label><div className="v"><Person name={t.custodian} /></div></div>
          <div className="gl-prop"><label>Synonyms</label><div className="v">{t.syn.length ? t.syn.map((s) => <span key={s} className="tag">{s}</span>) : <span className="gl-faint">—</span>}</div></div>
          <div className="gl-prop"><label>Child terms</label><div className="v">{ch.length ? ch.map((k, i) => <Fragment key={k.id}>{i ? ', ' : ''}<button className="gl-tlink" onClick={() => nav.term(k.id)}>{k.name}</button></Fragment>) : <span className="gl-faint">—</span>}</div></div>
          <div className="gl-prop"><label>Linked sources</label><div className="v">{srcs.length ? srcs.map((s) => <span key={s} className="tag">{s}</span>) : <span className="gl-faint">None yet</span>}</div></div>
        </aside>
      </div>
    </>
  );
}

function exportLinked(t) {
  const csv = 'asset,type,source\n' + t.linked.map((a) => { const i = assetInfo(a); return `${a},${i.type},${i.src}`; }).join('\n');
  const b = new Blob([csv], { type: 'text/csv' });
  const el = document.createElement('a'); el.href = URL.createObjectURL(b); el.download = `${t.id}-linked-assets.csv`; el.click();
  toast('Exported linked assets');
}

/* ------------------------------------------------------------------ drawers & modals */
function DeleteModal({ ui }) {
  const nav = useNav(ui);
  const t = T(ui.overlay.id);
  const close = () => ui.update({ overlay: null });
  if (!t) return null;
  const kc = kids(t.id).length;
  return (
    <>
      <div className="gl-scrim" onClick={close} />
      <div className="gl-modal" role="alertdialog" aria-label="Delete term">
        <h3>Delete "{t.name}"?</h3>
        <p className="gl-muted" style={{ margin: '0 0 16px' }}>This removes the term and its {t.linked.length} asset links{kc ? `, and makes its ${kc} child terms top-level` : ''}. Consider deprecating it instead.</p>
        <div className="gl-modal-acts">
          <button className="btn secondary md" onClick={close}>Cancel</button>
          <button className="btn secondary md" onClick={() => { close(); setStatus(t.id, 'deprecated'); }}>Deprecate instead</button>
          <button className="btn primary md" onClick={() => { deleteTerm(t.id); ui.update({ overlay: null }); toast(`Deleted "${t.name}"`); nav.home(); }}>Delete term</button>
        </div>
      </div>
    </>
  );
}

function LinkDrawer({ ui }) {
  const t = T(ui.overlay.id);
  const [q, setQ] = useState('');
  const [sel, setSel] = useState(() => new Set());
  const close = () => ui.update({ overlay: null });
  if (!t) return null;
  const opts = Object.keys(ASSET).filter((a) => !t.linked.includes(a) && a.toLowerCase().includes(q.toLowerCase()));
  const toggle = (a) => setSel((s) => { const n = new Set(s); n.has(a) ? n.delete(a) : n.add(a); return n; });
  const doLink = () => { if (sel.size) { linkAssets(t.id, [...sel]); toast(`Linked ${sel.size} asset(s)`); } ui.update({ overlay: null }); };
  return (
    <>
      <div className="gl-scrim" onClick={close} />
      <div className="gl-drawer" role="dialog" aria-label="Link assets">
        <header>Link assets to {t.name}<button className="ib" aria-label="Close" onClick={close}><X size={16} /></button></header>
        <div className="gl-db">
          <div className="gl-msearch"><Search size={14} strokeWidth={2} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search assets…" aria-label="Search assets" /></div>
          <div>{opts.map((a) => { const i = assetInfo(a); return (
            <label key={a} className="gl-chk"><input type="checkbox" checked={sel.has(a)} onChange={() => toggle(a)} /><span className="gl-mono">{a}</span><span className="gl-cnt">{i.type}</span></label>
          ); })}
          {!opts.length && <div className="gl-empty">No assets match.</div>}</div>
        </div>
        <footer><button className="btn secondary md" onClick={close}>Cancel</button><button className="btn primary md" onClick={doLink}>Link selected</button></footer>
      </div>
    </>
  );
}

function Toast() {
  const [msg, setMsg] = useState(null);
  const timer = useRef();
  useEffect(() => {
    registerToast((m) => { setMsg(m); clearTimeout(timer.current); timer.current = setTimeout(() => setMsg(null), 2200); });
    return () => { registerToast(null); clearTimeout(timer.current); };
  }, []);
  return msg ? <div className="gl-toast">{msg}</div> : null;
}

/* ------------------------------------------------------------------ content dispatcher */
export default function Glossary({ ui }) {
  useGlossaryData();
  const { view, glossary, term } = useView();
  const t = view === 'term' ? T(term) : null;

  let body;
  if (view === 'new') body = <GlossaryNewTerm />;
  else if (view === 'new-glossary') body = <GlossaryNewGlossary />;
  else if (view === 'term') body = t ? <TermPage ui={ui} t={t} /> : <Home ui={ui} />;
  else if (view === 'glossary') body = <GlossaryPage ui={ui} g={glossary} />;
  else body = <Home ui={ui} />;

  /* Overlays (scrim, drawers, modal, toast) are position:fixed. The page's fade-in
     animation leaves an identity transform on .gl / .inner-shell, which would make those
     the containing block and size the drawer to the page, not the viewport — so portal the
     overlays to <body> where fixed is viewport-relative. */
  return (
    <div className="gl fade-in">
      {body}
      {createPortal(
        <div className="gl">
          {ui.overlay?.type === 'delete' && <DeleteModal ui={ui} />}
          {ui.overlay?.type === 'link' && <LinkDrawer ui={ui} />}
          <Toast />
        </div>,
        document.body,
      )}
    </div>
  );
}
