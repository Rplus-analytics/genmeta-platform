import { AlertTriangle, CheckCircle2, FileText } from 'lucide-react';
import { tokenizeLine, normalizeLines } from './codeHighlight.js';

/* Line-numbered, lightly highlighted code viewer. `lines` may be a string,
   string[] or { t, risk }[] (risk lines are highlighted). */
export function CodeBlock({ lines, file, maxHeight }) {
  const rows = normalizeLines(lines);
  return (
    <div className="ca-code">
      {file && <div className="ca-code-head"><FileText size={13} strokeWidth={1.75} /><span>{file}</span></div>}
      <div className="ca-code-body" style={maxHeight ? { maxHeight } : undefined}>
        {rows.map((l, i) => (
          <div key={i} className={`ca-code-line${l.risk ? ' risk' : ''}`}>
            <span className="ca-ln">{i + 1}</span>
            <span className="ca-txt">
              {l.t ? tokenizeLine(l.t).map((s, j) => (s.cls ? <span key={j} className={`ca-tok-${s.cls}`}>{s.text}</span> : s.text)) : ' '}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* Numbered plain-English breakdown. */
export function Steps({ steps, compact }) {
  return (
    <ol className={`ca-steps${compact ? ' compact' : ''}`}>
      {steps.map((s, i) => (
        <li key={i}>
          <span className="ca-snum">{i + 1}</span>
          <div>
            <h4>{s.title}</h4>
            <p>{s.text}</p>
            {s.tag && <span className="ca-tag">{s.tag}</span>}
          </div>
        </li>
      ))}
    </ol>
  );
}

/* Metric tile; level is 'good' | 'warn' | 'crit' (drives the marker). */
export function Metric({ label, value, sub, level }) {
  return (
    <div className="ca-metric">
      <span className="ca-m-label">{label}</span>
      <span className={`ca-m-num${level ? ` ${level}` : ''}`}>{value}</span>
      <span className="ca-m-sub">{level && <i className={`ca-lvl ${level}`} aria-hidden="true" />}{sub}</span>
    </div>
  );
}

const NOTE_ICONS = { warn: AlertTriangle, ok: CheckCircle2, note: FileText };

export function ReviewNotes({ notes }) {
  return (
    <ul className="ca-notes">
      {notes.map((n, i) => {
        const I = NOTE_ICONS[n.icon] || FileText;
        return <li key={i} className={n.icon}><I size={15} strokeWidth={1.75} /><span>{n.text}</span></li>;
      })}
    </ul>
  );
}

/* Segmented control reusing the platform's .toggle styling. */
export function Toggle({ options, value, onChange, label }) {
  return (
    <div className="toggle" role="group" aria-label={label}>
      {options.map(([k, t]) => (
        <button key={k} type="button" className={value === k ? 'on' : ''} aria-pressed={value === k} onClick={() => onChange(k)}>{t}</button>
      ))}
    </div>
  );
}
