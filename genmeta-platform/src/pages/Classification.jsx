import { PageHead } from '../components/ui.jsx';
import { SOURCES, fmt } from '../data.js';

const LEVELS = [
  { k: 'Public', v: 212, c: '#A9D8FF' },
  { k: 'Internal', v: 486, c: '#5AAEF7' },
  { k: 'Personal', v: 241, c: '#2F7BE8' },
  { k: 'Financial', v: 263, c: '#1B4FC0' },
  { k: 'Sensitive', v: 82, c: '#0B1F5C' },
];
const total = LEVELS.reduce((t, l) => t + l.v, 0);

export default function Classification() {
  return (
    <div className="page fade-in">
      <PageHead title="Classification" sub="Sensitivity labels applied by the classification agent and confirmed by stewards." />
      <article className="card pad">
        <div className="stack-bar">{LEVELS.map((l) => <i key={l.k} style={{ width: `${(l.v / total) * 100}%`, background: l.c }} title={l.k} />)}</div>
        <div className="stack-legend">
          {LEVELS.map((l) => (
            <div key={l.k}><i style={{ background: l.c }} /><span>{l.k}</span><b>{fmt(l.v)}</b><small>{Math.round((l.v / total) * 100)}%</small></div>
          ))}
        </div>
      </article>
      <article className="card">
        <header className="card-head"><div><h2>By source system</h2><p>Tables per sensitivity level.</p></div></header>
        <div className="table-wrap">
          <table className="tbl">
            <thead><tr><th>System</th>{LEVELS.map((l) => <th key={l.k} className="num">{l.k}</th>)}<th className="num">Auto-classified</th></tr></thead>
            <tbody>
              {SOURCES.map((s, i) => {
                const split = [0.16, 0.38, 0.19, 0.2, 0.07].map((p, j) => Math.round(s.tables * (p + ((i + j) % 3 - 1) * 0.02)));
                return (
                  <tr key={s.id}><td><b>{s.vendor}</b></td>{split.map((v, j) => <td key={j} className="num">{v}</td>)}<td className="num">{Math.round(88 + (i * 7) % 11)}%</td></tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </article>
    </div>
  );
}
