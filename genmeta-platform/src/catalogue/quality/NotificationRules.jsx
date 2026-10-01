import { useState } from 'react';
import { Plus } from 'lucide-react';
import { getNotif, setNotif } from './store.js';
import { NOTIF_SEED, INCIDENTS } from './dqData.js';

const CHANNELS = ['In-app', 'Email', 'Slack', 'Teams', 'Webhook'];
const blank = () => ({ name: '', ch: 'Slack', to: '' });

export default function NotificationRules() {
  const [rules, setLocal] = useState(() => getNotif() || NOTIF_SEED);
  const [adding, setAdding] = useState(false);
  const [f, setF] = useState(blank);
  const persist = (next) => { setLocal(next); setNotif(next); };
  const toggle = (k) => persist(rules.map((r, i) => (i === k ? { ...r, on: !r.on } : r)));
  const save = () => {
    persist([...rules, { name: f.name || 'New rule', ch: f.ch, to: f.to || 'Owner and steward', f: 'Severity: High, Medium, Low · Priority: Critical, High, Medium', on: true }]);
    setF(blank()); setAdding(false);
  };
  const muted = INCIDENTS.filter((i) => i.muted).length;
  const slack = rules.filter((r) => r.ch === 'Slack' && r.on).length;

  return (
    <div className="dq-body">
      <div className="card pad-lg dq-tiles4">
        <div><span>In-app</span><b>{rules.some((r) => r.ch === 'In-app' && r.on) ? 'On' : 'Off'}</b><small>owner, steward, watchers</small></div>
        <div><span>Email</span><b>{rules.some((r) => r.ch === 'Email' && r.on) ? 'On' : 'Off'}</b><small>to the asset's owner and steward</small></div>
        <div><span>Slack</span><b>{slack} channel{slack === 1 ? '' : 's'}</b><small>{rules.filter((r) => r.ch === 'Slack').map((r) => r.to).join(', ') || '—'}</small></div>
        <div><span>Muted groups</span><b>{muted}</b><small>until unmuted</small></div>
      </div>

      <div className="card pad-lg ml-card">
        <div className="dq-cardhead">
          <div><h3 className="sec-h" style={{ margin: 0 }}>Notification rules</h3><p className="ml-note" style={{ margin: '4px 0 0' }}>Who hears about which incidents, and where. Alerts always go in-app and by email to the owner and steward; these add extra channels.</p></div>
          <button className="btn primary sm" onClick={() => setAdding((v) => !v)}><Plus size={13} />New notification rule</button>
        </div>

        {adding && (
          <div className="dq-form" style={{ marginBottom: 14 }}>
            <label className="dq-field"><span>Name</span><input value={f.name} onChange={(e) => setF((s) => ({ ...s, name: e.target.value }))} placeholder="e.g. Customer data to #cx-data" /></label>
            <label className="dq-field"><span>Channel</span><select value={f.ch} onChange={(e) => setF((s) => ({ ...s, ch: e.target.value }))}>{CHANNELS.map((c) => <option key={c}>{c}</option>)}</select></label>
            <label className="dq-field"><span>Send to</span><input value={f.to} onChange={(e) => setF((s) => ({ ...s, to: e.target.value }))} placeholder={f.ch === 'Slack' ? '#channel' : 'Owner and steward'} /></label>
            <div className="dq-field" style={{ alignSelf: 'end' }}><button className="btn primary sm" onClick={save}>Save</button></div>
          </div>
        )}

        <div className="e2e-hop-wrap">
          <table className="tbl dq-notif">
            <thead><tr><th>Rule</th><th>Channel</th><th>Sends to</th><th>Which incidents</th><th>On</th></tr></thead>
            <tbody>
              {rules.map((n, k) => (
                <tr key={k} className="static">
                  <td><b>{n.name}</b></td>
                  <td><span className="tag">{n.ch}</span></td>
                  <td>{n.to}</td>
                  <td className="ml-detail">{n.f}</td>
                  <td><input type="checkbox" checked={n.on} onChange={() => toggle(k)} aria-label={`Enable ${n.name}`} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
