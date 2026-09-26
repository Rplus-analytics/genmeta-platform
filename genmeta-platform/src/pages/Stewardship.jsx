import { useState } from 'react';
import { Check, X, FileText, Tag, GitBranch } from 'lucide-react';
import { PageHead } from '../components/ui.jsx';

const TASKS = [
  { k: 'describe', t: 'Review 22 AI-drafted descriptions', target: 'ledger.payments', who: 'Madhavi', due: 'Today' },
  { k: 'tag', t: 'Confirm PERSONAL classification', target: 'casework.claimant_address', who: 'Rajesh', due: 'Today' },
  { k: 'lineage', t: 'Validate 14 new lineage edges', target: 'events.web_sessions', who: 'Raghav', due: 'Tomorrow' },
  { k: 'describe', t: 'Approve glossary term “Active Claim”', target: 'Business glossary', who: 'PK', due: 'Fri' },
  { k: 'tag', t: 'Resolve conflicting FINANCIAL tags', target: 'finance.invoice_header', who: 'Madhavi', due: 'Fri' },
];
const ICON = { describe: FileText, tag: Tag, lineage: GitBranch };

export default function Stewardship() {
  const [done, setDone] = useState({});
  return (
    <div className="page fade-in">
      <PageHead title="Stewardship" sub="73 open tasks. GenMeta proposes changes; stewards approve them." />
      <article className="card">
        <ul className="tasks">
          {TASKS.map((t, i) => {
            const I = ICON[t.k];
            return (
              <li key={i} className={done[i] ? 'done' : ''}>
                <span className="feed-ico"><I size={15} /></span>
                <div className="task-t"><b>{t.t}</b><small><code>{t.target}</code> · {t.who} · due {t.due}</small></div>
                <button className="btn ghost sm" onClick={() => setDone({ ...done, [i]: true })}><X size={14} />Reject</button>
                <button className="btn primary sm" onClick={() => setDone({ ...done, [i]: true })}><Check size={14} />Approve</button>
              </li>
            );
          })}
        </ul>
      </article>
    </div>
  );
}
