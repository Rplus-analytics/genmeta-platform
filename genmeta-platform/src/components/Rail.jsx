import { useState } from 'react';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';

/* In-page left rails (Admin, Catalogue filters) share one look and one collapse behaviour.
   The collapsed state is remembered per rail in this browser. */
export function useCollapsed(key) {
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem(`gm:rail:${key}`) === '1'; } catch { return false; }
  });
  const set = (v) => setCollapsed((cur) => {
    const next = typeof v === 'function' ? v(cur) : v;
    try { localStorage.setItem(`gm:rail:${key}`, next ? '1' : '0'); } catch { /* storage unavailable */ }
    return next;
  });
  return [collapsed, set];
}

export function RailHead({ title, collapsed, onToggle, children }) {
  const I = collapsed ? PanelLeftOpen : PanelLeftClose;
  return (
    <div className="admin-nav-top">
      <div className="admin-nav-h">{title}</div>
      {children}
      <button type="button" className="icon-btn rail-toggle" onClick={onToggle} aria-expanded={!collapsed}
        aria-label={`${collapsed ? 'Expand' : 'Collapse'} ${title.toLowerCase()}`} title={`${collapsed ? 'Expand' : 'Collapse'} ${title.toLowerCase()}`}>
        <I size={16} strokeWidth={1.6} />
      </button>
    </div>
  );
}
