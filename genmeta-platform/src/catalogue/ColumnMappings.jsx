import { useEffect, useMemo, useState } from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { BY_KEY, kindLabel, upstreamOf, downstreamOf } from './model.js';
import { hopMethod } from './EndToEnd.jsx';
import CollapsibleCard from './CollapsibleCard.jsx';

/* Column mappings for the graph's focused asset. Sits full-width below the
   Lineage graph + sidebar row and re-reads whenever the focused asset changes
   (double-click a node, or click a chip here). Same data as the graph:
   RAW.edges (s, t, rel, ev, tf, map) via upstreamOf / downstreamOf. */

const edgeId = (e) => `${e.s}>${e.t}`;

/* A mapping's transformation label. "identity" when the column is carried
   through unchanged (method is identity or just the column's own name);
   otherwise the recorded method / expression (trim/uppercase, a JOIN, SQL …). */
function transformLabel(m) {
  const [src, tgt, method] = m;
  if (!method || method === 'identity' || method === src || method === tgt) return 'identity';
  return method;
}

/* The run id embedded in an S3 artifact uri, e.g.
   s3://…/cln/20260905T151735Z-dc231c17/customer.json → 20260905T151735Z-dc231c17 */
function runId(uri) {
  const m = (uri || '').match(/(\d{8}T\d{6}Z-[0-9a-f]+)/i);
  return m ? m[1] : null;
}

function Chip({ k, onFocus }) {
  const a = BY_KEY[k];
  return <button className="cm-chip" onClick={() => onFocus(k)} title={a ? a.fqn : k}>{a ? a.key : k}</button>;
}

function Section({ e, open, onToggle }) {
  const from = BY_KEY[e.s], to = BY_KEY[e.t];
  const summary = e.tf || '';
  const run = runId(to?.uri) || runId(from?.uri);
  const line = [summary, run ? `Run ${run}` : ''].filter(Boolean).join(' · ');
  return (
    <div className="cm-sec">
      <button className="cm-sec-h" aria-expanded={open} onClick={onToggle}>
        {open ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
        <span className="cm-sec-t"><code>{e.s}</code> → <code>{e.t}</code></span>
        <span className="cm-sec-sub">column mappings</span>
      </button>
      {open && (
        <div className="cm-sec-body">
          {line && <p className="cm-sum">{line}</p>}
          {e.map && e.map.length ? (
            <div className="cm-table-wrap">
              <table className="tbl cm-table">
                <thead><tr><th>Source column</th><th>Target column</th><th>Transformation</th></tr></thead>
                <tbody>
                  {e.map.map((m, i) => (
                    <tr key={m[0] + '>' + m[1] + i} className="static">
                      <td><code className="mono">{m[0]}</code></td>
                      <td><code className="mono">{m[1]}</code></td>
                      <td className="cm-tf">{transformLabel(m)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <p className="cm-empty">No column mappings recorded for this link.</p>}
        </div>
      )}
    </div>
  );
}

export default function ColumnMappings({ assetKey, onFocus }) {
  const a = BY_KEY[assetKey];
  const ups = useMemo(() => upstreamOf(assetKey), [assetKey]);
  const downs = useMemo(() => downstreamOf(assetKey), [assetKey]);
  const sections = useMemo(() => [...ups, ...downs], [ups, downs]);

  const [open, setOpen] = useState(() => new Set(sections[0] ? [edgeId(sections[0])] : []));
  // On refocus, reopen just the first section.
  useEffect(() => { setOpen(new Set(sections[0] ? [edgeId(sections[0])] : [])); }, [assetKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = (id) => setOpen((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const expandAll = () => setOpen(new Set(sections.map(edgeId)));
  const collapseAll = () => setOpen(new Set());

  if (!a) return null;

  const touching = sections;
  const anyManifest = touching.some((e) => e.ev === 'executed_pipeline_manifest');
  const anyParsed = touching.some((e) => !e.ev && hopMethod(e) === 'parsed');
  const isS3 = a.synthetic || a.source === 'Rplus Amazon S3';
  let note = '';
  if (anyManifest) note = 'Arrows below are backed by an executed pipeline run.';
  else if (anyParsed) note = 'Arrows below are parsed from view and query definitions.';
  if (note && isS3) note = `Synthetic demo records in a live S3 bucket. ${note}`;

  return (
    <>
      <CollapsibleCard
        className="cm-panel"
        title="Table Granularity"
        subtitle="Which tables feed this asset and which it feeds"
        storageKey="lineage.card.table"
      >
        <div className="cm-assetline">
          <b className="cm-name">{a.key}</b>
          <p className="cm-meta">{kindLabel(a.kind)} · {a.cols} columns · double-click a node to re-centre</p>
        </div>

        <div className="cm-rel">
          <div className="cm-rel-row">
            <span className="cm-rel-l">Upstream</span>
            {ups.length ? ups.map((e) => <Chip key={e.s} k={e.s} onFocus={onFocus} />) : <span className="cm-none">None recorded</span>}
          </div>
          <div className="cm-rel-row">
            <span className="cm-rel-l">Downstream</span>
            {downs.length ? downs.map((e) => <Chip key={e.t} k={e.t} onFocus={onFocus} />) : <span className="cm-none">None recorded</span>}
          </div>
        </div>

        {note && <p className="cm-note">{note}</p>}
      </CollapsibleCard>

      <CollapsibleCard
        className="cm-panel"
        title="Column Granularity"
        subtitle="How each column maps from source to target"
        storageKey="lineage.card.column"
        actions={sections.length > 0 ? (
          <>
            <button className="btn ghost sm" onClick={expandAll}>Expand all</button>
            <button className="btn ghost sm" onClick={collapseAll}>Collapse all</button>
          </>
        ) : null}
      >
        {sections.length ? (
          <div className="cm-secs">
            {sections.map((e) => <Section key={edgeId(e)} e={e} open={open.has(edgeId(e))} onToggle={() => toggle(edgeId(e))} />)}
          </div>
        ) : (
          <p className="cm-empty cm-empty-all">No lineage links recorded for this asset.</p>
        )}
      </CollapsibleCard>
    </>
  );
}
