import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';

/* Shared "slide-in side panel with a pinned toggle" — the same pattern as the
   Lineage graph's Asset details. Wraps main content (which narrows when the
   panel opens) and renders the panel on the right. Open/closed persists in
   localStorage; Esc / × close it; focus moves into the panel on open and back
   to the toggle on close; the toggle pulses when `pulseSignal` changes while
   collapsed; under 900px the panel opens as an overlay drawer (CSS). */
const read = (k, f) => { try { const v = localStorage.getItem(k); return v == null ? f : v === '1'; } catch { return f; } };
const write = (k, v) => { try { localStorage.setItem(k, v ? '1' : '0'); } catch { /* ignore */ } };

export default function CollapsibleSidePanel({ storageKey, title, tooltip, icon: Icon, panel, pulseSignal, children }) {
  const [open, setOpen] = useState(() => read(storageKey, false));
  const [pulse, setPulse] = useState(false);
  const panelRef = useRef(null);
  const toggleRef = useRef(null);
  const firstFocus = useRef(true);
  const firstPulse = useRef(true);

  useEffect(() => { write(storageKey, open); }, [storageKey, open]);
  useEffect(() => {
    if (firstFocus.current) { firstFocus.current = false; return; }
    if (open) panelRef.current?.focus(); else toggleRef.current?.focus();
  }, [open]);
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' && open) setOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);
  useEffect(() => {
    if (firstPulse.current) { firstPulse.current = false; return; }
    if (!open) { setPulse(true); const t = setTimeout(() => setPulse(false), 650); return () => clearTimeout(t); }
  }, [pulseSignal]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className={`csp ${open ? 'is-open' : ''}`}>
      <div className="csp-bar">
        <button ref={toggleRef} className={`lin-details-toggle csp-toggle ${open ? 'on' : ''} ${pulse ? 'pulse' : ''}`}
          aria-expanded={open} aria-label={tooltip} title={tooltip} onClick={() => setOpen((o) => !o)}><Icon size={16} /></button>
      </div>
      <div className="csp-main">
        <div className="csp-content">{children}</div>
        <aside ref={panelRef} tabIndex={-1} className={`lin-side csp-panel ${open ? 'open' : ''}`} aria-hidden={!open} aria-label={title}>
          <div className="ls-top"><h3>{title}</h3><button className="ls-close" aria-label={`Close ${title}`} onClick={() => setOpen(false)}><X size={16} /></button></div>
          {open && panel}
        </aside>
      </div>
    </div>
  );
}
