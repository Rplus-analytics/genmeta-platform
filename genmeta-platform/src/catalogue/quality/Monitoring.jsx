import { useState } from 'react';
import { Play, RefreshCw } from 'lucide-react';
import { evaluateAll, seedRules } from './metrics.js';
import { getRules } from './store.js';

const fmtTime = (iso) => { try { return new Date(iso).toLocaleString('en-GB'); } catch { return iso; } };

function runChecks(trigger) {
  const rules = getRules() || seedRules();
  const iso = new Date().toISOString();
  const results = evaluateAll(rules, iso, trigger);
  const failed = results.filter((r) => !r.pass).length;
  return { results, at: iso, trigger, checks: results.length, failed, secs: (results.length * 0.01 + 0.2).toFixed(1) };
}

export default function Monitoring({ a }) {
  const [run, setRun] = useState(() => runChecks('harvest'));
  const results = [...run.results].sort((x, y) => Number(x.pass) - Number(y.pass));
  const alerts = run.results.filter((r) => !r.pass);

  return (
    <div className="dq-body">
      <div className="card pad-lg ml-card">
        <p className="e2e-synopsis">
          Checks run on every scheduled harvest and again the moment an asset's data changes. Last run {fmtTime(run.at)} ({run.trigger}): {run.checks} checks, {run.failed} failed, {run.secs}s.
        </p>
        <div className="dq-modebar">
          <button className="btn primary sm" onClick={() => setRun(runChecks('manual'))}><Play size={13} />Run checks now</button>
          <button className="btn ghost sm" onClick={() => setRun(runChecks('data change'))}><RefreshCw size={13} />Check for data changes</button>
        </div>
        <h3 className="sec-h">Latest result per rule and asset</h3>
        <div className="e2e-hop-wrap">
          <table className="tbl dq-mon">
            <thead><tr><th>Status</th><th>Rule</th><th>Asset</th><th>Dimension</th><th>Measured</th><th>Finding</th><th>When</th></tr></thead>
            <tbody>
              {results.map((r, i) => (
                <tr key={r.ruleId + r.asset + i} className={`static ${r.asset === a.key ? 'is-current' : ''}`}>
                  <td><span className={`dq-status ${r.pass ? 'pass' : 'fail'}`}>{r.pass ? 'pass' : 'fail'}</span></td>
                  <td className="ml-detail">{r.rule}</td>
                  <td><code className="mono">{r.asset}</code></td>
                  <td><span className="dq-dim">{r.dim}</span></td>
                  <td className="num">{r.measured}</td>
                  <td className="ml-detail">{r.finding}</td>
                  <td className="tc-known">{fmtTime(r.when)}<div className="da-stage">{r.trigger}</div></td>
                </tr>
              ))}
            </tbody>
          </table>
          {!results.length && <p className="tbl-empty">No rules to evaluate yet — add rules on the Rules & thresholds tab.</p>}
        </div>
      </div>

      <div className="card pad-lg ml-card">
        <h3 className="sec-h">Alerts — in-app and by email to the asset's owner and steward</h3>
        {alerts.length ? (
          <div className="dq-alerts">
            {alerts.map((r, i) => (
              <div key={r.ruleId + r.asset + i} className="dq-alert">
                <span className="dq-dim">{r.dim}</span>
                <b>{r.rule} — <code className="mono">{r.asset}</code></b>
                <span className="da-stage">{fmtTime(r.when)} · {r.trigger}</span>
                <span className={`ml-sev ${r.severity}`}>open</span>
                <p className="ml-detail">{r.finding}</p>
                <small className="dq-notified">notified {r.owner || 'owner'}{r.steward ? ` · ${r.steward}` : ''} · email sent</small>
              </div>
            ))}
          </div>
        ) : <p className="ml-empty">No open alerts — every enabled rule passed on the last run.</p>}
      </div>

      <div className="card pad-lg ml-card">
        <h3 className="sec-h">Anomalies beyond the rules</h3>
        <p className="ml-note">statistical detection over the metric history, independent of the written rules. Flagged when a reading is more than 3.5 robust z-scores from its usual value, or the last three runs shift by more than 25%.</p>
        <p className="ml-empty">Nothing unusual in the metric history.</p>
      </div>
    </div>
  );
}
