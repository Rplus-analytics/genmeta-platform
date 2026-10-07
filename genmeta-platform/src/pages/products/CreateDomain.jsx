import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Check, Layers, Plus, X, Box, Link2 } from 'lucide-react';
import { DOMAINS, STAKE, D, subs } from '../../data/products.js';
import { Button } from '../../components/ui.jsx';
import { Fl, Tiles, OwnerPicker } from '../../governance/RegisterModel.jsx';
import { PEOPLE } from '../../governance/stewardship-data.js';
import { useProducts, paths } from './shared.jsx';

/* Data products › Create domain (or sub-domain) — the same one-page pattern as Create a data product.
   Built from the leaders: name, description, owners and a parent for sub-domains (Atlan data domains),
   a domain type (Microsoft Purview governance domains), stakeholders with named roles (Atlan stakeholders,
   Collibra responsibilities), and the products and resources that belong to it. */

const SECTIONS = [['cd-about', 'About this domain'], ['cd-people', 'People'], ['cd-products', 'Products'], ['cd-res', 'Resources']];
const KINDS = [['Business area', 'Business area', 'A team or line of business', 'ok'], ['Data domain', 'Data domain', 'A subject such as Customer', 'ok'], ['Regulatory', 'Regulatory', 'Set up for a regulation', 'warn'], ['Project', 'Project', 'One programme, time-bound', 'ok']];
const ROLES = ['Domain owner', 'Data product owner', 'Data steward', 'Data engineer', 'Data architect', 'Consumer'];
const COLOURS = ['#4D8CFF', '#2F6BD8', '#0E2A57', '#7FB2FF', '#6B46D9', '#0E7C86'];
const slug = (n) => n.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

