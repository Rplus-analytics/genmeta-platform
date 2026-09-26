import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, ChevronDown } from 'lucide-react';
import { ASSETS, srcMeta } from './model.js';
import LineageGraph from './LineageGraph.jsx';
import EndToEnd from './EndToEnd.jsx';

const SUBTABS = [['graph', 'Graph'], ['end-to-end', 'End to end']];

/* One connected platform per source system, in a stable order. */
const PLATFORMS = [...new Set(ASSETS.map((a) => a.source))]
  .map((s) => ({ source: s, vendor: srcMeta(s).vendor }))
  .sort((a, b) => a.vendor.localeCompare(b.vendor));

/* Filter bar + [Graph | End to end] sub-tabs, shared by both views.
   The sub-tab lives in the URL (?lineage=…) so a refresh stays put; the
   asset picker defaults to the current asset and, when changed, opens that
   asset on the End to end tab. */
export default function LineageSection({ a, onOpenAsset }) {
  const nav = useNavigate();
  const [sp, setSp] = useSearchParams();
  const sub = sp.get('lineage') === 'end-to-end' ? 'end-to-end' : 'graph';
  const setSub = (v) => setSp((prev) => { const n = new URLSearchParams(prev); n.set('lineage', v); return n; }, { replace: true });

  const [q, setQ] = useState('');
  const [platform, setPlatform] = useState('');

  const picker = useMemo(() => {
    const words = q.trim().toLowerCase();
    return ASSETS
      .filter((x) => (!platform || x.source === platform))
      .filter((x) => !words || `${x.source} ${x.key} ${x.name}`.toLowerCase().includes(words))
      .sort((x, y) => (x.source.localeCompare(y.source) || x.key.localeCompare(y.key)));
  }, [q, platform]);

  const pickAsset = (id) => {
    if (!id || String(id) === String(a.id)) return;
    nav(`/app/catalogue/${id}?lineage=end-to-end`);
  };

  // Keep the current asset selectable even when filters would hide it.
  const inPicker = picker.some((x) => x.id === a.id);

  return (
    <div className="lineage-section">
      <div className="card lin-filterbar">
        <label className="search grow lin-fb-search">
          <Search size={15} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search assets, tables or sources…" aria-label="Search assets, tables or sources" />
        </label>
        <div className={`fdrop ${platform ? 'set' : ''}`}>
          <select value={platform} onChange={(e) => setPlatform(e.target.value)} aria-label="Platform">
            <option value="">All platforms</option>
            {PLATFORMS.map((p) => <option key={p.source} value={p.source}>{p.vendor}</option>)}
          </select>
          <ChevronDown size={15} className="fdrop-c" />
        </div>
        <div className="fdrop set lin-fb-asset">
          <select value={a.id} onChange={(e) => pickAsset(e.target.value)} aria-label="Asset">
            {!inPicker && <option value={a.id}>{a.source} · {a.key}</option>}
            {picker.map((x) => <option key={x.id} value={x.id}>{x.source} · {x.key}</option>)}
          </select>
          <ChevronDown size={15} className="fdrop-c" />
        </div>
      </div>

      <nav className="asset-tabs lin-subtabs" role="tablist">
        {SUBTABS.map(([k, label]) => (
          <button key={k} role="tab" aria-selected={sub === k} className={sub === k ? 'on' : ''} onClick={() => setSub(k)}>{label}</button>
        ))}
      </nav>

      {sub === 'graph'
        ? <LineageGraph focusKey={a.key} onOpenAsset={onOpenAsset} />
        : <EndToEnd assetKey={a.key} />}
    </div>
  );
}
