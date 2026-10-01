import { useState } from 'react';
import { ChevronLeft, Bell, BellOff, Code2, Check } from 'lucide-react';
import { BY_KEY } from '../model.js';
import RootCause from '../RootCause.jsx';
import { getQuarantine } from './store.js';
import { DIML, STL, PEOPLE } from './dqData.js';

const Person = ({ n }) => <span className="dq-person"><i>{PEOPLE[n] || n[0]}</i>{n}</span>;
const Sev = ({ s }) => <span className={`dq-sev s-${s}`}><i />{s[0].toUpperCase() + s.slice(1)}</span>;
const Status = ({ s }) => <span className={`dq-badge2 st-${s}`}><i />{STL[s]}</span>;

function MetricChart({ i }) {
  const W = 760, H = 200, pl = 40, pr = 10, pt = 12, pb = 24, n = 21, bw = (W - pl - pr) / (n - 1);
  const base = i.dim === 'timeliness' ? 20 : i.dim === 'uniqueness' ? 99 : i.dim === 'accuracy' ? 97 : 90;
  const vals = [...Array(n)].map((_, k) => (k >= n - i.n ? base - (i.sev === 'high' ? 40 : 20) - (k % 3) * 4 : base + ((k * 7) % 5) - 2));
  const y = (v) => pt + (H - pt - pb) * (1 - v / 110);
  return (
    <svg className="dq-chart" viewBox={`0 0 ${W} ${H}`}>
      <path d={`M${pl},${y(base + 6)} L${W - pr},${y(base + 6)} L${W - pr},${y(base - 8)} L${pl},${y(base - 8)}Z`} fill="#EDF4FF" />
      {[0, 50, 100].map((v) => <g key={v}><text x={pl - 6} y={y(v) + 4} fontSize="10" textAnchor="end" fill="#8694AB">{v}</text><line x1={pl} x2={W - pr} y1={y(v)} y2={y(v)} stroke="#E3EAF3" /></g>)}
      <path d={`M${vals.map((v, k) => (pl + k * bw) + ',' + y(v)).join('L')}`} fill="none" stroke="#4D8CFF" strokeWidth="2" />
      {vals.map((v, k) => { const bad = k >= n - i.n; return <circle key={k} cx={pl + k * bw} cy={y(v)} r={bad ? 4.5 : 2.5} fill={bad ? '#0E2A57' : '#fff'} stroke={bad ? '#0E2A57' : '#4D8CFF'} strokeWidth="1.5"><title>{`${bad ? 'Incident: ' : ''}${v}`}</title></circle>; })}
      <text x={W - pr} y={y(base + 6) - 4} textAnchor="end" fontSize="10" fill="#566A89">expected band</text>
    </svg>
  );
}

function DebugModal({ i, onClose, toast }) {
  const col = '*';
  const name = i.asset.split('.').pop();
  const sql = i.dim === 'uniqueness'
    ? `SELECT ${col}, COUNT(*) AS copies\nFROM ${i.asset}\nGROUP BY ${col}\nHAVING COUNT(*) > 1\nORDER BY copies DESC\nLIMIT 50;`
    : i.dim === 'completeness'
      ? `SELECT *\nFROM ${i.asset}\nWHERE CUSTOMER_EMAIL IS NULL\n   OR TRIM(CUSTOMER_EMAIL) = ''\nLIMIT 50;`
      : `SELECT MAX(LAST_ALTERED) AS last_change,\n       DATEDIFF('hour', MAX(LAST_ALTERED), CURRENT_TIMESTAMP) AS hours_ago\nFROM INFORMATION_SCHEMA.TABLES\nWHERE TABLE_NAME = '${name}';`;
  return (
    <>
      <div className="dq-scrim" onClick={onClose} />
      <div className="dq-modal" style={{ width: 600 }}>
        <h3>Debug query</h3>
        <p className="ml-detail" style={{ margin: '0 0 12px' }}>Sample SQL that pulls the rows behind this incident. It runs on your warehouse; GenMeta does not store the rows.</p>
        <pre className="dq-code">{sql}</pre>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 14 }}>
          <button className="btn ghost sm" onClick={() => toast('Asked AI for a better query')}>Suggest with AI</button>
          <button className="btn ghost sm" onClick={() => toast('Query saved on this rule')}>Save on rule</button>
          <button className="btn primary sm" onClick={() => { onClose(); toast('Copied to clipboard'); }}>Copy SQL</button>
        </div>
      </div>
    </>
  );
}

