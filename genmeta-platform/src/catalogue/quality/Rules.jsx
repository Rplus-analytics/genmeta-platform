import { useState } from 'react';
import { Plus } from 'lucide-react';
import { ASSETS } from '../model.js';
import { CHECKS, APPLIES, checkLabel, checkDim, seedRules } from './metrics.js';
import { getRules, setRules } from './store.js';

const ACTION_OPTS = [['reprofile', 'reprofile'], ['reharvest', 'reharvest'], ['quarantine', 'quarantine'], ['task', 'task'], ['ai', 'ai describe']];
const BUSINESS_CHECKS = new Set(['no_missing', 'rowcount', 'fresh']);
const blankForm = () => ({ name: '', check: 'no_missing', appliesTo: 'Everything profiled', target: '', column: '', threshold: 95, severity: 'high', owner: '', why: '', actions: [] });

export default function Rules({ a }) {
  const [rules, setLocal] = useState(() => getRules() || seedRules());
  const [f, setF] = useState(blankForm);
  const upd = (k, v) => setF((s) => ({ ...s, [k]: v }));
  const persist = (next) => { setLocal(next); setRules(next); };

  const save = () => {
    if (!f.name.trim()) return;
    const rule = { ...f, id: `r-${Date.now()}`, threshold: Number(f.threshold) || 0, writtenBy: 'Admin', kind: BUSINESS_CHECKS.has(f.check) ? 'business' : 'technical', enabled: true };
    persist([...rules, rule]);
    setF(blankForm());
  };
  const toggleAction = (id) => upd('actions', f.actions.includes(id) ? f.actions.filter((x) => x !== id) : [...f.actions, id]);
  const toggleEnabled = (id) => persist(rules.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r)));

  return (
    <div className="dq-body">
      <div className="card pad-lg ml-card">
        <h3 className="sec-h">Write a rule</h3>
        <p className="ml-note">Plain templates, no SQL: pick what to check, where it applies and the threshold that counts as passing. Business users and engineers use the same form; who wrote it is recorded.</p>
        <div className="dq-form">
          <label className="dq-field"><span>Name</span><input value={f.name} onChange={(e) => upd('name', e.target.value)} placeholder="e.g. Customer identifiers are unique" /></label>
          <label className="dq-field"><span>Check</span>
            <select value={f.check} onChange={(e) => upd('check', e.target.value)}>{CHECKS.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}</select>
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
          <label className="dq-field"><span>Passes at ≥ %</span><input type="number" min="0" max="100" value={f.threshold} onChange={(e) => upd('threshold', e.target.value)} /></label>
          <label className="dq-field"><span>Severity</span>
            <select value={f.severity} onChange={(e) => upd('severity', e.target.value)}><option>high</option><option>medium</option><option>low</option></select>
          </label>
          <label className="dq-field"><span>Business owner</span><input value={f.owner} onChange={(e) => upd('owner', e.target.value)} placeholder="who answers for it" /></label>
          <label className="dq-field dq-field-wide"><span>Why it matters</span><input value={f.why} onChange={(e) => upd('why', e.target.value)} placeholder="the business reason" /></label>
          <div className="dq-field dq-field-wide">
            <span>Self-remediation when it fails <em className="dq-hint">(needs a governance lead or product owner)</em></span>
            <div className="dq-actions-row">
              {ACTION_OPTS.map(([id, label]) => (
                <label key={id} className="dq-check"><input type="checkbox" checked={f.actions.includes(id)} onChange={() => toggleAction(id)} />{label}</label>
              ))}
            </div>
          </div>
        </div>
        <button className="btn primary sm dq-save" onClick={save}><Plus size={13} />Save rule</button>
      </div>

      <div className="card pad-lg ml-card">
        <h3 className="sec-h">Rules ({rules.length})</h3>
        <div className="e2e-hop-wrap">
          <table className="tbl dq-rules">
            <thead><tr><th>Rule</th><th>Check</th><th>Dimension</th><th>Applies to</th><th className="num">Threshold</th><th>On failure</th><th>Written by</th><th>&nbsp;</th></tr></thead>
            <tbody>
              {rules.map((r) => (
                <tr key={r.id} className={`static ${r.enabled ? '' : 'dq-disabled'}`}>
                  <td><b>{r.name}</b><div className="ml-detail">{r.why}</div></td>
                  <td className="ml-detail">{checkLabel(r.check)}{r.column ? ` · ${r.column}` : ''}</td>
                  <td><span className="dq-dim">{checkDim(r.check)}</span></td>
                  <td className="ml-detail">{r.appliesTo}{r.target ? `: ${r.target}` : ''}</td>
                  <td className="num">≥ {r.threshold}%</td>
                  <td className="ml-detail"><span className={`ml-sev ${r.severity === 'high' ? 'high' : r.severity === 'medium' ? 'medium' : 'low'}`}>{r.severity}</span>{r.actions && r.actions.length ? <div className="dq-onfail">{r.actions.join(', ')} · authorised by governance lead</div> : null}</td>
                  <td className="ml-detail">{r.writtenBy}<div className="da-stage">{r.kind === 'business' ? 'business template' : 'technical'}</div></td>
                  <td><button className="btn ghost sm" onClick={() => toggleEnabled(r.id)}>{r.enabled ? 'Disable' : 'Enable'}</button></td>
                </tr>
              ))}
            </tbody>
          </table>
          {!rules.length && <p className="tbl-empty">No rules yet — write one above.</p>}
        </div>
      </div>
    </div>
  );
}
