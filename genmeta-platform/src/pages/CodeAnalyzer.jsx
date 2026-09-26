import { useState } from 'react';
import { FileSearch, GitBranch, Wand2 } from 'lucide-react';
import JobExplorer from '../code-analyzer/JobExplorer.jsx';
import Lineage from '../code-analyzer/Lineage.jsx';
import Converter from '../code-analyzer/Converter.jsx';
import '../code-analyzer/code-analyzer.css';

/* Code analyzer: explains legacy jobs in plain English, drafts modern
   rewrites and traces the custom lineage they produce. Ported from the
   standalone code-analyzer-app; all data and analysis are demo heuristics. */

const VIEWS = [
  { id: 'jobs', label: 'Job explorer', icon: FileSearch, C: JobExplorer },
  { id: 'lineage', label: 'Custom lineage', icon: GitBranch, C: Lineage },
  { id: 'convert', label: 'Convert your code', icon: Wand2, C: Converter },
];

export default function CodeAnalyzer() {
  const [view, setView] = useState('jobs');

  return (
    <div className="page fade-in ca-root">
      <div className="page-head">
        <div>
          <span className="eyebrow">Govern</span>
          <h1>Code analyzer</h1>
          <p>Explain legacy jobs in plain English, flag risk and personal data, draft modern rewrites and trace the lineage they produce.</p>
        </div>
        <div className="head-actions"><span className="chip ca-demo">Demo data</span></div>
      </div>

      <div className="tabs ca-views" role="tablist" aria-label="Code analyzer views">
        {VIEWS.map((v) => (
          <button key={v.id} type="button" role="tab" aria-selected={view === v.id} className={view === v.id ? 'on' : ''} onClick={() => setView(v.id)}>
            <v.icon size={15} strokeWidth={1.75} />{v.label}
          </button>
        ))}
      </div>

      {/* All views stay mounted so each keeps its state (selected job, pasted code) across tab switches. */}
      {VIEWS.map((v) => (
        <div key={v.id} className="ca-view" role="tabpanel" hidden={view !== v.id}><v.C /></div>
      ))}
    </div>
  );
}
