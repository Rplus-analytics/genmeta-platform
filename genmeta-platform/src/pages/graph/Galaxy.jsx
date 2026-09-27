import { useMemo, useState } from 'react';
import { Search, RotateCcw, RefreshCw, Info } from 'lucide-react';
import { SOURCES as ESTATE_SOURCES, CATALOGUE } from '../../data.js';
import { BRAND } from '../../brand.js';
import { AdminHead } from '../admin/kit.jsx';
import { kindLabel } from '../../catalogue/model.js';
import {
  GALAXY_KPIS, SOURCES, TYPE_CHIPS, LIST_ROWS, CAPABILITY_PANELS, assetNodeType,
} from './graphModel.js';
import { ASSETS, BY_KEY } from '../../catalogue/model.js';

const W = 1100, H = 640, CX = W / 2, CY = H / 2;

/* The current new-UI knowledge-graph picture: the estate hub, its source systems
   and their tables. Hover a system to trace its assets; click to open details. */
function GraphPicture({ hot, setHot, dimSources, onPick }) {
  const srcNodes = ESTATE_SOURCES.map((s, i) => {
    const a = (i / ESTATE_SOURCES.length) * Math.PI * 2 - Math.PI / 2;
    return { ...s, x: CX + Math.cos(a) * 190, y: CY + Math.sin(a) * 175, a };
  });
  const tblNodes = srcNodes.flatMap((s) => {
    const kids = CATALOGUE.filter((t) => t.sourceId === s.id);
    return kids.map((t, j) => {
      const a = s.a + (j - (kids.length - 1) / 2) * 0.15, r = Math.abs(Math.sin(s.a)) > 0.9 && j % 2 === 0 ? 0.86 : 1;
      return { ...t, x: CX + Math.cos(a) * 400 * r, y: CY + Math.sin(a) * 285 * r, parent: s.id };
    });
  });
  const off = (id) => (hot && hot !== id) || (dimSources && !dimSources.has(id));
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="graph">
      <defs>
        <radialGradient id="hub" cx="50%" cy="40%"><stop offset="0" stopColor="#A1CBF7" /><stop offset="1" stopColor="#447DE6" /></radialGradient>
      </defs>
      {srcNodes.map((s) => <line key={`h-${s.id}`} x1={CX} y1={CY} x2={s.x} y2={s.y} className={`edge flow ${off(s.id) ? 'dim' : ''}`} />)}
      {tblNodes.map((t) => {
        const p = srcNodes.find((s) => s.id === t.parent);
        return <line key={`e-${t.id}`} x1={p.x} y1={p.y} x2={t.x} y2={t.y} className={`edge ${off(t.parent) ? 'dim' : ''}`} />;
      })}
      {tblNodes.map((t) => (
        <g key={t.id} className={`gnode ${off(t.parent) ? 'dim' : ''}`} transform={`translate(${t.x},${t.y})`}
          onClick={() => onPick({ title: t.name, sub: `${t.source} · ${t.classification || 'Table'}`, rows: [['Source', t.source], ['Schema', t.schema], ['Fields', t.fields], ['Classification', t.classification], ['Described', t.described ? 'Yes' : 'Awaiting description'], ['Owner', t.owner]] })}>
          <circle r="6" className={t.described ? 'lit' : 'unlit'} />
          <text x={t.x > CX ? 10 : -10} y="4" textAnchor={t.x > CX ? 'start' : 'end'}>{t.name}</text>
        </g>
      ))}
      {srcNodes.map((s) => (
        <g key={s.id} className={`gsrc ${off(s.id) ? 'dim' : ''}`} transform={`translate(${s.x},${s.y})`}
          onMouseEnter={() => setHot(s.id)} onMouseLeave={() => setHot(null)}
          onClick={() => onPick({ title: s.vendor, sub: `${s.name} · source system`, rows: [['Tables', s.tables], ['Fields', s.fields], ['Databases', s.dbs], ['Described', `${Math.round(s.cov * 100)}%`], ['Status', s.status] ] })}>
          <circle r="30" />
          <text y="5" textAnchor="middle" className="ini">{s.ini}</text>
          <text y="48" textAnchor="middle" className="lbl">{s.vendor}</text>
        </g>
      ))}
      <g transform={`translate(${CX},${CY})`} className="ghub">
        <circle r="52" className="pulse-ring" />
        <circle r="42" fill="url(#hub)" />
        <image href={BRAND.burst} x="-24" y="-24" width="48" height="48" style={{ filter: 'brightness(0) invert(1)' }} />
      </g>
    </svg>
  );
}

