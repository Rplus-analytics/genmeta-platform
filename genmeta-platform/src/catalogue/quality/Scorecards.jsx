import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, ArrowUpRight } from 'lucide-react';
import { ASSETS, BY_KEY } from '../model.js';
import { overallScore, statusOf, dimensions, measurement, vendorOf, evaluateAll, seedRules } from './metrics.js';
import { getRules, getSnapshots } from './store.js';

const kindLabel = (a) => (a.kind === 'api' ? 'API' : a.kind[0].toUpperCase() + a.kind.slice(1));

export default function Scorecards({ a, onOpenAsset }) {
  const nav = useNavigate();
  const [openKey, setOpenKey] = useState(null);

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

  // issue distribution
  const issComplete = ASSETS.filter((x) => dimensions(x).completeness < 80).length;
  const issStructure = ASSETS.filter((x) => !(x.pk && x.pk.length)).length;
  const issDoc = ASSETS.filter((x) => !x.desc).length;
  const issTotal = issComplete + issStructure + issDoc;
  const bars = [['Completeness', issComplete], ['Structure', issStructure], ['Documentation', issDoc]];

  const snaps = getSnapshots();

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') setOpenKey(null); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const drawer = openKey ? BY_KEY[openKey] : null;
  const drawerFails = drawer ? evaluateAll(getRules() || seedRules(), new Date().toISOString(), '—').filter((r) => r.asset === drawer.key && !r.pass) : [];
  const recs = [];
  if (drawer) {
    if (!drawer.owner || !drawer.steward) recs.push({ text: 'Assign an owner and steward', to: '/app/stewardship' });
    if (dimensions(drawer).completeness < 80) recs.push({ text: 'Improve completeness — several columns are nullable', to: null });
    if (!drawer.desc) recs.push({ text: 'Add a description and business context', to: null });
    if (!(drawer.pk && drawer.pk.length)) recs.push({ text: 'Declare a primary key candidate', to: null });
  }

  return (
    <div className="dq-body">
      <div className="dq-scorecards-top">
        <div className="card pad-lg dq-bigtile">
          <b>{estate}%</b><span>Overall quality score</span><small>Across {ASSETS.length} assets</small>
        </div>
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
                <tr key={x.key} className={`static dq-row ${x.key === a.key ? 'is-current' : ''} ${x.key === openKey ? 'sel' : ''}`} onClick={() => setOpenKey(x.key)}>
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

      {drawer && (
        <div className="dq-drawer-scrim" onClick={() => setOpenKey(null)}>
          <aside className="dq-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="ls-top">
              <h3>Asset quality</h3>
              <button className="ls-close" aria-label="Close" onClick={() => setOpenKey(null)}><X size={16} /></button>
            </div>
            <b className="cm-name">{drawer.key}</b>
            <p className="cm-meta">{vendorOf(drawer)} · {kindLabel(drawer)}</p>
            <p className="dq-drawer-score"><span className={`dq-badge ${statusOf(drawer).toLowerCase()}`}>{statusOf(drawer)}</span> <b>{overallScore(drawer)}%</b> · {drawer.cols} columns</p>
            <p className="ml-note">{measurement(drawer) === 'Live' ? 'Live profile' : 'Metadata estimate — not yet profiled'}</p>
            <h4 className="e2e-hops-h">Quality dimensions</h4>
            <dl className="ls-dl">
              <div><dt>Completeness</dt><dd>{dimensions(drawer).completeness}%</dd></div>
              <div><dt>Key coverage</dt><dd>{drawer.pk && drawer.pk.length ? '100%' : '0%'}</dd></div>
              <div><dt>Documentation</dt><dd>{drawer.desc ? '100%' : '0%'}</dd></div>
            </dl>
            <h4 className="e2e-hops-h">Failing checks ({drawerFails.length})</h4>
            {drawerFails.length ? drawerFails.map((r, i) => (
              <p key={i} className="dq-drawer-fail"><span className={`ml-sev ${r.severity}`}>{r.severity}</span> {r.rule} — {r.finding}</p>
            )) : <p className="ml-detail">None on the last evaluation.</p>}
            <h4 className="e2e-hops-h">Recommended actions</h4>
            {recs.length ? recs.map((r, i) => (
              <p key={i} className="dq-rec">{r.to ? <button className="rel-link" onClick={() => nav(r.to)}>{r.text} <ArrowUpRight size={12} /></button> : r.text}</p>
            )) : <p className="ml-detail">No actions outstanding.</p>}
          </aside>
        </div>
      )}
    </div>
  );
}
