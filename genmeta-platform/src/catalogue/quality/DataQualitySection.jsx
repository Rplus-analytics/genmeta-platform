import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Play } from 'lucide-react';
import { ASSETS } from '../model.js';
import AssetFilterBar from '../AssetFilterBar.jsx';
import {
  DIMENSIONS, estateAverages, overallScore, readable, profileMethod, vendorOf,
  evaluateAll, seedRules,
} from './metrics.js';
import { getRules, setRules, getProfiled, setProfiled, addSnapshot, getQuarantine, seedMonitoring } from './store.js';
import { QUARANTINE_SEED, REMEDIATION_SEED, NOTIF_SEED } from './dqData.js';
import Overview from './Overview.jsx';
import Profiling from './Profiling.jsx';
import Rules from './Rules.jsx';
import Monitoring from './Monitoring.jsx';
import Remediation from './Remediation.jsx';
import Scorecards from './Scorecards.jsx';
import NotificationRules from './NotificationRules.jsx';

export const SUBTABS = [
  ['overview', 'Overview'], ['profiling', 'Profiling & dimensions'], ['rules', 'Rules & thresholds'],
  ['monitoring', 'Monitoring & anomalies'], ['remediation', 'Remediation'], ['scorecards', 'Scorecards'],
  ['notifications', 'Notification rules'],
];
const WITH_HEADER = new Set(['profiling', 'rules', 'monitoring', 'remediation', 'scorecards']);
const VALID = new Set(SUBTABS.map((s) => s[0]));
const DIM_LABEL = { completeness: 'Completeness', uniqueness: 'Uniqueness', validity: 'Validity', consistency: 'Consistency', timeliness: 'Timeliness', accuracy: 'Accuracy' };

const nowIso = () => new Date().toISOString();
const estateScore = () => Math.round(ASSETS.reduce((t, a) => t + overallScore(a), 0) / (ASSETS.length || 1));

function Header({ mode, setMode, onRun }) {
  const avg = estateAverages();
  const rules = getRules() || seedRules();
  const alerts = evaluateAll(rules, nowIso(), '—').filter((r) => !r.pass).length;
  const quarantined = getQuarantine().length;
  const warehouse = [...new Set(ASSETS.filter((a) => profileMethod(a) === 'warehouse aggregate query').map(vendorOf))];
  const other = [...new Set(ASSETS.filter((a) => profileMethod(a) !== 'warehouse aggregate query').map(vendorOf))];
  return (
    <div className="card pad-lg dq-header">
      <p className="e2e-synopsis">
        Trust, completeness, key coverage, documentation and sensitivity across the metadata estate.
        Live profiling measures non-null and approximate-distinct counts in {warehouse.join(', ') || 'warehouse sources'}; {other.join(', ') || 'other sources'} are metadata-only.
      </p>
      <div className="dq-modebar">
        <div className="seg2" role="tablist">
          <button role="tab" aria-selected={mode === 'estimates'} className={mode === 'estimates' ? 'on' : ''} onClick={() => setMode('estimates')}>Metadata estimates</button>
          <button role="tab" aria-selected={mode === 'live'} className={mode === 'live' ? 'on' : ''} onClick={() => setMode('live')}>Live profiling</button>
        </div>
        <button className="btn primary sm" onClick={onRun}><Play size={13} />Run profiling</button>
      </div>
      <div className="dq-tiles">
        {DIMENSIONS.map((d) => (
          <div key={d}><b>{avg[d]}%</b><span>{DIM_LABEL[d]}</span><small>estate average</small></div>
        ))}
        <div><b>{alerts}</b><span>Open quality alerts</span><small>{quarantined} quarantined · 0 anomalies</small></div>
      </div>
    </div>
  );
}

export default function DataQualitySection({ a, onOpenAsset }) {
  const [sp, setSp] = useSearchParams();
  const raw = sp.get('quality');
  const sub = VALID.has(raw) ? raw : 'overview';
  const setSub = (v) => setSp((prev) => { const n = new URLSearchParams(prev); n.set('quality', v); return n; }, { replace: true });
  const [mode, setMode] = useState('estimates');
  const [, setVer] = useState(0);
  const [focusInc, setFocusInc] = useState(null);
  const [focusTab, setFocusTab] = useState(null);

  useEffect(() => {
    if (getRules() == null) setRules(seedRules());
    seedMonitoring({ quarantine: QUARANTINE_SEED, remediation: REMEDIATION_SEED, notif: NOTIF_SEED });
  }, []);

  const goMonitoring = (inner) => { setFocusTab(inner || 'incidents'); setSub('monitoring'); };
  const openIncident = (id) => { setFocusInc(id); setSub('monitoring'); };

  const runProfiling = () => {
    const s = getProfiled();
    ASSETS.forEach((x) => { if (readable(x)) s.add(x.key); });
    setProfiled(s);
    addSnapshot({ date: new Date().toISOString().slice(0, 10), score: estateScore() });
    setMode('live');
    setVer((v) => v + 1);
  };

  return (
    <div className="dq-section">
      <AssetFilterBar a={a} query={`quality=${sub}`} />
      {WITH_HEADER.has(sub) && <Header mode={mode} setMode={setMode} onRun={runProfiling} />}
      {sub === 'overview' && <Overview onOpenIncident={openIncident} onGoMonitoring={goMonitoring} />}
      {sub === 'profiling' && <Profiling a={a} mode={mode} />}
      {sub === 'rules' && <Rules a={a} />}
      {sub === 'monitoring' && <Monitoring a={a} focusIncident={focusInc} focusTab={focusTab} onClearFocus={() => { setFocusInc(null); setFocusTab(null); }} />}
      {sub === 'remediation' && <Remediation a={a} />}
      {sub === 'scorecards' && <Scorecards a={a} onOpenAsset={onOpenAsset} />}
      {sub === 'notifications' && <NotificationRules />}
    </div>
  );
}
