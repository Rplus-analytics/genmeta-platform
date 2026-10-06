import { useNavigate } from 'react-router-dom';
import { Box, Layers, Plus, Database } from 'lucide-react';
import { DOMAINS, VIEWS, RECENT, CANDS, D, subs } from '../../data/products.js';
import { PageHead, Button } from '../../components/ui.jsx';
import { useProducts, paths } from './shared.jsx';

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

  const tiles = [
    [list.length, 'Products', `${tops.length} ${tops.length === 1 ? 'domain' : 'domains'}`],
    [list.filter((p) => p.status === 'published').length, 'Published', 'live in the marketplace'],
    [list.filter((p) => p.status === 'draft').length, 'Drafts', 'awaiting publish'],
    [list.reduce((a, p) => a + p.consumers, 0), 'Consumers', 'across all products'],
    [new Set(list.flatMap((p) => p.assets)).size, 'Assets', 'curated into products'],
  ];

  return (
    <div className="page fade-in dp">
      <PageHead eyebrow="Discover" title="Data products" sub="Curated, owned and certified datasets — discover your most valued assets.">
        <Button variant="secondary" icon={Layers} onClick={() => nav(paths.newDomain)}>Create domain</Button>
        <Button variant="primary" icon={Plus} onClick={() => nav(paths.create, { state: { prefill: { domain: scope !== 'all' ? scope : 'customer' } } })}>Create product</Button>
      </PageHead>

      <div className="tiles-sm">
        {tiles.map(([v, k, s]) => <div key={k}><b>{v.toLocaleString('en-GB')}</b><span>{k}</span><small>{s}</small></div>)}
      </div>

      <div className="dp-two">
        <div className="card pad">
          <h3>Most viewed</h3>
          <div className="dp-list">
            {mv.map((p) => (
              <div key={p.id} className="dp-lrow" onClick={() => nav(paths.product(p.id))}>
                <Box size={15} strokeWidth={1.7} /><span>{p.name}</span>
                <span className="gl-faint" style={{ marginLeft: 'auto' }}>{VIEWS[p.id]} views</span>
              </div>
            ))}
          </div>
        </div>
        <div className="card pad">
          <h3>Recently viewed</h3>
          <div className="dp-list">
            {RECENT.map(([id, t]) => {
              const p = store.PR(id), d = D(id);
              return (
                <div key={id} className="dp-lrow" onClick={() => nav(p ? paths.product(id) : paths.domain(id))}>
                  {p ? <Box size={15} strokeWidth={1.7} /> : <Layers size={15} strokeWidth={1.7} />}
                  <span>{p ? p.name : d.name}</span><span className="gl-faint" style={{ marginLeft: 'auto' }}>{t}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="block-head"><h2>Discover by domain</h2></div>
      <div className="dp-dgrid">
        {tops.map((d) => (
          <button key={d.id} className="card dp-dcard" onClick={() => nav(paths.domain(d.id))}>
            <span className="dp-dicon"><Layers size={18} strokeWidth={1.7} /></span>
            <div><b>{d.name}</b><span className="muted">{inDomainCount(d.id)} products · {subs(d.id).length} sub-domains</span></div>
          </button>
        ))}
      </div>

      <div className="dash-card">
        <div className="block-head"><div><h2>Recommended from usage</h2><p className="block-sub">Assets queried often enough to become products (Rplus_DWH query history, GenMeta's own queries excluded).</p></div><span className="tag">GenMeta</span></div>
        <div className="table-wrap">
          <table className="tbl static">
            <thead><tr><th>Candidate</th><th>Asset</th><th>Why</th><th className="num">Score</th><th /></tr></thead>
            <tbody>
              {CANDS.map((c) => (
                <tr key={c.a}>
                  <td><div className="tname"><Database size={15} strokeWidth={1.7} />{c.n}</div></td>
                  <td className="mono">{c.a}</td>
                  <td className="muted">{c.why}</td>
                  <td className="num">{c.s}/100</td>
                  <td style={{ textAlign: 'right' }}><Button variant="secondary" size="sm" onClick={() => createFromCand(c)}>Create product</Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
