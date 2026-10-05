import { useNavigate } from 'react-router-dom';
import { AlertTriangle, ArrowUpRight } from 'lucide-react';
import { BY_KEY } from '../model.js';
import { overallScore, statusOf, dimensions, measurement } from './metrics.js';
import { getSnapshots } from './store.js';

const kindLabel = (a) => (a.kind === 'api' ? 'API' : a.kind[0].toUpperCase() + a.kind.slice(1));
const RING = { Passing: 'var(--royal)', Warning: '#C98A1A', Breaking: '#C0392B' };

function failingChecks(a) {
  if (statusOf(a) === 'Passing') return [];
  const out = [];
  if (!a.owner) out.push({ text: 'No owner assigned', sev: 'High' });
  if (!(a.pk && a.pk.length)) out.push({ text: 'No key candidate detected', sev: 'Medium' });
  if (a.columns.length && dimensions(a).completeness < 80) out.push({ text: 'Columns may contain missing values', sev: 'Medium' });
  if (!a.desc) out.push({ text: 'No description or business context', sev: 'Low' });
  return out;
}

export default function AssetQualityPanel({ assetKey }) {
  const nav = useNavigate();
  const a = BY_KEY[assetKey];
  if (!a) return null;
  const score = overallScore(a);
  const status = statusOf(a);
  const dim = dimensions(a);
  const live = measurement(a) === 'Live';
  const lastSnap = getSnapshots().slice(-1)[0];
  const R = 26, C = 2 * Math.PI * R;

  const checks = failingChecks(a);
  const actions = [];
  if (!a.owner || !a.steward) actions.push({ text: 'Assign an owner and steward', link: 'Stewardship', to: '/app/governance/access/ownership' });
  if (!a.desc) actions.push({ text: 'Add a description', link: 'Overview', to: `/app/catalogue/${a.id}` });
  if (!live) actions.push({ text: 'Profile this asset', link: 'Run profiling', to: `/app/catalogue/${a.id}?quality=profiling` });
  if (!(a.pk && a.pk.length)) actions.push({ text: 'Declare a primary key candidate', link: null, to: null });

  const dims = [
    ['Completeness', dim.completeness],
    ['Key coverage', a.pk && a.pk.length ? 100 : 0],
    ['Documentation', a.desc ? 100 : 0],
  ];

  return (
    <div className="aqp">
      <div className="aqp-id">
        <span className="aqp-platform">{a.source}</span>
        <div className="aqp-name">
          <b>{a.name}</b>
          <small>{a.source} · {kindLabel(a)}</small>
        </div>
      </div>

      <div className="aqp-sec aqp-score">
        <svg width="64" height="64" viewBox="0 0 64 64" className="aqp-ring">
          <circle cx="32" cy="32" r={R} fill="none" stroke="var(--tint)" strokeWidth="6" />
          <circle cx="32" cy="32" r={R} fill="none" stroke={RING[status]} strokeWidth="6" strokeLinecap="round"
            strokeDasharray={C} strokeDashoffset={C * (1 - score / 100)} transform="rotate(-90 32 32)" />
          <text x="32" y="37" textAnchor="middle" fontSize="16" fontWeight="700" fill="var(--navy)">{score}</text>
        </svg>
        <div className="aqp-score-meta">
          <span className={`dq-badge ${status.toLowerCase()}`}>{status}</span>
          <span className="aqp-cols">{a.cols} columns</span>
          <small>{live ? `Live profile${lastSnap ? ` · ${lastSnap.date}` : ''}` : 'Metadata estimate — not yet profiled'}</small>
        </div>
      </div>

      <div className="aqp-sec">
        <h4 className="aqp-h">Quality dimensions</h4>
        {dims.map(([label, v]) => (
          <div key={label} className="aqp-dim">
            <span className="aqp-dim-l">{label}</span>
            <span className="dq-bar-track"><span className="dq-bar-fill" style={{ width: `${v}%` }} /></span>
            <span className="aqp-dim-n">{v}%</span>
          </div>
        ))}
      </div>

      <div className="aqp-sec">
        <h4 className="aqp-h">Failing checks ({checks.length})</h4>
        {checks.length ? checks.map((c) => (
          <div key={c.text} className="aqp-check">
            <AlertTriangle size={14} className="aqp-warn" />
            <span>{c.text}</span>
            <span className={`ml-sev ${c.sev.toLowerCase()}`}>{c.sev}</span>
          </div>
        )) : <p className="ml-detail">No failing checks.</p>}
      </div>

      <div className="aqp-sec">
        <h4 className="aqp-h">Recommended actions</h4>
        {actions.length ? actions.map((ac) => (
          <div key={ac.text} className={`aqp-action ${ac.to ? '' : 'is-note'}`}>
            <span>{ac.text}</span>
            {ac.to && <button className="rel-link" onClick={() => nav(ac.to)}>{ac.link} <ArrowUpRight size={12} /></button>}
          </div>
        )) : <p className="ml-detail">No actions outstanding.</p>}
      </div>
    </div>
  );
}
