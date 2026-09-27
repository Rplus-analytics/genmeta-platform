import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ChevronDown } from 'lucide-react';
import { ASSETS, srcMeta } from './model.js';

/* One connected platform per source system, in a stable order. */
const PLATFORMS = [...new Set(ASSETS.map((a) => a.source))]
  .map((s) => ({ source: s, vendor: srcMeta(s).vendor }))
  .sort((a, b) => a.vendor.localeCompare(b.vendor));

/* Shared filter bar used by both Lineage and Data quality: search, an
   "All platforms" dropdown and the "<Source> · <SCHEMA.ASSET>" asset picker.
   `query` is appended after `?` when a different asset is picked, so the
   caller keeps the user on the same top tab and sub-tab. */
export default function AssetFilterBar({ a, query }) {
  const nav = useNavigate();
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
    nav(`/app/catalogue/${id}?${query}`);
  };
  const inPicker = picker.some((x) => x.id === a.id);

  return (
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
  );
}
