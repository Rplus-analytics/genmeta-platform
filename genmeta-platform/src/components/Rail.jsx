import { useState } from 'react';
import { PanelLeftClose, PanelLeftOpen, ChevronDown } from 'lucide-react';

/* In-page left rails (Admin, Knowledge graph, Catalogue filters) share one look and one
   collapse behaviour. Every rail opens expanded on each visit; collapsing lasts only while
   you stay on the page (it is not saved), so a refresh or coming back shows it expanded again. */
export function useCollapsed() {
  return useState(false);
}

export function RailHead({ title, collapsed, onToggle, children }) {
  const I = collapsed ? PanelLeftOpen : PanelLeftClose;
  return (
    <div className="admin-nav-top">
      <div className="admin-nav-h">{title}</div>
      {children}
      {onToggle && (
        <button type="button" className="icon-btn rail-toggle" onClick={onToggle} aria-expanded={!collapsed}
          aria-label={`${collapsed ? 'Expand' : 'Collapse'} ${title.toLowerCase()}`} title={`${collapsed ? 'Expand' : 'Collapse'} ${title.toLowerCase()}`}>
          <I size={16} strokeWidth={1.6} />
        </button>
      )}
    </div>
  );
}

/* A collapsible section label inside an inner menu (Logs, Filters…). */
export function Section({ label, defaultOpen = true, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="inner-section">
      <button type="button" className="admin-nav-sec sec-toggle" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <span>{label}</span><ChevronDown size={13} className={`sec-chev ${open ? '' : 'closed'}`} />
      </button>
      {open && <div className="inner-section-b">{children}</div>}
    </div>
  );
}
