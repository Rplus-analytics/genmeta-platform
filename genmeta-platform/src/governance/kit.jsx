import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  X, Download, ChevronDown, ChevronRight, Fingerprint, Lock, ShieldCheck, Layers, Database, Scale, Boxes, GitBranch, Clock, CheckCircle2, BellRing,
  Target, Crosshair, Radar, Sigma, AlertTriangle, AlertOctagon, Tags, ScrollText, Link2, Eye, ShieldAlert, Globe2, MapPin, FileSignature,
  Landmark, Ruler, SlidersHorizontal, Archive, FileSearch, Gauge, Shield, FileWarning, UserRound, FileCheck2, ClipboardList, Flame,
  Inbox, KeyRound, CalendarCheck, ListChecks, UserX, Users, UserCheck, RefreshCw, Workflow, Hourglass,
} from 'lucide-react';
import { Button } from '../components/ui.jsx';

/* Icon + colour for every KPI tile in the section, keyed by its label (old UI used coloured icon cards). */
const TILE_LOOK = {
  'Classification reviews': [Tags, 'violet'], 'Ownership gaps': [UserX, 'bad'], 'Sensitive assets': [ShieldAlert, 'warn'], Sources: [Database, 'info'], 'Assets assessed': [Layers, 'teal'],
  'Assets in the register': [Layers, 'info'], 'Steward coverage': [UserCheck, 'warn'], 'Open quality issues': [AlertTriangle, 'bad'], 'Tasks in the queue': [ListChecks, 'violet'],
  'Audit integrity': [Fingerprint, 'ok'], 'Sensitive coverage': [Lock, 'warn'], Classification: [ShieldCheck, 'info'], Constitution: [Layers, 'violet'],
  'Sources governed': [Database, 'info'], 'Compliance posture': [Scale, 'warn'],
  'Models governed': [Boxes, 'info'], 'Model versions': [GitBranch, 'violet'], 'In validation or approval': [Clock, 'warn'], 'In production': [CheckCircle2, 'ok'], 'Open breach alerts': [BellRing, 'bad'],
  Accuracy: [Target, 'info'], Precision: [Crosshair, 'info'], Recall: [Radar, 'teal'], F1: [Sigma, 'violet'], 'False-positive rate': [AlertTriangle, 'warn'], 'False-negative rate': [AlertOctagon, 'bad'], 'Exact category': [Tags, 'teal'],
  'Audit records': [ScrollText, 'info'], 'Chain integrity': [Link2, 'ok'], 'Data access (14 days)': [Eye, 'teal'], 'Violations and refusals': [ShieldAlert, 'bad'],
  'Residency policy': [Globe2, 'info'], 'Locations in the register': [MapPin, 'violet'], 'Outside the policy': [AlertTriangle, 'bad'], 'Overrides recorded': [FileSignature, 'warn'],
  Policies: [Landmark, 'violet'], Standards: [Ruler, 'info'], Controls: [SlidersHorizontal, 'teal'], 'Regulatory obligations': [Scale, 'warn'], 'Retention requirements': [Archive, 'ok'], 'Extracted, awaiting review': [FileSearch, 'info'],
  Compliance: [Gauge, 'warn'], 'Policy coverage': [Shield, 'ok'], 'Sensitive data with retention': [Archive, 'bad'], 'Open risks': [AlertTriangle, 'bad'], 'Exceptions to decide': [FileWarning, 'warn'],
  'Assets holding personal data': [UserRound, 'info'], 'Accepted records of processing': [FileCheck2, 'ok'], 'Handling rules failing': [AlertTriangle, 'bad'], 'Assessments required': [ClipboardList, 'warn'],
  'DPIA required, not started': [ClipboardList, 'bad'], 'In progress': [Clock, 'warn'], Approved: [CheckCircle2, 'ok'], 'Risks recorded': [Flame, 'bad'],
  'Requests pending': [Inbox, 'warn'], 'Active grants': [KeyRound, 'ok'], 'Access policies': [ShieldCheck, 'info'], 'Reviews open': [CalendarCheck, 'violet'], 'Grants to review': [ListChecks, 'info'],
  'Active workflows': [Workflow, 'violet'], 'Waiting for you': [Inbox, 'warn'], 'Requests in progress': [Hourglass, 'info'], Overdue: [AlertTriangle, 'bad'],
  'Recommended to revoke': [UserX, 'bad'], Roles: [Users, 'violet'], 'Role assignments': [UserCheck, 'info'], Scopes: [Layers, 'teal'], 'Identities synchronised': [RefreshCw, 'ok'],
};

/* KPI strip: one row, each tile an icon chip + figure + label + one-line note. */
export function Tiles({ items }) {
  return (
    <div className="gv-tiles" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
      {items.map((t) => {
        const [I, tn] = TILE_LOOK[t.l] || [null, 'info'];
        return (
          <div key={t.l} className="gv-tile" title={t.s}>
            <div className="gv-tile-h">{I && <span className={`gv-chip sm ${t.tone || tn}`}><I size={14} strokeWidth={1.9} /></span>}<span>{t.l}</span></div>
            <b>{typeof t.v === 'number' ? t.v.toLocaleString('en-GB') : t.v}</b>
            {t.s && <small>{t.s}</small>}
          </div>
        );
      })}
    </div>
  );
}

