import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  CRIT, SENS, PRINC, CHECK, D, score, sclass, ini, ainfo, downstream, typGlyph,
} from '../../data/products.js';
import { Box, Megaphone } from 'lucide-react';
import {
  useProducts, paths, Svg, DomainIcon, Person, EntityHead, LineageGraph, requestAccessModal, quarantinedAssets,
} from './shared.jsx';
import { Tabs, Button } from '../../components/ui.jsx';
import { I, gaugeHTML, ringIconHTML } from './icons.js';

const TABS = [{ value: 'overview', label: 'Overview' }, { value: 'assets', label: 'Assets' }, { value: 'lineage', label: 'Lineage' }, { value: 'activity', label: 'Activity' }, { value: 'contracts', label: 'Contracts' }];

export default function Product() {
  const { id } = useParams();
  const nav = useNavigate();
  const store = useProducts();
  const p = store.PR(id);
  const [tab, setTab] = useState('overview');

  if (!p) return <div className="page dp"><div className="dash-card">Product not found.</div></div>;
  const d = D(p.domain), s = score(p);

  return (
    <div className="page fade-in dp">
      <EntityHead icon={Box} title={p.name} tick={p.cert === 'Verified'}
        kind={<>Product in <span className="gl-tlink" onClick={() => nav(paths.domain(d.id))}>{d.name}</span></>}
        status={p.status} id={p.id} isProduct
        onAddProduct={() => nav(paths.create, { state: { prefill: { domain: d.id } } })} />
      {p.status === 'draft' && (() => {
        const q = quarantinedAssets(p);
        return (
          <div className="dp-banner">
            <Box size={16} strokeWidth={1.7} />
            <span><b>Draft.</b> Only owners can see this product.{q.length > 0 && <> Publishing is blocked because <code className="mono">{q[0]}</code> is quarantined by Data quality.</>}</span>
            <Button variant="primary" size="sm" disabled={q.length > 0} title={q.length > 0 ? `${q[0]} is quarantined` : undefined} onClick={() => store.setStatus(p.id, 'published')}>Publish</Button>
          </div>
        );
      })()}
      {p.announce && <div className="dp-banner dp-banner-warn"><Megaphone size={16} strokeWidth={1.7} /><span><b>Announcement.</b> {p.announce}</span></div>}
      <Tabs items={TABS} value={tab} onChange={setTab} />
      <div className="dp-tabbody">
        {tab === 'overview' && <ProdOverview p={p} d={d} s={s} />}
        {tab === 'assets' && <ProdAssets p={p} />}
        {tab === 'lineage' && <LineageGraph ids={[p.id]} />}
        {tab === 'activity' && <ProdActivity p={p} />}
        {tab === 'contracts' && <ProdContracts p={p} />}
      </div>
    </div>
  );
}

