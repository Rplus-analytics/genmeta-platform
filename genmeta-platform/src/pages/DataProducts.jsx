import { useState } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { DOMAINS, D, subs } from '../data/products.js';
import InnerLayout from '../components/InnerLayout.jsx';
import { ProductsProvider, useProducts, paths, Svg, DomainIcon } from './products/shared.jsx';
import { I } from './products/icons.js';
import Home from './products/Home.jsx';
import Drafts from './products/Drafts.jsx';
import Domain from './products/Domain.jsx';
import Product from './products/Product.jsx';
import Create from './products/Create.jsx';

/* The Data products section mirrors Atlan's marketplace:
   an inner panel (Products · All domains switcher, Overview, My drafts, search, domain tree)
   reusing the shared InnerLayout, plus full-width pages for home/domain/product and a
   standalone full-page create flow. */
export default function DataProducts() {
  return (
    <ProductsProvider>
      <Routes>
        <Route path="new" element={<Create />} />
        <Route index element={<Shell><Home /></Shell>} />
        <Route path="drafts" element={<Shell><Drafts /></Shell>} />
        <Route path="domain/:id" element={<Shell><Domain /></Shell>} />
        <Route path=":id" element={<Shell><Product /></Shell>} />
        <Route path="*" element={<Navigate to="/app/products" replace />} />
      </Routes>
    </ProductsProvider>
  );
}

function Shell({ children }) {
  return <InnerLayout title="Products" menu={<InnerMenu />}>{children}</InnerLayout>;
}

function InnerMenu() {
  const nav = useNavigate();
  const store = useProducts();
  const { pathname } = useLocation();
  const [mq, setMq] = useState('');
  const [open, setOpen] = useState(() => new Set(['customer', 'finance', 'operations', 'orders']));
  const q = mq.toLowerCase();

  const isHome = pathname === '/app/products';
  const isDrafts = pathname.endsWith('/products/drafts');
  const dMatch = pathname.match(/\/app\/products\/domain\/([^/]+)/);
  const curDomain = dMatch ? dMatch[1] : null;
  let curProduct = null;
  if (!dMatch && !isHome && !isDrafts) { const m = pathname.match(/\/app\/products\/([^/]+)/); if (m && store.PR(m[1])) curProduct = m[1]; }

  const toggle = (id) => setOpen((o) => { const n = new Set(o); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const onScope = (v) => { store.setScope(v); nav(paths.home); };
  const tops = DOMAINS.filter((d) => !d.parent && (store.scope === 'all' || d.id === store.scope));
  const draftCount = store.products.filter((p) => p.status === 'draft').length;

  const ProdRow = ({ p, pad }) => (
    <div className={`mlink${curProduct === p.id ? ' on' : ''}`} style={{ paddingLeft: pad, display: 'flex', alignItems: 'center', gap: 8, height: 32, borderRadius: 6, cursor: 'pointer', fontSize: 13.5 }}
      tabIndex={0} onClick={() => nav(paths.product(p.id))} onKeyDown={(e) => { if (e.key === 'Enter') nav(paths.product(p.id)); }}>
      <span className="pico"><Svg html={I.boxS} /></span><span className="ell">{p.name}</span>
    </div>
  );
  const DomRow = ({ d, pad }) => {
    const ps = store.products.filter((p) => p.domain === d.id && (!q || p.name.toLowerCase().includes(q)));
    const isOpen = open.has(d.id) || !!q;
    return (
      <>
        <div className={`mlink${curDomain === d.id ? ' on' : ''}`} style={{ paddingLeft: pad, display: 'flex', alignItems: 'center', gap: 8, height: 32, borderRadius: 6, cursor: 'pointer', fontSize: 13.5 }}
          tabIndex={0} onClick={() => nav(paths.domain(d.id))} onKeyDown={(e) => { if (e.key === 'Enter') nav(paths.domain(d.id)); }}>
          <span className="tog" style={{ display: 'inline-flex', width: 14 }} onClick={(e) => { e.stopPropagation(); toggle(d.id); }}><Svg html={I.chev} className={isOpen ? 'chev open' : 'chev'} /></span>
          <DomainIcon id={d.id} size={16} /><span className="ell">{d.name}</span>
        </div>
        {isOpen && <>{subs(d.id).map((s) => <DomRow key={s.id} d={s} pad={pad + 16} />)}{ps.map((p) => <ProdRow key={p.id} p={p} pad={pad + 32} />)}</>}
      </>
    );
  };

  return (
    <div className="dp-menu-wrap" style={{ padding: '0 10px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '2px 4px 8px' }}>
        <select className="scope" style={{ flex: 1 }} value={store.scope} onChange={(e) => onScope(e.target.value)}>
          <option value="all">All domains</option>
          {DOMAINS.filter((d) => !d.parent).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
      </div>
      <div className={`mlink${isHome ? ' on' : ''}`} style={{ display: 'flex', alignItems: 'center', gap: 8, height: 32, borderRadius: 6, cursor: 'pointer', fontSize: 13.5 }} tabIndex={0} onClick={() => nav(paths.home)}><Svg html={I.binoc} /><span>Overview</span></div>
      <div className={`mlink${isDrafts ? ' on' : ''}`} style={{ display: 'flex', alignItems: 'center', gap: 8, height: 32, borderRadius: 6, cursor: 'pointer', fontSize: 13.5 }} tabIndex={0} onClick={() => nav(paths.drafts)}><Svg html={I.half} /><span>My drafts</span><span className="cnt" style={{ marginLeft: 'auto', fontSize: 11.5, color: 'var(--faint)' }}>{draftCount}</span></div>
      <div className="msearch" style={{ marginTop: 10 }}><Svg html={I.search} /><input placeholder="Search products and domains" value={mq} onChange={(e) => setMq(e.target.value)} /></div>
      {tops.map((d) => <DomRow key={d.id} d={d} pad={4} />)}
    </div>
  );
}