/* One card with an optional icon chip, a heading, a count, a sub-line and actions on the right. */
export function Card({ title, count, sub, actions, children, className = '', icon: I, tone: tn = 'info' }) {
  return (
    <section className={`dash-card ${className}`}>
      {(title || actions) && (
        <div className="block-head gv-head">
          <div className="gv-head-l">
            {I && <span className={`gv-chip ${tn}`}><I size={16} strokeWidth={1.8} /></span>}
            <div>
              {title && <h2>{title}{count != null && <span className="gv-count">{count}</span>}</h2>}
              {sub && <p className="block-sub">{sub}</p>}
            </div>
          </div>
          {actions && <div className="gv-tools">{actions}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

/* A titled block inside a card, separated by a rule — keeps long cards readable. */
export function Section({ icon: I, tone: tn = 'info', title, meta, children, first }) {
  return (
    <div className={`gv-section ${first ? 'first' : ''}`}>
      <div className="gv-section-h">
        {I && <span className={`gv-chip sm ${tn}`}><I size={14} strokeWidth={1.9} /></span>}
        <h3>{title}</h3>
        {meta && <span className="gv-section-meta">{meta}</span>}
      </div>
      {children}
    </div>
  );
}

/* Second-level navigation inside a tab — same look as the Catalogue's level-2 tabs
   (Graph · End to end · …): light pills, the active one on ice. Counts stay visible. */
export function SubNav({ items, value, onChange }) {
  return (
    <div className="subtabs gv-subtabs" role="tablist">
      {items.map((t) => (
        <button key={t.value} type="button" role="tab" aria-selected={value === t.value} className={value === t.value ? 'on' : ''} onClick={() => onChange(t.value)}>
          {t.label}{t.count != null && <em className={t.countTone || ''}>{t.count}</em>}
        </button>
      ))}
    </div>
  );
}

/* A separate card that folds open and shut (versions, lineage, workflow, history). */
export function Collapse({ icon: I, tone: tn = 'info', title, meta, actions, defaultOpen = true, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className={`dash-card gv-collapse ${open ? 'open' : ''}`}>
      <div className="gv-collapse-h">
        <button type="button" className="gv-collapse-t" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
          <ChevronRight size={16} className="gv-collapse-ic" />
          {I && <span className={`gv-chip sm ${tn}`}><I size={14} strokeWidth={1.9} /></span>}
          <h3>{title}</h3>
          {meta && <span className="gv-section-meta">{meta}</span>}
        </button>
        {actions && <div className="gv-collapse-a">{actions}</div>}
      </div>
      {open && <div className="gv-collapse-b">{children}</div>}
    </section>
  );
}

/* Status words used across the old screens, mapped onto semantic colours. */
const OK = ['passing', 'pass', 'inside', 'evidenced', 'on', 'ok', 'within the policy', 'verified', 'active', 'accepted', 'approved', 'yes', 'allow', 'healthy', 'passed', 'keep', 'low', 'full', 'detected', 'excepted', 'in production'];
const BAD = ['fail', 'failing', 'critical', 'outside', 'breach recorded', 'not connected', 'deny', 'refused', 'no', 'retired', 'not started', 'revoke', 'high', 'failed', 'bad', 'breach', 'rejected'];
const INFO = ['pending', 'proposed', 'draft', 'in review', 'disclosed', 'info', 'completion', 'dpo review', 'approval', 'registered'];
export function tone(s = '') {
  const k = String(s).toLowerCase();
  if (OK.includes(k)) return 'ok';
  if (BAD.includes(k)) return 'bad';
  if (INFO.includes(k)) return 'info';
  return 'warn';
}
export const StatusBadge = ({ s, children }) => <span className={`gv-badge ${tone(s)}`}><i />{children || s}</span>;

/* A coloured meter: green from 70%, amber from 40%, red below. */
export const meterTone = (pct) => (pct >= 0.7 ? 'ok' : pct >= 0.4 ? 'warn' : 'bad');
export function Meter({ pct, tone: tn }) {
  return <i className={`gv-meter ${tn || meterTone(pct)}`}><em style={{ width: `${Math.max(0, Math.min(1, pct)) * 100}%` }} /></i>;
}

/* Width of an element, so SVG charts draw at real pixels instead of being stretched. */
export function useWidth() {
  const ref = useRef(null);
  const [w, setW] = useState(0);
  useLayoutEffect(() => {
    if (!ref.current) return undefined;
    const ro = new ResizeObserver(([e]) => setW(Math.round(e.contentRect.width)));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return [ref, w];
}

export const Empty = ({ children }) => <p className="gv-empty">{children}</p>;
export const Note = ({ children }) => <p className="gv-note">{children}</p>;
export const Mono = ({ children }) => <code className="mono">{children}</code>;

/* A field label above its control (same look as the glossary forms). */
export function Fld({ label, children, hint }) {
  return <div className="gl-fld"><label>{label}</label>{children}{hint && <small className="gv-hint">{hint}</small>}</div>;
}

/* Overlays are fixed-position, so portal them to <body> (the page fade-in transform would trap them). */
export function Drawer({ title, onClose, footer, children, wide, className = '' }) {
  useEsc(onClose);
  return createPortal(
    <div className="gl">
      <div className="gl-scrim" onClick={onClose} />
      <div className={`gl-drawer gv-drawer ${wide ? 'wide' : ''} ${className}`} role="dialog" aria-label={typeof title === 'string' ? title : 'Detail'}>
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
