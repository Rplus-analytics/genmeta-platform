import { RailHead, useCollapsed } from './Rail.jsx';

/* Supabase-style page arrangement for sections that have their own menu:
   [icon sidebar 56] [inner menu 260, docked] [content, fills the rest].
   The inner menu is flush against the icon sidebar, full height under the top bar,
   sticky with its own scroll, and always opens expanded (collapse is not saved). */
export default function InnerLayout({ title, menu, children }) {
  const [collapsed, setCollapsed] = useCollapsed();
  return (
    <div className={`inner-shell fade-in ${collapsed ? 'is-collapsed' : ''}`}>
      <nav className={`admin-nav inner-menu ${collapsed ? 'collapsed' : ''}`} aria-label={title}>
        <RailHead title={title} collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
        {menu}
      </nav>
      <div className="inner-body">{children}</div>
    </div>
  );
}
