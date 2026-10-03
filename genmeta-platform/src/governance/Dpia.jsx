import { useState } from 'react';
import { Download, Play, Copy, Plus } from 'lucide-react';
import { PageHead, Tabs, Button, Segmented } from '../components/ui.jsx';
import {
  ORG, PD_MAP, colKind, DPIA_TILES, DOMAIN_SYSTEMS, ROPA_DOMAINS, LAWFUL_BASES, SPECIAL_CONDITIONS, SECURITY_DEFAULT,
  HANDLING_RULES, ownerOf, UNUSED, SCREEN_INDICATORS, ICO_TEMPLATE, SYSTEMS, AUDIT,
  LIKELIHOOD, SEVERITY, riskLevel, EFFECTS, SUGGESTED_RISKS,
} from './data.js';
import { Card, Tiles, StatusBadge, Empty, Note, Mono, Fld, Drawer, KV, downloadCsv, toast } from './kit.jsx';

const TABS = ['Personal data map', 'Records of processing', 'Lawful basis & minimisation', 'Data-handling rules', 'Assessments', 'Templates', 'Accountability pack']
  .map((label, i) => ({ value: ['map', 'ropa', 'lawful', 'rules', 'assess', 'templates', 'pack'][i], label }));
const PD_ASSETS = PD_MAP.map((r) => r.asset);
const piiCols = PD_MAP.reduce((n, r) => n + r.cols.filter((c) => !/BALANCE|AMOUNT|PRICE|amount|balance/.test(c)).length, 0);
const finCols = PD_MAP.reduce((n, r) => n + r.cols.length, 0) - piiCols;
const basisLabel = (k) => LAWFUL_BASES.find(([v]) => v === k)?.[1] || k;

/* one drafted Article 30 record per business domain holding personal data */
const proposal = (d) => {
  const rows = PD_MAP.filter((r) => r.domain === d);
  return {
    id: d, activity: `${d} data processing`, controller: ORG.controller, contact: ORG.contact, basis: 'public_task', special: 'not_applicable', transfers: 'None outside the UK recorded',
    purpose: `Processing of ${d.toLowerCase()} data across ${DOMAIN_SYSTEMS(d)} for ${d.toLowerCase()} operations.`,
    subjects: 'Individuals whose records the department holds', categories: [...new Set(rows.flatMap((r) => r.cols.map((c) => (/BALANCE|AMOUNT|PRICE|amount|balance/.test(c) ? 'FINANCIAL' : 'PII'))))].sort().join('\n'),
    recipients: '', retention: '', security: SECURITY_DEFAULT, assets: rows.map((r) => r.asset), status: 'proposed',
    evidence: `domain: ${d} · assets: ${rows.map((r) => r.asset).join(', ')} · systems: ${DOMAIN_SYSTEMS(d)} · columns: ${[...new Set(rows.flatMap((r) => r.cols))].sort().join(', ')} · shared with downstream: ${[...new Set(rows.flatMap((r) => r.shared))].join(', ') || '—'} · data products: — · models trained on it: — · retention rules: — · regions: ${[...new Set(rows.map((r) => r.region))].join(', ')} · owners: ${[...new Set(rows.map((r) => r.owner))].join(', ')}`,
    history: [['3 Oct 2026, 11:30', 'Claude', 'Drafted from the evidence']],
  };
};

export default function Dpia() {
  const [tab, setTab] = useState('map');
  const [records, setRecords] = useState(() => ROPA_DOMAINS.map(proposal));
  const [assessments, setAssessments] = useState([]);
  const accepted = records.filter((r) => r.status === 'accepted');
  const drafts = records.filter((r) => r.status === 'draft');
  const tiles = DPIA_TILES.map((t) => (t.l === 'Accepted records of processing' ? { ...t, v: accepted.length, s: `${drafts.length} draft` }
    : t.l === 'Assessments required' ? { ...t, v: assessments.filter((a) => a.stage !== 'Approved').length, s: `${records.length} activities screened` } : t));
  /* OneTrust-style guided path: each step shows progress and opens its tab */
  const failing = HANDLING_RULES.reduce((n, r) => n + r.fail.length, 0);
  const path = [
    ['map', 'Find personal data', `${PD_MAP.length} of ${PD_MAP.length} assets mapped`, true],
    ['ropa', 'Record the processing', `${accepted.length} of ${records.length} records accepted`, accepted.length === records.length],
    ['rules', 'Fix the handling rules', `${150 - failing} of 150 checks passing`, failing === 0],
    ['assess', 'Assess the high-risk activities', `${assessments.length} assessment(s) started`, assessments.length > 0 && assessments.every((a) => a.stage === 'Approved')],
    ['pack', 'Produce the accountability pack', 'ready when the steps above are done', false],
  ];
  return (
    <div className="page gv">
      <PageHead eyebrow="Govern" title="DPIA & GDPR"
        sub="Where personal data is identified, processed, stored and shared; the records of processing and the basis for each; the rules that govern personal data, monitored; and the impact assessments behind them." />
      <div className="gv-path" role="list" aria-label="Path to accountability">
        {path.map(([k, t, s, done], i) => (
          <button key={k} type="button" role="listitem" className={`${done ? 'done' : ''} ${tab === k ? 'on' : ''}`} onClick={() => setTab(k)}>
            <i>{done ? '✓' : i + 1}</i><span><b>{t}</b><small>{s}</small></span>
          </button>
        ))}
      </div>
      <Tabs items={TABS} value={tab} onChange={setTab} />
      {tab !== 'assess' && tab !== 'templates' && tab !== 'pack' && <Tiles items={tiles} />}
      {tab === 'map' && <PersonalDataMap />}
      {tab === 'ropa' && <Ropa records={records} setRecords={setRecords} />}
      {tab === 'lawful' && <Lawful accepted={accepted} />}
      {tab === 'rules' && <HandlingRules />}
      {tab === 'assess' && <Assessments records={records} list={assessments} setList={setAssessments} />}
      {tab === 'templates' && <Templates />}
      {tab === 'pack' && <Pack records={records} assessments={assessments} />}
    </div>
  );
}

