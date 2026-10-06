import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  DOMAINS, STAKE, MON, CRIT, SENS, PST, D, subs, score, sclass, ini, ainfo, midx,
} from '../../data/products.js';
import { Layers } from 'lucide-react';
import {
  useProducts, paths, Svg, DomainIcon, Person, EntityHead, ProductCard, LineageGraph,
} from './shared.jsx';
import { Tabs } from '../../components/ui.jsx';
import { I } from './icons.js';

const TABS = [{ value: 'overview', label: 'Overview' }, { value: 'products', label: 'Products and Assets' }, { value: 'stats', label: 'Statistics' }, { value: 'lineage', label: 'Lineage' }];

export default function Domain() {
  const { id } = useParams();
  const nav = useNavigate();
  const store = useProducts();
  const d = D(id);
  const [tab, setTab] = useState('overview');
  const [seg, setSeg] = useState('all');

  if (!d) return <div className="page dp"><div className="dash-card">Domain not found.</div></div>;

  const par = d.parent ? D(d.parent) : null;
  const list = store.inDomain(d.id);

  return (
    <div className="page fade-in dp">
      <EntityHead icon={Layers} title={d.name} kind={par ? `Sub-domain in ${par.name}` : 'Domain'} id={d.id}
        isProduct={false} onAddProduct={() => nav(paths.create, { state: { prefill: { domain: d.id } } })} onCreateSub={() => nav(paths.newDomain, { state: { parent: d.parent || d.id } })} />
      <Tabs items={TABS} value={tab} onChange={setTab} />
      <div className="dp-tabbody">
        {tab === 'overview' && <DomOverview d={d} list={list} />}
        {tab === 'products' && <DomProducts d={d} list={list} seg={seg} setSeg={setSeg} />}
        {tab === 'stats' && <DomStats d={d} list={list} goProducts={(s) => { setSeg(s); setTab('products'); }} />}
        {tab === 'lineage' && <LineageGraph ids={list.map((p) => p.id)} />}
      </div>
    </div>
  );
}

