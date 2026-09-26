import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { NAV } from '../nav.js';

/* Animated count-up for KPI figures */
export function CountUp({ to, decimals = 0, duration = 1100 }) {
  const [v, setV] = useState(0);
  const raf = useRef();
  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) { setV(to); return; }
    const t0 = performance.now();
    const tick = (n) => {
      const k = Math.min(1, (n - t0) / duration);
      setV(to * (1 - Math.pow(1 - k, 3)));
      if (k < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [to, duration]);
  return <>{decimals ? v.toFixed(decimals) : Math.round(v).toLocaleString('en-GB')}</>;
}

/* Minimal sparkline (area + line) */
export function Sparkline({ data, w = 120, h = 40, stroke = '#fff', fill = 'rgba(255,255,255,.18)' }) {
  const min = Math.min(...data), max = Math.max(...data);
  const pts = data.map((d, i) => [(i / (data.length - 1)) * w, h - 4 - ((d - min) / (max - min || 1)) * (h - 8)]);
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join('');
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="spark" aria-hidden="true">
      <path d={`${line}L${w} ${h}L0 ${h}Z`} fill={fill} />
      <path d={line} fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="3" fill={stroke} />
    </svg>
  );
}

export function Ring({ value, size = 64, stroke = 7, color = '#1F5FD6', track = '#E6EEFB', children }) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r;
  return (
    <div className="ring" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={stroke} fill="none" />
        <circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} fill="none" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - value)} transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(.2,.8,.2,1)' }} />
      </svg>
      <div className="ring-c">{children}</div>
    </div>
  );
}

export function VendorChip({ ini, size = 40 }) {
  return <span className="vchip" style={{ width: size, height: size, fontSize: size * 0.32 }}>{ini}</span>;
}

export function Status({ s }) {
  const map = { healthy: 'Healthy', warning: 'Warning', failed: 'Failed' };
  return <span className={`status ${s}`}><i />{map[s]}</span>;
}

export function PageHead({ title, sub, eyebrow, children }) {
  const { pathname } = useLocation();
  const group = eyebrow || NAV.find((n) => n.to === pathname)?.group;
  return (
    <div className="page-head">
      <div>
        {group && <span className="eyebrow">{group}</span>}
        <h1>{title}</h1>
        {sub && <p>{sub}</p>}
      </div>
      {children && <div className="head-actions">{children}</div>}
    </div>
  );
}