function ProdOverview({ p, d, s }) {
  const nav = useNavigate();
  const store = useProducts();
  const [showScore, setShowScore] = useState(false);
  const fix = p.sc.map((v, i) => [v, i]).filter(([v]) => v < 4);

  const aiDraft = () => {
    store.setReadme(p.id, `${p.name} is the ${d.name} domain's product for ${p.desc.charAt(0).toLowerCase() + p.desc.slice(1)} Use the output port ${p.outputs[0]} for reporting. It is built from ${p.sources} source systems${p.sla ? ' and refreshed ' + p.sla.fresh[0].toLowerCase() : ''}. Contact ${p.owner} for access.`);
    store.toast('AI draft added to the readme');
  };
  const cycle = (k, map, label) => { const keys = Object.keys(map); store.setField(p.id, k, keys[(keys.indexOf(p[k]) + 1) % keys.length], label + ' set to ' + map[keys[(keys.indexOf(p[k]) + 1) % keys.length]][0]); };

  return (
    <div className="ogrid">
      <div className="stack">
        <div className="acardbox">
          <b className="ct">Summary</b>
          <div className="tiles4">
            <div><span className="ti"><Svg html={I.compass} /></span><div><b>{p.assets.length}</b><small>Assets</small></div></div>
            <div><span className="ti"><Svg html={I.port} /></span><div><b>{p.outputs.length}</b><small>Output ports</small></div></div>
            <div><span className="ti"><Svg html={I.user} /></span><div title={[p.owner, ...p.experts].join(', ')}><b>{1 + p.experts.length}</b><small>Owners</small></div></div>
            <div><span className="ti"><Svg html={I.globe} /></span><div><b>{p.vis === 'Public' ? 'Public' : 'Private'}</b><small>Visibility</small></div></div>
          </div>
          <div className="srow4">
            <div><label>Domain</label><span className="tlink2" onClick={() => nav(paths.domain(d.id))}><DomainIcon id={d.id} size={14} /> {d.name}</span></div>
            <div><label>Criticality</label><span className="lvl"><i style={{ background: CRIT[p.crit][1] }} />{CRIT[p.crit][0]}</span></div>
            <div><label>Sensitivity</label><Svg html={I.lock} /> {SENS[p.sens][0]}</div>
            <div><label>Freshness</label>{p.fresh}</div>
          </div>
          <div className="lbl">About</div><p className="ovdesc">{p.desc}</p>
          <div className="reschips"><span className="rchip"><Svg html={I.link} /> {p.name} runbook</span><span className="tlink" onClick={() => store.toast('Link a Slack or Teams thread, a Jira issue or a document')}><Svg html={I.link} /> Add resource</span></div>
        </div>

        <div className="acardbox">
          <div style={{ display: 'flex', alignItems: 'center' }}><b className="ct" style={{ margin: 0 }}>Output ports ({p.outputs.length})</b><span className="faint" title="The assets consumers should use" style={{ marginLeft: 6 }}>ⓘ</span><button className="btn sm" style={{ marginLeft: 'auto' }} onClick={() => nav(paths.create, { state: { edit: p.id, step: 2 } })}><Svg html={I.pen} /> Edit</button></div>
          {p.outputs.map((a) => (
            <div key={a} className="port"><div className="aico"><Svg html={I.port} /></div>
              <div style={{ flex: 1 }}><div className="mono" style={{ color: 'var(--royal)', fontSize: 12.5 }}>{a}</div><div className="muted" style={{ fontSize: 12 }}>{ainfo(a).type} · {ainfo(a).src}</div></div>
              <span className="faint" title="Products using this port"><Svg html={I.port} /> {downstream(p.id).length}</span></div>
          ))}
        </div>

        <div className="acardbox readme">
          <div style={{ display: 'flex', alignItems: 'center' }}><b className="ct" style={{ margin: 0 }}>Readme</b><span style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}><button className="btn sm ghost" onClick={aiDraft}><Svg html={I.spark} /> AI generate</button><button className="ib sm"><Svg html={I.pen} /></button></span></div>
          <p style={{ marginTop: 12 }}>{p.readme || 'No readme yet. Add one, or let AI draft it from the product details.'}</p>
        </div>

        <div className="acardbox">
          <b className="ct">Collaboration</b>
          <div className="two" style={{ margin: 0 }}>
            <div className="collab"><b>Slack conversations</b><small>Link threads where this product is discussed.</small><button className="btn sm"><Svg html={I.plus} /> Add Slack thread</button></div>
            <div className="collab"><b>Jira issues</b><small>0 open issues linked.</small><button className="btn sm"><Svg html={I.plus} /> Link Jira issue</button></div>
          </div>
        </div>
      </div>

      <div className="stack">
        <div className="acardbox">
          <div style={{ display: 'flex', alignItems: 'baseline' }}><b className="ct" style={{ margin: 0 }}>Product score</b><span className="faint" style={{ marginLeft: 6 }} title="Six principles of data as a product">ⓘ</span></div>
          <small className="faint">Updated daily 4:00 AM</small>
          <div style={{ textAlign: 'center', marginTop: 8 }}><Svg html={gaugeHTML(s)} /></div>
          <div style={{ textAlign: 'center' }}><span className="tlink" onClick={() => setShowScore((v) => !v)}>{showScore ? 'Hide details ▴' : 'Improve score ▾'}</span></div>
          {showScore ? (
            <div className="princ">
              {PRINC.map((n, i) => (
                <div key={n} className="prow"><Svg html={ringIconHTML(p.sc[i])} /><div style={{ flex: 1 }}><b>{n}</b><small>{p.sc[i] >= 4 ? '✓ ' + CHECK[i][0] : 'To improve: ' + CHECK[i][1]}</small></div><span className="num">{p.sc[i]}/5</span></div>
              ))}
              <div style={{ textAlign: 'center', marginTop: 8 }}><span className="tlink" style={{ fontSize: 12.5 }} onClick={() => store.toast('Weighted average of six principles, 0–5; weights follow how complete the metadata is')}>How are we calculating the score?</span></div>
            </div>
          ) : fix.length ? <p className="psub" style={{ textAlign: 'center' }}>{fix.length} principle{fix.length > 1 ? 's' : ''} below 4</p> : null}
        </div>

        <div className="acardbox details">
          <b className="ct">Details</b>
          <div className="prop"><label>Sensitivity</label><div className="v"><Svg html={I.lock} /> {SENS[p.sens][0]} <button className="ib sm" onClick={() => cycle('sens', SENS, 'Sensitivity')}><Svg html={I.pen} /></button></div></div>
          <div className="prop"><label>Criticality</label><div className="v"><span className="lvl"><i style={{ background: CRIT[p.crit][1] }} />{CRIT[p.crit][0]}</span> <button className="ib sm" onClick={() => cycle('crit', CRIT, 'Criticality')}><Svg html={I.pen} /></button></div></div>
          <div className="prop"><label>Terms</label><div className="v">{p.terms.length ? p.terms.map((t) => <span key={t} className="tag"><Svg html={I.bookS} /> {t}</span>) : <span className="faint">—</span>}</div></div>
          <div className="prop"><label>Tags</label><div className="v">{p.tags.length ? p.tags.map((t) => <span key={t} className="tag">{t}</span>) : <span className="faint">—</span>}</div></div>
          <div className="prop"><label>Certificate</label><div className="v">{p.cert === 'Verified' ? <div className="cert"><b><Svg html={I.vtick} /> Verified</b>{p.owner} · 3 months ago</div> : p.cert}</div></div>
          <div className="prop"><label>Owners</label><div className="v"><Person name={p.owner} />{p.experts.map((e) => <Person key={e} name={e} />)}</div></div>
          <div className="prop"><label>Visibility</label><div className="v">{p.vis}</div></div>
          <div className="prop"><label>Custom metadata</label><div className="v"><span className="tag">Stewards</span><span className="tag">GenMeta AI Metadata</span></div></div>
        </div>
      </div>
    </div>
  );
}