export default function Incident({ incident, onBack, onStatus, toast }) {
  const i = incident;
  const [tab, setTab] = useState('overview');
  const [muted, setMuted] = useState(!!i.muted);
  const [debug, setDebug] = useState(false);
  const quarantined = getQuarantine().some((q) => q.asset === i.asset);
  const assetInModel = !!BY_KEY[i.asset];

  return (
    <div className="dq-body">
      <div className="lin-crumb"><button className="tlink" onClick={onBack}><ChevronLeft size={13} />Monitoring &amp; anomalies</button> / <b className="mono">{i.id}</b></div>

      <div className="card pad-lg dq-inc-head">
        <div><h2 className="sec-h" style={{ margin: 0, fontSize: 19, display: 'flex', gap: 8, alignItems: 'center' }}>{i.title} <Sev s={i.sev} /></h2><div className="da-stage mono">{i.id} · {i.asset}</div></div>
        <div className="dq-inc-tools">
          <button className="btn ghost sm" onClick={() => { setMuted((m) => !m); toast(muted ? i.id + ' unmuted' : i.id + ' muted for 24 hours'); }}>{muted ? <BellOff size={13} /> : <Bell size={13} />}{muted ? 'Unmute' : 'Mute'}</button>
          <button className="btn ghost sm" onClick={() => setDebug(true)}><Code2 size={13} />Debug query</button>
          <button className="btn primary sm" onClick={() => onStatus(i.id, 'resolved')}><Check size={13} />Mark resolved</button>
        </div>
      </div>

      {quarantined && <div className="banner"><span><b>Quarantined.</b> This asset is not fit for use — flagged in the Catalogue and blocked from being published as a data product until released.</span></div>}

      <nav className="asset-tabs lin-subtabs" role="tablist">
        {[['overview', 'Overview'], ['root', 'Root cause'], ['past', 'Past incidents']].map(([k, l]) => (
          <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}</button>
        ))}
      </nav>

      {tab === 'overview' && (
        <div className="dq-inc-grid">
          <div className="dq-stack">
            <div className="card pad-lg ml-card">
              <h3 className="sec-h">{i.title} on {i.asset}</h3>
              <p className="ml-note" style={{ marginTop: 0 }}>Measured value over the last 21 runs. Dark points are incidents.</p>
              <MetricChart i={i} />
            </div>
            <div className="card pad-lg ml-card">
              <h3 className="sec-h">Readings</h3>
              <div className="e2e-hop-wrap">
                <table className="tbl dq-mon">
                  <thead><tr><th>Measured</th><th>Expected</th><th>Severity</th><th>Status</th><th>Seen at</th><th>&nbsp;</th></tr></thead>
                  <tbody>
                    {[...Array(i.n)].map((_, k) => (
                      <tr key={k} className="static"><td className="mono">{i.measured}</td><td className="mono">{i.expect}</td><td><Sev s={i.sev} /></td><td><Status s={i.status} /></td><td className="tc-known">{k === 0 ? i.last : i.first}</td><td><button className="btn ghost sm" onClick={() => setDebug(true)}><Code2 size={12} />Debug</button></td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          <aside className="card pad-lg dq-inc-side">
            <div className="prop"><label>Status</label><div className="v"><Status s={i.status} /></div></div>
            <div className="prop"><label>Owner</label><div className="v"><Person n={i.own} /></div></div>
            <div className="prop"><label>Found by</label><div className="v">{i.kind === 'Anomaly' ? 'Anomaly detection' : i.title} <span className={`dq-kd ${i.kind === 'Anomaly' ? 'anom' : ''}`}>{i.kind}</span></div></div>
            <div className="prop"><label>Dimension</label><div className="v"><span className="dq-dim">{DIML[i.dim]}</span></div></div>
            <div className="prop"><label>First seen · last seen</label><div className="v">{i.first} · {i.last}</div></div>
            <div className="prop"><label>Set status</label><div className="v" style={{ gap: 6 }}>{Object.keys(STL).map((s) => <button key={s} className="btn ghost sm" onClick={() => onStatus(i.id, s)}>{STL[s]}</button>)}</div></div>
          </aside>
        </div>
      )}

      {tab === 'root' && (assetInModel
        ? <RootCause assetKey={i.asset} />
        : <div className="card pad-lg ml-card"><p className="ml-empty">Lineage for {i.asset} is not in the catalogue model.</p></div>)}

      {tab === 'past' && (
        <div className="card pad-lg ml-card">
          <h3 className="sec-h">Past incidents on this asset</h3>
          <div className="e2e-hop-wrap">
            <table className="tbl dq-mon">
              <thead><tr><th>Incident</th><th>Status</th><th>First seen</th><th>Time to resolve</th></tr></thead>
              <tbody>
                <tr className="static"><td className="mono">INC-0981</td><td><Status s="resolved" /></td><td className="tc-known">12 Sep</td><td>14.2 h</td></tr>
                <tr className="static"><td className="mono">INC-0902</td><td><Status s="fp" /></td><td className="tc-known">2 Sep</td><td>1.1 h</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {debug && <DebugModal i={i} onClose={() => setDebug(false)} toast={toast} />}
    </div>
  );
}
