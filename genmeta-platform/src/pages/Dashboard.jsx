import { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Plus, RefreshCw, Download, Maximize2, Minimize2 } from 'lucide-react';
import { SOURCES, TOTALS, fmt, sizeTxt } from '../data.js';
import { Ring, Status } from '../components/ui.jsx';
import EstateFrame, { useEstateRefresh } from '../components/EstateFrame.jsx';
import { useAuth } from '../auth.jsx';
import { Burst } from '../components/Loader.jsx';

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
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
  useEffect(() => {
    if (!expanded) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setExpanded(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [expanded]);
  const stats = [
    { k: 'Systems connected', v: fmt(TOTALS.systems), s: 'All reporting' },
    { k: 'Tables', v: fmt(TOTALS.tables), s: `${Math.round(TOTALS.coverage * 100)}% described` },
    { k: 'Fields', v: fmt(TOTALS.fields), s: 'Profiled & classified' },
    { k: 'Estate size', v: `${TOTALS.pb.toFixed(2)} PB`, s: `${TOTALS.databases} databases` },
    { k: 'Description coverage', v: `${Math.round(TOTALS.coverage * 100)}%`, s: 'of tables' },
    { k: 'Changes', v: changes, s: 'since the last pull · every 30 min' },
  ];

  useEffect(() => { if (search) nav('/app', { replace: true }); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const post = (msg) => frame.current?.contentWindow?.postMessage(msg, '*');
  const switchMode = (m) => { setMode(m); post({ type: 'genmeta:mode', mode: m }); };
  /* Opens the building pop-up inside the estate, bringing the estate into view first. */
  const openSource = (id) => {
    card.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    post({ type: 'genmeta:openSource', id });
  };
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
          <button className="btn ghost"><Download size={14} />Export</button>
          <button className="btn primary" onClick={() => nav('/app/sources')}><Plus size={14} />Add source</button>
        </div>
      </div>

      <div className="tiles-sm dash-tiles">
        {stats.map((t) => <div key={t.k}><b>{t.v}</b><span>{t.k}</span><small>{t.s}</small></div>)}
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

      <section className="block">
        <div>
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
                    <td className="num"><div className="numbar"><i style={{ width: `${(s.tables / maxTables) * 100}%` }} />{fmt(s.tables)}</div></td>
                    <td className="num">{fmt(s.fields)}</td>
                    <td className="num">{sizeTxt(s.pb)}</td>
                    <td><div className="cov"><div className="cov-bar"><i style={{ width: `${s.cov * 100}%` }} /></div><span>{Math.round(s.cov * 100)}%</span></div></td>
                    <td><Status s={s.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="block split even last">
        <div>
          <header className="block-head"><div><h2>Tables by system</h2></div></header>
          <div className="hbars">
            {SOURCES.map((s) => (
              <div key={s.id} className="hbar"><span>{s.vendor}</span><div><i style={{ width: `${(s.tables / maxTables) * 100}%` }} /></div><b>{fmt(s.tables)}</b></div>
            ))}
          </div>
        </div>
        <div>
          <header className="block-head"><div><h2>Standards alignment</h2><p className="block-sub">Mapped to UK government controls.</p></div>
            <Link className="bracket ghost" to="/app/governance">Governance</Link></header>
          <div className="rings">
            {[['GDS Service Standard', 0.92], ['NCSC CAF', 0.88], ['Tech Code of Practice', 0.95], ['UK GDPR', 0.9]].map(([n, v]) => (
              <div key={n} className="ring-item"><Ring value={v} size={72} stroke={3}><b>{Math.round(v * 100)}</b></Ring><span>{n}</span></div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
