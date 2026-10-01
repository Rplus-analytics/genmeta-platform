import { useMemo, useState } from 'react';
import { ASSETS, BY_KEY } from '../model.js';
import { DIMENSIONS, dimensions, overallScore, statusOf, profileMethod, readable, vendorOf, dimensionReason } from './metrics.js';

const DIM_KEYS = DIMENSIONS;
const DIM_LABEL = { completeness: 'Completeness', uniqueness: 'Uniqueness', validity: 'Validity', consistency: 'Consistency', timeliness: 'Timeliness', accuracy: 'Accuracy' };

export default function Profiling({ a }) {
  const [profileKey, setProfileKey] = useState(a.key);
  const rows = useMemo(() => [...ASSETS].sort((x, y) => overallScore(x) - overallScore(y)), []);
  const pa = BY_KEY[profileKey];

  return (
    <div className="dq-body">
      <div className="card pad-lg ml-card">
        <p className="ml-note">Warehouse tables and views are profiled with one aggregate query each; files in object storage are read and aggregated; APIs and streaming topics have no readable values here, so their structure is profiled and labelled as such. No row values are stored or shown.</p>
        <div className="e2e-hop-wrap">
          <table className="tbl dq-prof">
            <thead>
              <tr><th>Asset</th><th className="num">Rows</th><th className="num">Compl.</th><th className="num">Uniq.</th><th className="num">Valid.</th><th className="num">Consist.</th><th className="num">Timel.</th><th className="num">Accur.</th><th className="num">Score</th></tr>
            </thead>
            <tbody>
              {rows.map((x) => {
                const dm = dimensions(x);
                const ok = readable(x);
                return (
                  <tr key={x.key} className={`static dq-row ${x.key === profileKey ? 'sel' : ''} ${x.key === a.key ? 'is-current' : ''}`} onClick={() => setProfileKey(x.key)}>
                    <td><code className="mono">{x.key}</code><div className="da-stage">{vendorOf(x)} · {profileMethod(x)}</div></td>
                    <td className="num">{x.rows != null ? x.rows.toLocaleString('en-GB') : '—'}</td>
                    {DIM_KEYS.map((d) => <td key={d} className={`num ${ok ? '' : 'dq-na'}`}>{ok ? dm[d] : 'not measured'}</td>)}
                    <td className="num"><b>{overallScore(x)}</b></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {pa && (
        <div className="card pad-lg ml-card">
          <h3 className="sec-h">Dimension detail — {pa.key}</h3>
          <p className="ml-note">Why each dimension scored what it did. Dimensions with no readable signal show as not measured.</p>
          {(() => { const dm = dimensions(pa); const why = dimensionReason(pa); const ok = readable(pa); return (
            <div className="dq-dimrows">
              {DIM_KEYS.map((d) => {
                const v = ok ? dm[d] : null;
                return (
                  <div key={d} className="dq-dimrow">
                    <span className="dq-dimrow-l">{DIM_LABEL[d]}</span>
                    <span className="dq-bar-track"><span className="dq-bar-fill" style={{ width: `${v ?? 0}%`, ...(v != null && v < 60 ? { background: 'var(--navy)' } : {}) }} /></span>
                    <span className="dq-dimrow-n">{v != null ? v : <span className="dq-na">not measured</span>}</span>
                    <span className="dq-dimrow-why">{why[d]}</span>
                  </div>
                );
              })}
            </div>
          ); })()}
        </div>
      )}

      <div className="card pad-lg ml-card">
        <h3 className="sec-h">Column profile — {pa ? pa.key : ''}</h3>
        {pa && pa.columns.length ? (
          readable(pa) ? (
            <div className="e2e-hop-wrap">
              <table className="tbl dq-cols">
                <thead><tr><th>Column</th><th>Type</th><th className="num">Non-null</th><th className="num">Approx distinct</th><th>Min / max</th><th>Classification</th><th>Dimension detail</th></tr></thead>
                <tbody>
                  {pa.columns.map((c) => (
                    <tr key={c.name} className="static">
                      <td><code className="mono">{c.name}</code></td>
                      <td className="attr-type">{c.type}</td>
                      <td className="num">{c.nullable ? '~' : '100'}%</td>
                      <td className="num">{pa.rows != null ? '—' : 'not readable'}</td>
                      <td className="ml-detail">{c.type === 'number' ? (pa.rows != null ? '—' : 'not readable') : '—'}</td>
                      <td>{c.cls ? <span className="attr-cls">{c.cls}</span> : <span className="attr-dash">—</span>}</td>
                      <td className="ml-detail">{c.nullable ? 'nullable — may hold missing values' : 'declared not-null — complete'}{(pa.pk || []).includes(c.name) ? ' · key column' : ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <p className="ml-empty">{pa.key} is structure-only — values are not readable from this source, so only its columns and types are profiled.</p>
        ) : (
          <p className="ml-empty">Select an asset for its column profile and dimension detail.</p>
        )}
      </div>
    </div>
  );
}