function DomOverview({ d, list }) {
  const nav = useNavigate();
  const store = useProducts();
  const st = STAKE[d.id] || STAKE[d.parent] || [];
  const [cm, setCm] = useState({ a: true, b: false, c: false });
  const [rd, setRd] = useState(null);
  const toggle = (k) => setCm((c) => ({ ...c, [k]: !c[k] }));

  const Grp = ({ k, icon, title, fields }) => (
    <div className="cmg">
      <div className="cmh" onClick={() => toggle(k)}>{icon}<b>{title}</b><span style={{ marginLeft: 'auto' }}><Svg html={I.chev} className={cm[k] ? 'chev up' : 'chev'} /></span></div>
      {cm[k] && <div className="cmb">{fields.map(([l, v], i) => <div key={i}><label>{l}</label><div>{v || '-'}</div></div>)}</div>}
    </div>
  );

  const aiDraft = () => {
    setRd(`${d.name} holds ${list.length} data products owned by ${[...new Set(list.map((p) => p.owner))].join(', ')}. Start with ${list[0] ? list[0].name : 'the products below'}. Ask the owner for access to confidential products.`);
    store.toast('AI draft added');
  };

  return (
    <div className="ogrid">
      <div className="stack">
        <div className="acardbox">
          <b className="ct">Summary</b>
          <div className="tiles4">
            <div><span className="ti"><Svg html={I.compass} /></span><div><b>{new Set(list.flatMap((p) => p.assets)).size}</b><small>Assets owned</small></div></div>
            <div><span className="ti"><Svg html={I.boxS} /></span><div><b>{list.length}</b><small>Products</small></div></div>
            <div><span className="ti"><Svg html={I.user} /></span><div title={d.owners.join(', ')}><b>{d.owners.length}</b><small>Owners</small></div></div>
            <div><span className="ti"><Svg html={I.users} /></span><div><b>{st.length}</b><small>Stakeholders</small></div></div>
          </div>
          <div className="lbl">Description</div><p className="ovdesc">{d.readme || d.desc}</p>
        </div>

        <div className="acardbox">
          <div className="cmhead"><b className="ct" style={{ margin: 0 }}>Custom metadata</b><span className="tlink">Manage all</span></div>
          <Grp k="a" icon={<Svg html={I.dom} />} title="Data mesh details" fields={[['Business unit', d.name], ['Domain owners', d.owners.join(', ')], ['Region', 'United Kingdom'], ['Review cycle', 'Quarterly']]} />
          <Grp k="b" icon={<Svg html={I.cycle} />} title="AI Model Lifecycle" fields={[['Questions', '']]} />
          <Grp k="c" icon={<Svg html={I.bot} />} title="GenMeta AI Metadata" fields={[['Provider Name', ''], ['State', ''], ['AI Agent Name', ''], ['Task Name', ''], ['Task Description', '']]} />
        </div>

        <div className="acardbox readme">
          <div style={{ display: 'flex', alignItems: 'center' }}><b className="ct" style={{ margin: 0 }}>Readme</b>
            <span style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}><button className="btn sm ghost" onClick={aiDraft}><Svg html={I.spark} /> AI generate</button><button className="ib sm"><Svg html={I.pen} /></button></span></div>
          <h1 className="rdh">{d.name} Domain in Data Products Marketplace</h1>
          <p>{rd ? <>{rd} <span className="tag">AI draft</span></> : `Welcome to the ${d.name} section of our data products marketplace. Here you'll find a curated collection of data products tailored for the ${d.name.toLowerCase()} domain.`}</p>
          <p>Whether you're an analyst, data scientist or developer, these products give you trusted data to drive insights and make informed decisions.</p>
        </div>
      </div>

      <div className="stack">
        <div className="acardbox">
          <div className="sidehead"><b>{d.parent ? 'Sub-domains' : 'Subdomains'} <span className="faint">{subs(d.id).length}</span></b><span><button className="ib sm"><Svg html={I.search} /></button><button className="ib sm" aria-label="New sub-domain" onClick={() => nav(paths.newDomain, { state: { parent: d.parent || d.id } })}><Svg html={I.plus} /></button></span></div>
          {subs(d.id).length ? subs(d.id).map((s) => (
            <div key={s.id} className="lrow" onClick={() => nav(paths.domain(s.id))}><DomainIcon id={s.id} size={16} /><span>{s.name}</span><span className="faint" style={{ marginLeft: 'auto' }}>{store.inDomain(s.id).length}</span></div>
          )) : <div className="empty" style={{ padding: 18 }}>No sub-domains.<br /><small>Organise your domain by adding sub-domains.</small></div>}
        </div>
        <div className="acardbox">
          <div className="sidehead"><b>Stakeholders <span className="faint">{st.length}</span></b><button className="ib sm" onClick={() => store.toast('Add stakeholder: pick a user or group and a role')}><Svg html={I.plus} /></button></div>
          {st.map(([n, r], i) => <div key={i} className="lrow"><Person name={n} /><span className="tag" style={{ marginLeft: 'auto' }}>{r}</span></div>)}
        </div>
        <div className="acardbox">
          <b className="ct">Resources</b>
          {(d.resources || [['Domain charter', ''], [`#data-${d.id} on Slack`, '']]).map(([l, u]) => <div key={l} className="lrow" title={u || undefined}><Svg html={I.link} /><span>{l}</span></div>)}
          <button className="btn sm ghost"><Svg html={I.plus} /> Add resource</button>
        </div>
      </div>
    </div>
  );
}

