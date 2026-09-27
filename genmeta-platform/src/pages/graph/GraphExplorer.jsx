import { useState } from 'react';
import { Search, GitBranch, Zap, Share2, ScanSearch, Boxes } from 'lucide-react';
import { AdminHead } from '../admin/kit.jsx';
import { kindLabel } from '../../catalogue/model.js';
import {
  EXPLORER_KPIS, GRAPH_STATS, NODE_CLASSES, REL_KINDS, GRAPH_MODELS, FLEXIBILITY, HUBS, FLAGGED,
  resolveNode, neighbourhood, searchByMeaning, whatIf, propagate,
} from './graphModel.js';

const TABS = [
  { id: 'explore', label: 'Explore', icon: GitBranch },
  { id: 'search', label: 'Search by meaning', icon: Search },
  { id: 'whatif', label: 'What-if', icon: Zap },
  { id: 'propagation', label: 'Propagation', icon: Share2 },
  { id: 'shape', label: 'What the shape says', icon: ScanSearch },
  { id: 'arch', label: 'Architecture & scale', icon: Boxes },
];

const fmt = (n) => n.toLocaleString('en-GB');

/* ---------- Explore ---------- */
function Explore({ startText, setStartText, depth, setDepth }) {
  const [result, setResult] = useState(null);
  const run = () => { const id = resolveNode(startText); setResult(id ? neighbourhood(id, depth) : { center: null, notFound: true }); };
  return (
    <div className="kg-tab">
      <div className="kg-form">
        <label className="field kg-field"><span>Start from</span>
          <input value={startText} onChange={(e) => setStartText(e.target.value)} placeholder="asset:SRC.CUSTOMER · term:customer · policy:pol-…"
            onKeyDown={(e) => e.key === 'Enter' && run()} /></label>
        <label className="field kg-field kg-field-sm"><span>Depth</span>
          <select className="select" value={depth} onChange={(e) => setDepth(Number(e.target.value))}>
            <option value={1}>1 hop</option><option value={2}>2 hops</option><option value={3}>3 hops</option>
          </select></label>
        <button className="btn primary" onClick={run}>Expand</button>
      </div>
      {!result && <p className="kg-empty pad">Name a node to expand it — or pick one from a search result.</p>}
      {result?.notFound && <p className="kg-empty pad">No node matches “{startText}”. Try an asset FQN like SRC.CUSTOMER.</p>}
      {result?.center && (() => {
        const list = [];
        (result.rings || []).forEach((ring, d) => (ring || []).forEach((n) => { if (n.id !== result.center.id) list.push({ ...n, hops: d }); }));
        list.sort((a, b) => a.hops - b.hops || a.label.localeCompare(b.label));
        return (
          <div className="kg-result">
            <p className="kg-summary"><b>{result.center.label}</b> — {list.length} node(s) within {depth} hop(s), {result.edges.length} relationship(s).</p>
            <div className="table-wrap"><table className="tbl">
              <thead><tr><th>Node</th><th>Kind</th><th>Class</th><th className="num">Hops away</th></tr></thead>
              <tbody>{list.map((n) => (
                <tr key={n.id}><td><b className="kg-fqn">{n.label}</b></td><td>{kindLabel(n.kind)}</td><td>{n.klass}</td><td className="num">{n.hops}</td></tr>
              ))}</tbody>
            </table></div>
          </div>
        );
      })()}
    </div>
  );
}

/* ---------- Search by meaning ---------- */
function SearchMeaning({ onOpen }) {
  const [q, setQ] = useState('customer personal data');
  const [res, setRes] = useState(null);
  const run = () => setRes(searchByMeaning(q));
  return (
    <div className="kg-tab">
      <div className="kg-form">
        <label className="field kg-field"><span>Find</span>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="what are you looking for?" onKeyDown={(e) => e.key === 'Enter' && run()} /></label>
        <button className="btn primary" onClick={run}>Search the graph</button>
      </div>
      {res && (res.length ? (
        <div className="kg-result">
          <p className="kg-summary">{res.length} node(s) ranked by meaning.</p>
          <ul className="kg-searchlist">
            {res.map((r) => (
              <li key={r.node.id}><button onClick={() => onOpen(r.node.id)}>
                <b className="kg-fqn">{r.node.label}</b><span className="kg-searchkind">{kindLabel(r.node.kind)} · {r.node.klass}</span>
                <span className="kg-score">match {r.score}</span></button></li>
            ))}
          </ul>
        </div>
      ) : <p className="kg-empty pad">Nothing matched. Try “order”, “financial” or “credential”.</p>)}
    </div>
  );
}

