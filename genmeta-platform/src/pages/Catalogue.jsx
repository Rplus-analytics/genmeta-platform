import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, X, ChevronDown, ChevronUp, ChevronsUpDown, ArrowUpDown, BadgeCheck, Sparkles, Server, Database, FolderTree, Shapes,
  Boxes, UserRound, ShieldAlert, Gauge, Layers, Activity, Tags,
} from 'lucide-react';
import { useCollapsed, RailHead } from '../components/Rail.jsx';
import {
  ASSETS, FACETS, EXAMPLES, KIND_ICON, facetCounts, matchesFilters, matchesText, parseQuestion, srcMeta, kindLabel, tiles, pct,
} from '../catalogue/model.js';

/* Filters survive opening an asset and coming back */
const SAVED = { sel: {}, words: [], asked: '', q: '', sort: 'relevance' };

const SORTS = { relevance: 'Relevance', name: 'Name (A–Z)', trust: 'Trust score' };
const FACET_LABEL = Object.fromEntries(FACETS.map((f) => [f.key, f.label]));

export function SrcMark({ source, size = 20 }) {
  const m = srcMeta(source);
  return <span className="srcmark" style={{ '--s': `${size}px` }} title={m.vendor}>{m.ini}</span>;
}

export function Sens({ v }) {
  return <span className={`sens sens-${v.toLowerCase()}`}>{v}</span>;
}

const FACET_ICON = {
  source: Server, db: Database, schema: FolderTree, kind: Shapes,
  domain: Boxes, owner: UserRound, sensitivity: ShieldAlert, quality: Gauge, layer: Layers, usage: Activity, tags: Tags,
};
const DROP_ALL = { source: 'All source systems', db: 'All databases', schema: 'All schemas', kind: 'All asset types' };
const optLabel = (k, v) => (k === 'kind' ? kindLabel(v) : v);

/* One of the stacked dropdowns: source system › database › schema, then asset type */
function Drop({ f, opts, value, onChange }) {
  const I = FACET_ICON[f.key];
  const shown = opts.filter((o) => o.n > 0 || o.v === value);
  return (
    <label className={`fdrop ${value ? 'set' : ''}`}>
      <I size={15} strokeWidth={1.75} />
      <select value={value || ''} onChange={(e) => onChange(e.target.value || null)} aria-label={f.label}>
        <option value="">{DROP_ALL[f.key]}</option>
        {shown.map(({ v, n }) => <option key={v} value={v}>{optLabel(f.key, v)} ({n})</option>)}
      </select>
      <ChevronsUpDown size={14} className="fdrop-c" />
    </label>
  );
}

