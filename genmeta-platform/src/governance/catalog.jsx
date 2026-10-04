import { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, ChevronsUpDown, X, Search, ArrowUpDown } from 'lucide-react';
import { Section as RailSection } from '../components/Rail.jsx';

/* Catalogue kit shared by the Data-assets-style list pages in Governance (Policies, DPIA & GDPR):
   facet filters that live in the inner menu, plain-text search, sort, applied-filter chips and counts.
   Same look and behaviour as AI model governance (Models.jsx). Filter state survives navigation. */

const SAVED = {};
export function useFacets(name, items, facets, textOf, sorts) {
  const s0 = SAVED[name] || { sel: {}, q: '', sort: Object.keys(sorts)[0] };
  const [sel, setSel] = useState(s0.sel);
  const [q, setQ] = useState(s0.q);
  const [sort, setSort] = useState(s0.sort);
  SAVED[name] = { sel, q, sort };
  const of = (k) => facets.find((f) => f.key === k).of;
  const matches = (it, s) => Object.entries(s).every(([k, vs]) => !vs.length || of(k)(it).some((v) => vs.includes(v)));
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  const textMatch = (it) => words.every((w) => textOf(it).toLowerCase().includes(w));
  const results = useMemo(() => {
    const r = items.filter((it) => matches(it, sel) && textMatch(it));
    const fn = sorts[sort]?.[1];
    return fn ? [...r].sort(fn) : r;
  }, [items, sel, q, sort]); // eslint-disable-line react-hooks/exhaustive-deps
  const counts = useMemo(() => Object.fromEntries(facets.map((f) => {
    const base = items.filter((it) => matches(it, { ...sel, [f.key]: [] }) && textMatch(it));
    const vals = [...new Set(items.flatMap(f.of))].sort((a, b) => String(a).localeCompare(String(b)));
    return [f.key, vals.map((v) => ({ v, n: base.filter((it) => f.of(it).includes(v)).length }))];
  })), [items, sel, q]); // eslint-disable-line react-hooks/exhaustive-deps
  const toggle = (k, v) => setSel((s) => { const cur = s[k] || []; return { ...s, [k]: cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v] }; });
  const setDrop = (k, v) => setSel((s) => ({ ...s, [k]: v ? [v] : [] }));
  const active = Object.entries(sel).flatMap(([k, vs]) => vs.map((v) => [k, v]));
  const clearAll = () => { setSel({}); setQ(''); };
  return { facets, sel, toggle, setDrop, q, setQ, sort, setSort, sorts, results, counts, active, clearAll, nActive: active.length + (words.length ? 1 : 0), total: items.length };
}

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
  const [open, setOpen] = useState(sel.length > 0 || !!f.open);
  return (
    <section className="fgroup">
      <button type="button" className={`admin-link fgroup-h ${open ? 'on' : ''}`} onClick={() => setOpen((o) => !o)} aria-expanded={open}>
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
/* the filters shown in the inner menu under the section links */
export function FacetPanel({ state, sourceLabel = 'Source' }) {
  const { facets, sel, toggle, setDrop, counts, clearAll, nActive } = state;
  const drops = facets.filter((f) => f.drop);
  return (
    <div className="cat-filters">
      <div className="inner-sep" />
      <div className="cat-filters-h">
        <span className="admin-nav-sec">Filters</span>
        {nActive > 0 && <button type="button" className="btn link cat-clear" onClick={clearAll}>Clear ({nActive})</button>}
      </div>
      {drops.length > 0 && (
        <RailSection label={sourceLabel} defaultOpen>
          <div className="fsource">{drops.map((f) => <Drop key={f.key} f={f} opts={counts[f.key]} value={sel[f.key]?.[0]} onChange={(v) => setDrop(f.key, v)} />)}</div>
        </RailSection>
      )}
      {facets.filter((f) => !f.drop).map((f) => <FacetGroup key={f.key} f={f} opts={counts[f.key]} sel={sel[f.key] || []} toggle={toggle} />)}
    </div>
  );
}

/* search box, applied chips, count and sort above the list */
export function ResultsHead({ state, noun, placeholder }) {
  const { q, setQ, active, toggle, facets, sort, setSort, sorts, results, total, clearAll } = state;
  const label = (k) => facets.find((f) => f.key === k)?.label;
  return (
    <>
      <div className="askbox cat-search">
        <Search size={16} strokeWidth={1.75} />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={placeholder} aria-label={`Search ${noun}`} />
        {q && <button type="button" className="icon-btn" onClick={() => setQ('')} aria-label="Clear"><X size={15} /></button>}
      </div>
      <div className="results-h">
        <div className="applied">
          {active.map(([k, v]) => <button type="button" key={k + v} className="achip" onClick={() => toggle(k, v)} aria-label={`Remove ${label(k)} ${v}`}><span>{label(k)}:</span> {v}<X size={12} /></button>)}
          {q && <button type="button" className="achip" onClick={() => setQ('')}><span>Text:</span> {q}<X size={12} /></button>}
          {!active.length && !q && <span className="asked">Showing all {noun}</span>}
          {(active.length > 0 || q) && <button type="button" className="btn link" onClick={clearAll}>Clear all</button>}
        </div>
        <span className="showing">Showing <b>{results.length}</b> of {total}</span>
        <label className="sort"><ArrowUpDown size={14} />
          <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort">{Object.entries(sorts).map(([k, [l]]) => <option key={k} value={k}>{l}</option>)}</select>
        </label>
      </div>
    </>
  );
}
