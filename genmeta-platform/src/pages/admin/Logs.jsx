import { useState } from 'react';
import { Search, Download } from 'lucide-react';
import { QUERY_LOGS, EVENT_LOGS, ADMIN_TOTALS as T } from '../../admin-data.js';
import { fmt } from '../../data.js';
import { AdminHead, Pill } from './kit.jsx';

const QUERY_STATUS = { ok: ['ok', 'Success'], masked: ['warn', 'Masked'], denied: ['off', 'Denied'], timeout: ['off', 'Timeout'] };
const SEVERITY = { info: ['ok', 'Info'], warning: ['warn', 'Warning'], critical: ['off', 'Critical'] };

export function QueryLogs() {
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('all');
  const list = QUERY_LOGS.filter((l) =>
    (status === 'all' || l.status === status) && (l.user + l.src + l.q).toLowerCase().includes(q.toLowerCase()));
  return (
    <>
      <AdminHead title="Query logs" sub="Every query run through GenMeta, including Ask GenMeta and API clients.">
        <button className="btn ghost"><Download size={14} />Export CSV</button>
      </AdminHead>
      <div className="filters">
        <label className="search sm"><Search size={16} /><input placeholder="Search queries, users, sources…" value={q} onChange={(e) => setQ(e.target.value)} /></label>
        <div className="seg">
          {['all', 'ok', 'masked', 'denied', 'timeout'].map((s) => <button key={s} className={status === s ? 'on' : ''} onClick={() => setStatus(s)}>{s === 'ok' ? 'success' : s}</button>)}
        </div>
      </div>
      <article className="card">
        <div className="table-wrap">
          <table className="tbl static">
            <thead><tr><th>Time</th><th>User</th><th>Source</th><th>Query</th><th className="num">Rows</th><th className="num">Duration</th><th>Status</th></tr></thead>
            <tbody>
              {list.map((l, i) => (
                <tr key={i}>
                  <td className="muted mono">{l.t}</td>
                  <td>{l.user}</td>
                  <td>{l.src}</td>
                  <td><code className="q-cell" title={l.q}>{l.q}</code></td>
                  <td className="num">{fmt(l.rows)}</td>
                  <td className="num">{l.ms >= 1000 ? `${(l.ms / 1000).toFixed(1)} s` : `${l.ms} ms`}</td>
                  <td><Pill map={QUERY_STATUS} s={l.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="tbl-foot">Showing {list.length} of {fmt(T.queries24h)} queries in the last 24 hours</div>
      </article>
    </>
  );
}

export function EventLogs() {
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('all');
  const list = EVENT_LOGS.filter((e) =>
    (cat === 'all' || e.cat === cat) && (e.actor + e.ev + e.target).toLowerCase().includes(q.toLowerCase()));
  return (
    <>
      <AdminHead title="Event logs" sub="Audit trail of sign-ins, access changes, tokens and configuration.">
        <button className="btn ghost"><Download size={14} />Export CSV</button>
      </AdminHead>
      <div className="filters">
        <label className="search sm"><Search size={16} /><input placeholder="Search events…" value={q} onChange={(e) => setQ(e.target.value)} /></label>
        <div className="seg">
          {['all', 'auth', 'access', 'token', 'config'].map((s) => <button key={s} className={cat === s ? 'on' : ''} onClick={() => setCat(s)}>{s}</button>)}
        </div>
      </div>
      <article className="card">
        <div className="table-wrap">
          <table className="tbl static">
            <thead><tr><th>Time</th><th>Actor</th><th>Category</th><th>Event</th><th>Target</th><th>IP address</th><th>Severity</th></tr></thead>
            <tbody>
              {list.map((e, i) => (
                <tr key={i}>
                  <td className="muted mono">{e.t}</td>
                  <td>{e.actor}</td>
                  <td><span className="chip">{e.cat}</span></td>
                  <td>{e.ev}</td>
                  <td><code>{e.target}</code></td>
                  <td className="muted mono">{e.ip}</td>
                  <td><Pill map={SEVERITY} s={e.sev} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="tbl-foot">Showing {list.length} of {fmt(T.events24h)} events in the last 24 hours · hash-chained audit log</div>
      </article>
    </>
  );
}
