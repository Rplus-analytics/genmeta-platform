import { useRef } from 'react';
import { LayoutDashboard, Building2, Database, Layers, Network, Landmark } from 'lucide-react';
import { TOTALS, TRENDS } from '../data.js';
import { CountUp, Sparkline } from './ui.jsx';

export const KPIS = [
  { key: 'systems', label: 'Systems connected', value: TOTALS.systems, note: 'All reporting', tone: 'g1' },
  { key: 'tables', label: 'Tables', value: TOTALS.tables, note: `${Math.round(TOTALS.coverage * 100)}% described`, tone: 'g2' },
  { key: 'fields', label: 'Fields', value: TOTALS.fields, note: 'Profiled & classified', tone: 'g3' },
  { key: 'size', label: 'Estate size', value: TOTALS.pb, dec: 2, unit: 'PB', note: `${TOTALS.databases} databases`, tone: 'g4' },
];

const RAIL = [
  [LayoutDashboard, 'Dashboard'], [Building2, 'Data estate'], [Database, 'Sources'],
  [Layers, 'Catalogue'], [Network, 'Graph'], [Landmark, 'Governance'],
];

/* One glossy KPI card — used flat in the app and floating on the tablet */
export function GlossCard({ k, i = 0, spark = 70, flat = false }) {
  return (
    <article className={`gcard ${k.tone} ${flat ? 'flat' : ''}`} style={{ '--d': `${i * 0.35}s`, '--z': `${28 + i * 10}px` }}>
      <div className="gc-top"><span>{k.label}</span><i /></div>
      <div className="gc-val"><CountUp to={k.value} decimals={k.dec || 0} />{k.unit && <small>{k.unit}</small>}</div>
      <div className="gc-foot"><span>{k.note}</span><Sparkline data={TRENDS[k.key]} w={spark} h={spark * 0.34} stroke={flat ? '#447DE6' : 'rgba(255, 255, 255,.95)'} fill={flat ? 'rgba(68, 125, 230,.08)' : 'rgba(255, 255, 255,.16)'} /></div>
    </article>
  );
}

/* The tilted tablet from the website hero.
   mode="straighten": hover lays it flat.  mode="parallax": it follows the pointer. */
export default function Tablet({ hint = true, small = false, mode = 'straighten' }) {
  const ref = useRef(null);
  const move = (e) => {
    if (mode !== 'parallax' || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
    ref.current.style.setProperty('--px', `${(-y * 10).toFixed(2)}deg`);
    ref.current.style.setProperty('--pz', `${(x * 10).toFixed(2)}deg`);
  };
  const leave = () => { ref.current?.style.setProperty('--px', '0deg'); ref.current?.style.setProperty('--pz', '0deg'); };
  return (
    <div ref={ref} className={`scene ${small ? 'small' : ''} ${mode}`} onMouseMove={move} onMouseLeave={leave} aria-label="GenMeta dashboard preview">
      <div className="tablet">
        <div className="tablet-screen">
          <aside className="t-rail">
            <b>GenMeta</b>
            {RAIL.map(([I, l], i) => <span key={l} className={i === 0 ? 'on' : ''}><I size={11} strokeWidth={1.6} />{l}</span>)}
            <div className="t-user"><i />Admin</div>
          </aside>
          <div className="t-main">
            <div className="t-head"><span>Dashboard</span><em>Estate overview</em></div>
            <div className="t-grid floating">{KPIS.map((k, i) => <GlossCard key={k.key} k={k} i={i} />)}</div>
          </div>
        </div>
      </div>
      {hint && <span className="scene-hint">{mode === 'parallax' ? 'Move to tilt' : 'Hover to straighten'}</span>}
    </div>
  );
}
