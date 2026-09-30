import { Fragment, useEffect, useRef, useState } from 'react';
import { NavLink, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Building2, Database, Layers, Network, MessagesSquare, Landmark, Tag, Package, Users, ShieldCheck, FileCode2,
  BookA, LogOut, Search, Bell, CircleHelp, Server,
} from 'lucide-react';
import { NAV, pad3, navMatch, isDataAssets } from '../nav.js';
import { glossaryCrumbs } from '../glossary-data.js';
import { BRAND } from '../brand.js';
import { useAuth } from '../auth.jsx';
import { Burst } from '../components/Loader.jsx';
import Dashboard from '../pages/Dashboard.jsx';
import DataSources from '../pages/DataSources.jsx';
import CodeAnalyzer from '../pages/CodeAnalyzer.jsx';
import DataAssets from '../pages/DataAssets.jsx';
import KnowledgeGraph from '../pages/KnowledgeGraph.jsx';
import AskGenMeta from '../pages/AskGenMeta.jsx';
import Governance from '../pages/Governance.jsx';
import Classification from '../pages/Classification.jsx';
import DataProducts from '../pages/DataProducts.jsx';
import Stewardship from '../pages/Stewardship.jsx';
import Admin from '../pages/Admin.jsx';

const ICONS = { LayoutDashboard, Building2, Database, Layers, Network, MessagesSquare, Landmark, Tag, Package, Users, ShieldCheck, FileCode2, BookA };

/* Collapsed to icons by default; hovering the sidebar expands it (see .sidebar in styles.css),
   overlaying the page so the content never shifts. No manual collapse control. */
function Sidebar() {
  const { user, signOut } = useAuth();
  const nav = useNavigate();
  const { pathname } = useLocation();
  const Group = ({ g }) => NAV.filter((n) => n.group === g).map((n) => {
    const I = ICONS[n.icon];
    /* "Data assets" opens /app/catalogue and stays highlighted across all its section routes */
    if (n.assets) {
      return (
        <NavLink key={n.to} to={n.to} title={n.label} className={() => `nav-item ${isDataAssets(pathname) ? 'active' : ''}`}>
          <I size={17} strokeWidth={1.5} /><span className="nav-label">{n.label}</span>
        </NavLink>
      );
    }
    return (
      <NavLink key={n.to} to={n.to} end={n.end} title={n.label} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
        <I size={17} strokeWidth={1.5} /><span className="nav-label">{n.label}</span>
        {n.badge && <span className="nav-badge">{n.badge}</span>}
      </NavLink>
    );
  });

  return (
    <aside className="sidebar">
      <nav className="sb-nav">
        <div className="sb-group">Discover</div><Group g="Discover" />
        <div className="sb-group">Govern</div><Group g="Govern" />
        <div className="sb-group">Admin</div><Group g="Admin" />
      </nav>

      <div className="sb-foot">
        <div className="env"><span className="env-ico"><Server size={17} strokeWidth={1.5} /><i className="live-dot" /></span><div className="env-t"><b>R+ Production</b><small>Connected · v1.0.0</small></div></div>
        <div className="me">
          <span className="avatar">{user?.initials || 'AD'}</span>
          <div className="me-t"><b>{user?.name || 'Admin'}</b><small>{user?.role || 'Governance Lead'}</small></div>
          <button className="icon-btn" onClick={() => { signOut(); nav('/'); }} aria-label="Sign out" title="Sign out"><LogOut size={15} strokeWidth={1.5} /></button>
        </div>
      </div>
    </aside>
  );
}