function CapabilityPanel({ p }) {
  const [view, setView] = useState('table');
  const [n, setN] = useState(0); /* refetch bump, just re-triggers the fade */
  const rows = p.payload ? Object.entries(p.payload) : [];
  return (
    <div className="kg-cap" key={n}>
      <div className="kg-cap-head">
        <div><b>{p.title}</b><code className="kg-endpoint">{p.endpoint}</code></div>
        <div className="kg-cap-tools">
          <div className="seg2 sm">
            <button className={view === 'table' ? 'on' : ''} onClick={() => setView('table')}>Table view</button>
            <button className={view === 'json' ? 'on' : ''} onClick={() => setView('json')}>JSON view</button>
          </div>
          <button className="icon-btn" title="Refetch" aria-label="Refetch" onClick={() => setN((v) => v + 1)}><RefreshCw size={14} /></button>
        </div>
      </div>
      {!p.connected ? (
        <p className="kg-empty">Evidence source not connected for this module</p>
      ) : view === 'table' ? (
        <table className="tbl kg-cap-tbl"><tbody>
          {rows.map(([k, v]) => <tr key={k}><td className="mono">{k}</td><td className="num">{typeof v === 'number' && v < 1 ? v : (typeof v === 'number' ? v.toLocaleString('en-GB') : v)}</td></tr>)}
        </tbody></table>
      ) : (
        <pre className="kg-json">{JSON.stringify(p.payload, null, 2)}</pre>
      )}
    </div>
  );
}

