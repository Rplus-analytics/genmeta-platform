import { useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { RefreshCw } from 'lucide-react';
import EstateFrame, { useEstateRefresh } from '../components/EstateFrame.jsx';
import { Burst } from '../components/Loader.jsx';
import { SOURCES, TOTALS, fmt } from '../data.js';

/* Data Estate — the landmark skyline (2D) and city (3D), in the platform's own page chrome.
   Select a building to open its layers: source → raw → clean → prepared → BI / API / AI. */
export default function DataEstate() {
  const { search } = useLocation();
  const nav = useNavigate();
  const q = new URLSearchParams(search);
  const [mode, setMode] = useState(q.get('mode') === '3d' ? '3d' : '2d');
  const frame = useRef(null);
  const { refreshing: busy, refresh, ago, next, changes } = useEstateRefresh(frame, TOTALS.changes);

  const params = `?embed=1&modal=1${q.get('open') ? `&open=${q.get('open')}` : ''}${q.get('mode') === '3d' ? '&mode=3d' : ''}`;
  const post = (msg) => frame.current?.contentWindow?.postMessage(msg, '*');
  const switchMode = (m) => { setMode(m); post({ type: 'genmeta:mode', mode: m }); };
  const open = (id) => nav(`/app/data-estate?open=${id}${mode === '3d' ? '&mode=3d' : ''}`);

  return (
    <div className="page estate-page fade-in">
      <div className="page-head">
        <div>
          <span className="eyebrow">Discover</span>
          <h1>Data estate</h1>
          <p>Every connected source drawn as a landmark at its relative size. Lit windows are tables that already have descriptions. Select a building to see its layers.</p>
        </div>
        <div className="head-actions">
          <div className="toggle" role="group" aria-label="View">
            <button className={mode === '2d' ? 'on' : ''} onClick={() => switchMode('2d')}>2D</button><span>/</span>
            <button className={mode === '3d' ? 'on' : ''} onClick={() => switchMode('3d')}>3D</button>
          </div>
          <button className="btn ghost" onClick={refresh} disabled={busy}>{busy ? <><Burst size={15} />Harvesting</> : <><RefreshCw size={14} />Refresh now</>}</button>
        </div>
      </div>

      <div className="estate-stats">
        <div className="es-live"><span className="live-dot" /><p><span>Refreshed</span>{ago} · next pull in {next} min</p></div>
        <div><span>Systems</span><b>{TOTALS.systems}</b></div>
        <div><span>Tables</span><b>{fmt(TOTALS.tables)}</b></div>
        <div><span>Fields</span><b>{fmt(TOTALS.fields)}</b></div>
        <div><span>Changes</span><b>{changes}</b></div>
        <div><span>Estate size</span><b>{TOTALS.pb.toFixed(2)}<small> PB</small></b></div>
      </div>

      <div className="bezel">
        <div className="estate-frame tall">
          <EstateFrame key={params} ref={frame} title="GenMeta data estate — full view" params={params} />
        </div>
      </div>

      <div className="estate-chips">
        <span className="eyebrow">Open a source</span>
        <div>
          {SOURCES.map((s) => (
            <button key={s.id} className="chip-btn" onClick={() => open(s.id)}>
              <span className="ini">{s.ini}</span>{s.vendor}<small>{fmt(s.tables)} tables</small>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
