import { useEffect, useRef, useState } from 'react';
import { NavLink, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Building2, Database, Layers, Network, MessagesSquare, Landmark, Tag, Package, Users, ShieldCheck, FileCode2,
  PanelLeft, ChevronsUpDown, LogOut, Search, Bell, CircleHelp, Check,
} from 'lucide-react';
import { NAV, pad3 } from '../nav.js';
import { PRODUCTS } from '../data.js';
import { BRAND } from '../brand.js';
import { useAuth } from '../auth.jsx';
import { Burst } from '../components/Loader.jsx';
import Dashboard from '../pages/Dashboard.jsx';
import DataSources from '../pages/DataSources.jsx';
import CodeAnalyzer from '../pages/CodeAnalyzer.jsx';
import Catalogue from '../pages/Catalogue.jsx';
import AssetDetail from '../pages/AssetDetail.jsx';
import KnowledgeGraph from '../pages/KnowledgeGraph.jsx';
import AskGenMeta from '../pages/AskGenMeta.jsx';
import Governance from '../pages/Governance.jsx';
import Classification from '../pages/Classification.jsx';
import DataProducts from '../pages/DataProducts.jsx';
import Stewardship from '../pages/Stewardship.jsx';
import Admin from '../pages/Admin.jsx';

const ICONS = { LayoutDashboard, Building2, Database, Layers, Network, MessagesSquare, Landmark, Tag, Package, Users, ShieldCheck, FileCode2 };

function Sidebar({ onToggle }) {
  const { user, signOut } = useAuth();
  const nav = useNavigate();
  const [switcher, setSwitcher] = useState(false);
  const Group = ({ g }) => NAV.filter((n) => n.group === g).map((n) => {
    const I = ICONS[n.icon];
    return (
      <NavLink key={n.to} to={n.to} end={n.end} title={n.label} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
        <I size={17} strokeWidth={1.5} /><span className="nav-label">{n.label}</span>
        {n.badge && <span className="nav-badge">{n.badge}</span>}
      </NavLink>
    );
  });

  return (
    <aside className="sidebar">
      <div className="sb-top">
        <img className="sb-lockup" src={BRAND.lockup} alt="Rplus | GenMeta" />
        <img className="sb-burst" src={BRAND.burst} alt="GenMeta" />
        <button className="icon-btn" onClick={onToggle} aria-label="Collapse sidebar"><PanelLeft size={16} strokeWidth={1.5} /></button>
      </div>

      <div className="sb-product">
        <button className="sb-switch" onClick={() => setSwitcher((v) => !v)} aria-expanded={switcher}>
          <div><div className="sb-pname">GenMeta</div><div className="sb-psub">Metadata Intelligence Platform</div></div>
          <ChevronsUpDown size={14} strokeWidth={1.5} />
        </button>
        {switcher && (
          <div className="menu-pop sb-pop" onMouseLeave={() => setSwitcher(false)}>
            <div className="mp-h">Rplus platform</div>
            <div className="menu-item on"><span className="mi-n">P1</span><span className="mi-l">GenMeta</span><Check size={13} /></div>
            {PRODUCTS.map((p, i) => <div key={p.id} className="menu-item dim"><span className="mi-n">P{i + 2}</span><span className="mi-l">{p.name}</span><span className="mi-s">Soon</span></div>)}
          </div>
        )}
        <div className="sb-tagline">Understand · Connect · Govern</div>
      </div>

      <nav className="sb-nav">
        <div className="sb-group">Discover</div><Group g="Discover" />
        <div className="sb-group">Govern</div><Group g="Govern" />
        <div className="sb-group">Admin</div><Group g="Admin" />
      </nav>

      <div className="sb-foot">
        <div className="env"><span className="live-dot" /><div className="env-t"><b>R+ Production</b><small>Connected · v1.0.0</small></div></div>
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
  const idx = Math.max(0, NAV.findIndex((n) => (n.end ? n.to === pathname : pathname === n.to || pathname.startsWith(n.to + '/'))));
  const rest = pathname.slice(NAV[idx].to.length + 1);
  const sub = rest && (NAV[idx].crumbs ? NAV[idx].crumbs[rest] : 'Asset');
  return (
    <header className="topbar">
      <i className={`route-bar ${loading ? 'on' : ''}`} />
      <div className="crumbs"><span className="counter">{pad3(idx + 1)} — {pad3(NAV.length)}</span><span>{NAV[idx].group} / {sub ? <><span className="crumb-link">{NAV[idx].label}</span> / <b>{sub}</b></> : <b>{NAV[idx].label}</b>}</span></div>
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
  const [collapsed, setCollapsed] = useState(false);
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
    <div className={`shell ${collapsed ? 'is-collapsed' : ''}`}>
      <Sidebar onToggle={() => setCollapsed((c) => !c)} />
      <div className="main">
        <Topbar loading={loading} />
        <main ref={main} className={`content ${pathname === '/app/sources' ? 'flush' : ''}`}>
          <Routes>
            <Route index element={<Dashboard />} />
            <Route path="code-analyzer" element={<CodeAnalyzer />} />
            <Route path="sources" element={<DataSources />} />
            {/* The standalone Data estate page is retired; old links land on the dashboard. */}
            <Route path="data-estate" element={<Navigate to={`/app${search}`} replace />} />
            <Route path="catalogue" element={<Catalogue />} />
            <Route path="catalogue/:assetId" element={<AssetDetail />} />
            <Route path="graph" element={<KnowledgeGraph />} />
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
      {pathname !== '/app/ask' && (
        <button className="fab" onClick={() => nav('/app/ask')} aria-label="Ask GenMeta"><img src={BRAND.burst} alt="" /></button>
      )}
    </div>
  );
}
