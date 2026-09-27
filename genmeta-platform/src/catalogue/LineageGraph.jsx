import { useEffect, useMemo, useRef, useState } from 'react';
import { Plus, Minus, Maximize, Crosshair, ChevronDown, ChevronUp, Search, ArrowUpRight, Hash, Type, Calendar, ToggleLeft } from 'lucide-react';
import { BY_KEY, KIND_ICON, lineageFor, srcMeta, kindLabel, upstreamOf, downstreamOf } from './model.js';

const W = 244, H = 88, GX = 120, GY = 26, ROW = 26, LIST_MAX = 8;
const TYPE_ICON = { number: Hash, text: Type, date: Calendar, boolean: ToggleLeft, timestamp: Calendar };

function nodeHeight(a, open) {
  if (!open) return H;
  return H + 40 + Math.min(a.columns.length, LIST_MAX) * ROW + 8;
}

/* Columns by hop, ordered to keep edges short; nodes stacked and centred per column */
function layout(nodes, edges, open) {
  const hops = [...new Set(nodes.map((n) => n.hop))].sort((a, b) => a - b);
  const pos = {};
  const byHop = Object.fromEntries(hops.map((h) => [h, nodes.filter((n) => n.hop === h).map((n) => n.key).sort()]));
  hops.forEach((h, i) => {
    let list = byHop[h];
    if (i > 0) {
      const y = (k) => {
        const ins = edges.filter((e) => e.t === k && pos[e.s]).map((e) => pos[e.s].y + pos[e.s].h / 2);
        return ins.length ? ins.reduce((a, b) => a + b, 0) / ins.length : 1e6;
      };
      list = [...list].sort((a, b) => y(a) - y(b));
    }
    const hs = list.map((k) => nodeHeight(BY_KEY[k], open.has(k)));
    const total = hs.reduce((a, b) => a + b, 0) + GY * (list.length - 1);
    let yy = -total / 2;
    list.forEach((k, j) => { pos[k] = { x: i * (W + GX), y: yy, h: hs[j] }; yy += hs[j] + GY; });
  });
  const xs = Object.values(pos);
  const box = {
    x0: Math.min(...xs.map((p) => p.x)), x1: Math.max(...xs.map((p) => p.x + W)),
    y0: Math.min(...xs.map((p) => p.y)), y1: Math.max(...xs.map((p) => p.y + p.h)),
  };
  return { pos, box };
}