function ProdAssets({ p }) {
  const nav = useNavigate();
  const [q, setQ] = useState('');
  const [type, setType] = useState('');
  const types = [...new Set(p.assets.map((a) => ainfo(a).type))];
  const rows = p.assets.filter((a) => (!type || ainfo(a).type === type) && `${a} ${ainfo(a).src} ${ainfo(a).type}`.toLowerCase().includes(q.trim().toLowerCase()));
  return (
    <div className="dash-card">
      <div className="block-head"><div><h2>Assets <span className="gv-faint" style={{ fontWeight: 400 }}>{p.assets.length}</span></h2><p className="block-sub">The catalogue assets this product is built from. Output ports are what consumers use; inputs come from other products.</p></div>
        <Button variant="secondary" size="sm" onClick={() => nav(paths.create, { state: { edit: p.id, step: 1 } })}><Svg html={I.pen} /> Edit assets</Button></div>
      <div className="dp-ahead">
        <div className="msearch dp-asearch"><Svg html={I.search} /><input placeholder="Search assets" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search assets" /></div>
        <button type="button" className={`chip ${!type ? 'on' : ''}`} onClick={() => setType('')}>All <small>{p.assets.length}</small></button>
        {types.map((t) => <button type="button" key={t} className={`chip ${type === t ? 'on' : ''}`} onClick={() => setType(type === t ? '' : t)}>{t} <small>{p.assets.filter((a) => ainfo(a).type === t).length}</small></button>)}
      </div>
      <div className="table-wrap"><table className="tbl ax-assets">
        <thead><tr><th>Asset</th><th>Type</th><th>Source</th><th>Role in this product</th></tr></thead>
        <tbody>
          {rows.map((a) => (
            <tr key={a}><td><span className="an">{a}</span></td><td className="muted">{ainfo(a).type}</td><td className="muted">{ainfo(a).src}</td>
              <td>{p.outputs.includes(a) ? <span className="optag">Output port</span> : p.inputs.includes(a) ? <span className="optag in">Input</span> : <span className="faint">Asset</span>}</td></tr>
          ))}
          {!rows.length && <tr><td colSpan={4} className="muted" style={{ textAlign: 'center', padding: 20 }}>No assets match.</td></tr>}
        </tbody>
      </table></div>
    </div>
  );
}

