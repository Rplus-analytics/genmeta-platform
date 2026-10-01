import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, X, FileText, Tag, GitBranch, ShieldAlert, ArrowUpRight } from 'lucide-react';
import { PageHead } from '../components/ui.jsx';
import { getRemediation, getQuarantine } from '../catalogue/quality/store.js';

const TASKS = [
  { k: 'describe', t: 'Review 22 AI-drafted descriptions', target: 'ledger.payments', who: 'Madhavi', due: 'Today' },
  { k: 'tag', t: 'Confirm PERSONAL classification', target: 'casework.claimant_address', who: 'Rajesh', due: 'Today' },
  { k: 'lineage', t: 'Validate 14 new lineage edges', target: 'events.web_sessions', who: 'Raghav', due: 'Tomorrow' },
  { k: 'describe', t: 'Approve glossary term “Active Claim”', target: 'Business glossary', who: 'PK', due: 'Fri', to: '/app/glossary' },
  { k: 'tag', t: 'Resolve conflicting FINANCIAL tags', target: 'finance.invoice_header', who: 'Madhavi', due: 'Fri' },
];
const ICON = { describe: FileText, tag: Tag, lineage: GitBranch };

export default function Stewardship() {
  const [done, setDone] = useState({});
  const nav = useNavigate();
  return (
    <div className="page fade-in">
      <PageHead title="Stewardship" sub="73 open tasks. GenMeta proposes changes; stewards approve them." />
      <article className="card">
        <header className="card-head">
          <div><h2>Open tasks</h2><p>GenMeta’s proposals, waiting on a steward.</p></div>
          <button className="btn primary sm" onClick={() => setDone(Object.fromEntries(TASKS.map((_, i) => [i, true])))}><Check size={14} />Approve selected</button>
        </header>
        <ul className="tasks">
          {TASKS.map((t, i) => {
            const I = ICON[t.k];
            return (
              <li key={i} className={done[i] ? 'done' : ''}>
                <span className="feed-ico"><I size={15} /></span>
                <div className="task-t">
                  {t.to ? <button className="task-link" onClick={() => nav(t.to)}>{t.t}</button> : <b>{t.t}</b>}
                  <small><code>{t.target}</code> · {t.who} · due {t.due}</small>
                </div>
                <button className="btn subtle sm" onClick={() => setDone({ ...done, [i]: true })}><X size={14} />Reject</button>
                <button className="btn secondary sm" onClick={() => t.to ? nav(t.to) : setDone({ ...done, [i]: true })}><Check size={14} />{t.to ? 'Open' : 'Approve'}</button>
              </li>
            );
          })}
        </ul>
      </article>

      <QualityIssues nav={nav} />
    </div>
  );
}

/* Steward tasks raised by Data quality — remediation tasks and quarantined assets. */
function QualityIssues({ nav }) {
  const tasks = getRemediation().filter((r) => (r.task != null ? r.task : /Task/.test(r.actions || '')));
  const quar = getQuarantine();
  const [done, setDone] = useState({});
  if (!tasks.length && !quar.length) return null;
  return (
    <article className="card" style={{ marginTop: 16 }}>
      <header className="card-head">
        <div><h2>Approvals &amp; quality issues</h2><p>Tasks routed from Data quality remediation, and assets held in quarantine.</p></div>
        <button className="btn secondary sm" onClick={() => nav('/app/quality?quality=remediation')}><ArrowUpRight size={14} />Open Data quality</button>
      </header>
      <ul className="tasks">
        {quar.map((q) => (
          <li key={`q-${q.asset}`}>
            <span className="feed-ico"><ShieldAlert size={15} /></span>
            <div className="task-t"><b>Quarantined asset — review and release</b><small><code>{q.asset}</code> · {q.why}</small></div>
            <button className="btn secondary sm" onClick={() => nav('/app/quality?quality=remediation')}><Check size={14} />Review</button>
          </li>
        ))}
        {tasks.map((r, i) => (
          <li key={`t-${i}`} className={done[i] ? 'done' : ''}>
            <span className="feed-ico"><FileText size={15} /></span>
            <div className="task-t"><b>{r.rule} on {r.asset}</b><small><code>{r.asset}</code> · routed to {r.routedTo} · {r.authorisedBy}</small></div>
            <button className="btn subtle sm" onClick={() => setDone({ ...done, [i]: true })}><X size={14} />Dismiss</button>
            <button className="btn secondary sm" onClick={() => nav('/app/quality?quality=remediation')}><Check size={14} />Open</button>
          </li>
        ))}
      </ul>
    </article>
  );
}
