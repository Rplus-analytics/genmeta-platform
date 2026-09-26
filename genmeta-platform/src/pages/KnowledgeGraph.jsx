import { useState } from 'react';
import { SOURCES, CATALOGUE } from '../data.js';
import { PageHead } from '../components/ui.jsx';
import { BRAND } from '../brand.js';

const W = 1100, H = 640, CX = W / 2, CY = H / 2;

export default function KnowledgeGraph() {
  const [hot, setHot] = useState(null);
  const srcNodes = SOURCES.map((s, i) => {
    const a = (i / SOURCES.length) * Math.PI * 2 - Math.PI / 2;
    return { ...s, x: CX + Math.cos(a) * 190, y: CY + Math.sin(a) * 175, a };
  });
  const tblNodes = srcNodes.flatMap((s) => {
    const kids = CATALOGUE.filter((t) => t.sourceId === s.id);
    return kids.map((t, j) => {
      const a = s.a + (j - (kids.length - 1) / 2) * 0.15, r = Math.abs(Math.sin(s.a)) > 0.9 && j % 2 === 0 ? 0.86 : 1;
      return { ...t, x: CX + Math.cos(a) * 400 * r, y: CY + Math.sin(a) * 285 * r, parent: s.id };
    });
  });
  const dim = (id) => hot && hot !== id;

  return (
    <div className="page fade-in">
      <PageHead title="Knowledge graph" sub="How systems, tables and business terms connect. Hover a system to trace its assets." />
      <article className="card graph-card">
        <svg viewBox={`0 0 ${W} ${H}`} className="graph">
          <defs>
            <radialGradient id="hub" cx="50%" cy="40%"><stop offset="0" stopColor="#5ED3FA" /><stop offset="1" stopColor="#1F5FD6" /></radialGradient>
          </defs>
          {srcNodes.map((s) => (
            <line key={`h-${s.id}`} x1={CX} y1={CY} x2={s.x} y2={s.y} className={`edge flow ${dim(s.id) ? 'dim' : ''}`} />
          ))}
          {tblNodes.map((t) => {
            const p = srcNodes.find((s) => s.id === t.parent);
            return <line key={`e-${t.id}`} x1={p.x} y1={p.y} x2={t.x} y2={t.y} className={`edge ${dim(t.parent) ? 'dim' : ''}`} />;
          })}
          {tblNodes.map((t) => (
            <g key={t.id} className={`gnode ${dim(t.parent) ? 'dim' : ''}`} transform={`translate(${t.x},${t.y})`}>
              <circle r="6" className={t.described ? 'lit' : 'unlit'} />
              <text x={t.x > CX ? 10 : -10} y="4" textAnchor={t.x > CX ? 'start' : 'end'}>{t.name}</text>
            </g>
          ))}
          {srcNodes.map((s) => (
            <g key={s.id} className={`gsrc ${dim(s.id) ? 'dim' : ''}`} transform={`translate(${s.x},${s.y})`}
              onMouseEnter={() => setHot(s.id)} onMouseLeave={() => setHot(null)}>
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
        <div className="graph-legend"><span><i className="lit" />Described table</span><span><i className="unlit" />Awaiting description</span><span><i className="srcdot" />Source system</span></div>
      </article>
    </div>
  );
}
