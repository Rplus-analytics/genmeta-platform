import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { ASSETS } from '../model.js';
import { CHECKS, APPLIES, checkLabel, checkDim, seedRules } from './metrics.js';
import { getRules, setRules } from './store.js';
import { AUTHORISERS, ACTION_LABEL } from './dqData.js';

const ACTION_OPTS = [['reprofile', 'Reprofile'], ['reharvest', 'Reharvest'], ['quarantine', 'Quarantine'], ['task', 'Create task'], ['ai', 'AI describe']];
const BUSINESS_CHECKS = new Set(['no_missing', 'rowcount', 'fresh']);
const blankForm = () => ({ name: '', check: 'no_missing', appliesTo: 'Everything profiled', target: '', column: '', threshold: 95, severity: 'high', owner: '', why: '', actions: [], auth: '', params: {} });

/* Which parameter fields each check needs (DQM-03). */
function paramsForCheck(check) {
  switch (check) {
    case 'fresh': return [{ key: 'hours', label: 'Updated within (hours)', placeholder: '24' }];
    case 'range': return [{ key: 'min', label: 'Minimum', placeholder: '0' }, { key: 'max', label: 'Maximum', placeholder: '50000' }];
    case 'rowcount': return [{ key: 'min', label: 'Minimum rows', placeholder: '1' }, { key: 'max', label: 'Maximum rows', placeholder: '100000' }];
    case 'shape': return [{ key: 'shape', label: 'Expected shape', kind: 'select', options: ['Email', 'UK postcode', 'Date', 'NI number', 'Custom pattern'] }];
    case 'fk': return [{ key: 'parent', label: 'Parent table and key', placeholder: 'SRC.CUSTOMER.CUSTOMER_ID' }];
    case 'rowcount_upstream': return [{ key: 'upstream', label: 'Upstream asset', placeholder: 'SRC.ORDERS' }];
    default: return [];
  }
}
function paramText(r) {
  const p = r.params || {};
  if (r.check === 'fresh' && p.hours) return ` within ${p.hours} h`;
  if ((r.check === 'range' || r.check === 'rowcount') && (p.min || p.max)) return ` between ${p.min || '…'} and ${p.max || '…'}`;
  if (r.check === 'shape' && p.shape) return ` as ${p.shape}`;
  if (r.check === 'fk' && p.parent) return ` against ${p.parent}`;
  if (r.check === 'rowcount_upstream' && p.upstream) return ` against ${p.upstream}`;
  return '';
}
function sentence(f) {
  const where = f.appliesTo === 'Everything profiled' ? 'everything profiled' : (f.target || '…');
  const acts = f.auth && f.actions.length ? ` and GenMeta will ${f.actions.map((a) => ACTION_LABEL[a].toLowerCase()).join(', ')}` : '';
  return `GenMeta will check ${checkLabel(f.check).toLowerCase()} on ${where}${paramText(f)}${f.column ? ` column ${f.column}` : ''}, on every harvest and when data changes. It passes when at least ${f.threshold || 0}% of checks pass. If it fails, a ${f.severity} incident goes to ${f.owner || 'the owner'}${acts}.`;
}

