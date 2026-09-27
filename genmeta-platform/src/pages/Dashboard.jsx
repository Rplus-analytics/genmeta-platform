import { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Plus, RefreshCw, Download, Maximize2, Minimize2 } from 'lucide-react';
import { SOURCES, TOTALS, STANDARDS, fmt, sizeTxt } from '../data.js';
import { Ring, Status } from '../components/ui.jsx';
import EstateFrame, { useEstateRefresh } from '../components/EstateFrame.jsx';
import { useAuth } from '../auth.jsx';
import { Burst } from '../components/Loader.jsx';

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}

/* Download the Source systems table as a CSV, built from the same data the table shows. */
function exportSources() {
  const head = ['System', 'Name', 'Tables', 'Fields', 'Size', 'Described %', 'Status'];
  const rows = SOURCES.map((s) => [
    s.vendor, s.name, s.tables, s.fields, sizeTxt(s.pb), Math.round(s.cov * 100), s.status,
  ]);
  const esc = (v) => { const t = String(v); return /[",\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t; };
  const csv = [head, ...rows].map((r) => r.map(esc).join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
  const a = document.createElement('a');
  a.href = url; a.download = 'source-systems.csv';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

export default function Dashboard() {
  const nav = useNavigate();
  const { search } = useLocation();
  const { user } = useAuth();
  const frame = useRef(null);
  const card = useRef(null);
  /* Deep links (?open=<source>&mode=3d) are read once, when the estate is first drawn. */
  const [params] = useState(() => {
    const q = new URLSearchParams(search);
    return `?embed=1&modal=1${q.get('open') ? `&open=${q.get('open')}` : ''}${q.get('mode') === '3d' ? '&mode=3d' : ''}`;
  });
  const [mode, setMode] = useState(() => (new URLSearchParams(search).get('mode') === '3d' ? '3d' : '2d'));
  const { refreshing, refresh, ago, next, changes } = useEstateRefresh(frame, TOTALS.changes);
  /* the estate can be expanded to fill the window; Escape brings it back */
  const [expanded, setExpanded] = useState(false);
  /* remembers when the expansion was triggered by opening a building pop-up, so closing
     the pop-up returns the estate to its normal size (but a manual expand is left alone) */
  const autoExpanded = useRef(false);
  useEffect(() => {
    if (!expanded) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setExpanded(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [expanded]);
  /* The building pop-up lives inside the estate iframe. When it opens we expand the estate to
     fill the window so the pop-up has room to show full size; when it closes we collapse again. */
  useEffect(() => {
    const onMsg = (e) => {
      if (!frame.current || e.source !== frame.current.contentWindow) return;
      const d = e.data || {};
      if (d.type === 'genmeta:sourceOpened') { setExpanded((prev) => { if (!prev) autoExpanded.current = true; return true; }); }
      if (d.type === 'genmeta:sourceClosed' && autoExpanded.current) { autoExpanded.current = false; setExpanded(false); }
    };
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, []);
  const largest = SOURCES.reduce((a, s) => (s.pb > a.pb ? s : a));
  const stats = [
    { k: 'Systems connected', v: fmt(TOTALS.systems), s: 'All reporting' },
    { k: 'Tables', v: fmt(TOTALS.tables), s: `Across ${TOTALS.databases} databases` },
    { k: 'Fields', v: fmt(TOTALS.fields), s: 'Profiled & classified' },
    { k: 'Estate size', v: TOTALS.pb.toFixed(2), u: 'PB', s: `Largest: ${largest.vendor}` },
    { k: 'Described', v: `${Math.round(TOTALS.coverage * 100)}%`, s: `${fmt(Math.round(TOTALS.tables * TOTALS.coverage))} of ${fmt(TOTALS.tables)} tables` },
    { k: 'Changes', v: changes, s: 'Since last pull' },
  ];

  useEffect(() => { if (search) nav('/app', { replace: true }); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const post = (msg) => frame.current?.contentWindow?.postMessage(msg, '*');
  const switchMode = (m) => { setMode(m); post({ type: 'genmeta:mode', mode: m }); };
  /* Opens the building pop-up (the estate expands to full size via the message handler above). */
  const openSource = (id) => post({ type: 'genmeta:openSource', id });
  const maxTables = Math.max(...SOURCES.map((s) => s.tables));
  const first = (user?.name || 'Admin').split(' ')[0];

  return (
    <div className={`page fade-in ${expanded ? 'estate-open' : ''}`}>
      <div className="page-head">
        <div>
          <span className="eyebrow">Data estate</span>
          <h1>{greeting()}, {first}</h1>
          <p>Refreshed {ago} · next pull in {next} min · {changes} changes since the last pull.</p>
        </div>
        <div className="head-actions">
          <button className="btn ghost" onClick={refresh} disabled={refreshing}>{refreshing ? <><Burst size={15} />Harvesting</> : <><RefreshCw size={14} />Refresh</>}</button>
          <button className="btn ghost" onClick={exportSources}><Download size={14} />Export</button>
          <button className="btn primary" onClick={() => nav('/app/sources')}><Plus size={14} />Add source</button>
        </div>
      </div>

      <div className="tiles-sm dash-tiles">
        {stats.map((t) => <div key={t.k}><b>{t.v}{t.u && <span className="unit">{t.u}</span>}</b><span>{t.k}</span><small>{t.s}</small></div>)}
      </div>

      <section className="dash-grid">
        {expanded && <div className="estate-scrim" onClick={() => setExpanded(false)} />}
        <article ref={card} className={`estate-card ${expanded ? 'expanded' : ''}`}>
          <header className="block-head tight">
            <div><h2>Data estate</h2><p className="block-sub">Each connected source drawn as a building at its relative size. Lit windows are described tables. Select a building to see its layers.</p></div>
            <div className="block-tools">
              <div className="toggle" role="group" aria-label="View">
                <button className={mode === '2d' ? 'on' : ''} onClick={() => switchMode('2d')}>2D</button><span>/</span>
                <button className={mode === '3d' ? 'on' : ''} onClick={() => switchMode('3d')}>3D</button>
              </div>
              <button className="icon-btn estate-expand" onClick={() => setExpanded((v) => !v)}
                aria-label={expanded ? 'Collapse estate view' : 'Expand estate view'} title={expanded ? 'Collapse (Esc)' : 'Expand'}>
                {expanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
              </button>
            </div>
          </header>
          <div className="bezel grow"><div className="estate-frame fill"><EstateFrame ref={frame} title="GenMeta data estate" params={params} /></div></div>
        </article>
      </section>

      <article className="dash-card">
        <header className="block-head">
          <div><h2>Source systems</h2><p className="block-sub">Size, description coverage and ingestion health.</p></div>
          <Link className="bracket ghost" to="/app/sources">All sources</Link>
        </header>
        <div className="table-wrap">
          <table className="tbl">
            <thead><tr><th>System</th><th className="num">Tables</th><th className="num">Fields</th><th className="num">Size</th><th>Described</th><th>Status</th></tr></thead>
            <tbody>
              {SOURCES.map((s) => (
                <tr key={s.id} onClick={() => openSource(s.id)}>
                  <td><div className="sys"><span className="ini">{s.ini}</span><div><b>{s.vendor}</b><small>{s.name}</small></div></div></td>
                  <td className="num"><div className="numbar">{fmt(s.tables)}</div></td>
                  <td className="num">{fmt(s.fields)}</td>
                  <td className="num">{sizeTxt(s.pb)}</td>
                  <td><div className="cov"><div className="cov-bar"><i style={{ width: `${s.cov * 100}%` }} /></div><span>{Math.round(s.cov * 100)}%</span></div></td>
                  <td><Status s={s.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>

      <div className="dash-split">
        <article className="dash-card">
          <header className="block-head"><div><h2>Share of tables by system</h2></div></header>
          <div className="hbars">
            {SOURCES.map((s) => (
              <div key={s.id} className="hbar"><span>{s.vendor}</span><div><i style={{ width: `${(s.tables / maxTables) * 100}%` }} /></div><b>{fmt(s.tables)} · {Math.round((s.tables / TOTALS.tables) * 100)}%</b></div>
            ))}
          </div>
        </article>
        <article className="dash-card">
          <header className="block-head"><div><h2>Standards alignment</h2><p className="block-sub">Mapped to UK government controls.</p></div>
            <Link className="bracket ghost" to="/app/governance">Governance</Link></header>
          <div className="rings">
            {STANDARDS.map(([n, v]) => (
              <div key={n} className="ring-item"><Ring value={v} size={72} stroke={3}><b>{Math.round(v * 100)}</b></Ring><span>{n}</span></div>
            ))}
          </div>
        </article>
      </div>
    </div>
  );
}
