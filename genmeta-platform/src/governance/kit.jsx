import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Download, ChevronDown } from 'lucide-react';
import { Badge, Button } from '../components/ui.jsx';
export { Stats as Tiles } from '../pages/admin/kit.jsx';

/* One card with a section heading, an optional count, a sub-line and actions on the right. */
export function Card({ title, count, sub, actions, children, className = '' }) {
  return (
    <section className={`dash-card ${className}`}>
      {(title || actions) && (
        <div className="block-head gv-head">
          <div>
            {title && <h2>{title}{count != null && <span className="gv-count">{count}</span>}</h2>}
            {sub && <p className="block-sub">{sub}</p>}
          </div>
          {actions && <div className="gv-tools">{actions}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

/* Status words used across the old screens, mapped onto the three badge tones. */
const OK = ['passing', 'pass', 'inside', 'evidenced', 'on', 'ok', 'within the policy', 'verified', 'active', 'accepted', 'approved', 'yes', 'allow', 'healthy'];
const BAD = ['fail', 'failing', 'critical', 'outside', 'breach recorded', 'not connected', 'deny', 'refused', 'no', 'retired'];
export function tone(s = '') {
  const k = String(s).toLowerCase();
  if (OK.includes(k)) return 'ok';
  if (BAD.includes(k)) return 'bad';
  return 'warn';
}
export const StatusBadge = ({ s, children }) => <Badge tone={tone(s)}>{children || s}</Badge>;

export const Empty = ({ children }) => <p className="gv-empty">{children}</p>;
export const Note = ({ children }) => <p className="gv-note">{children}</p>;
export const Mono = ({ children }) => <code className="mono">{children}</code>;

/* A field label above its control (same look as the glossary forms). */
export function Fld({ label, children, hint }) {
  return <div className="gl-fld"><label>{label}</label>{children}{hint && <small className="gv-hint">{hint}</small>}</div>;
}

/* Overlays are fixed-position, so portal them to <body> (the page fade-in transform would trap them). */
export function Drawer({ title, onClose, footer, children, wide }) {
  useEsc(onClose);
  return createPortal(
    <div className="gl">
      <div className="gl-scrim" onClick={onClose} />
      <div className={`gl-drawer gv-drawer ${wide ? 'wide' : ''}`} role="dialog" aria-label={typeof title === 'string' ? title : 'Detail'}>
        <header>{title}<button className="ib" aria-label="Close" onClick={onClose}><X size={16} /></button></header>
        <div className="gl-db">{children}</div>
        {footer && <footer>{footer}</footer>}
      </div>
    </div>,
    document.body,
  );
}

export function Modal({ title, onClose, children, actions }) {
  useEsc(onClose);
  return createPortal(
    <div className="gl">
      <div className="gl-scrim" onClick={onClose} />
      <div className="gl-modal gv-modal" role="dialog" aria-label={title}>
        <h3>{title}</h3>
        {children}
        {actions && <div className="gl-modal-acts">{actions}</div>}
      </div>
    </div>,
    document.body,
  );
}

function useEsc(fn) {
  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') fn(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [fn]);
}

/* Toast: call toast('Saved') from anywhere inside the Governance section. */
let pushToast = null;
export const toast = (m) => pushToast && pushToast(m);
export function Toaster() {
  const [msg, setMsg] = useState(null);
  const t = useRef();
  useEffect(() => {
    pushToast = (m) => { setMsg(m); clearTimeout(t.current); t.current = setTimeout(() => setMsg(null), 2400); };
    return () => { pushToast = null; clearTimeout(t.current); };
  }, []);
  return msg ? createPortal(<div className="gl"><div className="gl-toast" role="status">{msg}</div></div>, document.body) : null;
}

/* A small dropdown of actions (Export ▾). */
export function MenuButton({ label, icon = Download, items }) {
  const [open, setOpen] = useState(false);
  const ref = useRef();
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  return (
    <div className="gv-menu" ref={ref}>
      <Button variant="secondary" size="md" icon={icon} onClick={() => setOpen((o) => !o)} aria-expanded={open}>{label}<ChevronDown size={14} /></Button>
      {open && (
        <div className="gv-menu-pop" role="menu">
          {items.map(([l, fn]) => <button key={l} role="menuitem" className="gv-menu-item" onClick={() => { setOpen(false); fn(); }}>{l}</button>)}
        </div>
      )}
    </div>
  );
}

/* Download a CSV built from rows (first row = header). */
export function downloadCsv(name, rows) {
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const blob = new Blob([rows.map((r) => r.map(esc).join(',')).join('\n')], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = name; a.click();
  toast(`Downloaded ${name}`);
}
export function downloadText(name, text, type = 'text/plain') {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name; a.click();
  toast(`Downloaded ${name}`);
}

/* Multi-select shown as a compact chip picker (no native multi-select boxes). */
export function ChipPick({ options, value, onChange }) {
  const toggle = (o) => onChange(value.includes(o) ? value.filter((x) => x !== o) : [...value, o]);
  return (
    <div className="gv-chips">
      {options.map((o) => <button type="button" key={o} className={`chip ${value.includes(o) ? 'on' : ''}`} onClick={() => toggle(o)}>{o}</button>)}
    </div>
  );
}

/* A labelled list of key → value pairs. */
export function KV({ rows }) {
  return <dl className="gl-kv gv-kv">{rows.map(([k, v]) => [<dt key={`${k}-k`}>{k}</dt>, <dd key={`${k}-v`}>{v}</dd>])}</dl>;
}
