import { useMemo, useState } from 'react';
import { Wand2, Check, X } from 'lucide-react';
import { ASSETS, BY_KEY, srcMeta, allEdges, acceptedEdges, addAcceptedEdge } from './model.js';
import { hopMethod, CONFIDENCE, METHOD_META } from './EndToEnd.jsx';
import EstateTiles, { estateStats } from './EstateTiles.jsx';

/* Methods & limits — an estate-wide (all edges) view of HOW lineage is known,
   what it cannot see, and AI-assisted proposals for missing links. Reuses the
   End to end helpers (hopMethod, CONFIDENCE) so the two tabs agree. */

const REJECTED_KEY = 'lineage.rejectedProposals';
const readRejected = () => { try { return JSON.parse(localStorage.getItem(REJECTED_KEY) || '[]'); } catch { return []; } };
const writeRejected = (list) => { try { localStorage.setItem(REJECTED_KEY, JSON.stringify(list)); } catch { /* ignore */ } };

const fmtConf = (c) => (Number.isInteger(c) ? String(c) : String(c));

/* Five methods, in confidence order, with the exact copy from the brief. */
const METHOD_ROWS = [
  { key: 'ingested', label: 'Direct metadata ingestion',
    how: 'a pipeline or platform states its own inputs and outputs, and GenMeta reads that statement',
    cannot: 'anything the pipeline does not declare, or a platform that publishes no manifest' },
  { key: 'parsed', label: 'Code parsing',
    how: "the view's SQL is parsed: every output column is traced to the source columns it reads and the expression that transforms them",
    cannot: 'logic outside the warehouse — a spreadsheet, a notebook, a hand-run script — and SQL shapes the parser does not cover, which are reported with no source rather than guessed' },
  { key: 'observed', label: 'Runtime capture',
    how: "the warehouse's own history of writes — INSERT, MERGE, CREATE TABLE AS, COPY INTO — recorded with the statement and when it ran",
    cannot: 'a platform that does not keep query history, work older than the retention window, and anything written by a tool that does not go through the warehouse' },
  { key: 'inferred', label: 'AI-assisted and structural inference',
    how: 'where nothing states or records the link, matching names, column overlap and load order suggest one — scored, never applied on its own',
    cannot: 'a relationship with no naming or structural trace, and it will suggest links that look right and are not, which is why every one is marked inferred' },
  { key: 'declared', label: 'Declared by a person',
    how: 'someone who knows recorded the dependency, with their name against it',
    cannot: 'whatever nobody thought to declare' },
];

/* Lifecycle order for the proposal engine: raw → clean → transform → curated → serve. */
function lifecycleRank(a) {
  const s = (a.schema || '').toUpperCase(), l = a.layer || '', k = a.kind;
  if (k === 'report' || k === 'dashboard' || k === 'api' || s === 'BI' || s === 'API' || s.endsWith('_API')) return 4;
  if (l === 'Raw' || s === 'SRC' || s.endsWith('_RAW')) return 0;
  if (s.endsWith('_CLN') || l === 'Cleansed') return 1;
  if (s === 'INT' || s === 'STG' || l === 'Staging') return 2;
  if (s.endsWith('_ENR') || s === 'PRL' || l === 'Curated' || l === 'Enriched') return 3;
  return 2;
}

const SEV_RANK = { high: 0, medium: 1, low: 2 };

