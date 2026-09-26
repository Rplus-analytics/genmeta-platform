import { useEffect, useState } from 'react';
import { BRAND } from '../brand.js';

/* The GenMeta burst, spinning — used for every "working" state in the product. */
export function Burst({ size = 28, spin = true, className = '' }) {
  return (
    <span className={`burst ${spin ? 'spin' : ''} ${className}`} style={{ '--s': `${size}px` }} aria-hidden="true">
      <i className="burst-glow" />
      <img src={BRAND.burst} alt="" />
    </span>
  );
}

/* Inline spinner with an optional label, e.g. inside a button or a card */
export function Spinner({ size = 18, label }) {
  return (
    <span className="spinner" role="status">
      <Burst size={size} />
      {label && <span className="spinner-l">{label}</span>}
    </span>
  );
}

/* Full-frame overlay that walks through the steps of a longer job */
export function Overlay({ title, steps = [], interval = 650 }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (steps.length < 2) return undefined;
    const t = setInterval(() => setI((v) => Math.min(v + 1, steps.length - 1)), interval);
    return () => clearInterval(t);
  }, [steps.length, interval]);
  return (
    <div className="overlay" role="status" aria-live="polite">
      <Burst size={84} />
      <b className="ov-title">{title}</b>
      {steps.length > 0 && (
        <ol className="ov-steps">
          {steps.map((s, k) => <li key={s} className={k < i ? 'done' : k === i ? 'now' : ''}>{s}</li>)}
        </ol>
      )}
      <div className="ov-bar"><i style={{ width: `${steps.length ? ((i + 1) / steps.length) * 100 : 100}%` }} /></div>
    </div>
  );
}

/* Small in-place cover for a card while it reloads */
export function Cover({ label }) {
  return (
    <div className="cover" role="status">
      <Burst size={44} />
      <span>{label}</span>
    </div>
  );
}
