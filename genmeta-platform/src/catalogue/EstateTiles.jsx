import { Share2, Sparkles, Boxes, ListChecks } from 'lucide-react';
import { allEdges } from './model.js';
import { hopMethod } from './EndToEnd.jsx';

/* The four estate-wide summary tiles, shared by Methods & limits and every
   other Lineage sub-tab so the numbers agree everywhere. */
export function estateStats() {
  const edges = allEdges();
  const byMethod = { ingested: 0, parsed: 0, observed: 0, declared: 0, inferred: 0 };
  for (const e of edges) byMethod[hopMethod(e)] += 1;
  const totalMaps = edges.reduce((t, e) => t + (e.map ? e.map.length : 0), 0);
  const derived = [...new Set(edges.map((e) => e.t))];
  const missingWhy = derived.filter((t) => !edges.some((e) => e.t === t && e.tf)).length;
  const inferredPct = edges.length ? Math.round((byMethod.inferred / edges.length) * 100) : 0;
  return { edges, byMethod, totalMaps, derived, derivedCount: derived.length, missingWhy, inferredPct, total: edges.length };
}

function Tile({ badge, icon: Icon, value, label, caption, multi }) {
  return (
    <div className="e2e-tile">
      <span className={`e2e-badge ${badge}`}><Icon size={16} strokeWidth={2} /></span>
      <b className={multi ? 'is-multi' : ''}>{value}</b>
      <span className="e2e-tile-l">{label}</span>
      <small>{caption}</small>
    </div>
  );
}

export default function EstateTiles() {
  const s = estateStats();
  return (
    <div className="e2e-tiles">
      <Tile badge="b-edges" icon={Share2} value={s.total} label="Lineage edges" caption={`${s.totalMaps} column mapping${s.totalMaps === 1 ? '' : 's'}`} />
      <Tile badge="b-inferred" icon={Sparkles} value={`${s.inferredPct}%`} label="Inferred" caption="suggested, not proven" />
      <Tile badge="b-derived" icon={Boxes} value={s.derivedCount} label="Derived assets" caption={`${s.missingWhy} still missing the why`} />
      <Tile badge="b-method" icon={ListChecks} multi value={`${s.byMethod.ingested} ingested · ${s.byMethod.parsed} parsed · ${s.byMethod.inferred} inferred`} label="By method" caption="every edge says how it was found" />
    </div>
  );
}
