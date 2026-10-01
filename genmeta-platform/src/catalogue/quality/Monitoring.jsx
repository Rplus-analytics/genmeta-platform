import { useEffect, useState } from 'react';
import { Play, RefreshCw, Bell, BellOff, Info } from 'lucide-react';
import { evaluateAll, seedRules } from './metrics.js';
import { getRules } from './store.js';
import {
  INCIDENTS, ALERTS, ALS, ANOMS, RESULTS, DIML, STL, PEOPLE,
} from './dqData.js';
import Incident from './Incident.jsx';

const fmtTime = (iso) => { try { return new Date(iso).toLocaleString('en-GB'); } catch { return iso; } };
const Person = ({ n }) => <span className="dq-person"><i>{PEOPLE[n] || n[0]}</i>{n}</span>;
const Sev = ({ s }) => <span className={`dq-sev s-${s}`}><i />{s[0].toUpperCase() + s.slice(1)}</span>;
const Pri = ({ p }) => { const k = ['None', 'Low', 'Medium', 'High', 'Critical'].indexOf(p); return <span className="dq-pri"><b>{[1, 2, 3, 4].map((n) => <u key={n} style={{ height: 2 + n * 2 }} className={n <= k ? 'on' : ''} />)}</b>{p}</span>; };

const INNER = [['results', 'Latest results'], ['alerts', 'Alerts'], ['anomalies', 'Anomalies'], ['incidents', 'Incidents']];

function runChecks(trigger) {
  const rules = getRules() || seedRules();
  const iso = new Date().toISOString();
  const results = evaluateAll(rules, iso, trigger);
  return { results, at: iso, trigger, checks: results.length, failed: results.filter((r) => !r.pass).length, secs: (results.length * 0.01 + 0.2).toFixed(1), rules };
}