function FacetGroup({ f, opts, sel, toggle, focus }) {
  const I = FACET_ICON[f.key];
  const [open, setOpen] = useState(sel.length > 0 || focus);
  const [more, setMore] = useState(false);
  const shown = more ? opts : opts.slice(0, 6);
  return (
    <section className="fgroup">
      <button className={`admin-link fgroup-h ${open ? 'on' : ''}`} onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <I size={16} strokeWidth={1.6} /><span>{f.label}</span>{sel.length > 0 && <em>{sel.length}</em>}{open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>
      {open && (
        <div className="fgroup-b">
          {shown.map(({ v, n }) => (
            <label key={v} className={`fopt ${n === 0 && !sel.includes(v) ? 'zero' : ''}`}>
              <input type="checkbox" checked={sel.includes(v)} onChange={() => toggle(f.key, v)} />
              <span className="fopt-l" title={v}>{v}</span><span className="fopt-n">{n}</span>
            </label>
          ))}
          {opts.length > 6 && <button className="fmore" onClick={() => setMore((m) => !m)}>{more ? 'Show fewer' : `Show ${opts.length - 6} more`}</button>}
        </div>
      )}
    </section>
  );
}

function AssetRow({ a, onOpen }) {
  const I = KIND_ICON[a.kind] || KIND_ICON.table;
  const verified = a.trust >= 0.8;
  return (
    <article className="arow" onClick={onOpen} onKeyDown={(e) => e.key === 'Enter' && onOpen()} tabIndex={0} role="link" aria-label={`Open ${a.fqn}`}>
      <div className="arow-main">
        <div className="arow-t">
          <SrcMark source={a.source} />
          <b>{a.fqn}</b>
          {verified && <BadgeCheck size={15} className="verified" aria-label="Verified" />}
          <Sens v={a.sensitivity} />
        </div>
        <div className="arow-path">
          <span><I size={13} strokeWidth={1.75} />{kindLabel(a.kind)}</span>
          <span className="sep">·</span><span>{a.source}</span>
          <span className="sep">›</span><span>{a.db}</span>
          <span className="sep">›</span><span className="mono">{a.schema}</span>
          {a.layer && <><span className="sep">·</span><span>{a.layer}</span></>}
        </div>
        <p className={`arow-d ${a.desc ? '' : 'none'}`}>{a.desc || 'No description yet'}</p>
        <div className="arow-meta">
          <span>{a.cols} {a.cols === 1 ? 'column' : 'columns'}</span>
          <span>Owner <b>{a.owner}</b></span>
          <span>Domain <b>{a.domain}</b></span>
          {a.terms.map((t) => <span key={t} className="term">{t}</span>)}
          {a.cls.map((c) => <span key={c} className="cls">{c}</span>)}
        </div>
      </div>
      <div className="arow-side">
        <span className={`qband q-${a.quality.toLowerCase()}`}>Quality {a.quality.toLowerCase()}</span>
        <span className="trust"><i style={{ width: pct(a.trust) }} /></span>
        <small>Trust {pct(a.trust)}</small>
        <small>{a.usage}</small>
      </div>
    </article>
  );
}

export default function Catalogue() {
  const nav = useNavigate();
  const [sel, setSel] = useState(SAVED.sel);
  const [words, setWords] = useState(SAVED.words);
  const [asked, setAsked] = useState(SAVED.asked);
  const [q, setQ] = useState(SAVED.q);
  const [sort, setSort] = useState(SAVED.sort);
  const [srcOpen, setSrcOpen] = useState(true);
  const [collapsed, setCollapsed] = useCollapsed('catalogue-filters');
  const [focus, setFocus] = useState(null);
  /* In the collapsed rail each filter is an icon; choosing one opens the rail at that filter. */
  const expandAt = (k) => { setFocus(k); if (FACETS.find((f) => f.key === k)?.drop) setSrcOpen(true); setCollapsed(false); };
  Object.assign(SAVED, { sel, words, asked, q, sort });

  const toggle = (k, v) => setSel((s) => {
    const cur = s[k] || [];
    return { ...s, [k]: cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v] };
  });
  /* picking a higher level clears the levels under it */
  const setDrop = (k, v) => setSel((s) => {
    const n = { ...s, [k]: v ? [v] : [] };
    if (k === 'source') { n.db = []; n.schema = []; }
    if (k === 'db') n.schema = [];
    return n;
  });
  const ask = (text) => {
    const t = text.trim();
    if (!t) { setWords([]); setAsked(''); return; }
    const p = parseQuestion(t);
    setQ(t); setAsked(t); setSel(p.sel); setWords(p.words);
  };
  const clearAll = () => { setSel({}); setWords([]); setAsked(''); setQ(''); };

  const results = useMemo(() => {
    const r = ASSETS.filter((a) => matchesFilters(a, sel) && matchesText(a, words));
    if (sort === 'name') r.sort((x, y) => x.fqn.localeCompare(y.fqn));
    if (sort === 'trust') r.sort((x, y) => y.trust - x.trust);
    return r;
  }, [sel, words, sort]);
  const counts = useMemo(() => facetCounts(ASSETS, sel, words), [sel, words]);
  const active = Object.entries(sel).flatMap(([k, vs]) => vs.map((v) => [k, v]));
  const nActive = active.length + (words.length ? 1 : 0);

  return (
    <div className="page cat fade-in">
      <span className="eyebrow cat-eyebrow">Discover</span>

      <div className="tiles-sm">
        {tiles(results).map((t) => (
          <div key={t.k}><b>{t.v.toLocaleString('en-GB')}</b><span>{t.k}</span><small>{t.s}</small></div>
        ))}
      </div>

      <form className="askbox" onSubmit={(e) => { e.preventDefault(); ask(q); }}>
        <Sparkles size={16} strokeWidth={1.75} />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder='Ask in plain English, e.g. "show me customer tables with PII"' aria-label="Ask in plain English" />
        {q && <button type="button" className="icon-btn" onClick={clearAll} aria-label="Clear"><X size={15} /></button>}
        <button type="submit" className="btn primary">Search</button>
      </form>
      <div className="examples">
        {EXAMPLES.map((e) => <button key={e} onClick={() => ask(e)} className={asked === e ? 'on' : ''}>{e}</button>)}
      </div>

      <div className={`cat-grid ${collapsed ? 'rail-collapsed' : ''}`}>
        <aside className={`admin-nav cat-rail ${collapsed ? 'collapsed' : ''}`} aria-label="Filters">
          <RailHead title="Filters" collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
          {collapsed ? (
            FACETS.map((f, i) => {
              const I = FACET_ICON[f.key];
              const n = sel[f.key]?.length || 0;
              return (
                <div key={f.key}>
                  {(i === 0 || (!f.drop && FACETS[i - 1].drop)) && <div className="admin-nav-sec" />}
                  <button className={`admin-link ${n ? 'on' : ''}`} onClick={() => expandAt(f.key)} title={n ? `${f.label} (${n} selected)` : f.label} aria-label={`Filter by ${f.label.toLowerCase()}`}>
                    <I size={16} strokeWidth={1.6} />{n > 0 && <i className="rail-dot" />}
                  </button>
                </div>
              );
            })
          ) : (
            <>
              {nActive > 0 && <button className="rail-clear" onClick={clearAll}>Clear all filters ({nActive})</button>}
              <button className="admin-nav-sec fsource-h" onClick={() => setSrcOpen((o) => !o)} aria-expanded={srcOpen}>
                <span>Source</span>{srcOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
              {srcOpen && (
                <div className="fsource">
                  {FACETS.filter((f) => f.drop).map((f) => (
                    <Drop key={f.key} f={f} opts={counts[f.key]} value={sel[f.key]?.[0]} onChange={(v) => setDrop(f.key, v)} />
                  ))}
                </div>
              )}
              <div className="admin-nav-sec">Metadata filters</div>
              {FACETS.filter((f) => !f.drop).map((f) => (
                <FacetGroup key={f.key} f={f} opts={counts[f.key]} sel={sel[f.key] || []} toggle={toggle} focus={focus === f.key} />
              ))}
            </>
          )}
        </aside>

        <section className="results">
          <div className="results-h">
            <div className="applied">
              {asked && <span className="asked">Results for “{asked}”</span>}
              {active.map(([k, v]) => (
                <button key={k + v} className="achip" onClick={() => toggle(k, v)} aria-label={`Remove ${FACET_LABEL[k]} ${v}`}>
                  <span>{FACET_LABEL[k]}:</span> {optLabel(k, v)}<X size={12} />
                </button>
              ))}
              {words.length > 0 && (
                <button className="achip" onClick={() => setWords([])} aria-label="Remove text search"><span>Text:</span> {words.join(' ')}<X size={12} /></button>
              )}
              {!asked && !active.length && <span className="asked">Showing all assets</span>}
            </div>
            <span className="showing">Showing <b>{results.length}</b> of {ASSETS.length}</span>
            <label className="sort"><ArrowUpDown size={14} />
              <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort">
                {Object.entries(SORTS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </select>
            </label>
          </div>

          {results.length === 0 ? (
            <div className="empty card">
              <Search size={20} />
              <b>No assets match</b>
              <p>Remove a filter or rephrase the question. Try naming a source, an owner, or a classification such as PII.</p>
              <button className="btn ghost" onClick={clearAll}>Clear all filters</button>
            </div>
          ) : (
            <div className="arows">{results.map((a) => <AssetRow key={a.id} a={a} onOpen={() => nav(`/app/catalogue/${a.id}`)} />)}</div>
          )}
        </section>
      </div>
    </div>
  );
}
