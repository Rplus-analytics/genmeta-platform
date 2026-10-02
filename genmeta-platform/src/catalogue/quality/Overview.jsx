import { ASSETS } from '../model.js';
import { Button } from '../../components/ui.jsx';
import { overallScore } from './metrics.js';
import { getRules, getQuarantine } from './store.js';
import { seedRules } from './metrics.js';
import { INCIDENTS, ACTIVITY, TREND, DAYS, DIML, PEOPLE } from './dqData.js';

const estateScore = () => Math.round(ASSETS.reduce((t, a) => t + overallScore(a), 0) / (ASSETS.length || 1));
const Person = ({ n }) => <span className="dq-person"><i>{PEOPLE[n] || n[0]}</i>{n}</span>;
const Sev = ({ s }) => <span className={`dq-sev s-${s}`}><i />{s[0].toUpperCase() + s.slice(1)}</span>;
const Status = ({ s }) => <span className={`dq-badge2 st-${s}`}><i />{{ triage: 'Triage', investigating: 'Investigating', resolved: 'Resolved', fp: 'False positive' }[s]}</span>;

/* stacked bars (incident counts) + quality score line */
function QualityChart() {
  const W = 760, H = 170, pl = 34, pr = 8, pt = 10, pb = 22, n = TREND.length, bw = (W - pl - pr) / n;
  const mx = Math.max(...TREND.map((d) => d.h + d.m + d.l)) || 1, barH = (H - pt - pb) * 0.42;
  const bars = [];
  TREND.forEach((d, i) => {
    const x = pl + i * bw + bw * 0.2, w = bw * 0.6; let y = H - pb;
    [['h', '#0E2A57'], ['m', '#4D8CFF'], ['l', '#A9D3FF']].forEach(([k, c]) => { const hh = d[k] / mx * barH; if (hh) { y -= hh; bars.push(<rect key={k + i} x={x} y={y} width={w} height={hh} fill={c} rx="1"><title>{`${DAYS[i]}: ${d.h} high, ${d.m} medium, ${d.l} low · score ${d.sc}%`}</title></rect>); } });
  });
  const pts = TREND.map((d, i) => [pl + i * bw + bw / 2, pt + (H - pt - pb) * (1 - d.sc / 100)]);
  return (
    <svg className="dq-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Data quality over time">
      {[0, 50, 100].map((v) => { const y = pt + (H - pt - pb) * (1 - v / 100); return <g key={v}><line x1={pl} x2={W - pr} y1={y} y2={y} stroke="#E3EAF3" /><text x={pl - 6} y={y + 4} textAnchor="end" fontSize="10" fill="#8694AB">{v}%</text></g>; })}
      {bars}
      <path d={`M${pts.map((p) => p.join(',')).join('L')}`} fill="none" stroke="#4D8CFF" strokeWidth="2" />
      {[0, 7, 14, 21, 29].map((i) => <text key={i} x={pl + i * bw + bw / 2} y={H - 6} textAnchor="middle" fontSize="10" fill="#8694AB">{DAYS[i]}</text>)}
    </svg>
  );
}
function TtrChart() {
  const W = 760, H = 170, pl = 34, pr = 8, pt = 10, pb = 22, n = TREND.length, bw = (W - pl - pr) / n;
  const mx = Math.max(...TREND.map((d) => d.res + d.fp + d.inv + d.tri)) || 1, barH = (H - pt - pb) * 0.5, mt = 40;
  const bars = [];
  TREND.forEach((d, i) => {
    const x = pl + i * bw + bw * 0.2, w = bw * 0.6; let y = H - pb;
    [['res', '#0E2A57'], ['fp', '#C9D6E6'], ['inv', '#4D8CFF'], ['tri', '#A9D3FF']].forEach(([k, c]) => { const hh = d[k] / mx * barH; if (hh) { y -= hh; bars.push(<rect key={k + i} x={x} y={y} width={w} height={hh} fill={c} rx="1" />); } });
  });
  const pts = TREND.map((d, i) => [pl + i * bw + bw / 2, pt + (H - pt - pb) * (1 - d.ttr / mt)]);
  return (
    <svg className="dq-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Time to resolution">
      {[0, 20, 40].map((v) => { const y = pt + (H - pt - pb) * (1 - v / mt); return <g key={v}><line x1={pl} x2={W - pr} y1={y} y2={y} stroke="#E3EAF3" /><text x={pl - 6} y={y + 4} textAnchor="end" fontSize="10" fill="#8694AB">{v}h</text></g>; })}
      {bars}
      <path d={`M${pts.map((p) => p.join(',')).join('L')}`} fill="none" stroke="#0E2A57" strokeWidth="1.8" />
      {[0, 7, 14, 21, 29].map((i) => <text key={i} x={pl + i * bw + bw / 2} y={H - 6} textAnchor="middle" fontSize="10" fill="#8694AB">{DAYS[i]}</text>)}
    </svg>
  );
}
const Legend = ({ items }) => <div className="dq-legend">{items.map(([c, l, v]) => <span key={l}><i style={c === 'line' ? { background: 'none', borderTop: '2px solid #4D8CFF', height: 0, width: 14, borderRadius: 0 } : { background: c, ...(c === '#fff' ? { border: '1px solid var(--line2)' } : {}) }} />{l} {v != null && <b>{v}</b>}</span>)}</div>;