function ProdActivity({ p }) {
  const nav = useNavigate();
  const store = useProducts();
  const h = store.act.filter((a) => a.p === p.id);
  const rq = store.reqs.filter((r) => r.p === p.id);
  return (
    <div className="three">
      <div className="acardbox"><b className="ct">Activity</b>
        <div className="hist">
          {h.map((a, i) => <div key={i}><span className="dot" /><div>{a.what}<small>{a.t} · {a.who}</small></div></div>)}
          <div><span className="dot" /><div>Asset was created<small>{p.created} · {p.owner}</small></div></div>
        </div>
      </div>
      <div className="acardbox"><b className="ct">Views</b>
        <div className="seg2" style={{ marginBottom: 10 }}><button className="on">Top users</button><button>Recent users</button></div>
        {[p.owner, ...p.experts, 'Venkat'].slice(0, 4).map((u, i) => <div key={i} className="lrow"><Person name={u} /><span className="faint" style={{ marginLeft: 'auto' }}>{[24, 13, 7, 3][i]} views</span></div>)}
        <div className="lbl" style={{ marginTop: 12 }}>Last edited by</div><Person name={p.owner} />
      </div>
      <div className="acardbox"><b className="ct">Downstream usage</b>
        <div className="bigscore"><b>{p.consumers}</b><span className="muted">consumers</span></div>
        {downstream(p.id).map((x) => <div key={x} className="lrow" onClick={() => nav(paths.product(x))}><span className="pico"><Svg html={I.boxS} /></span>{store.PR(x).name}</div>)}
        <div className="lbl" style={{ marginTop: 14 }}>Access requests</div>
        {rq.length ? rq.map((r, i) => <div key={i} className="lrow"><b>{r.who}</b><span className="faint" style={{ fontSize: 12 }}>{r.why}</span><span className="tag" style={{ marginLeft: 'auto' }}>{r.st}</span></div>) : <div className="muted" style={{ fontSize: 13 }}>None</div>}
        <button className="btn sm" style={{ marginTop: 8 }} onClick={() => requestAccessModal(store, p)}><Svg html={I.lock} /> Request access</button>
      </div>
    </div>
  );
}

function ProdContracts({ p }) {
  if (!p.sla) return <div className="acardbox empty">No contract yet.<br /><small>Publish the product, then set freshness, availability and quality promises for its output ports.</small><br /><br /><button className="btn sm"><Svg html={I.plus} /> Add contract</button></div>;
  return (
    <div className="acardbox">
      <div style={{ display: 'flex', alignItems: 'center' }}><b className="ct" style={{ margin: 0 }}>Data contract</b><span className="tag" style={{ marginLeft: 10 }}>v1 · active</span><button className="btn sm" style={{ marginLeft: 'auto' }}><Svg html={I.pen} /> Edit contract</button></div>
      <p className="psub">Promises to consumers on the output ports. Owners and approved consumers are alerted in-app and by email when one is breached.</p>
      <div className="slarow" style={{ color: 'var(--muted)', fontSize: 12 }}><span>Promise</span><span>Target</span><span>Last check</span><span>Status</span></div>
      {[['Freshness', 'fresh'], ['Availability', 'avail'], ['Quality', 'qual']].map(([l, k]) => (
        <div key={k} className="slarow"><span>{l}</span><span>{p.sla[k][0]}</span><span>{p.sla[k][1]}</span><span className={p.sla[k][2] ? 'ok' : 'warn'}>{p.sla[k][2] ? 'Meeting' : 'Breaching'}</span></div>
      ))}
      <div className="lbl" style={{ marginTop: 14 }}>Terms of use</div>
      <p className="ovdesc">Use for {p.desc.charAt(0).toLowerCase() + p.desc.slice(1)} Do not copy {p.sens === 'confidential' ? 'confidential ' : ''}data outside approved systems.</p>
      <div className="lbl">Applies to output ports</div>
      {p.outputs.map((a) => <span key={a} className="tag mono" style={{ margin: '0 6px 6px 0' }}>{a}</span>)}
    </div>
  );
}
