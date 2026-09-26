import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowUp, ShieldCheck, GitBranch, History, Gauge, Check, Copy, Layers, Network, Plus, CornerDownLeft,
} from 'lucide-react';
import { SOURCES, CATALOGUE, CHANGES, fmt } from '../data.js';
import { Burst } from '../components/Loader.jsx';
import { PageHead } from '../components/ui.jsx';

/* Starting points, grouped by the job someone is doing */
const GROUPS = [
  { icon: ShieldCheck, title: 'Sensitive data', qs: ['Which tables hold personal data?', 'Where is financial data stored?'] },
  { icon: GitBranch, title: 'Lineage', qs: ['Show lineage for customer_dim', 'What feeds the finance reports?'] },
  { icon: History, title: 'Changes', qs: ['What changed in Snowflake today?', 'Were there any breaking schema changes?'] },
  { icon: Gauge, title: 'Coverage and ownership', qs: ['Which sources have the lowest description coverage?', 'Which tables still need a description?'] },
];

const STEPS = ['Searching the catalogue', 'Tracing lineage', 'Checking policies', 'Writing the answer'];
const byVendor = (ids) => SOURCES.filter((s) => ids.includes(s.id));

/* Canned answers for this UI build: each returns text plus the evidence behind it */
function answer(q, scope) {
  const t = q.toLowerCase();
  const inScope = (r) => scope.includes(r.sourceId);
  if (t.includes('personal')) {
    const rows = CATALOGUE.filter((r) => inScope(r) && r.classification === 'Personal');
    return {
      text: `${rows.length} catalogued tables are classified Personal. The largest group is in the SQL Server casework database. Every one of them is covered by policy GOV-07 (role-based access) and masked for non-steward roles.`,
      rows, cols: ['table', 'source', 'classification', 'owner'], sources: [...new Set(rows.map((r) => r.sourceId))],
      actions: ['catalogue'],
    };
  }
  if (t.includes('financial')) {
    const rows = CATALOGUE.filter((r) => inScope(r) && r.classification === 'Financial');
    return {
      text: `Financial data sits in ${rows.length} tables across ${new Set(rows.map((r) => r.source)).size} sources. Oracle's legacy ledger and the Snowflake finance schema hold most of it; all are encrypted at rest (SEC-02).`,
      rows, cols: ['table', 'source', 'classification', 'owner'], sources: [...new Set(rows.map((r) => r.sourceId))],
      actions: ['catalogue'],
    };
  }
  if (t.includes('lineage') || t.includes('feeds')) {
    return {
      text: 'customer_dim in Snowflake is fed by the Confluent topic customer.updated.v3, merged by the Databricks job cust_merge_daily. Downstream it feeds 6 Power BI reports and 2 API endpoints.',
      path: [['Confluent', 'customer.updated.v3'], ['Databricks', 'cust_merge_daily'], ['Snowflake', 'finance.customer_dim'], ['Power BI', '6 reports · 2 APIs']],
      sources: ['confluent', 'databricks', 'snowflake'], actions: ['graph'],
    };
  }
  if (t.includes('changed') || t.includes('breaking')) {
    const rows = CHANGES.slice(0, 4);
    return {
      text: t.includes('breaking')
        ? 'No breaking schema changes were detected in the last 7 days. One drift warning is open on the Amazon S3 raw orders path and is waiting for a steward.'
        : 'Snowflake had 14 metadata changes since the last pull: 3 new fields on finance.gl_journal_lines, 2 renamed columns in orders_fact and 9 refreshed descriptions. Nothing breaking.',
      changes: rows, sources: ['snowflake', 's3'], actions: ['catalogue'],
    };
  }
  if (t.includes('coverage') || t.includes('lowest')) {
    const s = [...byVendor(scope)].sort((a, b) => a.cov - b.cov).slice(0, 3);
    return {
      text: `Lowest description coverage is in ${s.map((x) => x.vendor).join(', ')}. GenMeta can draft descriptions for the undocumented tables and send them to the owners for approval.`,
      bars: s, sources: s.map((x) => x.id), actions: ['catalogue'],
    };
  }
  if (t.includes('description') || t.includes('owner')) {
    const rows = CATALOGUE.filter((r) => inScope(r) && !r.described);
    return {
      text: `${rows.length} tables have no approved description yet. Most are in Amazon S3 and Oracle.`,
      rows, cols: ['table', 'source', 'owner', 'updated'], sources: [...new Set(rows.map((r) => r.sourceId))],
      actions: ['catalogue'],
    };
  }
  const src = byVendor(scope);
  return {
    text: `Across ${src.length} sources GenMeta has catalogued ${fmt(src.reduce((a, s) => a + s.tables, 0))} tables and ${fmt(src.reduce((a, s) => a + s.fields, 0))} fields. Try asking about a table, an owner, lineage, a classification or recent changes.`,
    sources: scope,
  };
}