export default function Monitoring({ a, focusIncident, focusTab, onClearFocus }) {
  const [tab, setTab] = useState('results');
  const [run, setRun] = useState(() => runChecks('harvest'));
  const [incidents, setIncidents] = useState(INCIDENTS);
  const [alerts, setAlerts] = useState(ALERTS);
  const [sel, setSel] = useState(() => new Set());
  const [filter, setFilter] = useState({ status: 'open', kind: 'all' });
  const [openInc, setOpenInc] = useState(null);
  const [explain, setExplain] = useState(null);
  const [toastMsg, setToastMsg] = useState(null);
  const toast = (m) => { setToastMsg(m); clearTimeout(window._dqtt); window._dqtt = setTimeout(() => setToastMsg(null), 2400); };

  useEffect(() => {
    if (focusIncident) { setTab('incidents'); setOpenInc(focusIncident); onClearFocus && onClearFocus(); }
    else if (focusTab) { setTab(focusTab); onClearFocus && onClearFocus(); }
  }, [focusIncident, focusTab, onClearFocus]);

  const thresholdOf = (ruleId) => { const r = run.rules.find((x) => x.id === ruleId); return r ? `≥ ${r.threshold}%` : '—'; };
  const setStatus = (id, s) => { setIncidents((list) => list.map((i) => (i.id === id ? { ...i, status: s } : i))); toast(id + ' set to ' + STL[s] + (s === 'fp' ? '. GenMeta will learn from this.' : '')); };
  const mute = (id) => { setIncidents((list) => list.map((i) => (i.id === id ? { ...i, muted: !i.muted } : i))); };
  const alertAct = (id, st) => { setAlerts((list) => list.map((x) => (x.id === id ? { ...x, st } : x))); toast(id + (st === 'ack' ? ' acknowledged' : ' resolved')); };
  const bulk = (kind) => { const ids = [...sel]; setIncidents((list) => list.map((i) => (ids.includes(i.id) ? { ...i, ...(kind === 'own' ? { own: 'Madhavi' } : kind === 'inv' ? { status: 'investigating' } : { muted: true }) } : i))); toast(ids.length + ' incidents updated'); setSel(new Set()); };

  if (openInc) {
    const inc = incidents.find((x) => x.id === openInc);
    if (inc) return (<>{toastMsg && <div className="dq-toast">{toastMsg}</div>}<Incident incident={inc} onBack={() => setOpenInc(null)} onStatus={(id, s) => { setStatus(id, s); }} toast={toast} /></>);
  }

  const results = evaluateAll(run.rules, run.at, run.trigger).sort((x, y) => Number(x.pass) - Number(y.pass));
  const f = filter;
  const incRows = incidents.filter((i) => (f.status === 'all' || (f.status === 'open' ? (i.status === 'triage' || i.status === 'investigating') : i.status === f.status)) && (f.kind === 'all' || i.kind === f.kind));

  return (
    <div className="dq-body">
      {toastMsg && <div className="dq-toast">{toastMsg}</div>}
      <div className="card pad-lg ml-card">
        <p className="e2e-synopsis">Checks run on every scheduled harvest (15 minutes) and again the moment an asset's data changes. Last run {fmtTime(run.at)} ({run.trigger}): {run.checks} checks, {run.failed} failed, {run.secs}s. Anomalies beyond the rules are flagged when a robust z-score is above 3.5, or the last three runs shift by more than 25%.</p>
        <div className="dq-modebar">
          <button className="btn ghost sm" onClick={() => { setRun(runChecks('data change')); toast('Looked for data changes: 1 asset changed, checks queued'); }}><RefreshCw size={13} />Check for data changes</button>
          <button className="btn primary sm" onClick={() => { setRun(runChecks('manual')); toast('Checks ran'); }}><Play size={13} />Run checks now</button>
        </div>
        <div className="dq-tiles4" style={{ marginTop: 14 }}>
          <div><span>Last run</span><b style={{ fontSize: 16 }}>{fmtTime(run.at)}</b><small>{run.checks} checks · {run.failed} failed · {run.secs}s</small></div>
          <div><span>Next scheduled run</span><b style={{ fontSize: 16 }}>in 11 min</b><small>every harvest · 15 min</small></div>
          <div><span>Open alerts</span><b>{alerts.filter((x) => x.st === 'open').length}</b><small>{alerts.filter((x) => x.st === 'ack').length} acknowledged</small></div>
          <div><span>Anomalies</span><b>{ANOMS.length}</b><small>found without a rule</small></div>
        </div>
      </div>

      <nav className="asset-tabs lin-subtabs dq-inner" role="tablist">
        {INNER.map(([k, l]) => {
          const cnt = k === 'results' ? RESULTS.length : k === 'alerts' ? alerts.filter((x) => x.st !== 'resolved').length : k === 'anomalies' ? ANOMS.length : incidents.filter((i) => i.status === 'triage' || i.status === 'investigating').length;
          return <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l} <small>{cnt}</small></button>;
        })}
      </nav>

      {tab === 'results' && (
        <div className="card pad-lg ml-card">
          <h3 className="sec-h">Latest result per rule and asset</h3>
          <div className="e2e-hop-wrap">
            <table className="tbl dq-mon">
              <thead><tr><th>Status</th><th>Rule</th><th>Asset</th><th>Dimension</th><th>Measured</th><th>Threshold</th><th>Trigger</th><th>When</th></tr></thead>
              <tbody>
                {results.map((r, i) => (
                  <tr key={r.ruleId + r.asset + i} className={`static ${r.asset === a.key ? 'is-current' : ''}`}>
                    <td><span className={`dq-status ${r.pass ? 'pass' : 'fail'}`}>{r.pass ? 'pass' : 'fail'}</span></td>
                    <td className="ml-detail">{r.rule}</td>
                    <td><code className="mono">{r.asset}</code></td>
                    <td><span className="dq-dim">{r.dim}</span></td>
                    <td className="mono">{r.measured}</td>
                    <td className="mono">{thresholdOf(r.ruleId)}</td>
                    <td><span className="dq-kd">{r.trigger}</span></td>
                    <td className="tc-known">{fmtTime(r.when)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!results.length && <p className="tbl-empty">No rules to evaluate yet — add rules on the Rules &amp; thresholds tab.</p>}
          </div>
          <p className="ml-foot">Trigger shows what started the run: the 15-minute schedule, a data change, or a manual run.</p>
        </div>
      )}

      {tab === 'alerts' && (
        <div className="card pad-lg ml-card">
          <h3 className="sec-h">Alerts — in-app and by email to the asset's owner and steward</h3>
          <div className="e2e-hop-wrap">
            <table className="tbl dq-mon">
              <thead><tr><th>Alert</th><th>Asset</th><th>Severity</th><th>Notified</th><th>Email</th><th>Status</th><th>&nbsp;</th></tr></thead>
              <tbody>
                {alerts.map((al) => (
                  <tr key={al.id} className="static">
                    <td><b>{al.t}</b><div className="da-stage mono">{al.id} · {al.w}</div></td>
                    <td><code className="mono">{al.a}</code></td>
                    <td><Sev s={al.sev} /></td>
                    <td className="ml-detail">{al.to}<div className="da-stage">in-app + email</div></td>
                    <td><span className={`dq-kd ${/Bounced/.test(al.mail) ? 'anom' : ''}`}>{al.mail}</span></td>
                    <td><span className={`dq-badge2 ${al.st === 'resolved' ? 'st-resolved' : al.st === 'ack' ? 'st-investigating' : 'st-triage'}`}><i />{ALS[al.st]}</span></td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      {al.st === 'open' && <button className="btn ghost sm" onClick={() => alertAct(al.id, 'ack')}>Acknowledge</button>}{' '}
                      {al.st !== 'resolved' && <button className="btn ghost sm" onClick={() => alertAct(al.id, 'resolved')}>Resolve</button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'anomalies' && (
        <div className="card pad-lg ml-card">
          <div className="dq-info"><Info size={15} /><div><b>Anomalies beyond the rules.</b> GenMeta watches every profiled metric, so nothing here needs a rule written first. It flags a robust z-score above 3.5, a level shift of more than 25% over the last three runs, or a change from a value that has always been constant.</div></div>
          <div className="e2e-hop-wrap">
            <table className="tbl dq-mon">
              <thead><tr><th>Asset</th><th>Metric</th><th>Now</th><th>Usual</th><th>How it was found</th><th className="num">Readings</th><th>&nbsp;</th></tr></thead>
              <tbody>
                {ANOMS.map((x, k) => (
                  <tr key={k} className="static">
                    <td><code className="mono">{x.a}</code></td><td>{x.m}</td>
                    <td className="mono"><b>{x.now}</b></td><td className="mono muted">{x.usual}</td>
                    <td className="ml-detail" style={{ maxWidth: 300 }}>{x.how}</td><td className="num">{x.n}</td>
                    <td><button className="btn ghost sm" onClick={() => setExplain(k)}>Explain</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'incidents' && (
        <>
          <div className="dq-filters">
            <span className="seg2">{[['open', 'Open'], ['triage', 'Triage'], ['investigating', 'Investigating'], ['resolved', 'Resolved'], ['fp', 'False positive'], ['all', 'All']].map(([k, l]) => <button key={k} className={f.status === k ? 'on' : ''} onClick={() => setFilter((s) => ({ ...s, status: k }))}>{l}</button>)}</span>
            <span className="seg2">{[['all', 'Rules + anomalies'], ['Rule', 'Rules'], ['Anomaly', 'Anomalies']].map(([k, l]) => <button key={k} className={f.kind === k ? 'on' : ''} onClick={() => setFilter((s) => ({ ...s, kind: k }))}>{l}</button>)}</span>
          </div>
          {sel.size > 0 && (
            <div className="dq-bulk"><b>{sel.size} selected</b><span style={{ flex: 1 }} /><button className="btn ghost sm" onClick={() => bulk('own')}>Assign owner</button><button className="btn ghost sm" onClick={() => bulk('inv')}>Set to Investigating</button><button className="btn ghost sm" onClick={() => bulk('mute')}>Mute</button><button className="btn ghost sm" onClick={() => setSel(new Set())}>Clear</button></div>
          )}
          <div className="card pad-lg ml-card">
            <div className="e2e-hop-wrap">
              <table className="tbl dq-mon">
                <thead><tr><th style={{ width: 28 }}><input type="checkbox" aria-label="Select all" checked={incRows.length > 0 && incRows.every((r) => sel.has(r.id))} onChange={(e) => { const n = new Set(sel); incRows.forEach((r) => (e.target.checked ? n.add(r.id) : n.delete(r.id))); setSel(n); }} /></th><th>Incident</th><th>Group</th><th>Asset</th><th>Status</th><th>Priority</th><th>Owner</th><th>First seen</th><th>Last seen</th><th>&nbsp;</th></tr></thead>
                <tbody>
                  {incRows.map((i) => (
                    <tr key={i.id} className="dq-row" onClick={() => setOpenInc(i.id)}>
                      <td onClick={(e) => e.stopPropagation()}><input type="checkbox" checked={sel.has(i.id)} onChange={(e) => { const n = new Set(sel); e.target.checked ? n.add(i.id) : n.delete(i.id); setSel(n); }} /></td>
                      <td><div style={{ display: 'flex', gap: 8, alignItems: 'center' }}><Sev s={i.sev} /> <span className="faint">{i.n}</span></div></td>
                      <td style={{ minWidth: 200 }}><b>{i.title}</b><div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 3 }}><small className="faint mono">{i.id}</small><span className={`dq-kd ${i.kind === 'Anomaly' ? 'anom' : ''}`}>{i.kind}</span><span className="dq-kd">{DIML[i.dim]}</span></div></td>
                      <td><code className="mono">{i.asset}</code></td>
                      <td onClick={(e) => e.stopPropagation()}><select className="dq-stsel" value={i.status} onChange={(e) => setStatus(i.id, e.target.value)}>{Object.entries(STL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></td>
                      <td><Pri p={i.pri} /></td>
                      <td><Person n={i.own} /></td>
                      <td className="muted">{i.first}</td><td className="muted">{i.last}</td>
                      <td onClick={(e) => e.stopPropagation()}><button className="btn ghost sm" title={i.muted ? 'Unmute' : 'Mute'} onClick={() => mute(i.id)}>{i.muted ? <BellOff size={13} /> : <Bell size={13} />}</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!incRows.length && <p className="tbl-empty">No incidents match. Checks run on every harvest.</p>}
            </div>
          </div>
        </>
      )}

      {explain != null && (
        <>
          <div className="dq-scrim" onClick={() => setExplain(null)} />
          <div className="dq-modal" style={{ width: 560 }}>
            <div className="eyebrow">Explained by Claude</div>
            <h3 style={{ marginTop: 4 }}>{ANOMS[explain].m} on {ANOMS[explain].a}</h3>
            <p style={{ fontSize: 13.5, lineHeight: 1.55 }}>{ANOMS[explain].why}</p>
            <div className="dq-plain"><b>What to check first</b><ol style={{ margin: '6px 0 0', paddingLeft: 18 }}>{ANOMS[explain].check.map((c, k) => <li key={k}>{c}</li>)}</ol></div>
            <p className="faint" style={{ fontSize: 12, margin: '10px 0 0' }}>Based on {ANOMS[explain].n} readings and lineage from the Graph. No row values were sent to the model.</p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 14 }}>
              {ANOMS[explain].inc ? <button className="btn ghost sm" onClick={() => { setOpenInc(ANOMS[explain].inc); setExplain(null); }}>Open incident</button> : <button className="btn ghost sm" onClick={() => { toast('Incident raised for ' + ANOMS[explain].a); setExplain(null); }}>Raise incident</button>}
              <button className="btn primary sm" onClick={() => setExplain(null)}>Done</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
