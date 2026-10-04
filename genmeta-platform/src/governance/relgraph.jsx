import { useEffect, useMemo, useRef, useState } from 'react';
import { Plus, Minus, Maximize } from 'lucide-react';

/* A lineage-style graph (same look as Data assets and AI model lineage): columns of node cards joined by
   labelled dashed edges; hover highlights a node's links, click calls onSelect, drag pans, buttons zoom.
   columns: [{ title, nodes: [{ id, label, sub, tag, icon, focus, muted }] }]  edges: [{ s, t, rel }] */
const NW = 220, NH = 78, GX = 76, GY = 18, PAD = 24;

export default function RelGraph({ columns, edges, onSelect, title, hint, minScale = 0.68 }) {
  const { nodes, box } = useMemo(() => {
    const ns = [];
    const cols = columns.filter((c) => c.nodes.length);
    cols.forEach((col, i) => {
      const total = col.nodes.length * NH + (col.nodes.length - 1) * GY;
      col.nodes.forEach((n, j) => ns.push({ ...n, i, col: col.title, x: i * (NW + GX), y: -total / 2 + j * (NH + GY) }));
    });
    const b = ns.length ? { x0: Math.min(...ns.map((n) => n.x)), x1: Math.max(...ns.map((n) => n.x + NW)), y0: Math.min(...ns.map((n) => n.y)) - 34, y1: Math.max(...ns.map((n) => n.y + NH)) } : { x0: 0, x1: 1, y0: 0, y1: 1 };
    return { nodes: ns, box: b, heads: cols.map((c, i) => ({ t: c.title, x: i * (NW + GX) })) };
  }, [columns]);
  const heads = useMemo(() => columns.filter((c) => c.nodes.length).map((c, i) => ({ t: c.title, x: i * (NW + GX) })), [columns]);
  const pos = Object.fromEntries(nodes.map((n) => [n.id, n]));
  const es = edges.filter((e) => pos[e.s] && pos[e.t]);
  const [hover, setHover] = useState(null);
  const [view, setView] = useState({ s: 1, x: 0, y: 0 });
  const [h, setH] = useState(380);
  const wrap = useRef(null); const drag = useRef(null);
  const fit = () => {
    const el = wrap.current; if (!el) return;
    const pw = el.clientWidth || 1;
    const bw = box.x1 - box.x0, bh = box.y1 - box.y0;
    const s = Math.max(minScale, Math.min(1, (pw - PAD * 2 - 44) / bw));
    const desired = Math.max(240, Math.min(620, Math.round(bh * s) + PAD * 2 + 20));
    setH(desired);
    setView({ s, x: Math.max(PAD + 44, (pw - bw * s) / 2) - box.x0 * s, y: Math.max(PAD, (desired - bh * s) / 2) - box.y0 * s });
  };
  useEffect(fit, [box]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { const el = wrap.current; if (!el) return undefined; const ro = new ResizeObserver(() => fit()); ro.observe(el); return () => ro.disconnect(); }, [box]); // eslint-disable-line react-hooks/exhaustive-deps
  const zoom = (f) => { const el = wrap.current; const cx = el.clientWidth / 2, cy = el.clientHeight / 2; setView((v) => { const s = Math.max(0.35, Math.min(2, v.s * f)); return { s, x: cx - (cx - v.x) * (s / v.s), y: cy - (cy - v.y) * (s / v.s) }; }); };
  const down = (e) => { if (e.button !== 0) return; drag.current = { x: e.clientX, y: e.clientY, v: view }; };
  const move = (e) => { const d = drag.current; if (!d) return; setView({ ...d.v, x: d.v.x + e.clientX - d.x, y: d.v.y + e.clientY - d.y }); };
  const up = () => { drag.current = null; };
  const lit = (e) => hover && (e.s === hover || e.t === hover);
  const dim = (n) => hover && n.id !== hover && !es.some((e) => (e.s === hover && e.t === n.id) || (e.t === hover && e.s === n.id));
  if (!nodes.length) return null;
  return (
    <div className="card lin-canvas-card rg-graph">
      {(title || hint) && <div className="lin-h"><div>{title && <h3>{title}</h3>}{hint && <p>{hint}</p>}</div></div>}
      <div className="lin-main">
        <div ref={wrap} className="lin-canvas" style={{ height: h }} onMouseDown={down} onMouseMove={move} onMouseUp={up} onMouseLeave={up}>
          <div className="lin-world" style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.s})` }}>
            {heads.map((c) => <div key={c.t} className="rg-colhead" style={{ left: c.x, top: box.y0, width: NW }}>{c.t}</div>)}
            <svg className="lin-edges" style={{ left: box.x0 - 40, top: box.y0 - 40, width: box.x1 - box.x0 + 80, height: box.y1 - box.y0 + 80 }}
              viewBox={`${box.x0 - 40} ${box.y0 - 40} ${box.x1 - box.x0 + 80} ${box.y1 - box.y0 + 80}`}>
              <defs>
                <marker id="rg-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="#447DE6" /></marker>
                <marker id="rg-arrow-dim" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="#B6C6DC" /></marker>
              </defs>
              {es.map((e, k) => {
                const a = pos[e.s], b = pos[e.t];
                const [l, r] = a.x <= b.x ? [a, b] : [b, a];
                const x1 = l.x + NW, y1 = l.y + NH / 2, x2 = r.x - 2, y2 = r.y + NH / 2, mx = (x1 + x2) / 2;
                const on = lit(e), off = hover && !on;
                return (
                  <g key={k} className={`ledge ${on ? 'on' : ''} ${off ? 'off' : ''}`}>
                    <path d={`M${x1} ${y1} C${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`} markerEnd={`url(#${off ? 'rg-arrow-dim' : 'rg-arrow'})`} />
                    {e.rel && <g transform={`translate(${mx} ${(y1 + y2) / 2})`}><rect x={-Math.max(30, e.rel.length * 3.4)} y="-9" width={Math.max(60, e.rel.length * 6.8)} height="18" rx="9" /><text y="4">{e.rel}</text></g>}
                  </g>
                );
              })}
            </svg>
            {nodes.map((n) => {
              const I = n.icon;
              return (
                <div key={n.id} className={`lnode gv-lnode ${n.focus ? 'focus' : ''} ${dim(n) ? 'dim' : ''} ${n.muted ? 'gv-muted-node' : ''}`}
                  style={{ left: n.x, top: n.y, width: NW, minHeight: NH }} onMouseEnter={() => setHover(n.id)} onMouseLeave={() => setHover(null)}
                  onMouseDown={(e) => e.stopPropagation()} onClick={() => onSelect && onSelect(n)} title={n.label}>
                  {n.focus && <span className="lnode-flag">{n.flag || 'This item'}</span>}
                  <div className="lnode-top">{I && <I size={14} strokeWidth={1.75} />}<span className="lnode-schema">{n.kind || n.col}</span>{n.tag && <span className="lnode-src" title={n.tag}>{n.tag}</span>}</div>
                  <b className="lnode-name">{n.label}</b>
                  {n.sub && <div className="lnode-foot"><span className="gv-lnode-sub" title={n.sub}>{n.sub}</span></div>}
                </div>
              );
            })}
          </div>
          <div className="lin-zoom" onMouseDown={(e) => e.stopPropagation()}>
            <button type="button" onClick={() => zoom(1.2)} aria-label="Zoom in"><Plus size={15} /></button>
            <button type="button" onClick={() => zoom(1 / 1.2)} aria-label="Zoom out"><Minus size={15} /></button>
            <button type="button" onClick={fit} aria-label="Fit to view"><Maximize size={14} /></button>
          </div>
        </div>
      </div>
    </div>
  );
}
