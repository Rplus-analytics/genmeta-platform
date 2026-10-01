import { createContext, useContext, useReducer, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DOMAINS, PRODUCTS, INITIAL_ACT, INITIAL_REQS, PST, CRIT, SENS, FEEDS,
  D, subs, score, sclass, ini, ainfo, now, COVER, downstream, typGlyph,
} from '../../data/products.js';
import { I, domainIconHTML } from './icons.js';
import { getQuarantine } from '../../catalogue/quality/store.js';

/* A product cannot be published while one of its assets is quarantined by Data quality. */
export const quarantinedAssets = (p) => { const q = new Set(getQuarantine().map((x) => x.asset)); return (p.assets || []).filter((k) => q.has(k)); };

/* ---------- routes ---------- */
export const paths = {
  home: '/app/products',
  drafts: '/app/products/drafts',
  create: '/app/products/new',
  domain: (id) => `/app/products/domain/${id}`,
  product: (id) => `/app/products/${id}`,
};

/* ---------- tiny inline-SVG renderer (icons are prototype SVG strings) ---------- */
export function Svg({ html, className = '', style, title }) {
  return <span className={`dp-svg ${className}`} title={title} style={{ display: 'inline-flex', ...style }} dangerouslySetInnerHTML={{ __html: html }} />;
}

/* ---------- store: products/activity/requests/stars/scope, mutated in place like the prototype ---------- */
const Ctx = createContext(null);
export const useProducts = () => useContext(Ctx);

