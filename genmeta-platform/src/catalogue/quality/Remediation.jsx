import { useState } from 'react';
import { getQuarantine, setQuarantine, getRemediation } from './store.js';

const fmtTime = (iso) => { try { return new Date(iso).toLocaleString('en-GB'); } catch { return iso; } };

export default function Remediation({ a }) {
  const [quar, setQuar] = useState(getQuarantine);
  const record = getRemediation();

  const release = (key) => { const next = quar.filter((q) => q.asset !== key); setQuar(next); setQuarantine(next); };

  return (
    <div className="dq-body">
      <div className="card pad-lg ml-card">
        <h3 className="sec-h">Quarantined assets — not fit for use; cannot be published as a data product</h3>
        {quar.length ? (
          <div className="e2e-hop-wrap">
            <table className="tbl dq-quar">
              <thead><tr><th>Asset</th><th>Why</th><th>Since</th><th>&nbsp;</th></tr></thead>
              <tbody>
                {quar.map((q) => (
                  <tr key={q.asset} className={`static ${q.asset === a.key ? 'is-current' : ''}`}>
                    <td><code className="mono">{q.asset}</code></td>
                    <td className="ml-detail">{q.why}</td>
                    <td className="tc-known">{fmtTime(q.since)}</td>
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
        <p className="ml-note">Every failure of a rule with authorised actions is remediated automatically and recorded here, alongside the steward it was routed to.</p>
        {record.length ? (
          <div className="e2e-hop-wrap">
            <table className="tbl dq-remed">
              <thead><tr><th>When</th><th>Asset</th><th>Rule</th><th>Actions taken</th><th>Routed to</th><th>Authorised by</th></tr></thead>
              <tbody>
                {record.map((r, i) => (
                  <tr key={i} className="static">
                    <td className="tc-known">{fmtTime(r.when)}<div className="da-stage">self-remediation</div></td>
                    <td><code className="mono">{r.asset}</code></td>
                    <td className="ml-detail">{r.rule}<div className="da-stage">{r.finding}</div></td>
                    <td className="ml-detail">{(r.actions || []).join('; ')}</td>
                    <td>{r.routedTo || '—'}</td>
                    <td>{r.authorisedBy || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p className="ml-empty">No remediations recorded yet. When a rule with authorised actions fails on a run, its actions and the steward it was routed to appear here.</p>}
      </div>
    </div>
  );
}
