import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getQuarantine, setQuarantine, getRemediation } from './store.js';
import { PEOPLE } from './dqData.js';

const fmtTime = (iso) => { try { return new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }); } catch { return iso; } };
const Person = ({ n }) => (n ? <span className="dq-person"><i>{PEOPLE[n] || n[0]}</i>{n}</span> : <span className="faint">—</span>);

export default function Remediation({ a }) {
  const nav = useNavigate();
  const [quar, setQuar] = useState(getQuarantine);
  const record = getRemediation();
  const release = (key) => { const next = quar.filter((q) => q.asset !== key); setQuar(next); setQuarantine(next); };

  return (
    <div className="dq-body">
      <div className="card pad-lg ml-card">
        <h3 className="sec-h">Quarantined assets — not fit for use; cannot be published as a data product</h3>
        <p className="ml-note">Flagged in the Catalogue and blocked from being published as a data product until their owner or steward releases them.</p>
        {quar.length ? (
          <div className="e2e-hop-wrap">
            <table className="tbl dq-quar">
              <thead><tr><th>Asset</th><th>Why</th><th>Since</th><th>Quarantined by</th><th>&nbsp;</th></tr></thead>
              <tbody>
                {quar.map((q) => (
                  <tr key={q.asset} className={`static ${q.asset === a.key ? 'is-current' : ''}`}>
                    <td><code className="mono">{q.asset}</code></td>
                    <td className="ml-detail">{q.why}</td>
                    <td className="tc-known">{q.since}</td>
                    <td><Person n={q.by} /></td>
                    <td><button className="btn ghost sm" onClick={() => release(q.asset)}>Release</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p className="ml-empty">Nothing quarantined.</p>}
      </div>

      <div className="card pad-lg ml-card">
        <h3 className="sec-h">Remediation record</h3>
        <p className="ml-note">Every automatic or manual fix, kept for audit, alongside the steward it was routed to. Tasks created here appear in Stewardship.</p>
        {record.length ? (
          <div className="e2e-hop-wrap">
            <table className="tbl dq-remed">
              <thead><tr><th>When</th><th>Asset</th><th>Rule</th><th>Actions taken</th><th>Routed to</th><th>Authorised by</th><th>Steward task</th></tr></thead>
              <tbody>
                {record.map((r, i) => {
                  const hasTask = r.task != null ? r.task : /Task/.test(r.actions || '');
                  return (
                    <tr key={i} className="static">
                      <td className="tc-known">{fmtTime(r.when)}<div className="da-stage">self-remediation</div></td>
                      <td><code className="mono">{r.asset}</code></td>
                      <td className="ml-detail">{r.rule}</td>
                      <td className="ml-detail">{r.actions}</td>
                      <td>{r.routedTo || '—'}</td>
                      <td>{r.authorisedBy || '—'}</td>
                      <td>{hasTask ? <button className="tlink dq-asbtn" onClick={() => nav('/app/stewardship')}>Open in Stewardship</button> : <span className="faint">—</span>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : <p className="ml-empty">No remediations recorded yet.</p>}
      </div>
    </div>
  );
}
