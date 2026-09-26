import { useMemo, useState } from 'react';
import {
  Database, TriangleAlert, CircleX, Table2, Clock, Plus, ChevronDown, RefreshCw, Search,
  LayoutGrid, List, Plug, History, Upload, MoreVertical, Cloud, Cable, ShieldAlert, GitBranch, CalendarClock,
} from 'lucide-react';
import { SOURCES, TOTALS, fmt } from '../data.js';
import { VendorChip, Status, PageHead } from '../components/ui.jsx';

function Bars({ seed }) {
  const h = Array.from({ length: 14 }, (_, i) => 20 + (((seed + 3) * (i + 7) * 37) % 80));
  return <div className="mini-bars">{h.map((v, i) => <i key={i} style={{ height: `${v}%` }} />)}</div>;
}

export default function DataSources() {
  const [tab, setTab] = useState('connected');
  const [q, setQ] = useState('');
  const [view, setView] = useState('grid');
  const list = useMemo(() => SOURCES.filter((s) => (s.name + s.vendor + s.type).toLowerCase().includes(q.toLowerCase())), [q]);
  const warn = SOURCES.filter((s) => s.status === 'warning').length;

  const stats = [
    { icon: Database, v: SOURCES.length, l: 'Connected sources', s: `of ${SOURCES.length} total` },
    { icon: TriangleAlert, v: warn, l: 'Warning', s: `${Math.round((warn / SOURCES.length) * 100)}% of sources` },
    { icon: CircleX, v: 0, l: 'Failed', s: '0% of sources' },
    { icon: Table2, v: fmt(TOTALS.tables), l: 'Total tables', s: 'across all sources' },
    { icon: Clock, v: 48, l: 'Scheduled scans', s: 'next 24 hours · next in 13 min' },
  ];

  return (
    <div className="page fade-in">
      <PageHead title="Data sources" sub="Connected systems and ingestion health across the metadata estate.">
        <button className="btn primary"><Plus size={16} />Add source<ChevronDown size={15} /></button>
      </PageHead>

      <div className="tabs">
        {[['connected', 'Connected sources', Database], ['connectors', 'Connectors', Plug], ['changes', 'Metadata changes', History], ['bulk', 'Bulk import', Upload]].map(([k, l, I]) => (
          <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}><I size={16} />{l}</button>
        ))}
      </div>

      <div className="strip">
        <RefreshCw size={15} />
        <span>Collection: <b>scheduled</b> every 30 min · <b>event-driven</b> trigger ready · <b>incremental</b> — last harvest re-read 2 sources, reused Amazon S3 and Snowflake (unchanged).</span>
      </div>

      <div className="stat-row">
        {stats.map((s) => (
          <div key={s.l} className="stat">
            <span className={`stat-ico ${s.tone || ''}`}><s.icon size={19} /></span>
            <div><b>{s.v}</b><span>{s.l}</span><small>{s.s}</small></div>
          </div>
        ))}
      </div>

      <div className="filters">
        <label className="search sm"><Search size={16} /><input placeholder="Search data sources…" value={q} onChange={(e) => setQ(e.target.value)} /></label>
        {['All source types', 'All statuses', 'All domains', 'All owners'].map((f) => (
          <button key={f} className="select">{f}<ChevronDown size={15} /></button>
        ))}
        <div className="legend-dots"><span className="status healthy"><i />Healthy</span><span className="status warning"><i />Warning</span><span className="status failed"><i />Failed</span></div>
        <div className="seg sm">
          <button className={view === 'grid' ? 'on' : ''} onClick={() => setView('grid')} aria-label="Grid"><LayoutGrid size={15} /></button>
          <button className={view === 'list' ? 'on' : ''} onClick={() => setView('list')} aria-label="List"><List size={15} /></button>
        </div>
      </div>

      <div className={view === 'grid' ? 'src-grid' : 'src-list'}>
        {list.map((s, i) => (
          <article key={s.id} className="card src">
            <header>
              <VendorChip ini={s.ini} size={42} />
              <div className="src-t"><b>{s.name}</b><small>{s.vendor}</small></div>
              <span className="pill ok"><i />Connected</span>
              <button className="icon-btn ghost" aria-label="More"><MoreVertical size={16} /></button>
            </header>
            <p className="src-d">{s.kind}</p>
            <div className="src-schemas">▸ {s.schemas} schema{s.schemas > 1 ? 's' : ''} inside this system</div>
            <div className="chips">
              <span className="chip"><Cable size={13} />{s.connection}</span>
              <span className="chip"><Cloud size={13} />{s.cloud}</span>
            </div>
            <div className="src-mid">
              <div className="chips">{s.tags.map((t) => <span key={t} className={`tag ${t === t.toUpperCase() ? 'hot' : ''}`}>{t}</span>)}</div>
              <Bars seed={i} />
            </div>
            <div className="src-nums">
              <div><Table2 size={16} /><div><b>{s.tables}</b><small>Tables</small></div></div>
              <div><CalendarClock size={16} /><div><b>30 min</b><small>Scan frequency</small></div></div>
              <div><Clock size={16} /><div><b>{s.lastScan}</b><small>Last scan</small></div></div>
            </div>
            <footer>
              <div className="owners"><span className="avatar sm">{s.owners[0].slice(0, 2).toUpperCase()}</span>{s.owners.join(', ')}</div>
              <div className="src-badges">
                <span className="mini"><GitBranch size={12} />{s.lineage}</span>
                <span className="mini"><ShieldAlert size={12} />{s.alerts}</span>
                <Status s={s.status} />
              </div>
            </footer>
          </article>
        ))}
      </div>
    </div>
  );
}