export function ProductsProvider({ children }) {
  const products = useRef(PRODUCTS);
  const act = useRef([...INITIAL_ACT]);
  const reqs = useRef([...INITIAL_REQS]);
  const stars = useRef(new Set());
  const [scope, setScopeState] = useState('all');
  const [toasts, setToasts] = useState([]);
  const [modalNode, setModalNode] = useState(null);
  const [, force] = useReducer((x) => x + 1, 0);
  const toastId = useRef(0);

  const toast = (m) => {
    const id = ++toastId.current;
    setToasts((t) => [...t, { id, m }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2200);
  };
  const modal = (node) => setModalNode(node);
  const closeModal = () => setModalNode(null);

  const PR = (id) => products.current.find((p) => p.id === id);
  const inDomain = (id) => products.current.filter((p) => p.domain === id || D(p.domain).parent === id);
  const log = (pid, what) => { act.current = [{ p: pid, what, t: now(), who: 'Admin' }, ...act.current]; };

  const setScope = (v) => setScopeState(v);
  const isStarred = (id) => stars.current.has(id);
  const toggleStar = (id) => { stars.current.has(id) ? stars.current.delete(id) : stars.current.add(id); force(); };

  const setStatus = (id, s) => {
    const p = PR(id); if (!p || p.status === s) return;
    if (s === 'published') { const q = quarantinedAssets(p); if (q.length) { toast(`Cannot publish — ${q[0]} is quarantined by Data quality`); return; } }
    const o = p.status; p.status = s; log(id, `Status ${o} → ${s}`); toast(`${p.name} is now ${PST[s][0].toLowerCase()}`); force();
  };
  const setField = (id, k, v, label) => { const p = PR(id); p[k] = v; if (label) log(id, label); force(); };
  const setReadme = (id, text) => { PR(id).readme = text; force(); };
  const setAnnounce = (id, text) => { PR(id).announce = text; log(id, 'Announcement updated'); force(); };
  const addRequest = (id, who, why) => { reqs.current = [...reqs.current, { p: id, who, why, t: new Date().toLocaleDateString('en-GB'), st: 'pending' }]; log(id, `Access requested by ${who}`); force(); };

  const updateAssets = (editId, assets, outputs) => {
    const p = PR(editId); p.assets = assets; p.outputs = outputs; log(editId, 'Assets and output ports updated'); force();
  };
  const createProduct = (n, status) => {
    let outputs = n.outputs.length ? n.outputs : n.assets.slice(0, 1);
    const id = n.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    if (PR(id)) { toast('A product with this name already exists'); return null; }
    if (status === 'published') { const q = new Set(getQuarantine().map((x) => x.asset)); const bad = n.assets.find((k) => q.has(k)); if (bad) { toast(`Cannot publish — ${bad} is quarantined by Data quality`); return null; } }
    products.current = [...products.current, {
      id, name: n.name, owner: n.owners[0], domain: n.domain, desc: n.desc || 'No description yet.',
      consumers: 0, sources: new Set(n.assets.map((a) => ainfo(a).src)).size, quality: 75, status, crit: n.crit, sens: n.sens, vis: n.vis,
      cert: 'Draft', terms: [], tags: [], experts: n.owners.slice(1), inputs: n.assets.filter((a) => !outputs.includes(a)),
      outputs, assets: n.assets, sc: [1, n.desc ? 3 : 1, 5, n.sens ? 3 : 1, 2, 1], created: 'Oct 2026', fresh: 'just now', sla: null, users: [0, 0, 0, 0, 0, 0],
    }];
    act.current = [{ p: id, what: status === 'draft' ? 'Created as draft' : 'Created and published', t: now(), who: 'Admin' }, ...act.current];
    toast(status === 'draft' ? 'Saved as draft' : 'Published to the marketplace'); force();
    return id;
  };

  const value = {
    products: products.current, act: act.current, reqs: reqs.current, scope,
    PR, inDomain, log, setScope, isStarred, toggleStar, setStatus, setField, setReadme, setAnnounce, addRequest, updateAssets, createProduct,
    toast, modal, closeModal,
  };
  return (
    <Ctx.Provider value={value}>
      {children}
      {modalNode && <><div className="dp-scrim" onClick={closeModal} /><div className="dp-modal">{modalNode}</div></>}
      {toasts.map((t) => <div key={t.id} className="dp-toast">{t.m}</div>)}
    </Ctx.Provider>
  );
}

/* ---------- small presentational helpers ---------- */
export function Person({ name }) {
  if (!name) return <span className="faint">—</span>;
  return <span className="person"><i>{ini(name)}</i>{name}</span>;
}
export function Badge({ status }) {
  return <span className={`badge ${PST[status][1]}`}><i />{PST[status][0]}</span>;
}
export function Dchip({ id }) {
  const d = D(id);
  return <span className="dchip"><i style={{ background: d.color }} />{d.name}</span>;
}
export function Lvl({ map, k }) {
  return <span className="lvl"><i style={{ background: map[k][1] }} />{map[k][0]}</span>;
}
export function DomainIcon({ id, size = 18 }) {
  return <Svg html={domainIconHTML(D(id), size)} />;
}

/* ---------- breadcrumb row ---------- */
export function Crumbs({ parts }) {
  const nav = useNavigate();
  return (
    <div className="crow">
      <button className="ib sm" title="Collapse sidebar"><Svg html={I.side} /></button>
      <span className="sepv" />
      <span className="tlink2" onClick={() => nav(paths.home)}><Svg html={I.binoc} /> Overview</span>
      {parts.map((x, i) => <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><span className="faint">›</span>{x}</span>)}
    </div>
  );
}
export function crumbDomainParts(id, nav) {
  const d = D(id), par = d.parent ? D(d.parent) : null;
  const link = (x) => <span className="tlink2" onClick={() => nav(paths.domain(x.id))}><DomainIcon id={x.id} size={14} /> {x.name}</span>;
  return [...(par ? [link(par)] : []), link(d)];
}

/* ---------- product card (Atlan "Products and Assets" card) ---------- */
export function ProductCard({ p }) {
  const nav = useNavigate();
  const s = score(p);
  return (
    <div className="acard" tabIndex={0} onClick={() => nav(paths.product(p.id))}
      onKeyDown={(e) => { if (e.key === 'Enter') nav(paths.product(p.id)); }}>
      <div className="acard-t">
        <span>{p.name}</span>
        {p.cert === 'Verified' && <Svg html={I.vtick} />}
        {p.status !== 'published' && <Badge status={p.status} />}
      </div>
      <div className="acard-d"><DomainIcon id={p.domain} size={14} /><span>{D(p.domain).name}</span></div>
      <div className="acard-x">{p.desc}</div><div className="tip">{p.desc}</div>
      <div className="acard-f">
        <span className="ports">{p.outputs.map((a) => <i key={a} title={a}>{typGlyph(ainfo(a).type)}</i>)}</span>
        <span>{p.outputs.length} output port{p.outputs.length > 1 ? 's' : ''}</span>
        <span className={`sc5 ${sclass(s)}`}>{s.toFixed(1)}</span>
      </div>
    </div>
  );
}

/* ---------- business lineage (product to product) ---------- */
export function LineageGraph({ ids }) {
  const nav = useNavigate();
  const { PR } = useProducts();
  const up = (id) => Object.keys(FEEDS).filter((k) => FEEDS[k].includes(id));
  const set = new Set(ids);
  ids.forEach((id) => { up(id).forEach((u) => set.add(u)); downstream(id).forEach((x) => set.add(x)); });
  const all = [...set].filter(PR);
  const depth = {};
  const dep = (id) => { if (depth[id] != null) return depth[id]; const u = up(id).filter((x) => set.has(x)); depth[id] = u.length ? Math.max(...u.map(dep)) + 1 : 0; return depth[id]; };
  all.forEach(dep);
  const cols = []; all.forEach((id) => { (cols[depth[id]] = cols[depth[id]] || []).push(id); });
  const W = 230, H = 64, GX = 110, GY = 26, pos = {};
  cols.forEach((c, ci) => c.forEach((id, ri) => { pos[id] = [20 + ci * (W + GX), 20 + ri * (H + GY)]; }));
  const w = 20 + cols.length * (W + GX), h = 40 + Math.max(1, ...cols.map((c) => c.length)) * (H + GY);
  const edges = all.flatMap((a) => downstream(a).filter((b) => pos[b]).map((b) => {
    const [x1, y1] = pos[a], [x2, y2] = pos[b];
    return <path key={a + b} d={`M${x1 + W} ${y1 + H / 2} C ${x1 + W + 55} ${y1 + H / 2}, ${x2 - 55} ${y2 + H / 2}, ${x2} ${y2 + H / 2}`} stroke="#A9D3FF" strokeWidth="2" fill="none" markerEnd="url(#ar)" />;
  }));
  const nodes = all.map((id) => {
    const p = PR(id), [x, y] = pos[id], hl = ids.length === 1 && id === ids[0];
    return (
      <g key={id} className="lnode" transform={`translate(${x},${y})`} onClick={() => nav(paths.product(id))}>
        <rect width={W} height={H} rx="10" fill={hl ? '#0E2A57' : '#fff'} stroke={hl ? '#0E2A57' : '#C9D6E6'} />
        <rect x="12" y="14" width="16" height="16" rx="4" fill={D(p.domain).color} />
        <text x="38" y="27" fontSize="13" fontWeight="600" fill={hl ? '#fff' : '#0E2A57'}>{p.name.length > 24 ? p.name.slice(0, 23) + '…' : p.name}</text>
        <text x="12" y="50" fontSize="11.5" fill={hl ? '#C9D7F0' : '#566A89'}>{D(p.domain).name} · {CRIT[p.crit][0]} · {score(p).toFixed(1)}</text>
      </g>
    );
  });
  return (
    <div className="acardbox">
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 10 }}>
        <b className="ct" style={{ margin: 0 }}>Business lineage</b>
        <span className="faint" style={{ marginLeft: 12, fontSize: 12.5 }}>Products connect when one product's output port is an asset in another. Refreshed hourly.</span>
      </div>
      <div style={{ overflow: 'auto' }}>
        <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} fontFamily="Hanken Grotesk, sans-serif">
          <defs><marker id="ar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" fill="#A9D3FF" /></marker></defs>
          {edges}{nodes}
        </svg>
      </div>
      {all.length < 2 && <p className="muted" style={{ fontSize: 13 }}>No connected products yet.</p>}
    </div>
  );
}

