import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, Navigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft, BadgeCheck, Star, Sparkles, Search, KeyRound, Link2, Check, X, CircleDashed, Copy, MessagesSquare, ChevronRight,
} from 'lucide-react';
import {
  BY_ID, BY_KEY, KIND_ICON, kindLabel, srcMeta, enrichment, termsFor, columnLineage, upstreamOf, downstreamOf, fmtBytes, pct,
} from '../catalogue/model.js';
import LineageSection from '../catalogue/LineageSection.jsx';
import { Sens } from './Catalogue.jsx';

const TABS = ['overview', 'columns', 'lineage', 'contract', 'quality'];
const TAB_LABEL = { overview: 'Overview', columns: 'Columns', lineage: 'Lineage', contract: 'Contract', quality: 'Data quality' };

function ColTable({ a, full }) {
  const [q, setQ] = useState('');
  const lin = columnLineage(a.key);
  const cols = a.columns.filter((c) => c.name.toLowerCase().includes(q.toLowerCase()));
  const fkCols = a.fk.map((f) => f.split(' ')[0]);
  return (
    <div className="coltable">
      <label className="search sm"><Search size={14} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Search ${a.columns.length} columns`} /></label>
      <div className="table-wrap">
        <table className="tbl">
          <thead><tr><th className="num">#</th><th>Column name</th><th>Type</th>{full && <th>Nullable</th>}<th>Classification</th>{full && <th>Upstream</th>}</tr></thead>
          <tbody>
            {cols.map((c) => {
              const up = lin.filter((l) => l[2] === c.name);
              return (
                <tr key={c.name} className="static">
                  <td className="num muted">{c.n}</td>
                  <td>
                    <code className="colname">{c.name}</code>
                    {a.pk.includes(c.name) && <span className="key pk"><KeyRound size={11} />PK</span>}
                    {fkCols.includes(c.name) && <span className="key fk"><Link2 size={11} />FK</span>}
                    {a.parts.includes(c.name) && <span className="key">Partition</span>}
                  </td>
                  <td className="muted">{c.type}</td>
                  {full && <td className="muted">{c.nullable ? 'Yes' : 'No'}</td>}
                  <td>{c.cls ? <span className="cls">{c.cls}</span> : <span className="muted">—</span>}</td>
                  {full && <td>{up.length ? up.map((u) => <div key={u.join()} className="upcol"><code>{u[0]}.{u[1]}</code><small>{u[4]}</small></div>) : <span className="muted">—</span>}</td>}
                </tr>
              );
            })}
          </tbody>
        </table>
        {cols.length === 0 && <p className="tbl-empty">No columns match “{q}”.</p>}
      </div>
    </div>
  );
}

function Overview({ a, go }) {
  const e = enrichment(a);
  const [pane, setPane] = useState('preview');
  const verified = a.trust >= 0.8;
  return (
    <div className="card pad-lg">
      <h3 className="sec-h">Asset summary</h3>
      <div className="sum-row">
        <span className="enrich"><b>{e.score}</b> Enrichment score</span>
        <button className="btn ghost sm" onClick={() => go('quality')}><Sparkles size={14} />Get suggestions for data quality rules<ChevronRight size={14} /></button>
      </div>
      <div className="sum-figs">
        <div><span>Rows</span><b>{a.rows != null ? a.rows.toLocaleString('en-GB') : '—'}</b></div>
        <div><span>Columns</span><b>{a.cols}</b></div>
        <div><span>Connection</span><b className="conn"><span className="srcmark" style={{ '--s': '18px' }}>{srcMeta(a.source).ini}</span>{a.source}</b></div>
        <div><span>Layer</span><b>{a.layer || '—'}</b></div>
      </div>
      <div className="sum-desc">
        <span>Description</span>
        <p className={a.desc ? '' : 'muted'}>{a.desc || 'No description yet. The catalog agent can draft one for the owner to approve.'}</p>
      </div>
      <div className="sum-cert">
        <div>
          <span>Certificate</span>
          <p className={`cert ${verified ? 'ok' : ''}`}>{verified ? <><BadgeCheck size={15} />Verified</> : <><CircleDashed size={15} />Draft</>}</p>
        </div>
        <div><span>Owner</span><p>{a.owner}</p></div>
        <div><span>Steward</span><p>{a.steward || 'Not assigned'}</p></div>
      </div>
      <div className="seg2" role="tablist">
        <button role="tab" aria-selected={pane === 'preview'} className={pane === 'preview' ? 'on' : ''} onClick={() => setPane('preview')}>Column preview</button>
        <button role="tab" aria-selected={pane === 'sample'} className={pane === 'sample' ? 'on' : ''} onClick={() => setPane('sample')}>Sample data</button>
      </div>
      {pane === 'preview' ? <ColTable a={a} /> : (
        <p className="sample-note">Sample data isn’t collected. GenMeta reads metadata only (names, types, lineage and classifications), never row-level values.</p>
      )}
    </div>
  );
}

function Contract({ a }) {
  return (
    <div className="card pad-lg">
      <h3 className="sec-h">Schema contract</h3>
      <p className="sec-sub">Inferred from the catalogued schema. Consumers can rely on these names, types and keys; a change is flagged as drift.</p>
      <div className="contract-grid">
        <div><span>Primary key</span><p>{a.pk.length ? a.pk.map((k) => <code key={k}>{k}</code>) : 'None declared'}</p></div>
        <div><span>Partitioned by</span><p>{a.parts.length ? a.parts.map((k) => <code key={k}>{k}</code>) : 'Not partitioned'}</p></div>
        <div><span>Foreign keys</span><p>{a.fk.length ? a.fk.map((k) => <code key={k}>{k}</code>) : 'None declared'}</p></div>
        {a.uri && <div><span>Location</span><p><code>{a.uri}</code></p></div>}
        {a.path && <div><span>Endpoint</span><p><code>{a.method} {a.path}</code></p></div>}
      </div>
      <ColTable a={a} full />
    </div>
  );
}

function Quality({ a }) {
  const e = enrichment(a);
  const classified = a.columns.filter((c) => c.cls).length;
  const ups = upstreamOf(a.key).length + downstreamOf(a.key).length;
  const checks = [
    ...e.checks.map(([k, ok]) => [k, ok, ok ? 'Recorded' : 'Missing']),
    ['Lineage', ups > 0, ups ? `${ups} recorded edges` : 'No recorded lineage'],
    ['Column classification', classified > 0 || a.cls.length === 0, `${classified} of ${a.columns.length} columns classified`],
  ];
  const rules = [
    ...a.pk.map((k) => [`${k} is unique and never null`, 'Primary key']),
    ...a.columns.filter((c) => c.cls === 'PII').slice(0, 3).map((c) => [`${c.name} is masked for non-steward roles`, 'Personal data']),
    ...a.columns.filter((c) => c.type === 'date').slice(0, 2).map((c) => [`${c.name} is within the last 2 days`, 'Freshness']),
    ...a.columns.filter((c) => !c.nullable && !a.pk.includes(c.name)).slice(0, 2).map((c) => [`${c.name} is never null`, 'Completeness']),
  ];
  return (
    <div className="dq-grid">
      <div className="card pad-lg">
        <h3 className="sec-h">Quality</h3>
        <div className="dq-figs">
          <div><span>Quality band</span><b>{a.quality}</b></div>
          <div><span>Trust score</span><b>{pct(a.trust)}</b></div>
          <div><span>Enrichment</span><b>{e.score}</b></div>
        </div>
        <ul className="checks">
          {checks.map(([k, ok, note]) => <li key={k} className={ok ? 'ok' : ''}>{ok ? <Check size={14} /> : <X size={14} />}<b>{k}</b><span>{note}</span></li>)}
        </ul>
      </div>
      <div className="card pad-lg">
        <h3 className="sec-h"><Sparkles size={15} />Suggested rules</h3>
        {rules.length ? (
          <ul className="rules">{rules.map(([r, why]) => <li key={r}><span>{r}</span><em>{why}</em><button className="btn ghost sm">Add rule</button></li>)}</ul>
        ) : <p className="muted">Not enough column metadata to suggest rules yet.</p>}
      </div>
    </div>
  );
}

function SidePanel({ a }) {
  const terms = termsFor(a);
  return (
    <aside className="asset-side card">
      <section><h4>Description</h4><p className={a.desc ? '' : 'muted'}>{a.desc || 'No description yet'}</p></section>
      <section><h4>Domain</h4><p>{a.domain}</p></section>
      <section className="side-figs">
        <div><h4>Rows</h4><p>{a.rows != null ? a.rows.toLocaleString('en-GB') : '—'}</p></div>
        <div><h4>Columns</h4><p>{a.cols}</p></div>
        <div><h4>Size</h4><p>{fmtBytes(a.bytes)}</p></div>
      </section>
      <section><h4>Usage</h4><p>{a.usage}{a.consumers != null && <span className="muted"> · {a.consumers} consumers · {a.producers} producers</span>}</p></section>
      <section><h4>Owners</h4><p className="people"><span className="avatar xs">{a.owner.slice(0, 2).toUpperCase()}</span>{a.owner}</p>
        {a.steward && <p className="people"><span className="avatar xs">{a.steward.slice(0, 2).toUpperCase()}</span>{a.steward}<span className="muted"> · steward</span></p>}</section>
      <section><h4>Terms</h4>{terms.length ? terms.map((t) => <p key={t.name} className="termrow"><span className="term">{t.name}</span><small>{t.status}</small></p>) : <p className="muted">No linked terms</p>}</section>
      <section><h4>Classifications</h4><div className="chips">{a.cls.length ? a.cls.map((c) => <span key={c} className="cls">{c}</span>) : <span className="muted">None</span>}</div></section>
      <section><h4>Tags</h4><div className="chips">{a.tags.map((t) => <span key={t} className="tagx">#{t}</span>)}</div></section>
    </aside>
  );
}

export default function AssetDetail() {
  const { assetId } = useParams();
  const nav = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const a = BY_ID[assetId];
  const [tab, setTab] = useState(() => (searchParams.get('lineage') ? 'lineage' : 'overview'));
  const [starred, setStarred] = useState(false);
  const [copied, setCopied] = useState(false);
  const I = useMemo(() => (a ? KIND_ICON[a.kind] || KIND_ICON.table : null), [a]);
  // When the asset changes (e.g. picked from the lineage filter bar) honour the
  // ?lineage= hint in the URL, otherwise start on the overview tab.
  useEffect(() => { setTab(searchParams.get('lineage') ? 'lineage' : 'overview'); }, [assetId]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!a) return <Navigate to="/app/catalogue" replace />;
  const verified = a.trust >= 0.8;
  const go = (t) => {
    setTab(t);
    const sp = new URLSearchParams(searchParams);
    if (t === 'lineage') { if (!sp.get('lineage')) sp.set('lineage', 'graph'); } else sp.delete('lineage');
    setSearchParams(sp, { replace: true });
  };

  return (
    <div className="page asset fade-in" key={a.id}>
      <div className="asset-head">
        <button className="icon-btn back" onClick={() => nav('/app/catalogue')} aria-label="Back to catalogue"><ArrowLeft size={17} /></button>
        <div className="asset-title">
          <div className="at-row">
            <h1>{a.name}</h1>
            {verified && <BadgeCheck size={20} className="verified" aria-label="Verified" />}
            <Sens v={a.sensitivity} />
          </div>
          <div className="at-path">
            <span className="mono">({a.fqn})</span>
            <span><I size={13} strokeWidth={1.75} />{kindLabel(a.kind)}</span>
            <span className="sep">·</span><span>{a.source}</span><span className="sep">›</span><span className="mono">{a.schema}</span>
          </div>
        </div>
        <div className="head-actions">
          <button className={`icon-btn bordered ${starred ? 'on' : ''}`} onClick={() => setStarred((s) => !s)} aria-pressed={starred} aria-label="Star asset"><Star size={16} /></button>
          <button className="btn ghost" onClick={() => { navigator.clipboard?.writeText(a.fqn).catch(() => {}); setCopied(true); setTimeout(() => setCopied(false), 1300); }}>
            {copied ? <Check size={14} /> : <Copy size={14} />}{copied ? 'Copied' : 'Copy name'}
          </button>
          <button className="btn primary" onClick={() => nav('/app/ask')}><MessagesSquare size={14} />Ask about this asset</button>
        </div>
      </div>

      <nav className="asset-tabs" role="tablist">
        {TABS.map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} className={tab === t ? 'on' : ''} onClick={() => go(t)}>
            {TAB_LABEL[t]}{t === 'columns' && <em>{a.cols}</em>}
          </button>
        ))}
      </nav>

      {tab === 'lineage' ? (
        <LineageSection a={a} onOpenAsset={(x) => nav(`/app/catalogue/${x.id}`)} />
      ) : (
        <div className="asset-grid">
          <div className="asset-main">
            {tab === 'overview' && <Overview a={a} go={go} />}
            {tab === 'columns' && <div className="card pad-lg"><h3 className="sec-h">Columns</h3><ColTable a={a} full /></div>}
            {tab === 'contract' && <Contract a={a} />}
            {tab === 'quality' && <Quality a={a} />}
          </div>
          <SidePanel a={a} />
        </div>
      )}
    </div>
  );
}

export { BY_KEY };