export default function MethodsLimits() {
  const [proposals, setProposals] = useState(null);
  const [loading, setLoading] = useState(false);
  const [rejected, setRejected] = useState(readRejected);
  const [accepted, setAccepted] = useState(() => acceptedEdges().map((e) => `${e.s}>${e.t}`));

  /* estate-wide stats (shared with the summary tiles) */
  const stats = useMemo(() => estateStats(), [accepted]);

  /* gaps, generated from the data */
  const gaps = useMemo(() => {
    const edges = allEdges();
    const out = [];
    const byPlatform = {};
    for (const a of ASSETS) (byPlatform[a.source] ||= []).push(a);
    const platEdges = {};
    for (const e of edges) for (const k of [e.s, e.t]) {
      const a = BY_KEY[k]; if (!a) continue;
      (platEdges[a.source] ||= []).push(e);
    }
    for (const [source, assets] of Object.entries(byPlatform)) {
      const es = platEdges[source] || [];
      const methods = new Set(es.map(hopMethod));
      const vendor = srcMeta(source).vendor;
      if (!(methods.has('ingested') || methods.has('parsed'))) {
        out.push({ gap: `${vendor} reports no lineage of its own`,
          detail: `${assets.length} asset(s) on ${vendor} have no stated or parsed lineage; anything shown for them is inferred from names and columns`,
          sev: 'high' });
      } else if (es.length && es.every((e) => hopMethod(e) === 'inferred')) {
        out.push({ gap: `${vendor} lineage is inferred only`,
          detail: `every one of its ${es.length} edge(s) is a suggestion, not a fact`, sev: 'medium' });
      }
    }
    const touched = new Set();
    for (const e of edges) { touched.add(e.s); touched.add(e.t); }
    const noEdge = ASSETS.filter((a) => !touched.has(a.key));
    if (noEdge.length) {
      out.push({ gap: `${noEdge.length} asset(s) have no lineage at all`,
        detail: `nothing flows into or out of them on the record: ${noEdge.slice(0, 6).map((a) => a.key).join(', ')} …`, sev: 'medium' });
    }
    const inferred = edges.filter((e) => hopMethod(e) === 'inferred').length;
    if (inferred) {
      out.push({ gap: `${inferred} of ${edges.length} edge(s) are inferred`,
        detail: 'they are drawn from matching names and column shapes, are marked as inferred wherever they appear, and should be confirmed by someone who knows the pipeline', sev: 'medium' });
    }
    const noMaps = edges.filter((e) => !e.map || e.map.length === 0).length;
    if (noMaps) {
      out.push({ gap: `${noMaps} edge(s) are table-level only`,
        detail: 'the flow is known but not which column feeds which — typically a cross-platform copy or a transformation outside the warehouse', sev: 'low' });
    }
    return out.sort((a, b) => SEV_RANK[a.sev] - SEV_RANK[b.sev]);
  }, [accepted]);

  const lookForLinks = () => {
    setLoading(true);
    setProposals(null);
    // brief async so the loading state is visible; computation is local
    setTimeout(() => {
      const existing = new Set(allEdges().map((e) => `${e.s}>${e.t}`));
      const rej = new Set(rejected.map((r) => `${r.s}>${r.t}`));
      const acc = new Set(acceptedEdges().map((e) => `${e.s}>${e.t}`));
      const list = [];
      for (const a of ASSETS) {
        const ca = new Set(a.columns.map((c) => c.name));
        if (!ca.size) continue;
        for (const b of ASSETS) {
          if (a.key === b.key) continue;
          const id = `${a.key}>${b.key}`;
          if (existing.has(id) || rej.has(id) || acc.has(id)) continue;
          if (!b.columns.length) continue;
          const shared = b.columns.filter((c) => ca.has(c.name)).length;
          if (!shared) continue;
          const min = Math.min(a.columns.length, b.columns.length);
          let score = shared / min;
          if (a.name === b.name && a.schema !== b.schema) score += 0.1; // same name across layers
          if (score < 0.25) continue;
          const before = lifecycleRank(a) <= lifecycleRank(b);
          list.push({ s: a.key, t: b.key, score: Math.min(score, 1), shared, min, fromSource: a.source, before });
        }
      }
      list.sort((x, y) => y.score - x.score);
      setProposals(list.slice(0, 12));
      setLoading(false);
    }, 350);
  };

  const accept = (p) => {
    addAcceptedEdge({ s: p.s, t: p.t, rel: 'derived_from', ev: null, tf: null, map: [], ai: true, acceptedBy: 'Admin', at: new Date().toISOString() });
    setAccepted(acceptedEdges().map((e) => `${e.s}>${e.t}`));
    setProposals((ps) => (ps || []).filter((x) => !(x.s === p.s && x.t === p.t)));
  };
  const reject = (p) => {
    const next = [...rejected, { s: p.s, t: p.t }];
    setRejected(next); writeRejected(next);
    setProposals((ps) => (ps || []).filter((x) => !(x.s === p.s && x.t === p.t)));
  };

  const s = stats;
  return (
    <div className="e2e ml">
      <EstateTiles />

      <div className="card pad-lg ml-card">
        <h3 className="sec-h">How lineage is derived here</h3>
        <div className="e2e-hop-wrap">
          <table className="tbl ml-methods">
            <thead>
              <tr><th>Method</th><th>How it works</th><th className="num">Confidence</th><th className="num">Edges</th><th>What it cannot see</th></tr>
            </thead>
            <tbody>
              {METHOD_ROWS.map((r) => (
                <tr key={r.key} className="static">
                  <td><span className={`e2e-pill ${METHOD_META[r.key].cls}`}>{r.label}</span></td>
                  <td className="ml-how">{r.how}</td>
                  <td className="num">{fmtConf(CONFIDENCE[r.key])}</td>
                  <td className="num">{s.byMethod[r.key]}</td>
                  <td className="ml-cannot">{r.cannot}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="ml-note">
          {s.byMethod.observed > 0
            ? `Runtime capture: ${s.byMethod.observed} write record(s) read, producing ${s.byMethod.observed} observed flow(s).`
            : 'Runtime capture: no warehouse access history is connected yet, so no observed flows.'}
        </p>
      </div>

      <div className="card pad-lg ml-card">
        <h3 className="sec-h">What this lineage cannot see, today</h3>
        <div className="e2e-hop-wrap">
          <table className="tbl ml-gaps">
            <thead><tr><th>Gap</th><th>Detail</th><th>Severity</th></tr></thead>
            <tbody>
              {gaps.map((g) => (
                <tr key={g.gap} className="static">
                  <td className="ml-gap">{g.gap}</td>
                  <td className="ml-detail">{g.detail}</td>
                  <td><span className={`ml-sev ${g.sev}`}>{g.sev}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="ml-italics">
          <p>An inferred edge is a suggestion. It is drawn differently, carries its confidence, and never becomes a fact until someone confirms it.</p>
          <p>Lineage is metadata: it says where data went, never what the data was.</p>
          <p>A transformation done outside the connected platforms — in a spreadsheet, a notebook or by hand — cannot be seen at all, and will show as a gap rather than a guess.</p>
        </div>
      </div>

      <div className="card pad-lg ml-card">
        <div className="cm-head">
          <div><h3 className="sec-h ml-tight">AI-assisted proposals</h3></div>
          <button className="btn ghost sm" onClick={lookForLinks} disabled={loading}>
            <Wand2 size={14} />{loading ? 'Looking…' : 'Look for missing links'}
          </button>
        </div>

        {loading && <p className="ml-loading">Scoring asset pairs by column overlap and lifecycle order…</p>}

        {proposals && !loading && (
          proposals.length ? (
            <div className="e2e-hop-wrap">
              <table className="tbl ml-proposals">
                <thead><tr><th>Proposed link</th><th>Why</th><th className="num">Confidence</th><th className="ml-act-h">Actions</th></tr></thead>
                <tbody>
                  {proposals.map((p) => (
                    <tr key={`${p.s}>${p.t}`} className="static">
                      <td><code className="mono">{p.s} → {p.t}</code></td>
                      <td className="ml-why">{p.shared} of {p.min} column(s) in common with {p.s} ({p.fromSource}){p.before ? ', which sits at or before it in the lifecycle' : ''}</td>
                      <td className="num">{p.score.toFixed(2)}</td>
                      <td className="ml-actions">
                        <button className="btn ghost sm" onClick={() => accept(p)}><Check size={13} />Accept</button>
                        <button className="btn ghost sm" onClick={() => reject(p)}><X size={13} />Reject</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <p className="ml-empty">No new links to propose — every high-overlap pair is already recorded, accepted or rejected.</p>
        )}

        <p className="ml-foot">An accepted proposal becomes an edge that stays marked AI-assisted, with the name of whoever accepted it. It never becomes indistinguishable from parsed or observed lineage.</p>
      </div>
    </div>
  );
}