/* ---------- entity header with cover (domain + product) ---------- */
export function EntityHead({ cover, icon, iconBg, title, tick, kind, edited, people, status, id, isProduct, onAddProduct, onCreateSub }) {
  const store = useProducts();
  const nav = useNavigate();
  const [pop, setPop] = useState(null);
  const close = () => setPop(null);
  const starred = store.isStarred(id);
  const n = starred ? 1 : 0;

  const doMore = (m) => {
    close();
    const p = store.PR(id);
    if (m === 'announce') { isProduct ? announceModal(store, p) : store.toast('Announcement posted to the domain'); }
    else if (m === 'request') requestAccessModal(store, p);
    else if (m === 'export') store.toast('Exported ' + p.assets.length + ' assets');
    else if (m === 'delete') store.toast('Only domain admins can delete products');
    else store.toast('Done');
  };

  return (
    <>
      <div className="cover" style={{ background: cover }} />
      <div className="ehead">
        <div className="eicon" style={{ background: iconBg }}><Svg html={icon} /></div>
        <div className="etitle">
          <h1>{title} {tick && <Svg html={I.vtick} />}</h1>
          <div className="kind">{kind}</div>
        </div>
        <div className="etools">
          <span className="faint" style={{ fontSize: 12.5 }}>edited {edited}</span>
          <span className="avs">{people.slice(0, 3).map((x, i) => <i key={i} title={x}>{ini(x)}</i>)}{people.length > 3 && <em>+{people.length - 3}</em>}</span>
          {status ? (
            <div style={{ position: 'relative' }}>
              <button className="stbtn" onClick={(e) => { e.stopPropagation(); setPop(pop === 'status' ? null : 'status'); }}><Svg html={I.vtickB} />{PST[status][0]} <Svg html={I.down} /></button>
              {pop === 'status' && <StatusPop cur={status} onPick={(k) => { close(); store.setStatus(id, k); }} />}
            </div>
          ) : (
            <div style={{ position: 'relative' }}>
              <button className="btn primary sm" onClick={(e) => { e.stopPropagation(); setPop(pop === 'add' ? null : 'add'); }}>Add <Svg html={I.down} /></button>
              {pop === 'add' && (
                <div className="menu" style={{ right: 0 }}>
                  <button onClick={() => { close(); onCreateSub && onCreateSub(); }}><Svg html={I.domS2} /> Sub-domain</button>
                  <button onClick={() => { close(); onAddProduct && onAddProduct(); }}><Svg html={I.boxS} /> Product</button>
                </div>
              )}
            </div>
          )}
          <span className="tgroup">
            <button className="ib sm" title="Star" onClick={() => store.toggleStar(id)}><Svg html={starred ? I.starF : I.starL} /></button>
            {status && <span className="faint" style={{ fontSize: 12, padding: '0 4px' }}>{n}</span>}
            <button className="ib sm" title="Share" onClick={() => store.toast('Link copied')}><Svg html={I.share} /></button>
            <span style={{ position: 'relative' }}>
              <button className="ib sm" title="More" onClick={(e) => { e.stopPropagation(); setPop(pop === 'more' ? null : 'more'); }}><Svg html={I.dots} /></button>
              {pop === 'more' && <MoreMenu isProduct={isProduct} onPick={doMore} />}
            </span>
          </span>
        </div>
      </div>
    </>
  );
}

