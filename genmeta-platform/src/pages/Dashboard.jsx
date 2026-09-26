import { useEffect, useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Plus, RefreshCw, Download, Maximize2 } from 'lucide-react';
import { SOURCES, TOTALS, CHANGES, fmt, sizeTxt } from '../data.js';
import { Ring, Status } from '../components/ui.jsx';
import { KPIS, GlossCard } from '../components/Tablet.jsx';
import EstateFrame, { useEstateRefresh } from '../components/EstateFrame.jsx';
import { useAuth } from '../auth.jsx';
import { Burst } from '../components/Loader.jsx';

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}

export default function Dashboard() {
  const nav = useNavigate();
  const { user } = useAuth();
  const frame = useRef(null);
  const [mode, setMode] = useState('2d');
  const { refreshing, refresh, ago, next, changes } = useEstateRefresh(frame, TOTALS.changes);

  useEffect(() => {
    const onMsg = (e) => {
      if (e.data && e.data.type === 'genmeta:open') nav(`/app/data-estate?open=${e.data.id}${mode === '3d' ? '&mode=3d' : ''}`);
    };
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, [nav, mode]);

  const switchMode = (m) => { setMode(m); frame.current?.contentWindow?.postMessage({ type: 'genmeta:mode', mode: m }, '*'); };
  const maxTables = Math.max(...SOURCES.map((s) => s.tables));
  const first = (user?.name || 'Admin').split(' ')[0];

  return (
    <div className="page fade-in">
      <div className="page-head">
        <div>
          <span className="eyebrow">Estate overview</span>
          <h1>{greeting()}, {first}</h1>
          <p>Refreshed {ago} · next pull in {next} min · {changes} changes since the last pull.</p>
        </div>
        <div className="head-actions">
          <button className="btn ghost" onClick={refresh} disabled={refreshing}>{refreshing ? <><Burst size={15} />Harvesting</> : <><RefreshCw size={14} />Refresh</>}</button>
          <button className="btn ghost"><Download size={14} />Export</button>
          <button className="btn primary" onClick={() => nav('/app/sources')}><Plus size={14} />Add source</button>
        </div>
      </div>

      <section className="dash-grid">
        <div className="kpi-col">
          {KPIS.map((k, i) => <GlossCard key={k.key} k={k} i={i} spark={92} flat />)}
        </div>

        <article className="estate-card">
          <header className="block-head tight">
            <div><h2>Data estate</h2><p className="block-sub">Each connected source drawn as a landmark at its relative size.</p></div>
            <div className="block-tools">
              <div className="toggle" role="group" aria-label="View">
                <button className={mode === '2d' ? 'on' : ''} onClick={() => switchMode('2d')}>2D</button><span>/</span>
                <button className={mode === '3d' ? 'on' : ''} onClick={() => switchMode('3d')}>3D</button>
              </div>
              <button className="icon-btn" onClick={() => nav(`/app/data-estate${mode === '3d' ? '?mode=3d' : ''}`)} aria-label="Open full view" title="Open full view"><Maximize2 size={15} strokeWidth={1.5} /></button>
            </div>
          </header>
          <div className="bezel grow"><div className="estate-frame fill"><EstateFrame ref={frame} title="GenMeta data estate" params="?embed=1" /></div></div>
          <div className="facts three">
            <div><Ring value={TOTALS.coverage} size={40} stroke={3}><b>{Math.round(TOTALS.coverage * 100)}</b></Ring><p><span>Description coverage</span>{Math.round(TOTALS.coverage * 100)}% of tables</p></div>
            <div><b className="fact-n">{changes}</b><p><span>Changes since last pull</span>metadata changes</p></div>
            <div><b className="fact-n">30<small>min</small></b><p><span>Collection</span>scheduled · incremental</p></div>
          </div>
        </article>
      </section>

      <section className="block split">
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
                  <tr key={s.id} onClick={() => nav(`/app/data-estate?open=${s.id}`)}>
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
        <div>
          <header className="block-head"><div><h2>Recent agent activity</h2></div></header>
          <ul className="log">
            {CHANGES.map((c, i) => (
              <li key={i} className={c.kind === 'alert' ? 'flag' : ''}>
                <time>{c.t}</time>
                <p><b>{c.who}</b> {c.what} <code>{c.target}</code><small>{c.src}</small></p>
              </li>
            ))}
          </ul>
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