/* ------------------------------------------------------------------ personal data map
   v2: OneTrust data map — filter by system, domain and region, and see where personal data
   concentrates before opening an asset. */
function PersonalDataMap() {
  const [sel, setSel] = useState(null);
  const [f, setF] = useState({ system: 'all', domain: 'all', region: 'all' });
  const r = sel && PD_MAP.find((x) => x.asset === sel);
  const comesFrom = (a) => PD_MAP.filter((x) => x.shared.includes(a)).map((x) => x.asset);
  const rows = PD_MAP.filter((x) => (f.system === 'all' || x.system === f.system) && (f.domain === 'all' || x.domain === f.domain) && (f.region === 'all' || x.region === f.region));
  const bySystem = [...SYSTEMS].sort().map((s) => [s, PD_MAP.filter((x) => x.system === s)]);
  const maxCols = Math.max(...bySystem.map(([, l]) => l.reduce((n, x) => n + x.cols.length, 0)));
  const set = (k) => (e) => setF((o) => ({ ...o, [k]: e.target.value }));
  return (
    <>
      <div className="gv-two">
        <Card title="Where personal data sits" sub="Personal-data columns per system. Click a system to filter the map.">
          <div className="gv-bars">
            {bySystem.map(([s, l]) => { const n = l.reduce((a, x) => a + x.cols.length, 0); return (
              <div key={s} className="click" onClick={() => setF((o) => ({ ...o, system: o.system === s ? 'all' : s }))} style={{ cursor: 'pointer', fontWeight: f.system === s ? 600 : 400 }}>
                <span>{s}</span><i><em style={{ width: `${(n / maxCols) * 100}%` }} /></i><b>{n}</b>
              </div>
            ); })}
          </div>
        </Card>
        <Card title="What kind of personal data" sub="From the classifier — names and contact details (PII) and money values linked to a person (FINANCIAL).">
          <div className="gv-health-n" style={{ marginBottom: 12 }}>
            <div><b>{piiCols}</b><span>PII columns</span></div>
            <div><b>{finCols}</b><span>FINANCIAL columns</span></div>
            <div><b>{PD_MAP.filter((x) => x.region === 'not recorded').length}</b><span>assets, region unknown</span></div>
          </div>
          <Note>No special-category data has been found. Nothing is held under a retention requirement yet.</Note>
        </Card>
      </div>
      <Card title="Personal data map" count={rows.length}
        sub={`Built from the classifier, lineage, data products, models, the ownership register and access grants — 25 of 37 catalogued assets hold personal data (${piiCols} PII, ${finCols} FINANCIAL columns) across ${[...SYSTEMS].sort().join(', ')}.`}
        actions={<>
          <select className="select" value={f.system} onChange={set('system')} aria-label="System"><option value="all">All systems</option>{[...SYSTEMS].sort().map((s) => <option key={s}>{s}</option>)}</select>
          <select className="select" value={f.domain} onChange={set('domain')} aria-label="Domain"><option value="all">All domains</option>{ROPA_DOMAINS.map((s) => <option key={s}>{s}</option>)}</select>
          <select className="select" value={f.region} onChange={set('region')} aria-label="Region"><option value="all">Any region</option><option>eu-west-2 (London)</option><option>not recorded</option></select>
        </>}>
        <div className="table-wrap">
          <table className="tbl">
            <thead><tr><th>Asset</th><th>Personal data</th><th>Shared with</th><th>Owner / steward</th><th>Retention</th><th>Region</th></tr></thead>
            <tbody>{rows.map((x) => (
              <tr key={x.asset} className={`click ${sel === x.asset ? 'on' : ''}`} onClick={() => setSel(x.asset)}>
                <td><Mono>{x.asset}</Mono><span className="gv-sub">{x.system} · {x.sensitivity} · {x.domain}</span></td>
                <td><div className="gv-tags">{x.cols.map((c) => <span key={c} className="tag mono">{c}</span>)}</div></td>
                <td>{x.shared.join(', ') || '—'}</td><td>{x.owner}</td><td className="gv-muted">none</td>
                <td>{x.region === 'not recorded' ? <StatusBadge s="warn">not recorded</StatusBadge> : x.region}</td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={6}><Empty>No assets match these filters.</Empty></td></tr>}
            </tbody>
          </table>
        </div>
        <Note>Select an asset to see where its personal data comes from and goes.</Note>
      </Card>
      {r && (
        <Drawer title={r.asset} onClose={() => setSel(null)}>
          <p className="gv-muted" style={{ fontSize: 13, margin: '0 0 14px' }}>{r.system} · {r.sensitivity}</p>
          <div className="gv-section-label" style={{ marginTop: 0 }}>Personal data</div>
          <ul className="gv-lines">{r.cols.map((c) => <li key={c}><Mono>{c}</Mono> — {colKind(c)}</li>)}</ul>
          <div className="gv-section-label">Where it flows</div>
          <div className="gv-flow" style={{ gridTemplateColumns: 'repeat(3, minmax(0,1fr))' }}>
            <div><span>Comes from</span><b>{comesFrom(r.asset).join(', ') || '—'}</b></div>
            <div><span>This asset</span><b>{r.asset}</b></div>
            <div><span>Goes to</span><b>{r.shared.join(', ') || '—'}</b></div>
          </div>
          <div className="gv-section-label">Context</div>
          <KV rows={[['Data products', '—'], ['Models', '—'], ['Access', '0 active grant(s)'], ['Retention', 'no retention requirement applies'], ['Held in', r.region], ['Owner / steward', r.owner]]} />
        </Drawer>
      )}
    </>
  );
}

/* ------------------------------------------------------------------ records of processing */
function Ropa({ records, setRecords }) {
  const [open, setOpen] = useState(null);
  const proposed = records.filter((r) => r.status === 'proposed');
  const register = records.filter((r) => r.status !== 'proposed');
  const notIn = PD_ASSETS.filter((a) => !register.some((r) => r.status === 'accepted' && r.assets.includes(a)));
  const save = (rec, status) => { setRecords((all) => all.map((x) => (x.id === rec.id ? { ...rec, status, history: [[new Date().toLocaleString('en-GB'), 'governance-lead', status === 'accepted' ? 'Accepted the record' : 'Saved as draft'], ...rec.history] } : x))); setOpen(null); toast(status === 'accepted' ? `Accepted “${rec.activity}”` : 'Draft saved'); };
  const exportCsv = () => downloadCsv('records-of-processing.csv', [['Activity', 'Status', 'Controller', 'Lawful basis', 'Purpose', 'Data subjects', 'Categories', 'Recipients', 'Retention', 'Assets'], ...records.map((r) => [r.activity, r.status, r.controller, basisLabel(r.basis), r.purpose, r.subjects, r.categories.replace(/\n/g, '; '), r.recipients, r.retention, r.assets.join('; ')])]);
  return (
    <>
      <Card title="Records of processing" sub={`Article 30 records. GenMeta proposes one per business domain that holds personal data, drafted from the evidence it can see; a governance lead accepts it. Controller ${ORG.controller}, contact ${ORG.contact}.`}
        actions={<Button variant="secondary" size="md" icon={Download} onClick={exportCsv}>Export register (CSV)</Button>}>
        <div className="gv-section-label" style={{ marginTop: 0 }}>Proposed from the evidence ({proposed.length}) — {notIn.length} asset(s) not yet in a record</div>
        <div className="table-wrap">
          <table className="tbl">
            <thead><tr><th>Activity</th><th>Purpose (drafted)</th><th>Lawful basis</th><th>Built from</th><th /></tr></thead>
            <tbody>
              {proposed.map((r) => (
                <tr key={r.id}>
                  <td className="gv-strong">{r.activity}<span className="gv-sub">drafted by Claude</span></td>
                  <td>{r.purpose}</td>
                  <td>{basisLabel(r.basis)}<span className="gv-sub">Default for a public authority carrying out its functions; confirm before accepting.</span></td>
                  <td className="gv-muted">{r.assets.join(', ')}</td>
                  <td><Button variant="secondary" size="sm" onClick={() => setOpen(r)}>Review…</Button></td>
                </tr>
              ))}
              {!proposed.length && <tr><td colSpan={5}><Empty>Every proposal has been reviewed.</Empty></td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
      <Card title="Register" count={register.length}>
        <div className="table-wrap">
          <table className="tbl">
            <thead><tr><th>Activity</th><th>Status</th><th>Lawful basis</th><th>Data subjects & categories</th><th>Recipients</th><th>Retention</th><th /></tr></thead>
            <tbody>
              {register.map((r) => (
                <tr key={r.id}>
                  <td className="gv-strong">{r.activity}</td><td><StatusBadge s={r.status} /></td><td>{basisLabel(r.basis)}</td>
                  <td>{r.subjects}<span className="gv-sub">{r.categories.replace(/\n/g, ', ')}</span></td><td>{r.recipients || '—'}</td><td>{r.retention || '—'}</td>
                  <td><Button variant="secondary" size="sm" onClick={() => setOpen(r)}>Open</Button></td>
                </tr>
              ))}
              {!register.length && <tr><td colSpan={7}><Empty>No records yet — review a proposal above.</Empty></td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
      {open && <RopaForm rec={open} onClose={() => setOpen(null)} onSave={save} />}
    </>
  );
}

function RopaForm({ rec, onClose, onSave }) {
  const [f, setF] = useState(rec);
  const [hist, setHist] = useState(false);
  const set = (k) => (e) => setF((o) => ({ ...o, [k]: e.target.value }));
  const ta = (k, label) => <div className="full"><Fld label={label}><textarea className="input" rows={2} value={f[k]} onChange={set(k)} /></Fld></div>;
  return (
    <Drawer wide title={<span>{f.activity} <span className="tag" style={{ marginLeft: 6 }}>{rec.status === 'proposed' ? 'draft' : rec.status}</span></span>} onClose={onClose}
      footer={<><Button variant="secondary" size="md" onClick={onClose}>Close</Button><Button variant="secondary" size="md" onClick={() => onSave(f, 'draft')}>Save draft</Button><Button variant="primary" size="md" onClick={() => onSave(f, 'accepted')}>Accept record</Button></>}>
      <div className="gv-form">
        <div className="full"><Fld label="Activity"><input className="input" value={f.activity} onChange={set('activity')} /></Fld></div>
        <Fld label="Controller"><input className="input" value={f.controller} onChange={set('controller')} /></Fld>
        <Fld label="Contact"><input className="input" value={f.contact} onChange={set('contact')} /></Fld>
        <Fld label="Lawful basis (Article 6)"><select className="select" value={f.basis} onChange={set('basis')}>{LAWFUL_BASES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Fld>
        <Fld label="Special category condition (Article 9)"><select className="select" value={f.special} onChange={set('special')}>{SPECIAL_CONDITIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Fld>
        <div className="full"><Fld label="Transfers"><input className="input" value={f.transfers} onChange={set('transfers')} /></Fld></div>
        {ta('purpose', 'Purpose')}{ta('subjects', 'Data subjects (one per line)')}{ta('categories', 'Personal data categories')}{ta('recipients', 'Recipients')}{ta('retention', 'Retention')}{ta('security', 'Security measures')}
      </div>
      <Note>Evidence behind this record: {rec.evidence}</Note>
      <div style={{ marginTop: 12 }}>
        <Button variant="link" onClick={() => setHist((h) => !h)}>History ({rec.history.length})</Button>
        {hist && <ul className="gv-lines">{rec.history.map(([at, who, what], i) => <li key={i}><b>{who}</b> · {what} <span className="gv-faint">· {at}</span></li>)}</ul>}
      </div>
    </Drawer>
  );
}

/* ------------------------------------------------------------------ lawful basis & minimisation */
function Lawful({ accepted }) {
  const covered = new Set(accepted.flatMap((r) => r.assets));
  const notCovered = PD_ASSETS.filter((a) => !covered.has(a));
  const special = accepted.filter((r) => r.special !== 'not_applicable');
  return (
    <>
      <Card title="Lawful basis">
        {accepted.length ? (
          <div className="table-wrap"><table className="tbl"><thead><tr><th>Activity</th><th>Lawful basis</th><th>Assets</th></tr></thead>
            <tbody>{accepted.map((r) => <tr key={r.id}><td className="gv-strong">{r.activity}</td><td>{basisLabel(r.basis)}</td><td className="gv-muted">{r.assets.join(', ')}</td></tr>)}</tbody></table></div>
        ) : <Empty>No accepted records yet.</Empty>}
        <Note>{covered.size} of {PD_ASSETS.length} assets holding personal data are named in an accepted record.{notCovered.length ? ` Not yet covered: ${notCovered.join(', ')}.` : ''}</Note>
      </Card>
      <Card title="Special category">
        {special.length ? <ul className="gv-lines">{special.map((r) => <li key={r.id}><b>{r.activity}</b> — {SPECIAL_CONDITIONS.find(([v]) => v === r.special)[1]}</li>)}</ul> : <Empty>No special category condition recorded in an accepted record.</Empty>}
      </Card>
      <Card title="Data minimisation" sub="Personal data that nothing reads — no downstream asset, no data product, no model and no query in 30 days.">
        <ul className="gv-lines">{UNUSED.map((a) => <li key={a}><Mono>{a}</Mono> — holds personal data but nothing reads it and no query has touched it in 30 days ({PD_MAP.find((r) => r.asset === a).cols.join(', ')})</li>)}</ul>
      </Card>
      <div className="gv-two">
        <Card title="Beyond the declared categories"><Empty>Nothing held beyond what the records declare.</Empty></Card>
        <Card title="Purpose limitation" sub="Processing GenMeta can see that the record does not declare.">
          <div className="table-wrap"><table className="tbl"><thead><tr><th>Asset</th><th>Record</th><th>Undeclared recipient</th><th>Kind</th></tr></thead><tbody><tr><td colSpan={4}><Empty>Every use matches a declared recipient.</Empty></td></tr></tbody></table></div>
        </Card>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ data-handling rules */
function HandlingRules() {
  const [last, setLast] = useState('3 Oct 2026, 11:30 by scheduler');
  const [filter, setFilter] = useState('all');
  const total = HANDLING_RULES.length * PD_ASSETS.length;
  const failing = HANDLING_RULES.reduce((n, r) => n + r.fail.length, 0);
  const findings = HANDLING_RULES.flatMap((r) => r.fail.map((a) => ({ rule: r, a })))
    .sort((x, y) => (x.rule.key === 'residency' ? -1 : y.rule.key === 'residency' ? 1 : 0));
  const shown = filter === 'all' ? findings : findings.filter((f) => f.rule.key === filter);
  return (
    <>
      <Card title="Data-handling rules for personal data"
        actions={<Button variant="primary" size="md" icon={Play} onClick={() => { setLast(`${new Date().toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })} by you`); toast(`${total} checks run · ${failing} failing · 22 issue(s) raised`); }}>Run checks and raise issues</Button>}>
        <p className="gv-muted" style={{ fontSize: 13, margin: '0 0 16px' }}>Last run {last}: {total} checks, {failing} failing, 22 issue(s) raised.</p>
        <div className="gv-rules">
          {HANDLING_RULES.map((r) => { const ok = PD_ASSETS.length - r.fail.length; return (
            <div key={r.key}><span>{r.req}</span><i><em style={{ width: `${(ok / PD_ASSETS.length) * 100}%` }} /></i><b>{ok}/{PD_ASSETS.length}</b></div>
          ); })}
        </div>
      </Card>
      <Card title="Findings" count={shown.length} actions={<select className="select" value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Rule"><option value="all">All rules</option>{HANDLING_RULES.filter((r) => r.fail.length).map((r) => <option key={r.key} value={r.key}>{r.req}</option>)}</select>}>
        <div className="table-wrap gv-scroll">
          <table className="tbl">
            <thead><tr><th>Status</th><th>Requirement</th><th>Asset</th><th>Finding</th><th>Responsible</th></tr></thead>
            <tbody>{shown.map(({ rule, a }) => <tr key={rule.key + a}><td><StatusBadge s="fail" /></td><td>{rule.req}</td><td><Mono>{a}</Mono></td><td className="gv-muted">{rule.finding(a)}</td><td>{ownerOf(a)}</td></tr>)}</tbody>
          </table>
        </div>
      </Card>
    </>
  );
}

/* ------------------------------------------------------------------ assessments
   v2: ICO DPIA template as a real workspace (likelihood × severity → overall risk, measures with
   effect, residual risk and approval) and a OneTrust-style inherent vs residual heatmap. */
const residual = (r) => {
  if (r.effect === 'Eliminated') return ['Remote', 'Minimal'];
  if (r.effect === 'Reduced') return [LIKELIHOOD[Math.max(0, LIKELIHOOD.indexOf(r.l) - 1)], r.s];
  return [r.l, r.s];
};
const LEVEL_TONE = { High: 'fail', Medium: 'warn', Low: 'ok' };
function Heatmap({ risks, mode }) {
  const cell = (l, s) => risks.filter((r) => { const [a, b] = mode === 'residual' ? residual(r) : [r.l, r.s]; return a === l && b === s; }).length;
  return (
    <table className="gv-heat">
      <tbody>
        {[...LIKELIHOOD].reverse().map((l) => (
          <tr key={l}><th>{l}</th>{SEVERITY.map((s) => { const n = cell(l, s); const lv = riskLevel(l, s); return <td key={s} className={`lv-${lv.toLowerCase()}`} title={`${l} × ${s}: ${lv}`}>{n || ''}</td>; })}</tr>
        ))}
        <tr><th />{SEVERITY.map((s) => <th key={s} className="x">{s}</th>)}</tr>
      </tbody>
    </table>
  );
}
function Assessments({ records, list, setList }) {
  const [ind, setInd] = useState({});
  const [open, setOpen] = useState(null);
  const [mode, setMode] = useState('inherent');
  const ticked = SCREEN_INDICATORS.filter((i) => ind[i]);
  const auto = (r) => [r.assets.length >= 10 && 'Large-scale processing of personal data', PD_MAP.filter((x) => r.assets.includes(x.asset)).some((x) => x.shared.length) && 'Datasets combined or matched'].filter(Boolean);
  const verdict = (r) => { const n = new Set([...auto(r), ...ticked]).size; return r.special !== 'not_applicable' || n >= 2 ? ['DPIA required', n] : n === 1 ? ['Consider a DPIA', n] : ['Not required', 0]; };
  const start = (r) => {
    const a = { id: r.id, name: `DPIA — ${r.activity}`, domain: r.id, stage: 'Completion', template: 'ICO standard DPIA v1', assignees: 'assessor',
      risks: (SUGGESTED_RISKS[r.id] || []).map(([t, l, s, m]) => ({ t, l, s, measure: m, effect: 'Reduced', approved: false })),
      need: `${r.purpose} Screening found: ${[...new Set([...auto(r), ...ticked])].join(', ') || 'no high-risk indicators'}.`, dpo: '', acceptedBy: '', ico: 'No' };
    setList((l) => [...l, a]); setOpen(a.id); toast('Assessment started from the ICO template, pre-filled from GenMeta\'s metadata');
  };
  const allRisks = list.flatMap((a) => a.risks);
  const cur = list.find((a) => a.id === open);
  const update = (id, patch) => setList((l) => l.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  return (
    <>
      <Tiles items={[
        { l: 'DPIA required, not started', v: records.filter((r) => verdict(r)[0] === 'DPIA required' && !list.some((a) => a.id === r.id)).length, s: 'from sensitivity, processing and risk indicators' },
        { l: 'In progress', v: list.filter((a) => a.stage !== 'Approved').length, s: 'completion, review or approval' },
        { l: 'Approved', v: list.filter((a) => a.stage === 'Approved').length, s: '0 overdue review(s)' },
        { l: 'Risks recorded', v: allRisks.length, s: `${allRisks.filter((r) => riskLevel(...residual(r)) === 'High').length} high residual` },
      ]} />
      <div className="gv-two wide-l">
        <Card title="When a DPIA may be needed" sub="Screened automatically for each activity from data sensitivity, the kind of processing and risk indicators GenMeta can see. Tick anything it cannot see; it is added to the assessment.">
          <div className="gv-checks" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))' }}>
            {SCREEN_INDICATORS.map((i) => <label key={i}><input type="checkbox" checked={!!ind[i]} onChange={(e) => setInd((o) => ({ ...o, [i]: e.target.checked }))} />{i}</label>)}
          </div>
          <div className="table-wrap">
            <table className="tbl">
              <thead><tr><th>Activity</th><th>Record</th><th>Verdict</th><th>Why</th><th /></tr></thead>
              <tbody>{records.map((r) => { const [v] = verdict(r); const a = list.find((x) => x.id === r.id); const why = [...new Set([...auto(r), ...ticked])]; return (
                <tr key={r.id}><td className="gv-strong">{r.activity}</td><td><StatusBadge s={r.status === 'accepted' ? 'accepted' : 'warn'}>{r.status}</StatusBadge></td>
                  <td><StatusBadge s={v === 'Not required' ? 'ok' : v === 'DPIA required' ? 'fail' : 'warn'}>{v}</StatusBadge></td>
                  <td className="gv-muted">{why.join(', ') || 'no high-risk indicators'}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>{a ? <Button variant="secondary" size="sm" onClick={() => setOpen(a.id)}>Open</Button> : v !== 'Not required' && <Button variant="secondary" size="sm" onClick={() => start(r)}>Start assessment</Button>}</td></tr>
              ); })}</tbody>
            </table>
          </div>
        </Card>
        <Card title="Risk heatmap" sub="Every risk recorded across assessments, by likelihood and severity (ICO scales)."
          actions={<Segmented size="sm" value={mode} onChange={setMode} options={[{ value: 'inherent', label: 'Inherent' }, { value: 'residual', label: 'Residual' }]} />}>
          <Heatmap risks={allRisks} mode={mode} />
          <Note>{allRisks.length ? `${allRisks.length} risk(s). Residual applies each measure's effect: eliminated → low, reduced → one step less likely.` : 'Start an assessment to record risks.'}</Note>
        </Card>
      </div>
      <Card title="Assessments" count={list.length} actions={<Button variant="secondary" size="md" icon={Download} onClick={() => downloadCsv('dpia-register.csv', [['Assessment', 'Stage', 'Template', 'Risks', 'Highest residual', 'Assignees'], ...list.map((a) => [a.name, a.stage, a.template, a.risks.length, highest(a), a.assignees])])}>Export register (CSV)</Button>}>
        <div className="table-wrap">
          <table className="tbl">
            <thead><tr><th>Assessment</th><th>Stage</th><th>Template</th><th className="num">Risks</th><th>Highest residual</th><th>Assignees</th><th /></tr></thead>
            <tbody>
              {list.map((a) => (
                <tr key={a.id} className="click" onClick={() => setOpen(a.id)}><td className="gv-strong">{a.name}</td><td><StatusBadge s={a.stage === 'Approved' ? 'approved' : 'pending'}>{a.stage}</StatusBadge></td><td>{a.template}</td><td className="num">{a.risks.length}</td>
                  <td>{a.risks.length ? <StatusBadge s={LEVEL_TONE[highest(a)]}>{highest(a)}</StatusBadge> : '—'}</td><td>{a.assignees}</td><td><span className="gl-tlink">Open</span></td></tr>
              ))}
              {!list.length && <tr><td colSpan={7}><Empty>No assessments yet — start one from the screening table above.</Empty></td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
      {cur && <AssessmentDrawer a={cur} onClose={() => setOpen(null)} onUpdate={(p) => update(cur.id, p)} />}
    </>
  );
}
const highest = (a) => ['High', 'Medium', 'Low'].find((lv) => a.risks.some((r) => riskLevel(...residual(r)) === lv)) || '—';
const STAGE_NEXT = { Completion: ['Send to DPO review', 'DPO review', 'dpo'], 'DPO review': ['Send for approval', 'Approval', 'governance-lead'], Approval: ['Approve and sign off', 'Approved', '—'] };

function AssessmentDrawer({ a, onClose, onUpdate }) {
  const [sec, setSec] = useState('risks');
  const setRisk = (i, patch) => onUpdate({ risks: a.risks.map((r, k) => (k === i ? { ...r, ...patch } : r)) });
  const next = STAGE_NEXT[a.stage];
  const stages = ['Completion', 'DPO review', 'Approval', 'Approved'];
  const blocked = a.stage === 'Approval' && (!a.dpo.trim() || !a.acceptedBy.trim() || a.risks.some((r) => !r.approved));
  return (
    <Drawer wide title={a.name} onClose={onClose} footer={<>
      <Button variant="secondary" size="md" onClick={onClose}>Close</Button>
      {next && <Button variant="primary" size="md" disabled={blocked} onClick={() => { onUpdate({ stage: next[1], assignees: next[2] }); toast(`${next[0]} — now ${next[1]}`); }}>{next[0]}</Button>}
    </>}>
      <div className="gv-steps" style={{ marginBottom: 14 }}>{stages.map((s, i) => <div key={s} className={i < stages.indexOf(a.stage) ? 'done' : s === a.stage ? 'cur' : ''}><i>{i + 1}</i>{s}</div>)}</div>
      <Tabs items={[{ value: 'need', label: '1–4 Need & processing' }, { value: 'risks', label: `5–6 Risks & measures (${a.risks.length})` }, { value: 'sign', label: '7 Sign off' }]} value={sec} onChange={setSec} />
      {sec === 'need' && (<>
        <Fld label="What is the processing and why (pre-filled from the record)"><textarea className="input" rows={4} value={a.need} onChange={(e) => onUpdate({ need: e.target.value })} /></Fld>
        <KV rows={[['Template', a.template], ['Nature, scope, context', 'pre-filled from the record of processing, lineage and the personal-data map'], ['Consultation', 'DPO, information assurance and the asset owners']]} />
      </>)}
      {sec === 'risks' && (<>
        <div className="table-wrap">
          <table className="tbl">
            <thead><tr><th>Risk to individuals</th><th>Likelihood</th><th>Severity</th><th>Overall</th></tr></thead>
            <tbody>{a.risks.map((r, i) => (
              <tr key={i}><td>{r.t}</td>
                <td><select className="select" value={r.l} onChange={(e) => setRisk(i, { l: e.target.value })}>{LIKELIHOOD.map((x) => <option key={x}>{x}</option>)}</select></td>
                <td><select className="select" value={r.s} onChange={(e) => setRisk(i, { s: e.target.value })}>{SEVERITY.map((x) => <option key={x}>{x}</option>)}</select></td>
                <td><StatusBadge s={LEVEL_TONE[riskLevel(r.l, r.s)]}>{riskLevel(r.l, r.s)}</StatusBadge></td></tr>
            ))}</tbody>
          </table>
        </div>
        <div className="gv-section-label">Measures to reduce risk</div>
        <div className="table-wrap">
          <table className="tbl">
            <thead><tr><th>Measure</th><th>Effect on risk</th><th>Residual</th><th>Approved</th></tr></thead>
            <tbody>{a.risks.map((r, i) => (
              <tr key={i}><td><input className="input" value={r.measure} onChange={(e) => setRisk(i, { measure: e.target.value })} /></td>
                <td><select className="select" value={r.effect} onChange={(e) => setRisk(i, { effect: e.target.value })}>{EFFECTS.map((x) => <option key={x}>{x}</option>)}</select></td>
                <td><StatusBadge s={LEVEL_TONE[riskLevel(...residual(r))]}>{riskLevel(...residual(r))}</StatusBadge></td>
                <td><label className="gv-check"><input type="checkbox" checked={r.approved} onChange={(e) => setRisk(i, { approved: e.target.checked })} />yes</label></td></tr>
            ))}</tbody>
          </table>
        </div>
        <div style={{ marginTop: 10 }}><Button variant="secondary" size="sm" icon={Plus} onClick={() => onUpdate({ risks: [...a.risks, { t: 'New risk', l: 'Possible', s: 'Significant', measure: '', effect: 'Reduced', approved: false }] })}>Add a risk</Button></div>
      </>)}
      {sec === 'sign' && (<>
        <Fld label="DPO advice"><textarea className="input" rows={3} value={a.dpo} onChange={(e) => onUpdate({ dpo: e.target.value })} /></Fld>
        <div className="gv-form">
          <Fld label="Residual risk accepted by"><input className="input" value={a.acceptedBy} onChange={(e) => onUpdate({ acceptedBy: e.target.value })} /></Fld>
          <Fld label="ICO consultation needed"><select className="select" value={a.ico} onChange={(e) => onUpdate({ ico: e.target.value })}><option>No</option><option>Yes</option></select></Fld>
        </div>
        <Note>Sign-off needs DPO advice, a named person accepting the residual risk, and every measure approved. Any high residual risk means the ICO must be consulted before processing starts.</Note>
      </>)}
      {blocked && <Note>To approve: add DPO advice and who accepts the residual risk, and approve every measure.</Note>}
    </Drawer>
  );
}

/* ------------------------------------------------------------------ templates */
function Templates() {
  const [list, setList] = useState([{ ...ICO_TEMPLATE }]);
  const [name, setName] = useState('');
  const [sel, setSel] = useState(0);
  const t = list[sel];
  return (
    <>
      <Card title="Templates" sub="The standard template follows the ICO's DPIA structure. Copy it to make a departmental version — sections, guidance, fields, the review interval and the workflow stages are all editable by a governance lead.">
        <div className="gv-inline" style={{ marginBottom: 14 }}>
          <Fld label="New template name"><input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="New template name" /></Fld>
          <Button variant="secondary" size="md" icon={Copy} disabled={!name.trim()} onClick={() => { setList((l) => [...l, { ...ICO_TEMPLATE, name, kind: 'departmental', version: 'v1' }]); setSel(list.length); setName(''); toast(`Copied “ICO standard DPIA” as ${name}`); }}>Copy “ICO standard DPIA”</Button>
        </div>
        <div className="table-wrap">
          <table className="tbl">
            <thead><tr><th>Template</th><th>Version</th><th className="num">Sections</th><th>Stages</th><th>Review</th></tr></thead>
            <tbody>{list.map((x, i) => (
              <tr key={x.name + i} className={`click ${i === sel ? 'on' : ''}`} onClick={() => setSel(i)}>
                <td><span className="gv-strong">{x.name}</span> <span className="tag">{x.kind}</span><span className="gv-sub">{x.basis}</span></td>
                <td>{x.version}</td><td className="num">{x.sections.length}</td><td>{x.stages.map(([s]) => s).join(' → ')}</td><td>{x.review} days</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </Card>
      <Card title={t.name} sub={t.intro}>
        <div className="gv-inline" style={{ marginBottom: 12 }}>
          <Fld label="Review every (days)" ><input className="input" type="number" value={t.review} disabled={t.kind === 'standard'} onChange={(e) => setList((l) => l.map((x, i) => (i === sel ? { ...x, review: +e.target.value } : x)))} /></Fld>
        </div>
        <div className="gv-section-label" style={{ marginTop: 0 }}>Stages</div>
        <div className="gv-steps">{t.stages.map(([s, who], i) => <div key={s}><i>{i + 1}</i>{s} <span className="gv-faint">({who})</span></div>)}</div>
        <div className="gv-section-label">Sections</div>
        <ol className="gv-sections">{t.sections.map(([h, d, fields], i) => <li key={h}><b>{i + 1}. {h}</b><p>{d}</p><ul>{fields.map((f) => <li key={f}>{f}</li>)}</ul></li>)}</ol>
      </Card>
    </>
  );
}

/* ------------------------------------------------------------------ accountability pack */
function Pack({ records, assessments }) {
  const acc = records.filter((r) => r.status === 'accepted');
  const dr = records.filter((r) => r.status === 'draft');
  const covered = new Set(acc.flatMap((r) => r.assets));
  const without = PD_ASSETS.filter((a) => !covered.has(a));
  const list = (a) => (a.length ? a.join(', ') : '—');
  const sections = [
    ['Identification — what personal data is held', [['assets holding personal data', 25], ['of total', 37], ['personal data columns', 56], ['by category', `PII: ${piiCols} · FINANCIAL: ${finCols}`], ['systems', [...SYSTEMS].sort().join(', ')]]],
    ['Processing — on what basis', [['records', records.filter((r) => r.status !== 'proposed').length], ['accepted', acc.length], ['draft', dr.length], ['lawful bases', list([...new Set(acc.map((r) => basisLabel(r.basis)))])], ['assets without a record', list(without)]]],
    ['Storage — where and for how long', [['regions', 'eu-west-2 (London), not recorded'], ['retention rules applied', 0], ['without retention', list(PD_ASSETS)]]],
    ['Sharing — who receives it', [['data products', '—'], ['models', '—'], ['downstream assets', 15], ['undeclared recipients', '—']]],
    ['Data-handling rules', [['checks', 150], ['failed', 82], ...HANDLING_RULES.map((r) => [r.req, `${r.fail.length} of 25 failing`])]],
    ['Assessments', [['screened', acc.length], ['assessment required', assessments.filter((a) => a.stage !== 'Approved').length], ['signed off', assessments.filter((a) => a.stage === 'Approved').length]]],
    ['Accountability — the audit chain', [['audit entries', AUDIT.length], ['audit verified', 'true'], ['broken links', 0]]],
    ['Minimisation', [['unused', UNUSED.length ? `${UNUSED.length} asset(s): ${UNUSED.join(', ')}` : '—'], ['over collected', '—']]],
  ];
  return (
    <>
      <Card title="Accountability pack" sub={`Generated 3 Oct 2026, 11:37 for ${ORG.controller}, contact ${ORG.contact}. Everything here is measured from the running system.`}
        actions={<Button variant="secondary" size="md" icon={Download} onClick={() => downloadCsv('accountability-pack.csv', [['Section', 'Measure', 'Value'], ...sections.flatMap(([h, rows]) => rows.map(([k, v]) => [h, k, v]))])}>Export register (CSV)</Button>} />
      <div className="gv-two">
        {sections.map(([h, rows]) => <Card key={h} title={h}><KV rows={rows} /></Card>)}
      </div>
    </>
  );
}
