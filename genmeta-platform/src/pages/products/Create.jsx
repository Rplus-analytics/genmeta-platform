import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ASSET, DOMAINS, CRIT, SENS, D, ainfo } from '../../data/products.js';
import { useProducts, paths, Svg, DomainIcon } from './shared.jsx';
import { I } from './icons.js';

const LABELS = ['Overview', 'Add assets', 'Select output ports (Optional)', 'Review'];
const COVER = (c) => `linear-gradient(115deg, ${c} 0%, #4D8CFF 55%, #A9D3FF 100%)`;
const ruleMatch = (r) => { if (!r.val) return []; const v = r.val.toLowerCase(); return Object.keys(ASSET).filter((a) => { const x = ASSET[a]; const f = r.attr === 'Connection' ? x[0] : r.attr === 'Asset type' ? x[1] : a; return r.op === 'is' ? f.toLowerCase() === v : f.toLowerCase().includes(v); }); };

export default function Create() {
  const nav = useNavigate();
  const loc = useLocation();
  const store = useProducts();
  const init = loc.state || {};

  const [n, setN] = useState(() => {
    if (init.edit) {
      const p = store.PR(init.edit);
      return { edit: p.id, step: init.step || 0, name: p.name, desc: p.desc, domain: p.domain, crit: p.crit, sens: p.sens, owners: [p.owner], vis: p.vis, assets: p.assets.slice(), outputs: p.outputs.slice(), mode: 'browse', rule: { attr: 'Connection', op: 'is', val: '' } };
    }
    return Object.assign({ step: 0, name: '', desc: '', domain: 'customer', crit: '', sens: '', owners: ['Admin'], vis: 'Private to domain members', assets: [], outputs: [], mode: 'browse', rule: { attr: 'Connection', op: 'is', val: '' } }, init.prefill || {});
  });
  const [ownDraft, setOwnDraft] = useState('');
  const up = (patch) => setN((o) => ({ ...o, ...patch }));
  const st = n.step, d = D(n.domain);

  const valid = () => {
    if (st === 0 && !n.name) return 'Enter a name';
    if (st === 0 && (!n.crit || !n.sens)) return 'Pick criticality and sensitivity';
    if (st === 1 && !n.assets.length) return 'Add at least one asset';
    return '';
  };
  const goStep = (g) => { const outputs = n.outputs.filter((a) => n.assets.includes(a)); setN((o) => ({ ...o, step: g, outputs })); window.scrollTo(0, 0); };
  const next = () => { const e = valid(); if (e) return store.toast(e); goStep(st + 1); };
  const back = () => goStep(st - 1);
  const cancel = () => nav(n.edit ? paths.product(n.edit) : paths.home);

  const finish = (status) => {
    if (n.edit) { store.updateAssets(n.edit, n.assets, n.outputs.filter((a) => n.assets.includes(a))); nav(paths.product(n.edit)); return; }
    const id = store.createProduct(n, status);
    if (id) nav(paths.product(id));
  };

  const addOwner = () => { const o = ownDraft.trim(); if (o && !n.owners.includes(o)) up({ owners: [...n.owners, o] }); setOwnDraft(''); };
  const toggleAsset = (a) => up({ assets: n.assets.includes(a) ? n.assets.filter((x) => x !== a) : [...n.assets, a] });
  const toggleOutput = (a) => up({ outputs: n.outputs.includes(a) ? n.outputs.filter((x) => x !== a) : [...n.outputs, a] });
  const addRule = () => { const add = ruleMatch(n.rule).filter((a) => !n.assets.includes(a)); up({ assets: [...n.assets, ...add] }); store.toast('Assets added from rule'); };

  return (
    <div className="dp dp-create">
      <div className="cbar">
        <div><b style={{ fontSize: 16 }}>{n.edit ? 'Edit product' : 'New product'}</b> <span className="faint">in</span> <DomainIcon id={n.domain} size={14} /> {d.name}</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span className="tlink" style={{ fontSize: 13 }}><Svg html={I.bookS} /> View docs</span>
          <button className="btn" onClick={cancel}>Cancel</button>
          {st > 0 && <button className="btn" onClick={back}>Back</button>}
          {st < 3 ? <button className="btn primary" onClick={next}>Continue →</button>
            : <><button className="btn" onClick={() => finish('draft')}>Save as draft</button><button className="btn primary" onClick={() => finish('published')}>Create and publish</button></>}
        </div>
      </div>
      <div className="cwrap">
        <div className="stepper">
          {LABELS.map((l, i) => (
            <div key={l} className={`sti ${i < st ? 'done' : i === st ? 'cur' : ''}`} onClick={() => { if (i < st) goStep(i); }}><span className="stn">{i < st ? '✓' : i + 1}</span><span>{l}</span></div>
          ))}
        </div>
        <div className="cbody">
          {st === 0 && (
            <div className="fcard">
              <div className="fld"><label>Cover</label><div className="ccover" style={{ background: COVER(d.color) }}><button className="btn sm">Change</button></div></div>
              <div className="frow">
                <div className="fld"><label>Name <span style={{ color: '#C2410C' }}>*</span> <span className="faint">({n.name.length}/80)</span></label><input className="input" maxLength={80} value={n.name} onChange={(e) => up({ name: e.target.value })} placeholder="e.g. Social Media Marketing" /></div>
                <div className="fld"><label>Domain</label><select className="input" value={n.domain} onChange={(e) => up({ domain: e.target.value })}>{DOMAINS.map((x) => <option key={x.id} value={x.id}>{x.parent ? '    ' : ''}{x.name}</option>)}</select></div>
              </div>
              <div className="fld"><label>Description</label><textarea className="input" value={n.desc} onChange={(e) => up({ desc: e.target.value })} placeholder="Describe the product" /></div>
              <div className="frow">
                <div className="fld"><label>Criticality <span className="faint" title="Business impact">ⓘ</span></label><select className="input" value={n.crit} onChange={(e) => up({ crit: e.target.value })}><option value="">Select</option>{Object.keys(CRIT).map((k) => <option key={k} value={k}>{CRIT[k][0]}</option>)}</select></div>
                <div className="fld"><label>Sensitivity <span className="faint" title="Data classification">ⓘ</span></label><select className="input" value={n.sens} onChange={(e) => up({ sens: e.target.value })}><option value="">Select</option>{Object.keys(SENS).map((k) => <option key={k} value={k}>{SENS[k][0]}</option>)}</select></div>
              </div>
              <div className="fld"><label>Owners</label><small className="faint" style={{ display: 'block', margin: '-2px 0 6px' }}>Members who can edit this product.</small>
                <div className="ownbox">{n.owners.map((o) => <span key={o} className="tag"><Svg html={I.user} /> {o}</span>)}<input className="owin" placeholder="Add user or group" value={ownDraft} onChange={(e) => setOwnDraft(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addOwner(); } }} /></div>
              </div>
              <div className="fld"><label>Visibility</label><div className="radio">{['Private to domain members', 'Private to selected members', 'Public'].map((v) => <label key={v}><input type="radio" name="vi" value={v} checked={n.vis === v} onChange={() => up({ vis: v })} />{v}</label>)}</div></div>
            </div>
          )}

          {st === 1 && (
            <div className="fcard">
              <b className="ct">Add assets <span style={{ color: '#C2410C' }}>*</span></b>
              <div className="seg2" style={{ marginBottom: 14 }}><button className={n.mode === 'browse' ? 'on' : ''} onClick={() => up({ mode: 'browse' })}>Add via browse</button><button className={n.mode === 'rule' ? 'on' : ''} onClick={() => up({ mode: 'rule' })}>Add via rule</button></div>
              {n.mode === 'browse' ? (
                <div className="pick">{Object.keys(ASSET).map((a) => <label key={a}><input type="checkbox" checked={n.assets.includes(a)} onChange={() => toggleAsset(a)} />{a}<small>{ASSET[a][1]} · {ASSET[a][0]}</small></label>)}</div>
              ) : (
                <div className="rulebox">
                  <div className="faint" style={{ fontSize: 12, marginBottom: 6 }}>Match all</div>
                  <div className="rule">
                    <select className="input" value={n.rule.attr} onChange={(e) => up({ rule: { ...n.rule, attr: e.target.value } })}>{['Connection', 'Asset type', 'Name'].map((x) => <option key={x}>{x}</option>)}</select>
                    <select className="input" value={n.rule.op} onChange={(e) => up({ rule: { ...n.rule, op: e.target.value } })}>{['is', 'contains'].map((x) => <option key={x}>{x}</option>)}</select>
                    <input className="input" value={n.rule.val} onChange={(e) => up({ rule: { ...n.rule, val: e.target.value } })} placeholder={n.rule.attr === 'Connection' ? 'e.g. Rplus Amazon S3' : n.rule.attr === 'Asset type' ? 'e.g. view' : 'e.g. CUSTOMER'} />
                  </div>
                  <span className="tlink" style={{ fontSize: 12.5 }}>+ Add filter</span>
                  <div className="rulecount"><b>{ruleMatch(n.rule).length}</b> assets match above filter · <span className="tlink" onClick={addRule}>Add them</span></div>
                </div>
              )}
              <p className="muted" style={{ fontSize: 12.5, marginTop: 10 }}><b>{n.assets.length}</b> assets selected</p>
            </div>
          )}

          {st === 2 && (() => {
            const inp = n.assets.filter((a) => store.products.some((p) => p.id !== n.edit && p.outputs.includes(a)));
            return (
              <>
                <div className="fcard">
                  <b className="ct"><Svg html={I.port} /> Output ports</b>
                  <p className="psub">Output ports are the assets in this product that produce data others can consume. You can add or remove them later from the product profile.</p>
                  {n.assets.length ? <div className="pick">{n.assets.map((a) => <label key={a} className={n.outputs.includes(a) ? 'sel' : ''}><input type="checkbox" checked={n.outputs.includes(a)} onChange={() => toggleOutput(a)} />{a}<small>{ainfo(a).type} · {ainfo(a).src}</small></label>)}</div> : <div className="empty">Add assets first.</div>}
                </div>
                <div className="fcard">
                  <b className="ct">Input ports</b>
                  <p className="psub">Input ports are output ports from other products that you added here as assets. We found {inp.length} in the previous step.</p>
                  {inp.map((a) => <span key={a} className="tag mono" style={{ margin: '0 6px 6px 0' }}>{a} · from {store.products.find((p) => p.outputs.includes(a)).name}</span>)}
                </div>
              </>
            );
          })()}

          {st === 3 && (
            <div className="fcard prev">
              <div className="ccover" style={{ background: COVER(d.color), height: 110, borderRadius: '10px 10px 0 0' }} />
              <div style={{ padding: '16px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'center' }}><h2 style={{ margin: 0, fontSize: 20 }}>{n.name || <span className="warn">Name missing</span>}</h2><span style={{ marginLeft: 'auto', color: 'var(--royal)', fontWeight: 600, fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6 }}><Svg html={I.vtickB} /> Active</span></div>
                <div className="faint" style={{ fontSize: 12.5, margin: '4px 0 12px', display: 'flex', alignItems: 'center', gap: 6 }}><Svg html={I.boxS} /> Product · <Svg html={I.lock} /> {n.sens ? SENS[n.sens][0] : '—'}</div>
                <div className="srow4">
                  <div><label>Domain</label><span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><DomainIcon id={n.domain} size={14} /> {d.name}</span></div>
                  <div><label>Criticality</label>{n.crit ? <span className="lvl"><i style={{ background: CRIT[n.crit][1] }} />{CRIT[n.crit][0]}</span> : '—'}</div>
                  <div><label>Sensitivity</label>{n.sens ? SENS[n.sens][0] : '—'}</div>
                  <div><label>Visibility</label>{n.vis === 'Public' ? 'Public' : 'Private'}</div>
                </div>
                <div className="lbl">About</div><p className="ovdesc">{n.desc || '—'}</p>
                <div className="lbl">Output ports ({n.outputs.length})</div>{n.outputs.length ? n.outputs.map((a) => <div key={a} className="mono" style={{ color: 'var(--royal)', fontSize: 12.5, padding: '3px 0' }}>{a}</div>) : <span className="faint">None</span>}
                <div className="lbl" style={{ marginTop: 10 }}>Assets</div><p className="ovdesc">{n.assets.length}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