export default function Rules({ a }) {
  const [rules, setLocal] = useState(() => getRules() || seedRules());
  const [f, setF] = useState(blankForm);
  const [del, setDel] = useState(null);
  const upd = (k, v) => setF((s) => ({ ...s, [k]: v }));
  const updParam = (k, v) => setF((s) => ({ ...s, params: { ...s.params, [k]: v } }));
  const persist = (next) => { setLocal(next); setRules(next); };

  const save = () => {
    if (!f.name.trim()) return;
    const rule = { ...f, id: `r-${Date.now()}`, threshold: Number(f.threshold) || 0, writtenBy: 'Admin', kind: BUSINESS_CHECKS.has(f.check) ? 'business' : 'technical', enabled: true, actions: f.auth ? f.actions : [] };
    persist([...rules, rule]);
    setF(blankForm());
  };
  const toggleAction = (id) => upd('actions', f.actions.includes(id) ? f.actions.filter((x) => x !== id) : [...f.actions, id]);
  const toggleEnabled = (id) => persist(rules.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r)));
  const remove = (id) => { persist(rules.filter((r) => r.id !== id)); setDel(null); };
  const params = paramsForCheck(f.check);

  return (
    <div className="dq-body">
      <div className="card pad-lg ml-card">
        <h3 className="sec-h">Write a rule</h3>
        <p className="ml-note">Plain templates, no SQL: pick what to check, where it applies and the threshold that counts as passing. Business users and engineers use the same form; who wrote it is recorded.</p>
        <div className="dq-form">
          <label className="dq-field"><span>Name</span><input value={f.name} onChange={(e) => upd('name', e.target.value)} placeholder="e.g. Customer identifiers are unique" /></label>
          <label className="dq-field"><span>Check</span>
            <select value={f.check} onChange={(e) => setF((s) => ({ ...s, check: e.target.value, params: {} }))}>{CHECKS.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}</select>
          </label>
          <label className="dq-field"><span>Applies to</span>
            <select value={f.appliesTo} onChange={(e) => upd('appliesTo', e.target.value)}>{APPLIES.map((x) => <option key={x} value={x}>{x}</option>)}</select>
          </label>
          <label className="dq-field"><span>{f.appliesTo === 'A dataset' ? 'Schema' : f.appliesTo === 'A classification' ? 'Classification' : 'Asset'}</span>
            {f.appliesTo === 'One asset'
              ? <select value={f.target} onChange={(e) => upd('target', e.target.value)}><option value="">—</option>{ASSETS.map((x) => <option key={x.key} value={x.key}>{x.key}</option>)}</select>
              : <input value={f.target} onChange={(e) => upd('target', e.target.value)} placeholder={f.appliesTo === 'Everything profiled' ? 'n/a' : 'name'} disabled={f.appliesTo === 'Everything profiled'} />}
          </label>
          <label className="dq-field"><span>Column</span><input value={f.column} onChange={(e) => upd('column', e.target.value)} placeholder="optional, e.g. CUSTOMER_ID" /></label>
          {params.map((p) => (
            <label key={p.key} className="dq-field"><span>{p.label}</span>
              {p.kind === 'select'
                ? <select value={f.params[p.key] || ''} onChange={(e) => updParam(p.key, e.target.value)}><option value="">Select</option>{p.options.map((o) => <option key={o} value={o}>{o}</option>)}</select>
                : <input value={f.params[p.key] || ''} onChange={(e) => updParam(p.key, e.target.value)} placeholder={p.placeholder} />}
            </label>
          ))}
          <label className="dq-field"><span>Passes at ≥ %</span><input type="number" min="0" max="100" value={f.threshold} onChange={(e) => upd('threshold', e.target.value)} /></label>
          <label className="dq-field"><span>Severity</span>
            <select value={f.severity} onChange={(e) => upd('severity', e.target.value)}><option>high</option><option>medium</option><option>low</option></select>
          </label>
          <label className="dq-field"><span>Business owner</span><input value={f.owner} onChange={(e) => upd('owner', e.target.value)} placeholder="who answers for it" /></label>
          <label className="dq-field dq-field-wide"><span>Why it matters</span><input value={f.why} onChange={(e) => upd('why', e.target.value)} placeholder="the business reason" /></label>
          <div className="dq-field dq-field-wide">
            <span>Self-remediation when it fails <em className="dq-hint">(only a governance lead or product owner can authorise)</em></span>
            <select value={f.auth} onChange={(e) => setF((s) => ({ ...s, auth: e.target.value, actions: e.target.value ? s.actions : [] }))} style={{ marginBottom: 6 }}>
              <option value="">Not authorised: alert only</option>{AUTHORISERS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
            <div className={`dq-actions-row ${f.auth ? '' : 'is-disabled'}`}>
              {ACTION_OPTS.map(([id, label]) => (
                <label key={id} className="dq-check"><input type="checkbox" disabled={!f.auth} checked={f.actions.includes(id)} onChange={() => toggleAction(id)} />{label}</label>
              ))}
            </div>
          </div>
        </div>
        <div className="dq-plain">{sentence(f)}</div>
        <button className="btn primary sm dq-save" onClick={save}><Plus size={13} />Save rule</button>
      </div>

      <div className="card pad-lg ml-card">
        <h3 className="sec-h">Rules ({rules.length})</h3>
        <div className="e2e-hop-wrap">
          <table className="tbl dq-rules">
            <thead><tr><th>Rule</th><th>Check</th><th>Dimension</th><th>Applies to</th><th className="num">Threshold</th><th>On failure</th><th>Written by</th><th>On</th><th>&nbsp;</th></tr></thead>
            <tbody>
              {rules.map((r) => (
                <tr key={r.id} className={`static ${r.enabled ? '' : 'dq-disabled'}`}>
                  <td><b>{r.name}</b><div className="ml-detail">{r.why}</div></td>
                  <td className="ml-detail">{checkLabel(r.check)}{r.column ? ` · ${r.column}` : ''}{paramText(r)}</td>
                  <td><span className="dq-dim">{checkDim(r.check)}</span></td>
                  <td className="ml-detail">{r.appliesTo}{r.target ? `: ${r.target}` : ''}</td>
                  <td className="num">≥ {r.threshold}%</td>
                  <td className="ml-detail"><span className={`ml-sev ${r.severity}`}>{r.severity}</span>{r.actions && r.actions.length ? <div className="dq-onfail">{r.actions.map((x) => ACTION_LABEL[x]).join(', ')}<br /><span className="faint">authorised by {r.auth || 'governance lead'}</span></div> : <div className="dq-onfail faint">Alert only</div>}</td>
                  <td className="ml-detail">{r.writtenBy}<div className="da-stage">{r.kind === 'business' ? 'business template' : 'technical'}</div></td>
                  <td><input type="checkbox" checked={r.enabled} onChange={() => toggleEnabled(r.id)} aria-label="Enable rule" /></td>
                  <td><button className="icon-btn dq-del" title="Delete rule" aria-label={`Delete ${r.name}`} onClick={() => setDel(r)}><Trash2 size={15} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
          {!rules.length && <p className="tbl-empty">No rules yet — write one above.</p>}
        </div>
        <p className="ml-foot">Self-remediation actions need a governance lead or product owner to authorise them.</p>
      </div>

      {del && (
        <>
          <div className="dq-scrim" onClick={() => setDel(null)} />
          <div className="dq-modal">
            <h3>Delete “{del.name}”?</h3>
            <p className="ml-detail">Its history stays in the remediation record. To pause it instead, switch it off.</p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 12 }}>
              <button className="btn ghost sm" onClick={() => setDel(null)}>Cancel</button>
              <button className="btn primary sm" onClick={() => remove(del.id)}>Delete</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
