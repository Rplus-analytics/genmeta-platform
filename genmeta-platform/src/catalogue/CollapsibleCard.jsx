import { useEffect, useState } from 'react';
import { ChevronDown } from 'lucide-react';

/* A card whose body collapses. The header (title + subtitle, and any actions
   passed in) stays visible; a chevron at the top-right toggles the body.
   State is per-card (keyed by storageKey) and mirrored to localStorage so it
   survives a refresh. Used by the three Lineage granularity cards. */

function readOpen(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    return v == null ? fallback : v === '1';
  } catch {
    return fallback;
  }
}
function writeOpen(key, val) {
  try { localStorage.setItem(key, val ? '1' : '0'); } catch { /* storage unavailable — ignore */ }
}

export default function CollapsibleCard({ title, subtitle, storageKey, actions, children, className = '' }) {
  const [open, setOpen] = useState(() => readOpen(storageKey, true));
  useEffect(() => { writeOpen(storageKey, open); }, [storageKey, open]);
  const toggle = () => setOpen((o) => !o);

  return (
    <section className={`card cc-card ${className}`}>
      <div className="cc-head" onClick={toggle}>
        <div className="cc-titles">
          <b className="cc-title">{title}</b>
          {subtitle && <p className="cc-sub">{subtitle}</p>}
        </div>
        <div className="cc-head-right">
          {open && actions && <div className="cc-actions" onClick={(e) => e.stopPropagation()}>{actions}</div>}
          <button
            type="button"
            className="cc-toggle"
            aria-expanded={open}
            aria-label={`${open ? 'Collapse' : 'Expand'} ${title}`}
            onClick={(e) => { e.stopPropagation(); toggle(); }}
          >
            <ChevronDown size={18} className={`cc-chev ${open ? '' : 'closed'}`} />
          </button>
        </div>
      </div>
      {open && <div className="cc-body">{children}</div>}
    </section>
  );
}