export default function CreateDomain() {
  const nav = useNavigate();
  const { state } = useLocation();
  const store = useProducts();
  const [f, setF] = useState({ name: '', desc: '', parent: state?.parent || '', kind: 'Data domain', owners: ['Admin'], stake: [], move: [], res: [{ l: '', u: '' }] });
  const [sp, setSp] = useState({ who: '', role: 'Data product owner' });
  const [active, setActive] = useState('cd-about');
  const up = (patch) => setF((o) => ({ ...o, ...patch }));
  const set = (k) => (e) => up({ [k]: e?.target ? e.target.value : e });

  const name = f.name.trim();
  const id = slug(name);
  const taken = !!name && (DOMAINS.some((d) => d.id === id || d.name.toLowerCase() === name.toLowerCase()) || store.PR(id) || ['drafts', 'new', 'domain', 'new-domain'].includes(id));
  const par = f.parent ? D(f.parent) : null;
  const candidates = store.products.filter((p) => (par ? p.domain === par.id : true));
  const resources = f.res.filter((r) => r.l.trim());
  const done = [!!(name && !taken && f.desc.trim().length >= 10), f.owners.length > 0, f.move.length > 0, resources.length > 0];
  const pct = Math.round((done.filter(Boolean).length / done.length) * 100);
  const ready = done[0] && done[1];

  useEffect(() => {
    const io = new IntersectionObserver((es) => es.forEach((e) => e.isIntersecting && setActive(e.target.id)), { rootMargin: '-35% 0px -60% 0px' });
    SECTIONS.forEach(([sid]) => { const el = document.getElementById(sid); if (el) io.observe(el); });
    return () => io.disconnect();
  }, []);
  const jump = (sid) => document.getElementById(sid)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  const addStake = () => { const w = sp.who.trim(); if (w && !f.stake.some(([x, r]) => x === w && r === sp.role)) up({ stake: [...f.stake, [w, sp.role]] }); setSp((o) => ({ ...o, who: '' })); };
  const toggleMove = (pid) => up({ move: f.move.includes(pid) ? f.move.filter((x) => x !== pid) : [...f.move, pid] });
  const create = () => {
    const color = par ? par.color : COLOURS[DOMAINS.filter((d) => !d.parent).length % COLOURS.length];
    DOMAINS.push({ id, name, color, parent: f.parent || null, owners: f.owners, desc: f.desc.trim(), readme: f.desc.trim(), kind: f.kind, resources: resources.map((r) => [r.l.trim(), r.u.trim()]) });
    STAKE[id] = [...f.owners.map((o) => [o, 'Domain owner']), ...f.stake.filter(([w, r]) => !(r === 'Domain owner' && f.owners.includes(w)))];
    f.move.forEach((pid) => store.setField(pid, 'domain', id, `Moved to ${name}`));
    store.toast(`${par ? 'Sub-domain' : 'Domain'} ${name} created${f.move.length ? ` · ${f.move.length} product${f.move.length > 1 ? 's' : ''} moved in` : ''}`);
    nav(paths.domain(id));
  };

  const missing = [
    !done[0] && ['cd-about', taken ? 'About — a domain or product with this name already exists' : 'About — a name and a short description (10+ characters)'],
    !done[1] && ['cd-people', 'People — at least one domain owner'],
    !done[2] && ['cd-products', 'Products — optional; move existing products in now or later'],
    !done[3] && ['cd-res', 'Resources — optional; a charter or channel helps people find their way'],
  ].filter(Boolean);
  const blocking = missing.filter(([sid]) => sid === 'cd-about' || sid === 'cd-people');

  return (
    <div className="page gv rg cp nt">
      <div className="rg-top">
        <div><span className="gv-eyebrow">Data products</span><h1>{par ? `Create a sub-domain in ${par.name}` : 'Create domain'}</h1></div>
        <div className="gv-inline" style={{ gap: 8, alignItems: 'center' }}>
          <Button variant="secondary" onClick={() => nav(par ? paths.domain(par.id) : paths.home)}>Cancel</Button>
          <Button variant="primary" icon={Plus} disabled={!ready} onClick={create}>{par ? 'Create sub-domain' : 'Create domain'}</Button>
        </div>
      </div>
      <div className="rg-toc">
        {SECTIONS.map(([sid, l], k) => <button key={sid} type="button" className={`${active === sid ? 'on' : ''} ${done[k] ? 'done' : ''}`} onClick={() => jump(sid)}><i>{done[k] ? <Check size={11} strokeWidth={3} /> : k + 1}</i>{l}</button>)}
        <span className="rg-pct"><b>{pct}%</b> complete<span className="rg-bar"><i style={{ width: `${pct}%` }} /></span></span>
      </div>

      <div className="rg-grid">
        <main>
          <section className="dash-card rg-sec" id="cd-about">
            <h2><span>01</span>About this domain</h2>
            <p className="rg-lead">A domain groups the data products one part of the business is accountable for. Use a sub-domain to split a large domain.</p>
            <Fl label="Name" req hint={taken ? 'A domain or product with this name already exists.' : `${f.name.length}/80 characters`}><input className="input" maxLength={80} value={f.name} onChange={set('name')} placeholder="e.g. Debt Management" autoFocus /></Fl>
            <Fl label="What does it cover?" req><textarea className="input" rows={2} value={f.desc} onChange={set('desc')} placeholder="e.g. Debts, payment plans and recovery — the products Debt Management publishes" /></Fl>
            <div className="rg-two">
              <Fl label="Parent domain" hint={par ? `It will sit under ${par.name}; its products count towards ${par.name} too.` : 'Leave empty for a top-level domain.'}>
                <select className="select" value={f.parent} onChange={(e) => up({ parent: e.target.value, move: [] })}><option value="">None — a top-level domain</option>{DOMAINS.filter((d) => !d.parent).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select>
              </Fl>
              <div />
            </div>
            <Fl label="Type"><Tiles opts={KINDS} value={f.kind} onChange={set('kind')} /></Fl>
          </section>

          <section className="dash-card rg-sec" id="cd-people">
            <h2><span>02</span>People</h2>
            <p className="rg-lead">Domain owners decide what the domain publishes and approve its products. Stakeholders are the other people consumers can contact.</p>
            <Fl label="Domain owners" req><OwnerPicker value={f.owners} onChange={set('owners')} /></Fl>
            <Fl label="Stakeholders" hint="Optional — a person and the role they play here.">
              <div className="cd-stake">
                <input className="input" list="cd-people" value={sp.who} onChange={(e) => setSp((o) => ({ ...o, who: e.target.value }))} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addStake(); } }} placeholder="Type a name" />
                <select className="select" value={sp.role} onChange={(e) => setSp((o) => ({ ...o, role: e.target.value }))} aria-label="Role">{ROLES.map((r) => <option key={r}>{r}</option>)}</select>
                <Button variant="secondary" icon={Plus} disabled={!sp.who.trim()} onClick={addStake}>Add</Button>
                <datalist id="cd-people">{PEOPLE.map((p) => <option key={p} value={p} />)}</datalist>
              </div>
              {f.stake.length > 0 && (
                <div className="table-wrap" style={{ marginTop: 10 }}><table className="tbl">
                  <thead><tr><th>Person</th><th>Role</th><th /></tr></thead>
                  <tbody>{f.stake.map(([w, r], i) => <tr key={`${w}-${r}`}><td>{w}</td><td><span className="tag">{r}</span></td><td style={{ textAlign: 'right' }}><button type="button" className="ib" aria-label={`Remove ${w}`} onClick={() => up({ stake: f.stake.filter((_, k) => k !== i) })}><X size={14} /></button></td></tr>)}</tbody>
                </table></div>
              )}
            </Fl>
          </section>

          <section className="dash-card rg-sec" id="cd-products">
            <h2><span>03</span>Products</h2>
            <p className="rg-lead">{par ? `Optional. Move products from ${par.name} into the new sub-domain.` : 'Optional. Move existing products into the new domain; you can also create new ones after.'}</p>
            {candidates.length ? (
              <div className="table-wrap cp-pick"><table className="tbl">
                <thead><tr><th style={{ width: 36 }} /><th>Product</th><th>Domain today</th><th>Owner</th><th>Status</th></tr></thead>
                <tbody>{candidates.map((p) => {
                  const on = f.move.includes(p.id);
                  return (
                    <tr key={p.id} className={on ? 'on' : ''} onClick={() => toggleMove(p.id)}>
                      <td><input type="checkbox" checked={on} readOnly aria-label={`Move ${p.name}`} /></td>
                      <td><span className="cd-pn"><Box size={14} strokeWidth={1.7} />{p.name}</span></td>
                      <td className="gv-muted">{D(p.domain)?.parent ? `${D(D(p.domain).parent).name} › ` : ''}{D(p.domain)?.name}</td>
                      <td className="gv-muted">{p.owner}</td><td className="gv-muted">{p.status}</td>
                    </tr>
                  );
                })}</tbody>
              </table></div>
            ) : <p className="gv-muted" style={{ margin: 0, fontSize: 13 }}>No products to move.</p>}
          </section>

          <section className="dash-card rg-sec" id="cd-res">
            <h2><span>04</span>Resources</h2>
            <p className="rg-lead">Optional. Links shown on the domain page — a charter, a wiki page or a team channel.</p>
            {f.res.map((r, i) => (
              <div key={i} className="cd-res">
                <input className="input" value={r.l} onChange={(e) => up({ res: f.res.map((x, k) => (k === i ? { ...x, l: e.target.value } : x)) })} placeholder="Label, e.g. Domain charter" />
                <input className="input" value={r.u} onChange={(e) => up({ res: f.res.map((x, k) => (k === i ? { ...x, u: e.target.value } : x)) })} placeholder="Link, e.g. https://… or #channel" />
                {f.res.length > 1 && <button type="button" className="ib" aria-label="Remove resource" onClick={() => up({ res: f.res.filter((_, k) => k !== i) })}><X size={14} /></button>}
              </div>
            ))}
            <Button variant="link" size="sm" icon={Plus} onClick={() => up({ res: [...f.res, { l: '', u: '' }] })}>Add another link</Button>
          </section>
        </main>

        <aside className="rg-live">
          <div className="dash-card rg-panel">
            <h3>Preview</h3>
            <div className="cp-prev">
              <span className="cp-prev-i"><Layers size={18} strokeWidth={1.7} /></span>
              <div><b>{name || 'Untitled domain'}</b><small>{par ? `Sub-domain in ${par.name}` : 'Domain'} · {f.kind}</small></div>
            </div>
            <p className="cp-prev-d">{f.desc.trim() || 'No description yet.'}</p>
            <div className="cp-prev-n"><div><b>{f.move.length}</b><small>Products</small></div><div><b>{f.owners.length}</b><small>Owners</small></div><div><b>{f.stake.length + f.owners.length}</b><small>Stakeholders</small></div></div>
          </div>

          <div className="dash-card rg-panel">
            <h3>Where it sits</h3>
            <ul className="cd-tree">
              {DOMAINS.filter((d) => !d.parent).map((d) => (
                <li key={d.id} className={par?.id === d.id ? 'on' : ''}><Layers size={13} /> {d.name}<small>{store.inDomain(d.id).length}</small>
                  {par?.id === d.id && <ul>{subs(d.id).map((s) => <li key={s.id}><Layers size={13} /> {s.name}</li>)}<li className="new"><Plus size={13} /> {name || 'New sub-domain'}<small>{f.move.length}</small></li></ul>}
                </li>
              ))}
              {!par && <li className="new"><Plus size={13} /> {name || 'New domain'}<small>{f.move.length}</small></li>}
            </ul>
            {resources.length > 0 && <p className="rg-eta" style={{ marginTop: 10 }}>{resources.map((r) => <span key={r.l} className="cd-link"><Link2 size={12} /> {r.l.trim()}</span>)}</p>}
          </div>

          <div className="dash-card rg-panel">
            <h3>Still needed</h3>
            {missing.length ? <ul className="rg-missing">{missing.map(([sid, t]) => <li key={t}><button type="button" onClick={() => jump(sid)}>{t}</button></li>)}</ul> : null}
            {!blocking.length && (<>
              <p className="rg-ready"><Check size={14} strokeWidth={3} /> Ready to create.</p>
              <Button variant="primary" icon={Plus} onClick={create} style={{ marginTop: 10, width: '100%', justifyContent: 'center' }}>{par ? 'Create sub-domain' : 'Create domain'}</Button>
            </>)}
          </div>
        </aside>
      </div>
    </div>
  );
}
