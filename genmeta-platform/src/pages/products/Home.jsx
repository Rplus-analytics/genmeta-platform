import { useNavigate } from 'react-router-dom';
import { DOMAINS, VIEWS, RECENT, CANDS, D, subs } from '../../data/products.js';
import { useProducts, paths, Svg, DomainIcon, Crumbs } from './shared.jsx';
import { I } from './icons.js';

export default function Home() {
  const nav = useNavigate();
  const store = useProducts();
  const { scope } = store;
  const inScope = (p) => scope === 'all' || p.domain === scope || D(p.domain).parent === scope;
  const inDomainCount = (id) => store.products.filter((p) => p.domain === id || D(p.domain).parent === id).length;

  const list = store.products.filter(inScope);
  const mv = list.filter((p) => VIEWS[p.id]).sort((a, b) => VIEWS[b.id] - VIEWS[a.id]).slice(0, 5);
  const tops = DOMAINS.filter((d) => !d.parent && (scope === 'all' || d.id === scope));

  const createFromCand = (c) => {
    const exists = store.PR(c.n.toLowerCase().replace(/ /g, '-'));
    nav(paths.create, { state: { prefill: { name: exists ? c.n + ' Product' : c.n, assets: [c.a], outputs: [c.a], domain: c.a.includes('CUSTOMER') ? 'customer' : 'orders' } } });
  };

  return (
    <div className="dp">
      <Crumbs parts={[]} />
      <div className="pad">
        <div className="hhead">
          <div><h1>Data products</h1><p className="muted">Discover your most valued assets.</p></div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn" onClick={() => store.toast('New domain: cover, colour, name (80), icon, description, owners')}><Svg html={I.layers} /> Create domain</button>
            <button className="btn primary" onClick={() => nav(paths.create, { state: { prefill: { domain: scope !== 'all' ? scope : 'customer' } } })}><Svg html={I.boxS} /> Create product</button>
          </div>
        </div>

        <div className="two">
          <div className="acardbox">
            <b className="ct">Most viewed</b>
            {mv.map((p) => (
              <div key={p.id} className="lrow" onClick={() => nav(paths.product(p.id))}>
                <span className="pico"><Svg html={I.boxS} /></span><span>{p.name}</span>
                <span className="faint" style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 4 }}><Svg html={I.trend} /> {VIEWS[p.id]} views</span>
              </div>
            ))}
          </div>
          <div className="acardbox">
            <b className="ct">Recently viewed</b>
            {RECENT.map(([id, t]) => {
              const p = store.PR(id), d = D(id);
              return (
                <div key={id} className="lrow" onClick={() => nav(p ? paths.product(id) : paths.domain(id))}>
                  {p ? <span className="pico"><Svg html={I.boxS} /></span> : <DomainIcon id={id} size={16} />}
                  <span>{p ? p.name : d.name}</span><span className="faint" style={{ marginLeft: 'auto' }}>{t}</span>
                </div>
              );
            })}
          </div>
        </div>

        <h2 className="h2">Discover assets and products by domain</h2>
        <div className="dgrid">
          {tops.map((d) => (
            <div key={d.id} className="dcard" onClick={() => nav(paths.domain(d.id))}>
              <div className="dcover" style={{ background: `linear-gradient(115deg, ${d.color} 0%, #4D8CFF 55%, #A9D3FF 100%)` }} />
              <div className="dicon" style={{ background: d.color }}><Svg html={I.layersW} /></div>
              <div className="dbody"><b>{d.name}</b><span className="faint"><Svg html={I.layers} /> {inDomainCount(d.id)} products · {subs(d.id).length} sub-domains</span></div>
            </div>
          ))}
        </div>

        <h2 className="h2">Recommended from usage <span className="tag">GenMeta</span></h2>
        <div className="acardbox">
          <p className="psub" style={{ marginTop: 0 }}>Assets queried often enough to become products (Rplus_DWH query history, GenMeta's own queries excluded).</p>
          {CANDS.map((c) => (
            <div key={c.a} className="cand">
              <span className="pico"><Svg html={I.db} /></span>
              <div style={{ flex: 1 }}>
                <b style={{ fontSize: 13 }}>{c.n}</b> <span className="mono faint" style={{ fontSize: 11.5 }}>{c.a}</span>
                <div className="muted" style={{ fontSize: 12 }}>{c.why} · candidate score {c.s}/100</div>
              </div>
              <button className="btn sm" onClick={() => createFromCand(c)}>Create product</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