function DomProducts({ d, list, seg, setSeg }) {
  const store = useProducts();
  const [q, setQ] = useState('');
  const [sort, setSort] = useState('relevance');
  const [f, setF] = useState({ type: '', dom: '', src: '', own: '', tag: '' });
  const [more, setMore] = useState(false);
  const uniq = (a) => [...new Set(a)];

  let r = list.filter((p) => (seg === 'all' || p.status === seg)
    && (!q || (p.name + ' ' + p.desc + ' ' + p.owner).toLowerCase().includes(q.toLowerCase()))
    && (!f.type || p.outputs.some((a) => ainfo(a).type === f.type))
    && (!f.dom || p.domain === f.dom) && (!f.src || p.assets.some((a) => ainfo(a).src === f.src))
    && (!f.own || p.owner === f.own) && (!f.tag || p.tags.includes(f.tag)));
  const k = { relevance: (p) => -(score(p) * 100 + p.consumers), name: (p) => p.name, recent: (p) => -store.products.indexOf(p), score: (p) => -score(p) }[sort];
  r = [...r].sort((a, b) => { const x = k(a), y = k(b); return x < y ? -1 : x > y ? 1 : 0; });

  const Opt = ({ keyName, label, vals }) => (
    <select className={`fsel${f[keyName] ? ' on' : ''}`} value={f[keyName]} onChange={(e) => setF((o) => ({ ...o, [keyName]: e.target.value }))}>
      <option value="">{label}</option>{vals.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
    </select>
  );
  const anyFilter = Object.values(f).some(Boolean) || seg !== 'all';
  const shown = more ? r : r.slice(0, 6);

  return (
    <>
      <div className="asearch">
        <div className="msearch" style={{ margin: 0, flex: 1, height: 34, background: '#fff' }}><Svg html={I.search} /><input placeholder="Search in this domain" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <select className="fsel" style={{ width: 160, height: 32 }} value={sort} onChange={(e) => setSort(e.target.value)}>
          {[['relevance', '⇅ Relevance'], ['recent', '⇅ Recently created'], ['name', '⇅ Name (A–Z)'], ['score', '⇅ Highest score']].map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <button className="ib"><Svg html={I.dots} /></button>
      </div>
      <div className="afilters">
        <button className={`ib sm fbtn${anyFilter ? ' on' : ''}`} title="Clear filters" onClick={() => { setF({ type: '', dom: '', src: '', own: '', tag: '' }); setSeg('all'); }}><Svg html={I.funnel} /></button>
        <Opt keyName="type" label="Asset type" vals={uniq(list.flatMap((p) => p.outputs.map((a) => ainfo(a).type))).map((t) => [t, t])} />
        <Opt keyName="dom" label="Domains" vals={uniq(list.map((p) => p.domain)).map((x) => [x, D(x).name])} />
        <Opt keyName="src" label="Source" vals={uniq(list.flatMap((p) => p.assets.map((a) => ainfo(a).src))).map((s) => [s, s])} />
        <Opt keyName="own" label="Owners" vals={uniq(list.map((p) => p.owner)).map((o) => [o, o])} />
        <Opt keyName="tag" label="Tags" vals={uniq(list.flatMap((p) => p.tags)).map((t) => [t, t])} />
        <span className="seg2" style={{ marginLeft: 'auto' }}>{['all', 'published', 'draft', 'sunset', 'archived'].map((s) => <button key={s} className={seg === s ? 'on' : ''} onClick={() => setSeg(s)}>{s === 'all' ? 'All' : PST[s][0]}</button>)}</span>
      </div>
      <div className="ptitle"><b>Products</b><span className="faint">{r.length}</span></div>
      <p className="psub">Includes products added across all subdomains within this domain.</p>
      {r.length ? (
        <>
          <div className="agrid">{shown.map((p) => <ProductCard key={p.id} p={p} />)}</div>
          {r.length > 6 && <div className="showmore"><button className="btn ghost sm" onClick={() => setMore((m) => !m)}>{more ? 'Show less ↑' : 'Show more ↓'}</button></div>}
        </>
      ) : <div className="acardbox empty">No products match these filters.</div>}
    </>
  );
}

function DomStats({ d, list, goProducts }) {
  const nav = useNavigate();
  const store = useProducts();
  const by = (s) => list.filter((p) => p.status === s).length;
  const assets = new Set(list.flatMap((p) => p.assets)).size;
  const ports = list.reduce((a, p) => a + p.outputs.length, 0);
  const enr = [['With certificate', list.filter((p) => p.cert === 'Verified').length, I.ring], ['With description', list.filter((p) => p.desc && p.sc[1] >= 3).length, I.lines], ['With status', list.length, I.vtickB], ['With glossary terms', list.filter((p) => p.terms.length).length, I.bookS]];
  const months = MON.map((m, i) => list.filter((p) => midx(p.created) === i).length), mx = Math.max(1, ...months);
  const views = [3, 5, 4, 7, 6, 9, 8, 11, 10, 13, 12, 15].map((v) => Math.round(v * list.length / 4)), vmx = Math.max(1, ...views);
  const dot = { published: '#4D8CFF', draft: '#E3A008', sunset: '#C2410C', archived: '#9F2D2D' };
  const visitors = [...new Set(list.flatMap((p) => [p.owner, ...p.experts]))].slice(0, 5);

  return (
    <>
      <div className="ssec"><Svg html={I.layers} /> Summary</div>
      <div className="srow">
        <div className="acardbox" style={{ flex: 2 }}>
          <b className="ct">Domain at a glance</b>
          <div className="sumgrid">
            <div className="sumleft">
              <div className="sumi"><Svg html={I.boxS} /><div><b>{list.length}</b><small>Total products</small></div></div>
              <div className="sumi"><Svg html={I.layers} /><div><b>{subs(d.id).length}</b><small>Sub-domains</small></div></div>
              <div className="sumi"><Svg html={I.db} /><div><b>{assets}</b><small>Total assets</small></div></div>
              <div className="sumi"><Svg html={I.port} /><div><b>{ports}</b><small>Output ports</small></div></div>
            </div>
            <div className="sumright">
              <div className="dsh">DOMAIN &amp; SUB-DOMAINS</div>
              {[...subs(d.id), d].map((x) => (
                <div key={x.id} className="dsr" onClick={() => nav(paths.domain(x.id))}><DomainIcon id={x.id} size={16} /> {x.name}{x.id === d.id && <span className="faint"> (this domain)</span>}<span className="faint" style={{ marginLeft: 'auto' }}>{store.products.filter((p) => p.domain === x.id).length}</span></div>
              ))}
            </div>
          </div>
        </div>
        <div className="acardbox" style={{ flex: 1 }}>
          <b className="ct">Products by status</b>
          <div className="stat4">{['published', 'draft', 'sunset', 'archived'].map((s) => (
            <div key={s} onClick={() => goProducts(s)}><i style={{ background: dot[s] }} /><div><b>{by(s)}</b><small>{s === 'draft' ? 'Draft products' : PST[s][0]}</small></div></div>
          ))}</div>
        </div>
      </div>

      <div className="ssec"><Svg html={I.trend} /> Activity</div>
      <div className="srow">
        <div className="acardbox" style={{ flex: 1.1 }}>
          <b className="ct">Products by enrichment</b>
          <div className="enr4">{enr.map(([l, n, ic]) => (
            <div key={l}><span className="eic"><Svg html={ic} /></span><small>{l}</small><b>{n}</b><span className="rem" onClick={() => store.toast('Showing products still missing: ' + l.replace('With ', '').toLowerCase())}>{list.length - n} remaining →</span></div>
          ))}</div>
        </div>
        <div className="acardbox" style={{ flex: 1.4 }}>
          <b className="ct">Products created over time</b>
          <div className="cot">
            <div className="sumi"><Svg html={I.boxS} /><div><b style={{ fontSize: 24 }}>{list.length}</b><small>Total products</small></div></div>
            <div className="spk"><div className="spky"><span>{mx}</span><span>{mx > 1 ? Math.round(mx / 2) : ''}</span><span>0</span></div>
              <div><div className="spkb">{months.map((c, i) => <i key={i} style={{ height: `${c ? Math.max(8, c / mx * 100) : 0}%` }} title={`${MON[i]}: ${c}`} />)}</div><div className="spkx">{MON.filter((m, i) => i % 3 === 0).map((m) => <span key={m}>{m}</span>)}</div></div>
            </div>
          </div>
        </div>
      </div>

      <div className="ssec"><Svg html={I.spark} /> Usage</div>
      <div className="srow">
        <div className="acardbox" style={{ flex: 1.4 }}>
          <b className="ct">Views over time</b><p className="psub">{views.reduce((a, b) => a + b, 0)} views · last 12 weeks</p>
          <div className="vbars">{views.map((v, i) => <i key={i} style={{ height: `${v / vmx * 100}%` }} title={`Week ${i + 1}: ${v}`} />)}</div>
        </div>
        <div className="acardbox" style={{ flex: 1 }}>
          <b className="ct">Top domain visitors</b>
          {visitors.map((v, i) => <div key={i} className="lrow"><Person name={v} /><span className="faint" style={{ marginLeft: 'auto' }}>{[42, 31, 18, 11, 6][i]} views</span></div>)}
        </div>
      </div>
    </>
  );
}
