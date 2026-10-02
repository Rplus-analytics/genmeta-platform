import { Fragment, useState } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { Search, ChevronRight, Compass, FilePen, Layers, Box } from 'lucide-react';
import { DOMAINS, D, subs } from '../data/products.js';
import InnerLayout from '../components/InnerLayout.jsx';
import { Section } from '../components/Rail.jsx';
import { ProductsProvider, useProducts, paths } from './products/shared.jsx';
import Home from './products/Home.jsx';
import Drafts from './products/Drafts.jsx';
import Domain from './products/Domain.jsx';
import Product from './products/Product.jsx';
import Create from './products/Create.jsx';

/* Data products: an inner panel (glossary-style search, Overview, My drafts, domain tree and a
   domain filter) reusing InnerLayout, full-width pages for home/domain/product, and a
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
  const tops = DOMAINS.filter((d) => !d.parent && (store.scope === 'all' || d.id === store.scope));
  const draftCount = store.products.filter((p) => p.status === 'draft').length;
  const onScope = (v) => { store.setScope(v); nav(paths.home); };

  const ProdRow = ({ p, depth }) => (
    <div className={`gl-mlink ${depth > 1 ? 'gl-tchild2' : 'gl-tchild'} ${curProduct === p.id ? 'on' : ''}`} tabIndex={0}
      onClick={() => nav(paths.product(p.id))} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), nav(paths.product(p.id)))}>
      <Box className="gl-book" size={16} strokeWidth={1.7} /><span className="ell">{p.name}</span>
    </div>
  );
  const DomRow = ({ d, depth }) => {
    const ps = store.products.filter((p) => p.domain === d.id && (!q || p.name.toLowerCase().includes(q)));
    const isOpen = open.has(d.id) || !!q;
    return (
      <Fragment>
        <div className={`gl-mlink ${depth ? 'gl-tchild' : ''} ${curDomain === d.id ? 'on' : ''}`} tabIndex={0}
          onClick={() => nav(paths.domain(d.id))} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), nav(paths.domain(d.id)))}>
          <span onClick={(e) => { e.stopPropagation(); toggle(d.id); }}><ChevronRight className={`gl-chev ${isOpen ? 'open' : ''}`} size={14} /></span>
          <Layers className="gl-book" size={16} strokeWidth={1.7} /><span className="ell">{d.name}</span>
        </div>
        {isOpen && <>{subs(d.id).map((s) => <DomRow key={s.id} d={s} depth={depth + 1} />)}{ps.map((p) => <ProdRow key={p.id} p={p} depth={depth + 1} />)}</>}
      </Fragment>
    );
  };

  return (
    <div className="gl-menu-block">
      <div className="gl-msec gl-msec-first">Products</div>
      <div className="gl-msearch">
        <Search size={14} strokeWidth={2} />
        <input value={mq} onChange={(e) => setMq(e.target.value)} placeholder="Search products & domains…" aria-label="Search products and domains" />
      </div>
      <div className={`gl-mlink ${isHome ? 'on' : ''}`} tabIndex={0} onClick={() => nav(paths.home)}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), nav(paths.home))}>
        <Compass className="gl-book" size={16} strokeWidth={1.7} />Overview
      </div>
      <div className={`gl-mlink ${isDrafts ? 'on' : ''}`} tabIndex={0} onClick={() => nav(paths.drafts)}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), nav(paths.drafts))}>
        <FilePen className="gl-book" size={16} strokeWidth={1.7} />My drafts<span className="gl-cnt">{draftCount}</span>
      </div>
      {tops.map((d) => <DomRow key={d.id} d={d} depth={0} />)}
      <div className="inner-sep" />
      <div className="gl-msec">Domain</div>
      <Section label="Filter" defaultOpen>
        <div className="fopts">
          <label className="fopt">
            <input type="radio" name="dpscope" checked={store.scope === 'all'} onChange={() => onScope('all')} />
            <span className="fopt-l">All domains</span><span className="fopt-n">{store.products.length}</span>
          </label>
          {DOMAINS.filter((d) => !d.parent).map((d) => (
            <label key={d.id} className="fopt">
              <input type="radio" name="dpscope" checked={store.scope === d.id} onChange={() => onScope(d.id)} />
              <span className="fopt-l">{d.name}</span><span className="fopt-n">{store.products.filter((p) => p.domain === d.id || D(p.domain).parent === d.id).length}</span>
            </label>
          ))}
        </div>
      </Section>
    </div>
  );
}