function Evidence({ a }) {
  const nav = useNavigate();
  const [copied, setCopied] = useState(false);
  const copy = () => { navigator.clipboard?.writeText(a.text).catch(() => {}); setCopied(true); setTimeout(() => setCopied(false), 1400); };
  return (
    <>
      {a.rows && a.rows.length > 0 && (
        <div className="ev-table">
          <table className="tbl">
            <thead><tr>{a.cols.map((c) => <th key={c}>{c[0].toUpperCase() + c.slice(1)}</th>)}</tr></thead>
            <tbody>
              {a.rows.slice(0, 6).map((r) => (
                <tr key={r.id} onClick={() => nav('/app/catalogue')}>
                  {a.cols.map((c) => (
                    <td key={c}>
                      {c === 'table' ? <code>{r.schema}.{r.name}</code>
                        : c === 'classification' ? <span className={`tag cls-${r.classification.toLowerCase()}`}>{r.classification}</span>
                          : r[c]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {a.rows.length > 6 && <p className="ev-more">Showing 6 of {a.rows.length} tables</p>}
        </div>
      )}
      {a.path && (
        <ol className="ev-path">
          {a.path.map(([sys, obj]) => <li key={obj}><span>{sys}</span><code>{obj}</code></li>)}
        </ol>
      )}
      {a.changes && (
        <ul className="ev-changes">
          {a.changes.map((c) => <li key={c.target}><time>{c.t}</time><span>{c.who} {c.what} <code>{c.target}</code></span></li>)}
        </ul>
      )}
      {a.bars && (
        <div className="ev-bars">
          {a.bars.map((s) => (
            <div key={s.id}><span>{s.vendor}</span><div className="cov-bar"><i style={{ width: `${s.cov * 100}%` }} /></div><b>{Math.round(s.cov * 100)}%</b></div>
          ))}
        </div>
      )}
      <footer className="ans-foot">
        <div className="ans-src">
          <span>Sources</span>
          {byVendor(a.sources || []).map((s) => <span key={s.id} className="src-chip"><i className="ini">{s.ini}</i>{s.vendor}</span>)}
        </div>
        <div className="ans-act">
          {a.actions?.includes('catalogue') && <button className="btn ghost sm" onClick={() => nav('/app/catalogue')}><Layers size={14} />Open in catalogue</button>}
          {a.actions?.includes('graph') && <button className="btn ghost sm" onClick={() => nav('/app/graph')}><Network size={14} />View lineage</button>}
          <button className="btn ghost sm" onClick={copy} aria-label="Copy answer">{copied ? <Check size={14} /> : <Copy size={14} />}{copied ? 'Copied' : 'Copy'}</button>
        </div>
      </footer>
    </>
  );
}

function Typed({ text, onDone }) {
  const words = text.split(' ');
  const [n, setN] = useState(0);
  useEffect(() => {
    if (n >= words.length) { onDone?.(); return undefined; }
    const t = setTimeout(() => setN(n + 1), 22);
    return () => clearTimeout(t);
  }, [n, words.length, onDone]);
  return <>{words.slice(0, n).join(' ')}{n < words.length && <i className="caret" />}</>;
}

function Working() {
  const [i, setI] = useState(0);
  useEffect(() => { const t = setInterval(() => setI((v) => Math.min(v + 1, STEPS.length - 1)), 480); return () => clearInterval(t); }, []);
  return (
    <article className="answer working" aria-live="polite">
      <header className="ans-head"><Burst size={20} /><b>GenMeta</b><span>Working</span></header>
      <ul className="steps">
        {STEPS.map((s, k) => <li key={s} className={k < i ? 'done' : k === i ? 'now' : ''}>{k < i ? <Check size={13} /> : <i />}{s}</li>)}
      </ul>
    </article>
  );
}

export default function AskGenMeta() {
  const [msgs, setMsgs] = useState([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [scope, setScope] = useState(SOURCES.map((s) => s.id));
  const end = useRef(null);
  const input = useRef(null);
  useEffect(() => end.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }), [msgs, busy]);

  const send = (q) => {
    if (!q.trim() || busy || !scope.length) return;
    setMsgs((m) => [...m, { me: true, t: q }]);
    setText('');
    setBusy(true);
    setTimeout(() => { setBusy(false); setMsgs((m) => [...m, { me: false, a: answer(q, scope), typing: true, ms: 1900 }]); }, 1900);
  };
  const typed = (k) => setMsgs((m) => m.map((x, j) => (j === k ? { ...x, typing: false } : x)));
  const toggle = (id) => setScope((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const recent = useMemo(() => msgs.filter((m) => m.me).map((m) => m.t).reverse().slice(0, 5), [msgs]);
  const scopeLabel = scope.length === SOURCES.length ? `All ${SOURCES.length} sources` : `${scope.length} of ${SOURCES.length} sources`;

  return (
    <div className="page ask-page fade-in">
      <PageHead title="Ask GenMeta" sub="Ask about any table, field, owner, lineage or policy. Answers come from catalogued metadata, never from the data itself.">
        {msgs.length > 0 && <button className="btn ghost" onClick={() => { setMsgs([]); input.current?.focus(); }}><Plus size={14} />New conversation</button>}
      </PageHead>

      <div className="ask-grid">
        <section className="ask-main">
          {msgs.length === 0 ? (
            <div className="starters">
              {GROUPS.map(({ icon: I, title, qs }) => (
                <div key={title} className="starter card">
                  <h3><I size={16} strokeWidth={1.75} />{title}</h3>
                  {qs.map((q) => <button key={q} onClick={() => send(q)}>{q}<CornerDownLeft size={14} /></button>)}
                </div>
              ))}
            </div>
          ) : (
            <div className="thread">
              {msgs.map((m, i) => (m.me ? (
                <div key={i} className="q"><p>{m.t}</p></div>
              ) : (
                <article key={i} className="answer">
                  <header className="ans-head"><Burst size={20} spin={!!m.typing} /><b>GenMeta</b><span>Searched {m.a.sources?.length || scope.length} sources · {(m.ms / 1000).toFixed(1)} s</span></header>
                  <p className="ans-text">{m.typing ? <Typed text={m.a.text} onDone={() => typed(i)} /> : m.a.text}</p>
                  {!m.typing && <Evidence a={m.a} />}
                </article>
              )))}
              {busy && <Working />}
              <div ref={end} />
            </div>
          )}

          <form className="ask-composer" onSubmit={(e) => { e.preventDefault(); send(text); }}>
            <textarea ref={input} id="ask-input" rows={1} value={text} onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(text); } }}
              placeholder="Ask about a table, owner, lineage or policy" aria-label="Question" />
            <div className="ac-row">
              <span className="ac-scope">{scopeLabel}</span>
              <span className="ac-hint">Enter to send · Shift + Enter for a new line</span>
              <button type="submit" className="ac-send" aria-label="Send" disabled={busy || !text.trim() || !scope.length}>{busy ? <Burst size={16} /> : <ArrowUp size={16} />}</button>
            </div>
          </form>
        </section>

        <aside className="ask-rail">
          <div className="card rail-card">
            <h3>Sources in scope</h3>
            <ul className="scope-list">
              {SOURCES.map((s) => (
                <li key={s.id}>
                  <label>
                    <input type="checkbox" checked={scope.includes(s.id)} onChange={() => toggle(s.id)} />
                    <span className="ini">{s.ini}</span>
                    <span className="sl-name">{s.vendor}<small>{fmt(s.tables)} tables</small></span>
                  </label>
                </li>
              ))}
            </ul>
            {!scope.length && <p className="rail-warn">Select at least one source to ask a question.</p>}
          </div>
          <div className="card rail-card">
            <h3>How answers are grounded</h3>
            <p>GenMeta reads table and field names, descriptions, lineage, classifications and owners. It never reads row-level data.</p>
            <p className="rail-meta">Amazon Bedrock with Guardrails</p>
          </div>
          {recent.length > 0 && (
            <div className="card rail-card">
              <h3>Asked in this session</h3>
              <ul className="recent">{recent.map((r) => <li key={r}><button onClick={() => send(r)}>{r}</button></li>)}</ul>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