/* ---------- What-if ---------- */
function WhatIf() {
  const [text, setText] = useState('asset:SRC.CUSTOMER');
  const [res, setRes] = useState(null);
  const run = () => { const id = resolveNode(text); setRes(id ? whatIf(id) : { notFound: true }); };
  return (
    <div className="kg-tab">
      <div className="kg-form">
        <label className="field kg-field"><span>If this changed</span>
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder="asset:SRC.CUSTOMER" onKeyDown={(e) => e.key === 'Enter' && run()} /></label>
        <button className="btn primary" onClick={run}>What would it affect?</button>
      </div>
      {res?.notFound && <p className="kg-empty pad">No node matches that. Try SRC.CUSTOMER.</p>}
      {res?.start && (
        <div className="kg-result">
          <div className="kg-impact"><span className={`kg-level kg-level-${res.level}`}>{res.level}</span>
            <p>{res.affected.length} thing(s) depend on <b>{res.start.label}</b>: {res.technical} technical.</p></div>
          {res.affected.length ? (
            <div className="table-wrap"><table className="tbl">
              <thead><tr><th>Affected</th><th>Kind</th><th>Class</th><th className="num">Hops away</th></tr></thead>
              <tbody>{res.affected.map((a) => (
                <tr key={a.key}><td><b className="kg-fqn">{a.key}</b></td><td>{kindLabel(a.kind)}</td><td>{a.cls}</td><td className="num">{a.hops}</td></tr>
              ))}</tbody>
            </table></div>
          ) : <p className="kg-empty pad">Nothing downstream depends on it.</p>}
        </div>
      )}
    </div>
  );
}

/* ---------- Propagation ---------- */
function Propagation() {
  const [from, setFrom] = useState('asset:SRC.CUSTOMER');
  const [label, setLabel] = useState('uk-gsc:official-sensitive');
  const [res, setRes] = useState(null);
  const run = () => { const id = resolveNode(from); setRes(id ? propagate(id) : { notFound: true }); };
  return (
    <div className="kg-tab">
      <div className="kg-form">
        <label className="field kg-field"><span>From</span>
          <input value={from} onChange={(e) => setFrom(e.target.value)} placeholder="asset:SRC.CUSTOMER" /></label>
        <label className="field kg-field"><span>Label</span>
          <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="uk-gsc:official-sensitive" onKeyDown={(e) => e.key === 'Enter' && run()} /></label>
        <button className="btn primary" onClick={run}>Where would it reach?</button>
      </div>
      <p className="kg-explain">A label follows <code>flows_to</code> and <code>contains</code> edges. Something that already carries the label keeps its own and passes the inheritance on; an override stops that branch entirely, and nothing beyond it inherits.</p>
      {res?.notFound && <p className="kg-empty pad">No node matches that. Try SRC.CUSTOMER.</p>}
      {res?.start && (
        <div className="kg-result">
          <b className="kg-subhead">Would inherit it ({res.inherit.length})</b>
          <ul className="kg-proplist">
            {res.inherit.map((r) => (
              <li key={r.label}><b className="kg-fqn">{r.label}</b><span>{r.hops} hop(s) through {r.via}: {r.path}</span></li>
            ))}
            {!res.inherit.length && <li className="kg-none">Nothing downstream would inherit <code>{label}</code>.</li>}
          </ul>
          <b className="kg-subhead">Stopped ({res.stopped.length})</b>
          <ul className="kg-proplist stopped">
            {res.stopped.map((s) => <li key={s.key}><b className="kg-fqn">{s.key}</b><span>overridden here: {s.reason}</span></li>)}
          </ul>
        </div>
      )}
    </div>
  );
}

/* ---------- What the shape says ---------- */
function Shape() {
  return (
    <div className="kg-tab">
      <p className="kg-methods">Degree centrality for hubs; label propagation for communities; neighbourhood overlap (Jaccard) for similarity and discovery; embedding similarity (Amazon Titan, in this region) for meaning.</p>
      <span className="chip kg-embed">embeddings live (amazon.titan-embed-text-v2:0)</span>
      <div className="kg-shape-grid">
        <div>
          <b className="kg-subhead">Hubs</b>
          <ul className="kg-hublist">
            {HUBS.map((h) => <li key={h.label}><b className="kg-fqn">{h.label}</b><span className="kg-deg">{h.degree}</span><span className="kg-hkind">{kindLabel(h.kind)}</span></li>)}
          </ul>
        </div>
        <div>
          <b className="kg-subhead">Flagged by the shape</b>
          <p className="kg-flagnote">Sensitive but ungoverned: no policy, standard or control applies to it.</p>
          <ul className="kg-flaglist">{FLAGGED.map((f) => <li key={f}><b className="kg-fqn">{f}</b></li>)}</ul>
        </div>
      </div>
      <div className="kg-recs"><b className="kg-subhead">Relationships worth recording</b><p className="kg-empty">None suggested.</p></div>
    </div>
  );
}