function Topbar({ loading }) {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const nav = useNavigate();
  const { group, parent, item, rest } = navMatch(pathname);
  const sub = rest && (item.crumbs ? item.crumbs[rest] : 'Asset');
  /* The Business glossary has its own deep breadcrumb (glossary / term). */
  const glossCrumbs = pathname.startsWith('/app/glossary') ? glossaryCrumbs(pathname) : [];
  /* don't repeat the group when it already matches the page label (e.g. Admin) */
  const showGroup = !!parent || group !== item.label;
  const topIdx = Math.max(0, NAV.findIndex((n) => n === parent || n === item));
  return (
    <header className="topbar">
      <i className={`route-bar ${loading ? 'on' : ''}`} />
      <img className="topbar-logo" src={BRAND.lockup} alt="Rplus | GenMeta" />
      <div className="crumbs"><span className="counter">{pad3(topIdx + 1)} — {pad3(NAV.length)}</span><span>{showGroup && `${group} / `}{parent && `${parent.label} / `}
        {glossCrumbs.length ? (
          <>
            <span className="crumb-link" role="link" tabIndex={0} onClick={() => nav(item.to)}>{item.label}</span>
            {glossCrumbs.map((c, i) => (
              <Fragment key={i}>{' / '}{(i === glossCrumbs.length - 1 || !c.to) ? <b>{c.label}</b> : <span className="crumb-link" role="link" tabIndex={0} onClick={() => nav(c.to)}>{c.label}</span>}</Fragment>
            ))}
          </>
        ) : sub ? <><span className="crumb-link">{item.label}</span> / <b>{sub}</b></> : <b>{item.label}</b>}</span></div>
      <label className="top-search"><Search size={15} strokeWidth={1.5} /><input placeholder="Search data, systems, or ask a question…" aria-label="Search" /><kbd>⌘K</kbd></label>
      <div className="top-actions">
        <span className={`top-burst ${loading ? 'on' : ''}`}><Burst size={20} /></span>
        <button className="icon-btn" aria-label="Notifications"><Bell size={17} strokeWidth={1.5} /><i className="ping" /></button>
        <button className="icon-btn" aria-label="Help"><CircleHelp size={17} strokeWidth={1.5} /></button>
        <span className="avatar sm">{user?.initials || 'AD'}</span>
      </div>
    </header>
  );
}

export default function AppShell() {
  const { user } = useAuth();
  const { pathname, search } = useLocation();
  const nav = useNavigate();
  const main = useRef(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (main.current) main.current.scrollTop = 0;
    setLoading(true);
    const t = setTimeout(() => setLoading(false), 650);
    return () => clearTimeout(t);
  }, [pathname]);
  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="app-frame">
      <Topbar loading={loading} />
      <div className="shell">
        <Sidebar />
        <div className="main">
          <main ref={main} className={`content ${pathname === '/app/sources' ? 'flush' : ''}`}>
            <Routes>
              <Route index element={<Dashboard />} />
            <Route path="code-analyzer" element={<CodeAnalyzer />} />
            <Route path="sources" element={<DataSources />} />
            {/* The standalone Data estate page is retired; old links land on the dashboard. */}
            <Route path="data-estate" element={<Navigate to={`/app${search}`} replace />} />
            {/* The Data assets section shares one InnerLayout across all its routes */}
            <Route path="catalogue" element={<DataAssets />} />
            <Route path="catalogue/:assetId" element={<DataAssets />} />
            <Route path="glossary" element={<DataAssets />} />
            <Route path="glossary/g/:glossary" element={<DataAssets />} />
            <Route path="glossary/:term" element={<DataAssets />} />
            <Route path="lineage" element={<DataAssets />} />
            <Route path="quality" element={<DataAssets />} />
            <Route path="data-governance" element={<DataAssets />} />
            <Route path="data-explorer" element={<DataAssets />} />
            <Route path="metadata-changes" element={<DataAssets />} />
            <Route path="graph/*" element={<KnowledgeGraph />} />
            <Route path="ask" element={<AskGenMeta />} />
            <Route path="governance" element={<Governance />} />
            <Route path="classification" element={<Classification />} />
            <Route path="products" element={<DataProducts />} />
            <Route path="stewardship" element={<Stewardship />} />
              <Route path="admin/*" element={<Admin />} />
              <Route path="*" element={<Navigate to="/app" replace />} />
            </Routes>
          </main>
        </div>
      </div>
      {pathname !== '/app/ask' && (
        <button className="fab" onClick={() => nav('/app/ask')} aria-label="Ask GenMeta"><img src={BRAND.burst} alt="" /></button>
      )}
    </div>
  );
}