function Node({ k, p, focus, selected, open, colSel, traceSeen, hot, dim, onSelect, onFocus, onToggle, onCol }) {
  const a = BY_KEY[k];
  const I = KIND_ICON[a.kind] || KIND_ICON.table;
  const m = srcMeta(a.source);
  const [q, setQ] = useState('');
  const cols = a.columns.filter((c) => c.name.toLowerCase().includes(q.toLowerCase()));
  return (
    <div className={`lnode ${focus ? 'focus' : ''} ${selected ? 'sel' : ''} ${dim ? 'dim' : ''} ${hot ? 'hot' : ''}`}
      style={{ left: p.x, top: p.y, width: W, minHeight: p.h }}
      onClick={(e) => { e.stopPropagation(); onSelect(k); }} onDoubleClick={(e) => { e.stopPropagation(); onFocus(k); }}>
      {focus && <span className="lnode-flag">Focus</span>}
      <div className="lnode-top">
        <I size={14} strokeWidth={1.75} />
        <span className="lnode-schema">{a.schema}</span>
        <span className="lnode-src" title={a.source}>{m.vendor}</span>
      </div>
      <b className="lnode-name" title={a.fqn}>{a.name}</b>
      <div className="lnode-foot">
        <button className="lnode-cols" onClick={(e) => { e.stopPropagation(); onToggle(k); }} aria-expanded={open}>
          {a.cols} cols {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </button>
        <span className="lnode-kind">{kindLabel(a.kind)}</span>
        {!focus && <button className="lnode-refocus" onClick={(e) => { e.stopPropagation(); onFocus(k); }} aria-label={`Focus on ${a.fqn}`} title="Focus lineage here"><Crosshair size={14} /></button>}
      </div>
      {open && (
        <div className="lnode-list" onClick={(e) => e.stopPropagation()}>
          <label className="lnode-search"><Search size={12} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Search ${a.columns.length} columns`} /></label>
          <ul style={{ maxHeight: LIST_MAX * ROW }}>
            {cols.map((c) => {
              const TI = TYPE_ICON[c.type] || Type;
              const on = colSel && colSel.k === k && colSel.c === c.name;
              const traced = !on && traceSeen && traceSeen.has(`${k}|${c.name}`);
              return (
                <li key={c.name}>
                  <button className={on ? 'on' : traced ? 'traced' : ''} onClick={() => onCol(on ? null : { k, c: c.name })}>
                    <TI size={11} /><span>{c.name}</span>{c.cls && <em>{c.cls === 'SPECIAL_CATEGORY' ? 'SPECIAL' : c.cls}</em>}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

export default function LineageGraph({ focusKey, onOpenAsset }) {
  const [focus, setFocus] = useState(focusKey);
  const [selected, setSelected] = useState(focusKey);
  const [open, setOpen] = useState(() => new Set());
  const [colSel, setColSel] = useState(null);
  const [hover, setHover] = useState(null);
  const [view, setView] = useState({ s: 1, x: 0, y: 0 });
  const [tab, setTab] = useState('overview');
  const wrap = useRef(null);
  const drag = useRef(null);

  useEffect(() => { setFocus(focusKey); setSelected(focusKey); setColSel(null); }, [focusKey]);

  const { nodes, edges } = useMemo(() => lineageFor(focus), [focus]);
  const { pos, box } = useMemo(() => layout(nodes, edges, open), [nodes, edges, open]);

  const fit = () => {
    const el = wrap.current; if (!el) return;
    const pw = el.clientWidth, ph = el.clientHeight, bw = box.x1 - box.x0 + 80, bh = box.y1 - box.y0 + 80;
    const fitS = Math.min(1.05, pw / bw, ph / bh);
    if (fitS >= 0.72) { setView({ s: fitS, x: (pw - (box.x1 - box.x0) * fitS) / 2 - box.x0 * fitS, y: (ph - (box.y1 - box.y0) * fitS) / 2 - box.y0 * fitS }); return; }
    /* too big to fit legibly: stay readable and centre on the focused asset */
    const s = 0.8, f = pos[focus] || { x: 0, y: 0, h: H };
    const cx = Math.min(Math.max(f.x + W / 2, box.x0 + pw / (2 * s) - 40), box.x1 - pw / (2 * s) + 40);
    setView({ s, x: pw / 2 - cx * s, y: ph / 2 - (f.y + f.h / 2) * s });
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(fit, [focus]);
  useEffect(() => { const ro = new ResizeObserver(() => fit()); if (wrap.current) ro.observe(wrap.current); return () => ro.disconnect(); }, [focus]); // eslint-disable-line

  const zoom = (f) => {
    const el = wrap.current; const cx = el.clientWidth / 2, cy = el.clientHeight / 2;
    setView((v) => { const s = Math.max(0.35, Math.min(2, v.s * f)); return { s, x: cx - (cx - v.x) * (s / v.s), y: cy - (cy - v.y) * (s / v.s) }; });
  };
  const down = (e) => { if (e.button !== 0) return; drag.current = { x: e.clientX, y: e.clientY, v: view, moved: false }; };
  const move = (e) => {
    const d = drag.current; if (!d) return;
    const dx = e.clientX - d.x, dy = e.clientY - d.y;
    if (Math.abs(dx) + Math.abs(dy) > 3) d.moved = true;
    setView({ ...d.v, x: d.v.x + dx, y: d.v.y + dy });
  };
  const up = () => { drag.current = null; };
  const wheel = (e) => { if (!e.ctrlKey && !e.metaKey) return; e.preventDefault(); zoom(e.deltaY < 0 ? 1.1 : 0.9); };
  useEffect(() => { const el = wrap.current; el?.addEventListener('wheel', wheel, { passive: false }); return () => el?.removeEventListener('wheel', wheel); });

  const pickCol = (x) => {
    setColSel(x);
    if (!x) return;
    setTimeout(() => setOpen((s) => new Set([...s, ...[...(traceRef.current?.seen || [])].map((id) => id.split('|')[0])])), 0);
  };
  const refocus = (k) => { setFocus(k); setSelected(k); setColSel(null); };
  const toggle = (k) => setOpen((s) => { const n = new Set(s); if (n.has(k)) n.delete(k); else n.add(k); return n; });

  /* which edges carry the selected column */
  /* follow the selected column through every recorded mapping, upstream and downstream */
  const trace = useMemo(() => {
    if (!colSel) return null;
    const seen = new Set([`${colSel.k}|${colSel.c}`]), lit = new Set(), steps = [];
    const walk = (k, c, dir) => {
      for (const e of edges) {
        for (const m of e.map) {
          const hit = dir < 0 ? (e.t === k && m[1] === c) : (e.s === k && m[0] === c);
          if (!hit) continue;
          const nk = dir < 0 ? e.s : e.t, nc = dir < 0 ? m[0] : m[1], id = `${nk}|${nc}`;
          lit.add(e.s + '>' + e.t);
          if (!steps.some((s) => s.e === e && s.m === m)) steps.push({ e, m });
          if (!seen.has(id)) { seen.add(id); walk(nk, nc, dir); }
        }
      }
    };
    walk(colSel.k, colSel.c, -1); walk(colSel.k, colSel.c, 1);
    return { seen, lit, steps };
  }, [colSel, edges]);
  const colEdges = trace?.lit || null;
  const traceRef = useRef(null);
  traceRef.current = trace;
  const lit = hover || null;
  const litEdge = (e) => (colEdges ? colEdges.has(e.s + '>' + e.t) : lit ? e.s === lit || e.t === lit : false);
  const dimNode = (k) => {
    if (trace) return ![...trace.seen].some((x) => x.startsWith(k + '|'));
    if (lit) return !(k === lit || edges.some((e) => (e.s === lit && e.t === k) || (e.t === lit && e.s === k)));
    return false;
  };

  const up1 = edges.filter((e) => e.t === focus).length, down1 = edges.filter((e) => e.s === focus).length;
  const fa = BY_KEY[focus];
  const sens = fa.columns.filter((c) => c.cls).length;
  const sa = BY_KEY[selected] || fa;
  const ups = upstreamOf(sa.key), downs = downstreamOf(sa.key);

  return (
    <div className="lineage">
      <div className="lin-stats">
        <div><b>{up1}</b><span>Upstream assets</span><small>Direct inputs to the focused asset</small></div>
        <div><b>{down1}</b><span>Downstream assets</span><small>Direct consumers in lineage</small></div>
        <div><b>{edges.length}</b><span>Lineage edges</span><small>Recorded pipeline dependencies</small></div>
        <div><b>{fa.cols}</b><span>Columns</span><small>Fields in the focused asset</small></div>
        <div><b>{sens}</b><span>Sensitive columns</span><small>Classified in the focused asset</small></div>
      </div>

      <div className="lin-body">
        <div className="card lin-canvas-card">
          <div className="lin-h">
            <div><h3>Lineage graph</h3><p>Click an asset for details · double-click to refocus · open “cols” to trace a column</p></div>
            {focus !== focusKey && <button className="btn ghost sm" onClick={() => refocus(focusKey)}>Back to {BY_KEY[focusKey].name}</button>}
          </div>
          <div ref={wrap} className="lin-canvas" onMouseDown={down} onMouseMove={move} onMouseUp={up} onMouseLeave={up}
            onClick={() => { if (!drag.current?.moved) setColSel(null); }}>
            <div className="lin-world" style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.s})` }}>
              <svg className="lin-edges" style={{ left: box.x0 - 40, top: box.y0 - 40, width: box.x1 - box.x0 + 80, height: box.y1 - box.y0 + 80 }}
                viewBox={`${box.x0 - 40} ${box.y0 - 40} ${box.x1 - box.x0 + 80} ${box.y1 - box.y0 + 80}`}>
                <defs>
                  <marker id="lin-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="#447DE6" /></marker>
                  <marker id="lin-arrow-dim" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="#B6C6DC" /></marker>
                </defs>
                {edges.map((e) => {
                  const a = pos[e.s], b = pos[e.t]; if (!a || !b) return null;
                  const x1 = a.x + W, y1 = a.y + Math.min(a.h, H) / 2, x2 = b.x - 2, y2 = b.y + Math.min(b.h, H) / 2;
                  const mx = (x1 + x2) / 2;
                  const on = litEdge(e), off = (colEdges || lit) && !on;
                  return (
                    <g key={e.s + e.t} className={`ledge ${on ? 'on' : ''} ${off ? 'off' : ''}`}>
                      <path d={`M${x1} ${y1} C${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`} markerEnd={`url(#${off ? 'lin-arrow-dim' : 'lin-arrow'})`} />
                      <g transform={`translate(${mx} ${(y1 + y2) / 2})`}>
                        <rect x="-38" y="-9" width="76" height="18" rx="9" />
                        <text y="4">{e.rel}</text>
                      </g>
                    </g>
                  );
                })}
              </svg>
              {nodes.map((n) => (
                <div key={n.key} onMouseEnter={() => setHover(n.key)} onMouseLeave={() => setHover(null)}>
                  <Node k={n.key} p={pos[n.key]} focus={n.key === focus} selected={n.key === selected} open={open.has(n.key)}
                    colSel={colSel} traceSeen={trace?.seen} hot={lit === n.key} dim={dimNode(n.key)}
                    onSelect={setSelected} onFocus={refocus} onToggle={toggle} onCol={pickCol} />
                </div>
              ))}
            </div>
            {edges.length === 0 && <p className="lin-empty">No lineage has been recorded for this asset yet.</p>}
            <div className="lin-zoom" onMouseDown={(e) => e.stopPropagation()}>
              <button onClick={() => zoom(1.2)} aria-label="Zoom in"><Plus size={15} /></button>
              <button onClick={() => zoom(1 / 1.2)} aria-label="Zoom out"><Minus size={15} /></button>
              <button onClick={fit} aria-label="Fit to screen"><Maximize size={14} /></button>
            </div>
            <div className="lin-legend"><span><i className="lg-focus" />Focus</span><span><i className="lg-edge" />Recorded lineage</span><span>Ctrl + scroll to zoom · drag to pan</span></div>
          </div>
        </div>

        <aside className="card lin-side">
          <h3>Asset details</h3>
          <div className="ls-head">
            <b>{sa.name}</b>
            <small>{sa.schema} · {kindLabel(sa.kind)}</small>
            <span className="lnode-src">{sa.source}</span>
          </div>
          <div className="ls-tabs" role="tablist">
            {['overview', 'columns', 'relationships'].map((t) => (
              <button key={t} role="tab" aria-selected={tab === t} className={tab === t ? 'on' : ''} onClick={() => setTab(t)}>{t[0].toUpperCase() + t.slice(1)}</button>
            ))}
          </div>
          {tab === 'overview' && (
            <dl className="ls-dl">
              <div><dt>Full name</dt><dd className="mono">{sa.fqn}</dd></div>
              <div><dt>Description</dt><dd>{sa.desc || 'No description yet'}</dd></div>
              <div><dt>Source</dt><dd>{sa.source}</dd></div>
              <div><dt>Columns</dt><dd>{sa.cols}</dd></div>
              <div><dt>Sensitivity</dt><dd>{sa.cls.join(', ') || 'None'}</dd></div>
              <div><dt>Owner</dt><dd>{sa.owner}</dd></div>
              <div><dt>Layer</dt><dd>{sa.layer || '—'}</dd></div>
            </dl>
          )}
          {tab === 'columns' && (
            <ul className="ls-cols">
              {sa.columns.map((c) => (
                <li key={c.name}><code>{c.name}</code><span>{c.type}</span>{c.cls && <em>{c.cls}</em>}</li>
              ))}
            </ul>
          )}
          {tab === 'relationships' && (
            <div className="ls-rel">
              <h4>Upstream ({ups.length})</h4>
              {ups.length ? ups.map((e) => <RelItem key={e.s} k={e.s} e={e} onFocus={refocus} />) : <p className="muted">No recorded inputs.</p>}
              <h4>Downstream ({downs.length})</h4>
              {downs.length ? downs.map((e) => <RelItem key={e.t} k={e.t} e={e} onFocus={refocus} />) : <p className="muted">No recorded consumers.</p>}
            </div>
          )}
          {colSel && (
            <div className="ls-map">
              <h4>Column trace · <code>{colSel.c}</code></h4>
              {trace.steps.map(({ e, m }) => (
                <p key={e.s + e.t + m.join()}><code>{BY_KEY[e.s].name}.{m[0]}</code> → <code>{BY_KEY[e.t].name}.{m[1]}</code><small>{m[2]}</small></p>
              ))}
              {trace.steps.length === 0 && <p className="muted">No column mappings recorded for this column.</p>}
            </div>
          )}
          {sa.key !== focusKey && <button className="btn ghost wide-sm" onClick={() => onOpenAsset(sa)}><ArrowUpRight size={14} />Open {sa.name}</button>}
        </aside>
      </div>
    </div>
  );
}

function RelItem({ k, e, onFocus }) {
  const a = BY_KEY[k];
  return (
    <button className="rel" onClick={() => onFocus(k)}>
      <b>{a.fqn}</b>
      <small>{e.tf || e.rel}</small>
      <span>{e.map.length} column mappings · {(e.ev || '').replace(/_/g, ' ')}</span>
    </button>
  );
}