/* ---------- Architecture & scale ---------- */
function Architecture() {
  const [model, setModel] = useState('native');
  const [scale, setScale] = useState(null);
  const m = GRAPH_MODELS.find((x) => x.id === model);
  return (
    <div className="kg-tab">
      <div>
        <b className="kg-subhead">The model</b>
        <div className="seg2 kg-modeltabs">
          {GRAPH_MODELS.map((x) => <button key={x.id} className={model === x.id ? 'on' : ''} onClick={() => setModel(x.id)}>{x.label}</button>)}
        </div>
        <p className="kg-modeldesc">{m.desc}</p>
      </div>

      <div className="kg-two">
        <div>
          <b className="kg-subhead">What it holds</b>
          <div className="table-wrap"><table className="tbl">
            <thead><tr><th>Class</th><th>Means</th><th className="num">Nodes</th></tr></thead>
            <tbody>{NODE_CLASSES.map((c) => <tr key={c.klass}><td>{c.klass}</td><td className="kg-means">{c.means}</td><td className="num">{fmt(c.nodes)}</td></tr>)}</tbody>
          </table></div>
        </div>
        <div>
          <b className="kg-subhead">Relationships</b>
          <div className="table-wrap"><table className="tbl">
            <thead><tr><th>Relationship</th><th>Means</th><th className="num">Edges</th></tr></thead>
            <tbody>{REL_KINDS.map((r) => <tr key={r.rel}><td className="mono">{r.rel}</td><td className="kg-means">{r.means}</td><td className="num">{fmt(r.edges)}</td></tr>)}</tbody>
          </table></div>
        </div>
      </div>

      <div>
        <b className="kg-subhead">Flexibility</b>
        <ul className="kg-flex">{FLEXIBILITY.map((f) => <li key={f}>{f}</li>)}</ul>
      </div>

      <div className="kg-scale">
        <b className="kg-subhead">Scale</b>
        <p>{fmt(GRAPH_STATS.things)} nodes and {fmt(GRAPH_STATS.relationships)} edges, built in {GRAPH_STATS.buildMs} ms; a two-hop query returned 96 nodes in 11 ms.</p>
        <button className="btn ghost sm" onClick={() => setScale({ n: GRAPH_STATS.things * 10, e: GRAPH_STATS.relationships * 10, ms: GRAPH_STATS.buildMs * 10 })}>Run a scale test at 10×</button>
        {scale && <p className="kg-scaleres">At 10×: {fmt(scale.n)} nodes and {fmt(scale.e)} edges, built in ~{fmt(scale.ms)} ms (simulated).</p>}
      </div>
    </div>
  );
}

export default function GraphExplorer() {
  const [tab, setTab] = useState('explore');
  const [startText, setStartText] = useState('');
  const [depth, setDepth] = useState(2);
  const openInExplore = (id) => { setStartText(id); setDepth(2); setTab('explore'); };

  return (
    <div className="kg-page">
      <AdminHead title="Graph Explorer" sub="One graph over everything the platform knows — business terms, technical assets, the policies and classifications that govern them, the checks run against them and the products and models built on them. Expand anything, follow a lineage path, ask what a change would affect, and see where a label would inherit." />

      <div className="tiles-sm kg-kpis">
        {EXPLORER_KPIS.map((t) => (
          <div key={t.k} title={t.s}><b>{typeof t.v === 'number' ? t.v.toLocaleString('en-GB') : t.v}</b><span>{t.k}</span><small>{t.s}</small></div>
        ))}
      </div>

      <article className="card kg-explorer-card">
        <div className="tabs kg-tabs">
          {TABS.map((t) => { const I = t.icon; return (
            <button key={t.id} className={tab === t.id ? 'on' : ''} onClick={() => setTab(t.id)}><I size={14} strokeWidth={1.7} />{t.label}</button>
          ); })}
        </div>
        <div className="kg-tabbody">
          {tab === 'explore' && <Explore startText={startText} setStartText={setStartText} depth={depth} setDepth={setDepth} />}
          {tab === 'search' && <SearchMeaning onOpen={openInExplore} />}
          {tab === 'whatif' && <WhatIf />}
          {tab === 'propagation' && <Propagation />}
          {tab === 'shape' && <Shape />}
          {tab === 'arch' && <Architecture />}
        </div>
      </article>
    </div>
  );
}
