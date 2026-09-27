import { useEffect, useMemo, useState } from 'react';
import { Gauge } from 'lucide-react';
import { ASSETS } from '../model.js';
import { overallScore, statusOf, dimensions, measurement, vendorOf } from './metrics.js';
import { getSnapshots } from './store.js';
import CollapsibleSidePanel from './CollapsibleSidePanel.jsx';
import AssetQualityPanel from './AssetQualityPanel.jsx';

const kindLabel = (a) => (a.kind === 'api' ? 'API' : a.kind[0].toUpperCase() + a.kind.slice(1));

export default function Scorecards({ a }) {
  const [selected, setSelected] = useState(a.key);
  const [pulse, setPulse] = useState(0);
  useEffect(() => { setSelected(a.key); setPulse((n) => n + 1); }, [a.key]);
  const pick = (key) => { setSelected(key); setPulse((n) => n + 1); };

  const rows = useMemo(() => [...ASSETS].sort((x, y) => overallScore(x) - overallScore(y)), []);
  const estate = Math.round(ASSETS.reduce((t, x) => t + overallScore(x), 0) / (ASSETS.length || 1));
  const withKey = ASSETS.filter((x) => x.pk && x.pk.length).length;
  const withDesc = ASSETS.filter((x) => x.desc).length;
  const completeness = Math.round(ASSETS.reduce((t, x) => t + dimensions(x).completeness, 0) / (ASSETS.length || 1));
  const sensitiveCols = ASSETS.reduce((t, x) => t + x.columns.filter((c) => c.cls).length, 0);
  const sensitiveAssets = ASSETS.filter((x) => x.columns.some((c) => c.cls)).length;
  const passing = ASSETS.filter((x) => statusOf(x) === 'Passing').length;
  const warnings = ASSETS.filter((x) => statusOf(x) === 'Warning').length;
  const breaking = ASSETS.filter((x) => statusOf(x) === 'Breaking').length;

  const issComplete = ASSETS.filter((x) => dimensions(x).completeness < 80).length;
  const issStructure = ASSETS.filter((x) => !(x.pk && x.pk.length)).length;
  const issDoc = ASSETS.filter((x) => !x.desc).length;
  const issTotal = issComplete + issStructure + issDoc;
  const bars = [['Completeness', issComplete], ['Structure', issStructure], ['Documentation', issDoc]];
  const snaps = getSnapshots();

  return (
    <CollapsibleSidePanel storageKey="quality.assetPanelOpen" title="Asset quality" tooltip="Asset quality"
      icon={Gauge} pulseSignal={pulse} panel={<AssetQualityPanel assetKey={selected} />}>
      <div className="dq-body">
        <div className="dq-scorecards-top">
          <div className="card pad-lg dq-bigtile"><b>{estate}%</b><span>Overall quality score</span><small>Across {ASSETS.length} assets</small></div>
          <div className="card pad-lg dq-submetrics">
            <div><b>{completeness}%</b><span>Completeness</span><small>Non-null / populated fields</small></div>
            <div><b>{Math.round(100 * withKey / ASSETS.length)}%</b><span>Key coverage</span><small>Assets with a key candidate</small></div>
            <div><b>{Math.round(100 * withDesc / ASSETS.length)}%</b><span>Documentation</span><small>Descriptions & context</small></div>
            <div><b>{sensitiveCols}</b><span>Sensitive coverage</span><small>{sensitiveCols} columns across {sensitiveAssets} assets</small></div>
          </div>
        </div>

        <div className="card pad-lg ml-card">
          <div className="dq-statuscounts">
            <div><b>{passing}</b><span>Passing · {Math.round(100 * passing / ASSETS.length)}% of assets</span></div>
            <div><b>{warnings}</b><span>Warnings</span></div>
            <div><b>{breaking}</b><span>Breaking</span></div>
            <div><b>{ASSETS.length}</b><span>Assets assessed · {sensitiveAssets} with sensitive data</span></div>
          </div>
        </div>

        <div className="dq-two">
          <div className="card pad-lg ml-card">
            <h3 className="sec-h">Quality trend</h3>
            {snaps.length > 1 ? (
              <svg className="dq-spark" viewBox="0 0 300 80" preserveAspectRatio="none">
                <polyline fill="none" stroke="var(--royal)" strokeWidth="2"
                  points={snaps.map((s, i) => `${(i / (snaps.length - 1)) * 300},${80 - (s.score / 100) * 76}`).join(' ')} />
              </svg>
            ) : (
              <p className="ml-empty">One snapshot recorded so far. The trend line builds up as you run profiling on more days — every report is stored as a real, dated data point (no synthetic history).</p>
            )}
          </div>
          <div className="card pad-lg ml-card">
            <h3 className="sec-h">Issue distribution by type</h3>
            <p className="ml-note">{issTotal} issues across the estate</p>
            <div className="dq-bars">
              {bars.map(([label, n]) => (
                <div key={label} className="dq-bar-row">
                  <span className="dq-bar-l">{label}</span>
                  <span className="dq-bar-track"><span className="dq-bar-fill" style={{ width: `${issTotal ? Math.round(100 * n / issTotal) : 0}%` }} /></span>
                  <span className="dq-bar-n">{n} · {issTotal ? Math.round(100 * n / issTotal) : 0}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="card pad-lg ml-card">
          <h3 className="sec-h">Quality scorecards ({ASSETS.length}) — Click a row to inspect or expand its columns.</h3>
          <div className="e2e-hop-wrap">
            <table className="tbl dq-cards">
              <thead><tr><th>Asset</th><th>Type</th><th>Status</th><th className="num">Score</th><th className="num">Cols</th><th>Measurement</th></tr></thead>
              <tbody>
                {rows.map((x) => (
                  <tr key={x.key} className={`static dq-row ${x.key === selected ? 'is-current' : ''}`} onClick={() => pick(x.key)}>
                    <td><div className="da-stage">{vendorOf(x)}</div><code className="mono">{x.key}</code></td>
                    <td>{kindLabel(x)}</td>
                    <td><span className={`dq-badge ${statusOf(x).toLowerCase()}`}>{statusOf(x)}</span></td>
                    <td className="num"><div className="dq-scorebar"><span style={{ width: `${overallScore(x)}%` }} /></div>{overallScore(x)}</td>
                    <td className="num">{x.cols}</td>
                    <td>{measurement(x)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </CollapsibleSidePanel>
  );
}