function StatusPop({ cur, onPick }) {
  const M = { draft: 'Visible only to owners', published: 'Visible to all users with access', sunset: 'Planned for retirement', archived: 'Retired and hidden for all users' };
  return (
    <div className="menu stpop" style={{ right: 0, width: 270 }}>
      <div className="faint" style={{ fontSize: 12, padding: '6px 10px' }}>Change status</div>
      {Object.keys(PST).map((k) => (
        <button key={k} className={cur === k ? 'cur' : ''} onClick={() => onPick(k)}>
          <span className={`sdot2 ${k}`} /><span><b>{PST[k][0]}</b><small>{M[k]}</small></span>
        </button>
      ))}
    </div>
  );
}
function MoreMenu({ isProduct, onPick }) {
  return (
    <div className="menu" style={{ right: 0 }}>
      {isProduct ? (
        <>
          <button onClick={() => onPick('announce')}><Svg html={I.mega} /> Add announcement</button>
          <button onClick={() => onPick('request')}><Svg html={I.lock} /> Request access</button>
          <button onClick={() => onPick('export')}>Export assets</button>
          <button onClick={() => onPick('delete')}>Delete product</button>
        </>
      ) : (
        <>
          <button onClick={() => onPick('announce')}><Svg html={I.mega} /> Add announcement</button>
          <button onClick={() => onPick('slack')}>Post on Slack or Teams</button>
          <button onClick={() => onPick('edit')}>Edit domain</button>
        </>
      )}
    </div>
  );
}

/* ---------- modals ---------- */
function AnnounceForm({ store, p }) {
  const [v, setV] = useState(p.announce || '');
  return (
    <>
      <h3>Add announcement</h3>
      <p className="muted" style={{ fontSize: 13, margin: '0 0 10px' }}>Shown at the top of the product for every consumer.</p>
      <textarea className="input" style={{ width: '100%', minHeight: 72, padding: '8px 10px' }} value={v} onChange={(e) => setV(e.target.value)} />
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
        <button className="btn" onClick={store.closeModal}>Cancel</button>
        <button className="btn primary" onClick={() => { store.setAnnounce(p.id, v.trim()); store.closeModal(); }}>Post</button>
      </div>
    </>
  );
}
export function announceModal(store, p) { store.modal(<AnnounceForm store={store} p={p} />); }

function RequestForm({ store, p }) {
  const [why, setWhy] = useState('');
  return (
    <>
      <h3>Request access to {p.name}</h3>
      <p className="muted" style={{ fontSize: 13, margin: '0 0 10px' }}>{p.owner} (owner) will be asked to approve.</p>
      <div style={{ marginBottom: 12 }}>
        <label className="lbl" style={{ display: 'block', fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>Why do you need it?</label>
        <textarea className="input" style={{ width: '100%', minHeight: 72, padding: '8px 10px' }} value={why} onChange={(e) => setWhy(e.target.value)} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <button className="btn" onClick={store.closeModal}>Cancel</button>
        <button className="btn primary" onClick={() => { store.addRequest(p.id, 'Admin', why || 'Not given'); store.closeModal(); store.toast('Request sent to ' + p.owner); }}>Send request</button>
      </div>
    </>
  );
}
export function requestAccessModal(store, p) { store.modal(<RequestForm store={store} p={p} />); }