export default function Overview({ onOpenIncident, onGoMonitoring }) {
  const rules = getRules() || seedRules();
  const open = INCIDENTS.filter((i) => i.status === 'triage' || i.status === 'investigating');
  const quar = getQuarantine();
  const t = TREND.reduce((a, d) => ({ h: a.h + d.h, m: a.m + d.m, l: a.l + d.l, n: a.n + d.non }), { h: 0, m: 0, l: 0, n: 0 });

  return (
    <div className="dq-body">
      <div className="card pad-lg dq-tiles5">
        <div><span>Overall quality</span><b>{estateScore()}%</b><small>across {ASSETS.length} assets</small></div>
        <div><span>Open incidents</span><b>{open.length}</b><small>{open.filter((i) => i.sev === 'high').length} high · {INCIDENTS.filter((i) => i.kind === 'Anomaly' && i.status !== 'resolved').length} anomalies</small></div>
        <div><span>Mean time to resolve</span><b>18.4 h</b><small className="dq-delta">↓ 4.1 h vs last period</small></div>
        <div><span>Rules running</span><b>{rules.length}</b><small>every harvest · 15 min</small></div>
        <div><span>Quarantined</span><b>{quar.length}</b><small>cannot be published</small></div>
      </div>

      <div className="dq-two">
        <div className="card pad-lg ml-card">
          <h3 className="sec-h">Data quality over time</h3>
          <p className="ml-note" style={{ marginTop: 0 }}>Score leaves out resolved and false-positive incidents, so it shows live problems only.</p>
          <Legend items={[['#0E2A57', 'High', t.h], ['#4D8CFF', 'Medium', t.m], ['#A9D3FF', 'Low', t.l], ['#fff', 'Passed checks', t.n], ['line', 'Quality score']]} />
          <QualityChart />
        </div>
        <div className="card pad-lg ml-card">
          <h3 className="sec-h">Time to resolution</h3>
          <p className="ml-note" style={{ marginTop: 0 }}>Average hours from first seen to Resolved or False positive.</p>
          <Legend items={[['#0E2A57', 'Resolved', TREND.reduce((a, d) => a + d.res, 0)], ['#C9D6E6', 'False positive', TREND.reduce((a, d) => a + d.fp, 0)], ['#4D8CFF', 'Investigating', INCIDENTS.filter((i) => i.status === 'investigating').length], ['#A9D3FF', 'Triage', INCIDENTS.filter((i) => i.status === 'triage').length]]} />
          <TtrChart />
        </div>
      </div>

      <div className="dq-two" style={{ marginTop: 16 }}>
        <div className="dash-card dq-attn">
          <div className="block-head"><h2>Needs attention</h2><Button variant="link" onClick={() => onGoMonitoring('incidents')}>All incidents</Button></div>
          <div className="table-wrap">
            <table className="tbl">
              <thead><tr><th>Incident</th><th>Asset</th><th>Severity</th><th>Status</th><th>Owner</th></tr></thead>
              <tbody>
                {[...open].sort((a, b) => (a.sev === 'high' ? 0 : 1) - (b.sev === 'high' ? 0 : 1)).map((i) => (
                  <tr key={i.id} className="dq-row" onClick={() => onOpenIncident(i.id)}>
                    <td><b>{i.title}</b><div className="da-stage mono">{i.id}</div></td>
                    <td><code className="mono">{i.asset}</code></td>
                    <td><Sev s={i.sev} /></td><td><Status s={i.status} /></td><td><Person n={i.own} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="card pad-lg ml-card">
          <h3 className="sec-h">Activity</h3>
          <p className="ml-note" style={{ marginTop: 0 }}>Who changed what.</p>
          <div className="dq-feed">
            {ACTIVITY.map(([day, rows]) => (
              <div key={day}>
                <div className="dq-daylbl">{day}</div>
                {rows.map((r, k) => <div key={k} className="dq-feedrow"><span className="dq-who">{r[0]}</span><div><b>{r[1]}</b> {r[2]}<small>{r[3]}</small></div></div>)}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