export default function Galaxy() {
  const [view, setView] = useState('graph');
  const [hot, setHot] = useState(null);
  const [q, setQ] = useState('');
  const [src, setSrc] = useState('All sources');
  const [types, setTypes] = useState([]); /* selected node-type chips */
  const [sel, setSel] = useState(null);
  const [capOpen, setCapOpen] = useState(false);

  const toggleType = (t) => setTypes((cur) => (cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t]));
  const reset = () => { setQ(''); setSrc('All sources'); setTypes([]); setSel(null); setHot(null); };

  /* the list view honours the search box, source dropdown and type chips */
  const rows = useMemo(() => {
    const words = q.toLowerCase().split(/\s+/).filter(Boolean);
    return LIST_ROWS.filter((r) => {
      if (src !== 'All sources' && r.source !== src) return false;
      if (types.length && !types.includes(r.type)) return false;
      if (words.length && !words.every((w) => r.key.toLowerCase().includes(w) || r.source.toLowerCase().includes(w) || r.kind.includes(w))) return false;
      return true;
    });
  }, [q, src, types]);

  /* in the graph picture, the source dropdown / search dim non-matching source systems */
  const dimSources = useMemo(() => {
    if (src === 'All sources' && !q) return null;
    const words = q.toLowerCase().split(/\s+/).filter(Boolean);
    const keep = new Set(ESTATE_SOURCES.filter((s) => {
      const label = `${s.vendor} ${s.name}`.toLowerCase();
      return (src === 'All sources' || s.vendor === src || label.includes(src.toLowerCase())) && (!words.length || words.some((w) => label.includes(w)));
    }).map((s) => s.id));
    return keep;
  }, [src, q]);

  const pickList = (key) => {
    const a = BY_KEY[key];
    if (!a) return;
    setSel({ title: a.fqn, sub: `${a.source} · ${kindLabel(a.kind)}`, rows: [
      ['Domain', a.domain], ['Owner', a.owner], ['Steward', a.steward], ['Sensitivity', a.sensitivity],
      ['Classifications', (a.cls || []).join(', ') || '—'], ['Terms', (a.terms || []).join(', ') || '—'], ['Description', a.desc || '—'],
    ] });
  };

  return (
    <div className="kg-page">
      <AdminHead title="Galaxy" sub="A visual map of your data estate — explore how sources, assets and business entities are connected." />

      <div className="tiles-sm kg-kpis">
        {GALAXY_KPIS.map((t) => (
          <div key={t.k} title={t.s}><b>{t.v.toLocaleString('en-GB')}</b><span>{t.k}</span><small>{t.s}</small></div>
        ))}
      </div>

      <article className="card kg-graph-card">
        <header className="card-head">
          <div><h2>Knowledge Graph</h2></div>
          <div className="seg2">
            <button className={view === 'graph' ? 'on' : ''} onClick={() => setView('graph')}>Graph</button>
            <button className={view === 'list' ? 'on' : ''} onClick={() => setView('list')}>List</button>
          </div>
        </header>

        <div className="kg-controls">
          <label className="search kg-search"><Search size={15} strokeWidth={1.6} />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search a source, asset or entity…" aria-label="Search the graph" />
          </label>
          <select className="select" value={src} onChange={(e) => setSrc(e.target.value)} aria-label="Filter by source">
            <option>All sources</option>
            {SOURCES.map((s) => <option key={s.name} value={s.name}>{s.name}</option>)}
          </select>
        </div>

        <div className="kg-srcchips">
          {SOURCES.map((s) => (
            <button key={s.name} className={`chip-btn ${src === s.name ? 'on' : ''}`} onClick={() => setSrc(src === s.name ? 'All sources' : s.name)}>
              <span className="ini">{s.ini}</span>{s.name}
            </button>
          ))}
        </div>

        <p className="kg-hint">Click any node to focus its neighbourhood · hover to trace · filter by type below</p>

        {view === 'graph' ? (
          <div className="kg-stage">
            <GraphPicture hot={hot} setHot={setHot} dimSources={dimSources} onPick={setSel} />
            <div className="graph-legend"><span><i className="lit" />Described table</span><span><i className="unlit" />Awaiting description</span><span><i className="srcdot" />Source system</span></div>
          </div>
        ) : (
          <div className="table-wrap kg-listwrap">
            <table className="tbl">
              <thead><tr><th>Asset</th><th>Source</th><th>Type</th></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.key} onClick={() => pickList(r.key)}>
                    <td><b className="kg-fqn">{r.key}</b></td>
                    <td>{r.source}</td>
                    <td><span className="chip kg-typechip">{r.kind}</span></td>
                  </tr>
                ))}
                {!rows.length && <tr><td colSpan={3} className="kg-none">No assets match these filters.</td></tr>}
              </tbody>
            </table>
          </div>
        )}

        <div className="kg-filters">
          {TYPE_CHIPS.map((c) => (
            <button key={c.type} className={`chip kg-fchip ${types.includes(c.type) ? 'on' : ''}`} onClick={() => toggleType(c.type)}>
              {c.type}<span className="kg-fcount">{c.count}</span>
            </button>
          ))}
          <button className="kg-clear" onClick={() => setTypes([])} disabled={!types.length}>Clear</button>
          <button className="kg-clear" onClick={() => setTypes(TYPE_CHIPS.map((c) => c.type))}>All</button>
        </div>

        <p className="kg-note"><Info size={13} strokeWidth={1.7} />Business entity links are inferred from shared keys; only lineage edges represent data movement.</p>

        <div className="kg-actions">
          <button className="btn ghost sm" onClick={reset}><RotateCcw size={14} />Reset view</button>
        </div>
      </article>

      <article className="card kg-detail-card">
        <header className="card-head"><div><h2>Asset details</h2></div></header>
        {sel ? (
          <div className="kg-detail">
            <div className="kg-detail-h"><b>{sel.title}</b><small>{sel.sub}</small></div>
            <dl className="kg-detail-grid">
              {sel.rows.filter(([, v]) => v != null && v !== '').map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}
            </dl>
          </div>
        ) : (
          <p className="kg-empty pad">Select an asset in the graph or table to explore its details.</p>
        )}
      </article>

      <section className={`card cc-card kg-cc ${capOpen ? '' : 'closed'}`}>
        <div className="cc-head" onClick={() => setCapOpen((o) => !o)}>
          <div className="cc-titles"><b className="cc-title">Platform capabilities and graph changes</b>
            <p className="cc-sub">Live evidence from the platform APIs behind this view.</p></div>
          <button type="button" className="cc-toggle" aria-expanded={capOpen} aria-label="Toggle capabilities"
            onClick={(e) => { e.stopPropagation(); setCapOpen((o) => !o); }}>
            <span className={`cc-chev ${capOpen ? '' : 'closed'}`}>⌄</span>
          </button>
        </div>
        {capOpen && (
          <div className="cc-body kg-caps">
            {CAPABILITY_PANELS.map((p) => <CapabilityPanel key={p.id} p={p} />)}
          </div>
        )}
      </section>
    </div>
  );
}
