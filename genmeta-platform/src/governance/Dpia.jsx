import { useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams, Navigate } from 'react-router-dom';
import {
  Download, Play, Copy, Plus, Database, Tags, Map as MapIcon, FileCheck2, BookOpen, Scale, ShieldAlert, Minimize2, CheckCircle2, Target, ListChecks,
  AlertTriangle, Filter, Flame, ClipboardList, LayoutTemplate, FileText, PackageCheck, Search as Search2, Archive, Share2, Link2, Lock, RefreshCw, History, Recycle,
  ArrowLeft, Server, Cpu, Package, CircleDot, Gavel, Layers, Workflow as WorkflowIcon, GitFork,
} from 'lucide-react';
import { PageHead, Tabs, Button, Segmented } from '../components/ui.jsx';
import {
  ORG, PD_MAP, colKind, colClass, ROPA_DOMAINS, LAWFUL_BASES, SPECIAL_CONDITIONS, ownerOf, SCREEN_INDICATORS, ICO_TEMPLATE, SYSTEMS, AUDIT,
  LIKELIHOOD, SEVERITY, riskLevel, EFFECTS, BASE, DOMAIN_SYSTEMS,
} from './data.js';
import { useFacets, ResultsHead } from './catalog.jsx';
import RelGraph from './relgraph.jsx';
import { Card, Tiles, StatusBadge, Empty, Note, Mono, Fld, Drawer, KV, downloadCsv, toast, Meter } from './kit.jsx';
import {
  useDpia, setRole, saveRecord, runChecks, regeneratePack, setTemplates, startAssessment, updateAssessment, advanceAssessment,
  PD_ASSETS, productsOf, modelsOf, classesOf, retentionOf, retentionText, recipientsOf, recipientsText, retentionFor, evidenceOf, beyondDeclared, specialIn,
  undeclared, ruleTotals, unusedNow, screen, INDICATOR_WEIGHT, VIEW_ROLES, ROLE_PERSON, EARLIER_RISKS, residualOf, STEWARDED, setTicked, handlingRules,
} from './dpia-store.js';

export const DPIA_BASE = `${BASE}/dpia`;
const TABS = ['Processing activities', 'Personal data map', 'Lawful basis & minimisation', 'Data-handling rules', 'Assessments', 'Templates', 'Accountability pack']
  .map((label, i) => ({ value: ['activities', 'map', 'lawful', 'rules', 'assess', 'templates', 'pack'][i], label, icon: [BookOpen, MapIcon, Scale, ShieldAlert, ClipboardList, LayoutTemplate, PackageCheck][i] }));
const ALL_COLS = PD_MAP.flatMap((r) => r.cols);
const countClass = (k) => ALL_COLS.filter((c) => colClass(c) === k).length;
const basisLabel = (k) => LAWFUL_BASES.find(([v]) => v === k)?.[1] || k;
const CLASS_TONE = { PII: 'info', FINANCIAL: 'warn', SPECIAL_CATEGORY: 'bad', GOVERNMENT_ID: 'violet' };
const statusWord = (s) => (s === 'proposed' ? 'drafted — not accepted' : s);

export default function Dpia({ filters }) {
  const st = useDpia();
  const [sp, setSp] = useSearchParams();
  const tab = sp.get('tab') || 'activities';
  const setTab = (t) => setSp(t === 'activities' ? {} : { tab: t });
  const { records, assessments } = st;
  const accepted = records.filter((r) => r.status === 'accepted');
  const drafts = records.filter((r) => r.status === 'draft');
  const { total, failing } = ruleTotals(st);
  const required = records.filter((r) => screen(r).verdict === 'DPIA required' && !assessments.some((a) => a.id === r.id && a.stage === 'Approved'));
  const tiles = [
    { l: 'Assets holding personal data', v: PD_ASSETS.length, s: `${ALL_COLS.length} personal data columns` },
    { l: 'Accepted records of processing', v: accepted.length, s: `${drafts.length} draft · ${records.length - accepted.length - drafts.length} proposed` },
    { l: 'Handling rules failing', v: failing, s: `of ${total} checks on personal data` },
    { l: 'Assessments required', v: required.length, s: `${records.length} activities screened` },
  ];
  const path = [
    ['map', 'Find personal data', `${PD_MAP.length} of ${PD_MAP.length} assets mapped`, true],
    ['activities', 'Record the processing', `${accepted.length} of ${records.length} records accepted`, accepted.length === records.length],
    ['rules', 'Fix the handling rules', `${total - failing} of ${total} checks passing`, failing === 0],
    ['assess', 'Assess the high-risk activities', `${assessments.filter((a) => a.stage === 'Approved').length} signed off · ${required.length} still required`, required.length === 0],
    ['pack', 'Produce the accountability pack', st.packAt ? `regenerated ${st.packAt}` : 'built live from the steps above', !!st.packAt && required.length === 0 && failing === 0],
  ];
  return (
    <div className="page gv">
      <PageHead eyebrow="Govern" title="DPIA & GDPR"
        sub="Where personal data is identified, processed, stored and shared; the records of processing and the basis for each; the rules that govern personal data, monitored; and the impact assessments behind them.">
        <Fld label="Viewing as (test)">
          <select className="select" value={st.role} onChange={(e) => setRole(e.target.value)} aria-label="Viewing as">{VIEW_ROLES.map((r) => <option key={r} value={r}>{r} · {ROLE_PERSON[r]}</option>)}</select>
        </Fld>
      </PageHead>
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
      {tab === 'activities' && <ActivitiesCatalogue st={st} state={filters} />}
      {tab === 'lawful' && <Lawful st={st} />}
      {tab === 'rules' && <HandlingRules st={st} />}
      {tab === 'assess' && <Assessments st={st} />}
      {tab === 'templates' && <Templates st={st} />}
      {tab === 'pack' && <Pack st={st} />}
    </div>
  );
}

/* ------------------------------------------------------------------ personal data map */
function PersonalDataMap() {
  const nav = useNavigate();
  const [f, setF] = useState({ system: 'all', domain: 'all', region: 'all' });
  const comesFrom = (a) => PD_MAP.filter((x) => x.shared.includes(a)).map((x) => x.asset);
  const rows = PD_MAP.filter((x) => (f.system === 'all' || x.system === f.system) && (f.domain === 'all' || x.domain === f.domain) && (f.region === 'all' || x.region === f.region));
  const bySystem = [...SYSTEMS].sort().map((s) => [s, PD_MAP.filter((x) => x.system === s)]);
  const maxCols = Math.max(...bySystem.map(([, l]) => l.reduce((n, x) => n + x.cols.length, 0)));
  const set = (k) => (e) => setF((o) => ({ ...o, [k]: e.target.value }));
  const sp = specialIn(PD_ASSETS);
  const gov = PD_MAP.flatMap((x) => x.cols.filter((c) => colClass(c) === 'GOVERNMENT_ID').map((c) => `${x.asset}.${c}`));
  const withRet = PD_ASSETS.filter((a) => retentionOf(a).length).length;
  return (
    <>
      <div className="gv-two">
        <Card icon={Database} tone="info" title="Where personal data sits" sub="Personal-data columns per system. Click a system to filter the map.">
          <div className="gv-bars">
            {bySystem.map(([s, l]) => { const n = l.reduce((a, x) => a + x.cols.length, 0); return (
              <div key={s} className="click" onClick={() => setF((o) => ({ ...o, system: o.system === s ? 'all' : s }))} style={{ cursor: 'pointer', fontWeight: f.system === s ? 600 : 400 }}>
                <span>{s}</span><Meter pct={n / maxCols} tone="info" /><b>{n}</b>
              </div>
            ); })}
          </div>
        </Card>
        <Card icon={Tags} tone="violet" title="What kind of personal data" sub="From the classifier — names and contact details (PII), money linked to a person (FINANCIAL), National Insurance numbers (GOVERNMENT_ID) and Article 9 special-category data.">
          <div className="gv-health-n" style={{ marginBottom: 12 }}>
            {['PII', 'FINANCIAL', 'SPECIAL_CATEGORY', 'GOVERNMENT_ID'].map((k) => <div key={k}><b>{countClass(k)}</b><span>{k.replace('_', ' ').toLowerCase()}</span></div>)}
          </div>
          <Note>Special-category data found: {sp.map((x) => `${x.asset}.${x.col}`).join(', ')} — needs an Article 9 condition. NI numbers in {gov.join(', ')}. {withRet} of {PD_ASSETS.length} assets are held under a retention requirement.</Note>
        </Card>
      </div>
      <Card icon={MapIcon} tone="teal" title="Personal data map" count={rows.length}
        sub={`Built from the classifier, lineage, data products, models, the ownership register and access grants — ${PD_ASSETS.length} of 37 catalogued assets hold personal data across ${[...SYSTEMS].sort().join(', ')}.`}
        actions={<>
          <select className="select" value={f.system} onChange={set('system')} aria-label="System"><option value="all">All systems</option>{[...SYSTEMS].sort().map((s) => <option key={s}>{s}</option>)}</select>
          <select className="select" value={f.domain} onChange={set('domain')} aria-label="Domain"><option value="all">All domains</option>{ROPA_DOMAINS.map((s) => <option key={s}>{s}</option>)}</select>
          <select className="select" value={f.region} onChange={set('region')} aria-label="Region"><option value="all">Any region</option><option>eu-west-2 (London)</option><option>not recorded</option></select>
        </>}>
        <div className="table-wrap">
          <table className="tbl">
            <thead><tr><th>Asset</th><th>Personal data</th><th>Shared with</th><th>Owner / steward</th><th>Retention</th><th>Region</th></tr></thead>
            <tbody>{rows.map((x) => { const ret = retentionOf(x.asset); const used = [...productsOf(x.asset).map((p) => `product ${p}`), ...modelsOf(x.asset).map((m) => `model ${m}`)]; return (
              <tr key={x.asset} className="click" onClick={() => nav(assetPath(x.asset))}>
                <td><Mono>{x.asset}</Mono><span className="gv-sub">{x.system} · {x.sensitivity} · {x.domain}</span></td>
                <td><div className="gv-tags">{x.cols.map((c) => <span key={c} className={`tag mono ${colClass(c) === 'SPECIAL_CATEGORY' ? 'gv-tag-bad' : ''}`} title={colClass(c)}>{c}</span>)}</div></td>
                <td style={{ whiteSpace: 'normal' }}>{[...x.shared, ...used].join(', ') || '—'}</td><td>{x.owner}</td>
                <td>{ret.length ? <span title={ret.map((i) => i.retention).join('; ')}>{ret.map(retentionText).join('; ')}</span> : <span className="gv-muted">none</span>}</td>
                <td>{x.region === 'not recorded' ? <StatusBadge s="warn">not recorded</StatusBadge> : x.region}</td>
              </tr>
            ); })}
            {!rows.length && <tr><td colSpan={6}><Empty>No assets match these filters.</Empty></td></tr>}
            </tbody>
          </table>
        </div>
        <Note>Select an asset to open its page — where its personal data comes from and goes.</Note>
      </Card>
    </>
  );
}

/* ------------------------------------------------------------------ records of processing */
const builtFrom = (r) => {
  const prods = [...new Set(r.assets.flatMap(productsOf))]; const models = [...new Set(r.assets.flatMap(modelsOf))];
  return <>{r.assets.join(', ')}{prods.length > 0 && <span className="gv-sub">Data product: {prods.join(', ')}</span>}{models.length > 0 && <span className="gv-sub">Model trained on it: {models.join(', ')}</span>}</>;
};
function RopaForm({ rec, role, onSave }) {
  const prefRecip = !rec.recipients.trim() && recipientsOf(rec.assets).length > 0;
  const prefRet = !rec.retention.trim() && !!retentionFor(rec.assets);
  const [f, setF] = useState({ ...rec, recipients: rec.recipients || recipientsText(rec.assets), retention: rec.retention || retentionFor(rec.assets) });
  const [hist, setHist] = useState(false);
  const set = (k) => (e) => setF((o) => ({ ...o, [k]: e.target.value }));
  const isLead = role === 'governance-lead';
  const needs9 = specialIn(f.assets).length > 0 && f.special === 'not_applicable';
  const canAccept = isLead && !needs9;
  const whyNot = !isLead ? 'Only a governance lead can accept' : needs9 ? 'Choose an Article 9 condition first — this activity holds special-category data' : '';
  const beyond = beyondDeclared(f);
  const sp = specialIn(f.assets);
  const missing = [...new Set(beyond.map((b) => b.cls))];
  const ta = (k, label, hint) => <div className="full"><Fld label={label} hint={hint}><textarea className="input" rows={k === 'recipients' || k === 'retention' ? 3 : 2} value={f[k]} onChange={set(k)} /></Fld></div>;
  return (
    <Card icon={FileCheck2} tone="info" title="Record of processing (Article 30)" sub={rec.status === 'proposed' ? 'Drafted by Claude from the evidence — review, edit and accept.' : `Status: ${rec.status}.`}
      actions={<><Button variant="secondary" size="md" onClick={() => onSave(f, 'draft')}>Save draft</Button>
        <Button variant="primary" size="md" icon={canAccept ? undefined : Lock} disabled={!canAccept} onClick={() => onSave(f, 'accepted')} title={whyNot}>{rec.status === 'accepted' ? 'Save and keep accepted' : 'Accept record'}</Button></>}>
      {!isLead && <div className="gv-callout info" style={{ marginBottom: 12 }}><Lock size={15} /><span>You are viewing as <b>{role}</b>. Only a <b>governance-lead</b> can accept a record of processing — switch “Viewing as (test)” at the top of the page.</span></div>}
      {sp.length > 0 && f.special === 'not_applicable' && <div className="gv-callout bad" style={{ marginBottom: 12 }}><AlertTriangle size={15} /><span>This activity holds special-category data ({sp.map((x) => `${x.asset}.${x.col}`).join(', ')}). Choose an Article 9 condition — <b>Accept record</b> stays disabled until you do.</span></div>}
      {missing.length > 0 && <div className="gv-callout warn" style={{ marginBottom: 12 }}><AlertTriangle size={15} /><span>Held but not declared: {missing.join(', ')} ({beyond.map((b) => `${b.asset}.${b.col}`).join(', ')}). <Button variant="link" onClick={() => setF((o) => ({ ...o, categories: [...o.categories.split('\n').filter(Boolean), ...missing].join('\n') }))}>Add to categories</Button></span></div>}
      <div className="gv-form">
        <div className="full"><Fld label="Activity"><input className="input" value={f.activity} onChange={set('activity')} /></Fld></div>
        <Fld label="Controller"><input className="input" value={f.controller} onChange={set('controller')} /></Fld>
        <Fld label="Contact"><input className="input" value={f.contact} onChange={set('contact')} /></Fld>
        <Fld label="Lawful basis (Article 6)"><select className="select" value={f.basis} onChange={set('basis')}>{LAWFUL_BASES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Fld>
        <Fld label="Special category condition (Article 9)"><select className="select" value={f.special} onChange={set('special')}>{SPECIAL_CONDITIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Fld>
        <div className="full"><Fld label="Transfers"><input className="input" value={f.transfers} onChange={set('transfers')} /></Fld></div>
        {ta('purpose', 'Purpose')}{ta('subjects', 'Data subjects (one per line)')}{ta('categories', 'Personal data categories')}
        {ta('recipients', 'Recipients', prefRecip ? 'Pre-filled from lineage (downstream assets), data products and models that use this data — edit as needed.' : '')}
        {ta('retention', 'Retention', prefRet ? 'Pre-filled from the retention rule applied to these assets in Policies.' : '')}
        {ta('security', 'Security measures')}
      </div>
      <Note>Evidence behind this record: {evidenceOf(f)}</Note>
      <div style={{ marginTop: 12 }}>
        <Button variant="link" onClick={() => setHist((h) => !h)}>History ({rec.history.length})</Button>
        {hist && <ul className="gv-lines">{rec.history.map(([at, who, what], i) => <li key={i}><b>{who}</b> · {what} <span className="gv-faint">· {at}</span></li>)}</ul>}
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------------ lawful basis & minimisation */
function Lawful({ st }) {
  const accepted = st.records.filter((r) => r.status === 'accepted');
  const covered = new Set(accepted.flatMap((r) => r.assets));
  const notCovered = PD_ASSETS.filter((a) => !covered.has(a));
  const sp = specialIn(PD_ASSETS);
  const recFor = (a) => st.records.find((r) => r.assets.includes(a));
  const unused = unusedNow();
  const beyond = accepted.flatMap((r) => beyondDeclared(r).map((b) => ({ ...b, r })));
  const und = accepted.flatMap((r) => undeclared(r).map((u) => ({ ...u, r })));
  return (
    <>
      <Card icon={Scale} tone="info" title="Lawful basis">
        {accepted.length ? (
          <div className="table-wrap"><table className="tbl"><thead><tr><th>Activity</th><th>Lawful basis</th><th>Assets</th></tr></thead>
            <tbody>{accepted.map((r) => <tr key={r.id}><td className="gv-strong">{r.activity}</td><td>{basisLabel(r.basis)}</td><td className="gv-muted">{r.assets.join(', ')}</td></tr>)}</tbody></table></div>
        ) : <Empty>No accepted records yet.</Empty>}
        <Note>{covered.size} of {PD_ASSETS.length} assets holding personal data are named in an accepted record.{notCovered.length ? ` Not yet covered: ${notCovered.join(', ')}.` : ''}</Note>
      </Card>
      <Card icon={ShieldAlert} tone="violet" title="Special category (Article 9)" count={sp.length} sub="Every special-category column the classifier has found, and the condition recorded for it.">
        <div className="table-wrap"><table className="tbl"><thead><tr><th>Column</th><th>Record</th><th>Article 9 condition</th></tr></thead>
          <tbody>{sp.map((x) => { const r = recFor(x.asset); const ok = r && r.status === 'accepted' && r.special !== 'not_applicable'; return (
            <tr key={x.asset + x.col}><td><Mono>{x.asset}.{x.col}</Mono><span className="gv-sub">{colKind(x.col)}</span></td><td>{r ? `${r.activity} (${statusWord(r.status)})` : '—'}</td>
              <td>{ok ? <StatusBadge s="ok">{SPECIAL_CONDITIONS.find(([v]) => v === r.special)[1]}</StatusBadge> : <StatusBadge s="bad">{r && r.status === 'accepted' ? 'no condition recorded' : 'no accepted record'}</StatusBadge>}</td></tr>
          ); })}</tbody></table></div>
      </Card>
      <Card icon={Minimize2} tone="warn" title="Data minimisation" count={unused.length} sub="Personal data that nothing reads — no downstream asset, no data product, no model and no query in 30 days. Assets that feed a model or product are never listed.">
        <ul className="gv-lines">{unused.map((a) => <li key={a}><Mono>{a}</Mono> — holds personal data but nothing reads it and no query has touched it in 30 days ({PD_MAP.find((r) => r.asset === a).cols.join(', ')})</li>)}</ul>
      </Card>
      <div className="gv-two">
        <Card icon={beyond.length ? AlertTriangle : CheckCircle2} tone={beyond.length ? 'bad' : 'ok'} title="Beyond the declared categories" count={beyond.length} sub="Data an accepted record holds that its declared categories do not list.">
          {beyond.length ? (
            <div className="table-wrap"><table className="tbl"><thead><tr><th>Column</th><th>Class</th><th>Record</th></tr></thead>
              <tbody>{beyond.map((b) => <tr key={b.asset + b.col}><td><Mono>{b.asset}.{b.col}</Mono></td><td><StatusBadge s={CLASS_TONE[b.cls] === 'bad' ? 'bad' : 'warn'}>{b.cls}</StatusBadge></td><td>{b.r.activity}</td></tr>)}</tbody></table></div>
          ) : <Empty>{accepted.length ? 'Nothing held beyond what the accepted records declare.' : 'Accept a record to compare what it declares with what its assets hold.'}</Empty>}
        </Card>
        <Card icon={Target} tone={und.length ? 'warn' : 'ok'} title="Purpose limitation" count={und.length} sub="Downstream assets, data products and models using a record’s data that its Recipients do not name.">
          <div className="table-wrap"><table className="tbl"><thead><tr><th>Asset</th><th>Record</th><th>Undeclared recipient</th><th>Kind</th></tr></thead>
            <tbody>
              {und.map((u) => <tr key={u.r.id + u.v}><td><Mono>{u.from || '—'}</Mono></td><td>{u.r.activity}</td><td className="gv-strong">{u.v}</td><td>{u.kind}</td></tr>)}
              {!und.length && <tr><td colSpan={4}><Empty>{accepted.length ? 'Every use matches a declared recipient.' : 'Accept a record to check its recipients.'}</Empty></td></tr>}
            </tbody></table></div>
        </Card>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ data-handling rules */
function HandlingRules({ st }) {
  const [filter, setFilter] = useState('all');
  const { rules, total, failing } = ruleTotals(st);
  const findings = rules.flatMap((r) => r.fail.map((a) => ({ rule: r, a })));
  const shown = filter === 'all' ? findings : findings.filter((f) => f.rule.key === filter);
  const lr = st.lastRun;
  const stale = lr.total !== total || lr.failing !== failing;
  return (
    <>
      <Card icon={ListChecks} tone="warn" title="Data-handling rules for personal data"
        actions={<Button variant="primary" size="md" icon={Play} onClick={() => { const r = runChecks(); toast(`${r.total} checks run · ${r.failing} failing · ${r.issues} issue(s) raised — written to the audit log`); }}>Run checks and raise issues</Button>}>
        <p className="gv-muted" style={{ fontSize: 13, margin: '0 0 6px' }}>Now: {total} checks across {rules.length} rules, {failing} failing — computed from the current records, retention rules, stewards, models and data products.</p>
        <p className="gv-muted" style={{ fontSize: 13, margin: '0 0 16px' }}>Last run {lr.at} by {lr.by}: {lr.total} checks, {lr.failing} failing{lr.issues != null ? `, ${lr.issues} issue(s) raised` : ''}.{stale && <b style={{ color: 'var(--gv-warn)' }}> Things have changed since — run the checks to raise issues on the current state.</b>}</p>
        <div className="gv-rules">
          {rules.map((r) => { const ok = r.scope.length - r.fail.length; return (
            <div key={r.key}><span>{r.req}{r.scope.length !== PD_ASSETS.length && <small className="gv-faint"> · {r.scope.length} asset(s) in scope</small>}</span><Meter pct={r.scope.length ? ok / r.scope.length : 1} /><b>{ok}/{r.scope.length}</b></div>
          ); })}
        </div>
      </Card>
      <Card icon={AlertTriangle} tone="bad" title="Findings" count={shown.length} actions={<select className="select" value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Rule"><option value="all">All rules</option>{rules.filter((r) => r.fail.length).map((r) => <option key={r.key} value={r.key}>{r.req}</option>)}</select>}>
        <div className="table-wrap gv-scroll">
          <table className="tbl">
            <thead><tr><th>Status</th><th>Requirement</th><th>Asset</th><th>Finding</th><th>Responsible</th></tr></thead>
            <tbody>
              {shown.map(({ rule, a }) => <tr key={rule.key + a}><td><StatusBadge s="fail" /></td><td>{rule.req}</td><td><Mono>{a}</Mono></td><td className="gv-muted">{rule.finding(a)}</td><td>{ownerOf(a)}</td></tr>)}
              {!shown.length && <tr><td colSpan={5}><Empty>No failing checks.</Empty></td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}

/* ------------------------------------------------------------------ assessments */
const LEVEL_TONE = { High: 'fail', Medium: 'warn', Low: 'ok' };
function Heatmap({ risks, mode }) {
  const cell = (l, s) => risks.filter((r) => { const [a, b] = mode === 'residual' ? residualOf(r) : [r.l, r.s]; return a === l && b === s; }).length;
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
const highest = (a) => ['High', 'Medium', 'Low'].find((lv) => a.risks.some((r) => riskLevel(...residualOf(r)) === lv)) || '—';
const STAGE_NEXT = { Completion: ['Send to DPO review', 'DPO review', 'assessor'], 'DPO review': ['Send for approval', 'Approval', 'dpo'], Approval: ['Approve and sign off', 'Approved', 'governance-lead'] };
const holder = (a) => (a.stage === 'Completion' ? `assessor · ${a.assessor}` : a.stage === 'DPO review' ? `DPO · ${a.dpo}` : a.stage === 'Approval' ? `governance lead · ${a.lead}` : `review due ${a.reviewDue}`);

function Assessments({ st }) {
  const { records, assessments: list } = st;
  const nav = useNavigate();
  const ticked = st.ticked;
  const ind = Object.fromEntries(ticked.map((t) => [t, true]));
  const setInd = (fn) => { const o = fn(ind); setTicked(SCREEN_INDICATORS.filter((t) => o[t])); };
  const [mode, setMode] = useState('inherent');
  const allRisks = list.flatMap((a) => a.risks);
  const setOpen = (id) => nav(`${DPIA_BASE}/${id}?tab=assessment`);
  const start = (r) => { startAssessment(r, ticked); setOpen(r.id); toast('Assessment started from the template, pre-filled from GenMeta’s metadata'); };
  return (
    <>
      <Tiles items={[
        { l: 'DPIA required, not started', v: records.filter((r) => screen(r, ticked).verdict === 'DPIA required' && !list.some((a) => a.id === r.id)).length, s: 'from sensitivity, processing and risk indicators' },
        { l: 'In progress', v: list.filter((a) => a.stage !== 'Approved').length, s: 'completion, review or approval' },
        { l: 'Approved', v: list.filter((a) => a.stage === 'Approved').length, s: list.filter((a) => a.reviewDue).length ? `next review ${list.filter((a) => a.reviewDue).map((a) => a.reviewDue)[0]}` : '0 overdue review(s)' },
        { l: 'Risks recorded', v: allRisks.length, s: `${allRisks.filter((r) => riskLevel(...residualOf(r)) === 'High').length} high residual` },
      ]} />
      <div className="gv-two wide-l">
        <Card icon={Filter} tone="info" title="When a DPIA may be needed" sub="Screened automatically for each activity from data sensitivity, lineage, models and risk indicators GenMeta can see — each indicator is weighted. Tick anything it cannot see.">
          <div className="gv-checks" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))' }}>
            {SCREEN_INDICATORS.map((i) => <label key={i}><input type="checkbox" checked={!!ind[i]} onChange={(e) => setInd((o) => ({ ...o, [i]: e.target.checked }))} />{i} <span className="gv-faint">+{INDICATOR_WEIGHT[i]}</span></label>)}
          </div>
          <div className="table-wrap">
            <table className="tbl">
              <thead><tr><th>Activity</th><th>Record</th><th className="num">Score</th><th>Verdict</th><th>Why</th><th /></tr></thead>
              <tbody>{records.map((r) => { const s = screen(r, ticked); const a = list.find((x) => x.id === r.id); return (
                <tr key={r.id}><td className="gv-strong">{r.activity}</td><td><StatusBadge s={r.status === 'accepted' ? 'accepted' : r.status === 'draft' ? 'draft' : 'warn'}>{statusWord(r.status)}</StatusBadge></td>
                  <td className="num gv-strong">{s.score}</td>
                  <td><StatusBadge s={s.verdict === 'Not required' ? 'ok' : s.verdict === 'DPIA required' ? 'fail' : 'warn'}>{s.verdict}</StatusBadge></td>
                  <td className="gv-muted" style={{ whiteSpace: 'normal', minWidth: 240 }}>{s.found.length ? s.found.map(([f, why]) => <span key={f} className="gv-sub" style={{ display: 'block' }}><b>{f}</b> +{INDICATOR_WEIGHT[f] || 1} — {why}</span>) : 'no high-risk indicators'}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>{a ? <Button variant="secondary" size="sm" onClick={() => setOpen(a.id)}>Open</Button> : s.verdict !== 'Not required' && <Button variant="secondary" size="sm" onClick={() => start(r)}>Start assessment</Button>}</td></tr>
              ); })}</tbody>
            </table>
          </div>
        </Card>
        <Card icon={Flame} tone="bad" title="Risk heatmap" sub="Every risk recorded across assessments, by likelihood and severity (ICO scales)."
          actions={<Segmented size="sm" value={mode} onChange={setMode} options={[{ value: 'inherent', label: 'Inherent' }, { value: 'residual', label: 'Residual' }]} />}>
          <Heatmap risks={allRisks} mode={mode} />
          <Note>{allRisks.length ? `${allRisks.length} risk(s). Residual applies each measure's effect: eliminated → low, reduced → one step less likely.` : 'Start an assessment to record risks.'}</Note>
        </Card>
      </div>
      <Card icon={ClipboardList} tone="violet" title="Assessments" count={list.length} actions={<Button variant="secondary" size="md" icon={Download} onClick={() => downloadCsv('dpia-register.csv', [['Assessment', 'Stage', 'Template', 'Risks', 'Highest residual', 'Assessor', 'DPO', 'Governance lead', 'Review due'], ...list.map((a) => [a.name, a.stage, a.template, a.risks.length, highest(a), a.assessor, a.dpo, a.lead, a.reviewDue || ''])])}>Export register (CSV)</Button>}>
        <div className="table-wrap">
          <table className="tbl">
            <thead><tr><th>Assessment</th><th>Record</th><th>Stage</th><th className="num">Risks</th><th>Highest residual</th><th>With</th><th /></tr></thead>
            <tbody>
              {list.map((a) => { const r = records.find((x) => x.id === a.id); return (
                <tr key={a.id} className="click" onClick={() => setOpen(a.id)}><td className="gv-strong">{a.name}<span className="gv-sub">{a.template}</span></td>
                  <td><StatusBadge s={r.status === 'accepted' ? 'accepted' : 'warn'}>{statusWord(r.status)}</StatusBadge></td>
                  <td><StatusBadge s={a.stage === 'Approved' ? 'approved' : 'pending'}>{a.stage}</StatusBadge>{a.reviewDue && <span className="gv-sub">review due {a.reviewDue}</span>}</td><td className="num">{a.risks.length}</td>
                  <td>{a.risks.length ? <StatusBadge s={LEVEL_TONE[highest(a)]}>{highest(a)}</StatusBadge> : '—'}</td><td>{holder(a)}</td><td><span className="gl-tlink">Open</span></td></tr>
              ); })}
              {!list.length && <tr><td colSpan={7}><Empty>No assessments yet — start one from the screening table above.</Empty></td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}

function AssessmentWorkspace({ a, st }) {
  const [sec, setSec] = useState('risks');
  const [reuse, setReuse] = useState(false);
  const rec = st.records.find((r) => r.id === a.id);
  const upd = (patch, what) => updateAssessment(a.id, patch, what);
  const setRisk = (i, patch) => upd({ risks: a.risks.map((r, k) => (k === i ? { ...r, ...patch } : r)) });
  const next = STAGE_NEXT[a.stage];
  const stages = ['Completion', 'DPO review', 'Approval', 'Approved'];
  const noMeasure = a.risks.filter((r) => !r.measure.trim());
  const wrongRole = next && st.role !== next[2] && !(next[2] === 'assessor' && st.role === 'governance-lead');
  const blockReason = !next ? '' : wrongRole ? `Only the ${next[2]} can do this — you are viewing as ${st.role}.`
    : (a.stage === 'Completion' || a.stage === 'DPO review') && (!a.risks.length || noMeasure.length) ? (a.risks.length ? `Every risk needs a measure — ${noMeasure.map((r) => `“${r.t}”`).join(', ')}` : 'Record at least one risk first.')
      : a.stage === 'Approval' && (!a.advice.trim() || !a.acceptedBy.trim() || a.risks.some((r) => !r.approved)) ? 'To approve: add DPO advice and who accepts the residual risk, and approve every measure.' : '';
  const earlier = [...EARLIER_RISKS, ...st.assessments.filter((x) => x.id !== a.id).flatMap((x) => x.risks.map((r) => [x.name, r.t, r.l, r.s, r.measure]))]
    .filter(([, t]) => !a.risks.some((r) => r.t === t));
  return (
    <Card icon={ClipboardList} tone="violet" title={a.name} sub={`${a.template} · ${a.risks.length} risk(s)`}
      actions={next && <Button variant="primary" size="md" disabled={!!blockReason} onClick={() => { advanceAssessment(a.id, next[1], next[0]); toast(`${next[0]} — now ${next[1]} · written to the audit log`); }}>{next[0]}</Button>}>
      <div className="gv-steps" style={{ marginBottom: 14 }}>{stages.map((s, i) => <div key={s} className={i < stages.indexOf(a.stage) ? 'done' : s === a.stage ? 'cur' : ''}><i>{i + 1}</i>{s}</div>)}</div>
      <KV rows={[['Record', `${rec.activity} — ${statusWord(rec.status)}`], ['Template', a.template], ['Now with', holder(a)], ...(a.reviewDue ? [['Review due', a.reviewDue]] : [])]} />
      {blockReason && <div className="gv-callout warn" style={{ margin: '10px 0' }}><Lock size={15} /><span>{blockReason}</span></div>}
      <Tabs items={[{ value: 'need', label: '1–4 Need & processing' }, { value: 'risks', label: `5–6 Risks & measures (${a.risks.length})` }, { value: 'sign', label: '7 Sign off' }, { value: 'people', label: 'Assignees' }, { value: 'trail', label: `Audit trail (${a.history.length})` }]} value={sec} onChange={setSec} />
      {sec === 'need' && (<>
        <Fld label="What is the processing and why (pre-filled from the record and screening)"><textarea className="input" rows={5} value={a.need} onChange={(e) => upd({ need: e.target.value })} /></Fld>
        <KV rows={[['Nature, scope, context', `${rec.assets.length} assets · recipients: ${recipientsOf(rec.assets).map(([, v]) => v).join(', ') || '—'}`], ['Retention', retentionFor(rec.assets) || 'none applied'], ['Consultation', 'DPO, information assurance and the asset owners']]} />
      </>)}
      {sec === 'risks' && (<>
        <div className="gv-inline" style={{ justifyContent: 'flex-end', marginBottom: 8 }}>
          <Button variant="secondary" size="sm" icon={Recycle} onClick={() => setReuse((v) => !v)}>Reuse from earlier assessments</Button>
          <Button variant="secondary" size="sm" icon={Plus} onClick={() => upd({ risks: [...a.risks, { t: 'New risk', l: 'Possible', s: 'Significant', measure: '', effect: 'Reduced', approved: false }] }, 'Added a risk')}>Add a risk</Button>
        </div>
        {reuse && (
          <div className="gv-proposal">
            <b>Risks and measures from earlier assessments</b>
            {earlier.length ? <ul className="gv-lines" style={{ marginTop: 6 }}>{earlier.map(([from, t, l, s, m]) => (
              <li key={from + t}><b>{t}</b> <span className="gv-faint">· {l} × {s} · {from}</span><br /><span className="gv-muted">Measure: {m}</span>{' '}
                <Button variant="link" onClick={() => upd({ risks: [...a.risks, { t, l, s, measure: m, effect: 'Reduced', approved: false }] }, `Reused a risk from ${from}: ${t}`)}>Reuse</Button></li>
            ))}</ul> : <p className="gv-muted" style={{ margin: '6px 0 0' }}>Nothing else to reuse.</p>}
          </div>
        )}
        <div className="table-wrap">
          <table className="tbl">
            <thead><tr><th>Risk to individuals</th><th>Likelihood</th><th>Severity</th><th>Overall</th></tr></thead>
            <tbody>{a.risks.map((r, i) => (
              <tr key={i}><td><input className="input" value={r.t} onChange={(e) => setRisk(i, { t: e.target.value })} /></td>
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
              <tr key={i}><td><input className="input" value={r.measure} placeholder="Required before DPO review" style={!r.measure.trim() ? { borderColor: 'var(--gv-warn)' } : undefined} onChange={(e) => setRisk(i, { measure: e.target.value })} /></td>
                <td><select className="select" value={r.effect} onChange={(e) => setRisk(i, { effect: e.target.value })}>{EFFECTS.map((x) => <option key={x}>{x}</option>)}</select></td>
                <td><StatusBadge s={LEVEL_TONE[riskLevel(...residualOf(r))]}>{riskLevel(...residualOf(r))}</StatusBadge></td>
                <td><label className="gv-check"><input type="checkbox" checked={r.approved} disabled={st.role !== 'governance-lead' && st.role !== 'dpo'} onChange={(e) => upd({ risks: a.risks.map((x, k) => (k === i ? { ...x, approved: e.target.checked } : x)) }, `${e.target.checked ? 'Approved' : 'Withdrew approval of'} the measure for “${r.t}”`)} />yes</label></td></tr>
            ))}</tbody>
          </table>
        </div>
      </>)}
      {sec === 'sign' && (<>
        <Fld label="DPO advice"><textarea className="input" rows={3} value={a.advice} onChange={(e) => upd({ advice: e.target.value })} /></Fld>
        <div className="gv-form">
          <Fld label="Residual risk accepted by"><input className="input" value={a.acceptedBy} onChange={(e) => upd({ acceptedBy: e.target.value })} placeholder={a.lead} /></Fld>
          <Fld label="ICO consultation needed"><select className="select" value={a.ico} onChange={(e) => upd({ ico: e.target.value }, `ICO consultation set to ${e.target.value}`)}><option>No</option><option>Yes</option></select></Fld>
        </div>
        <Note>Sign-off needs DPO advice, a named person accepting the residual risk, and every measure approved. Any high residual risk means the ICO must be consulted before processing starts. On approval the review date is set from the template ({(st.templates.find((t) => t.name === a.template) || st.templates[0]).review} days).</Note>
      </>)}
      {sec === 'people' && (<>
        <div className="gv-form">
          <Fld label="Assessor (completion)"><input className="input" value={a.assessor} onChange={(e) => upd({ assessor: e.target.value })} onBlur={(e) => upd({}, `Assessor set to ${e.target.value}`)} /></Fld>
          <Fld label="Data protection officer (review)"><input className="input" value={a.dpo} onChange={(e) => upd({ dpo: e.target.value })} onBlur={(e) => upd({}, `DPO set to ${e.target.value}`)} /></Fld>
          <Fld label="Governance lead (approval)"><input className="input" value={a.lead} onChange={(e) => upd({ lead: e.target.value })} onBlur={(e) => upd({}, `Governance lead set to ${e.target.value}`)} /></Fld>
        </div>
        <Note>Each stage is assigned to the person named here. The stage only moves on when someone with that role acts (switch “Viewing as (test)” to try it).</Note>
      </>)}
      {sec === 'trail' && <ul className="gv-lines">{a.history.map(([at, who, what], k) => <li key={k}><b>{who}</b> · {what} <span className="gv-faint">· {at}</span></li>)}</ul>}
    </Card>
  );
}

/* ------------------------------------------------------------------ templates */
function Templates({ st }) {
  const list = st.templates;
  const [name, setName] = useState('');
  const [sel, setSel] = useState(0);
  const t = list[sel] || list[0];
  return (
    <>
      <Card icon={LayoutTemplate} tone="info" title="Templates" sub="The standard template follows the ICO's DPIA structure. Copy it to make a departmental version — sections, guidance, fields, the review interval and the workflow stages are all editable by a governance lead.">
        <div className="gv-inline" style={{ marginBottom: 14 }}>
          <Fld label="New template name"><input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="New template name" /></Fld>
          <Button variant="secondary" size="md" icon={Copy} disabled={!name.trim()} onClick={() => { setTemplates([...list, { ...ICO_TEMPLATE, name, kind: 'departmental', version: 'v1' }]); setSel(list.length); setName(''); toast(`Copied “ICO standard DPIA” as ${name}`); }}>Copy “ICO standard DPIA”</Button>
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
      <Card icon={FileText} tone="violet" title={t.name} sub={t.intro}>
        <div className="gv-inline" style={{ marginBottom: 12 }}>
          <Fld label="Review every (days)"><input className="input" type="number" value={t.review} disabled={t.kind === 'standard' || st.role !== 'governance-lead'} onChange={(e) => setTemplates(list.map((x, i) => (i === sel ? { ...x, review: +e.target.value } : x)))} /></Fld>
        </div>
        <div className="gv-section-label" style={{ marginTop: 0 }}>Stages</div>
        <div className="gv-steps">{t.stages.map(([s, who], i) => <div key={s}><i>{i + 1}</i>{s} <span className="gv-faint">({who})</span></div>)}</div>
        <div className="gv-section-label">Sections</div>
        <ol className="gv-sections">{t.sections.map(([h, d, fields], i) => <li key={h}><b>{i + 1}. {h}</b><p>{d}</p><ul>{fields.map((f) => <li key={f}>{f}</li>)}</ul></li>)}</ol>
      </Card>
    </>
  );
}

/* ------------------------------------------------------------------ accountability pack (built live) */
const PACK_ICONS = [[Search2, 'info'], [Scale, 'violet'], [Archive, 'teal'], [Share2, 'warn'], [ListChecks, 'bad'], [ClipboardList, 'violet'], [Link2, 'ok'], [Minimize2, 'warn']];
function Pack({ st }) {
  const { records, assessments } = st;
  const acc = records.filter((r) => r.status === 'accepted');
  const dr = records.filter((r) => r.status === 'draft');
  const covered = new Set(acc.flatMap((r) => r.assets));
  const without = PD_ASSETS.filter((a) => !covered.has(a));
  const noRet = PD_ASSETS.filter((a) => !retentionOf(a).length);
  const rules = [...new Set(PD_ASSETS.flatMap((a) => retentionOf(a).map((i) => i.title)))];
  const { rules: hr, total, failing } = ruleTotals(st);
  const und = acc.flatMap((r) => undeclared(r).map((u) => u.v));
  const beyond = acc.flatMap((r) => beyondDeclared(r));
  const unused = unusedNow();
  const sp = specialIn(PD_ASSETS);
  const list = (a) => (a.length ? a.join(', ') : '—');
  const sections = [
    ['Identification — what personal data is held', [['assets holding personal data', PD_ASSETS.length], ['of total', 37], ['personal data columns', ALL_COLS.length], ['by category', ['PII', 'FINANCIAL', 'SPECIAL_CATEGORY', 'GOVERNMENT_ID'].map((k) => `${k}: ${countClass(k)}`).join(' · ')], ['systems', [...SYSTEMS].sort().join(', ')]]],
    ['Processing — on what basis', [['records', records.filter((r) => r.status !== 'proposed').length], ['accepted', acc.length], ['draft', dr.length], ['lawful bases', list([...new Set(acc.map((r) => basisLabel(r.basis)))])], ['special category (Article 9)', `${sp.length} column(s) · ${acc.filter((r) => r.special !== 'not_applicable').length} record(s) name a condition`], ['assets without a record', list(without)]]],
    ['Storage — where and for how long', [['regions', [...new Set(PD_MAP.map((r) => r.region))].join(', ')], ['retention rules applied', `${rules.length} (${list(rules)}) on ${PD_ASSETS.length - noRet.length} asset(s)`], ['without retention', list(noRet)]]],
    ['Sharing — who receives it', [['data products', list([...new Set(PD_ASSETS.flatMap(productsOf))])], ['models', list([...new Set(PD_ASSETS.flatMap(modelsOf))])], ['downstream assets', [...new Set(PD_MAP.flatMap((r) => r.shared))].length], ['undeclared recipients', list([...new Set(und)])]]],
    ['Data-handling rules', [['checks', total], ['failed', failing], ['last run', `${st.lastRun.at} by ${st.lastRun.by}`], ...hr.map((r) => [r.req, `${r.fail.length} of ${r.scope.length} failing`])]],
    ['Assessments', [['activities screened', records.length], ['DPIA required', records.filter((r) => screen(r).verdict === 'DPIA required').length], ['in progress', assessments.filter((a) => a.stage !== 'Approved').length], ['signed off', assessments.filter((a) => a.stage === 'Approved').map((a) => `${a.name} (review due ${a.reviewDue})`).join('; ') || 0]]],
    ['Accountability — the audit chain', [['audit entries', AUDIT.length], ['audit verified', 'true'], ['broken links', 0]]],
    ['Minimisation', [['unused', unused.length ? `${unused.length} asset(s): ${unused.join(', ')}` : '—'], ['held beyond declared categories', beyond.length ? beyond.map((b) => `${b.asset}.${b.col}`).join(', ') : '—']]],
  ];
  return (
    <>
      <Card icon={PackageCheck} tone="ok" title="Accountability pack" sub={`${st.packAt ? `Regenerated ${st.packAt}` : 'Built live'} for ${ORG.controller}, contact ${ORG.contact}. Everything here is measured from the current state — records, retention, rules, assessments and the audit chain.`}
        actions={<>
          <Button variant="secondary" size="md" icon={RefreshCw} onClick={() => { regeneratePack(); toast('Accountability pack regenerated from the current state'); }}>Regenerate</Button>
          <Button variant="secondary" size="md" icon={Download} onClick={() => downloadCsv('accountability-pack.csv', [['Section', 'Measure', 'Value'], ...sections.flatMap(([h, rows]) => rows.map(([k, v]) => [h, k, v]))])}>Export (CSV)</Button>
        </>} />
      <div className="gv-two">
        {sections.map(([h, rows], i) => <Card key={h} icon={PACK_ICONS[i][0]} tone={PACK_ICONS[i][1]} title={h}><KV rows={rows} /></Card>)}
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ processing activities — catalogue look (like Data assets / AI models) */
const STAGE_OF = (st, r) => st.assessments.find((a) => a.id === r.id)?.stage || 'No assessment';
const activityView = (st, r) => {
  const s = screen(r, st.ticked);
  const a = st.assessments.find((x) => x.id === r.id);
  const systems = [...new Set(PD_MAP.filter((x) => r.assets.includes(x.asset)).map((x) => x.system))];
  const classes = [...new Set(r.assets.flatMap(classesOf))].sort();
  return { ...r, s, a, systems, classes, stage: STAGE_OF(st, r), highest: a ? highest(a) : null };
};
const A_FACETS = [
  { key: 'status', label: 'Record status', icon: CircleDot, open: true, of: (r) => [statusWord(r.status)] },
  { key: 'verdict', label: 'DPIA screening', icon: Filter, open: true, of: (r) => [r.s.verdict] },
  { key: 'stage', label: 'Assessment stage', icon: ClipboardList, of: (r) => [r.stage] },
  { key: 'system', label: 'System', icon: Server, drop: true, all: 'All systems', of: (r) => r.systems },
  { key: 'basis', label: 'Lawful basis', icon: Gavel, drop: true, all: 'All lawful bases', of: (r) => [basisLabel(r.basis).split(' — ')[0]] },
  { key: 'classes', label: 'Data held', icon: Tags, of: (r) => r.classes },
];
const A_SORTS = {
  risk: ['Screening score', (a, b) => b.s.score - a.s.score],
  name: ['Name (A–Z)', (a, b) => a.activity.localeCompare(b.activity)],
  assets: ['Assets', (a, b) => b.assets.length - a.assets.length],
};
export function useDpiaFilters() {
  const st = useDpia();
  const list = useMemo(() => st.records.map((r) => activityView(st, r)), [st]);
  return useFacets('dpia', list, A_FACETS, (r) => `${r.activity} ${r.purpose} ${r.assets.join(' ')} ${r.systems.join(' ')} ${basisLabel(r.basis)}`, A_SORTS);
}

function ActivitiesCatalogue({ st, state }) {
  const nav = useNavigate();
  const { results } = state;
  const exportCsv = () => downloadCsv('records-of-processing.csv', [['Activity', 'Status', 'Controller', 'Lawful basis', 'Purpose', 'Data subjects', 'Categories', 'Recipients', 'Retention', 'Assets'], ...st.records.map((r) => [r.activity, r.status, r.controller, basisLabel(r.basis), r.purpose, r.subjects, r.categories.replace(/\n/g, '; '), r.recipients.replace(/\n/g, '; '), r.retention.replace(/\n/g, '; '), r.assets.join('; ')])]);
  const open = (r) => nav(`${DPIA_BASE}/${r.id}`);
  return (
    <div className="cat gv fade-in">
      <div className="pl-gaps">
        <span className="gv-muted" style={{ fontSize: 13 }}>One record of processing per business domain that holds personal data — drafted by Claude from the evidence, accepted by a governance lead. Controller {ORG.controller}, contact {ORG.contact}.</span>
        <span style={{ flex: 1 }} />
        <Button variant="secondary" size="md" icon={Download} onClick={exportCsv}>Export register (CSV)</Button>
      </div>
      <section className="results">
        <ResultsHead state={state} noun="processing activities" placeholder="Search activities, purposes, assets, systems…" />
        {!results.length ? <div className="empty card"><Search2 size={20} /><b>No activities match</b><p>Remove a filter.</p></div> : (
          <div className="arows">{results.map((r) => {
            const prods = [...new Set(r.assets.flatMap(productsOf))]; const models = [...new Set(r.assets.flatMap(modelsOf))];
            const vt = r.s.verdict === 'DPIA required' ? 'bad' : r.s.verdict === 'Consider a DPIA' ? 'warn' : 'ok';
            return (
              <article key={r.id} className="arow" onClick={() => open(r)} onKeyDown={(e) => e.key === 'Enter' && open(r)} tabIndex={0} role="link" aria-label={`Open ${r.activity}`}>
                <div className="arow-main">
                  <div className="arow-t">
                    <span className="gv-chip sm info"><BookOpen size={13} /></span>
                    <b>{r.activity}</b>
                    <StatusBadge s={r.status === 'accepted' ? 'accepted' : r.status === 'draft' ? 'draft' : 'warn'}>{statusWord(r.status)}</StatusBadge>
                    {r.a && <StatusBadge s={r.a.stage === 'Approved' ? 'approved' : 'pending'}>DPIA {r.a.stage.toLowerCase()}</StatusBadge>}
                    {r.classes.includes('SPECIAL_CATEGORY') && <span className="gv-badge bad"><i />special category</span>}
                  </div>
                  <div className="arow-path">
                    <span><Layers size={13} strokeWidth={1.75} />{r.id} domain</span><span className="sep">·</span><span>{r.systems.join(', ')}</span>
                  </div>
                  <p className="arow-d">{r.purpose}</p>
                  <div className="arow-meta">
                    <span><b>{r.assets.length}</b> assets</span>
                    <span>Lawful basis <b>{basisLabel(r.basis).split(' — ')[0]}</b></span>
                    <span>Recipients <b>{recipientsOf(r.assets).length}</b></span>
                    <span>Retention <b>{retentionFor(r.assets) ? '6 years (HMRC default)' : 'none'}</b></span>
                    {r.a?.reviewDue && <span>Review due <b>{r.a.reviewDue}</b></span>}
                    {r.classes.map((c) => <span key={c} className="term">{c}</span>)}
                    {prods.map((p) => <span key={p} className="term">product {p}</span>)}
                    {models.map((m) => <span key={m} className="term">model {m}</span>)}
                  </div>
                </div>
                <div className="arow-side">
                  <span className={`gv-riskband ${vt}`}>{r.s.verdict}</span>
                  <span className="trust"><i style={{ width: `${Math.min(100, Math.round((r.s.score / 10) * 100))}%` }} /></span>
                  <small>Screening score {r.s.score}</small>
                  <small>{r.highest ? `Highest residual: ${r.highest}` : r.a ? 'No risks yet' : 'No assessment yet'}</small>
                </div>
              </article>
            );
          })}</div>
        )}
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------ one processing activity (asset-page look) */
const ACT_TABS = [['record', 'Record of processing'], ['data', 'Personal data'], ['flow', 'Data flow'], ['assessment', 'Assessment (DPIA)'], ['findings', 'Findings'], ['trail', 'Audit trail']];
export function DpiaActivityPage() {
  const { activityId } = useParams();
  const nav = useNavigate();
  const st = useDpia();
  const [sp, setSp] = useSearchParams();
  const tab = sp.get('tab') || 'record';
  const setTab = (t) => setSp(t === 'record' ? {} : { tab: t });
  const r = st.records.find((x) => x.id === activityId);
  if (!r) return <Navigate to={DPIA_BASE} replace />;
  const v = activityView(st, r);
  const a = v.a;
  const rules = handlingRules(st).map((x) => ({ ...x, fail: x.fail.filter((as) => r.assets.includes(as)) })).filter((x) => x.fail.length);
  const nFind = rules.reduce((n, x) => n + x.fail.length, 0) + (r.status === 'accepted' ? beyondDeclared(r).length + undeclared(r).length : 0);
  const trail = [...r.history.map(([at, who, what]) => [at, who, `Record — ${what}`]), ...(a ? a.history.map(([at, who, what]) => [at, who, `DPIA — ${what}`]) : [])];
  const vt = v.s.verdict === 'DPIA required' ? 'bad' : v.s.verdict === 'Consider a DPIA' ? 'warn' : 'ok';
  return (
    <div className="page asset gv fade-in" key={r.id}>
      <div className="asset-head">
        <button type="button" className="icon-btn back" onClick={() => nav(DPIA_BASE)} aria-label="Back to processing activities"><ArrowLeft size={17} /></button>
        <div className="asset-title">
          <div className="at-row">
            <h1>{r.activity}</h1>
            <StatusBadge s={r.status === 'accepted' ? 'accepted' : r.status === 'draft' ? 'draft' : 'warn'}>{statusWord(r.status)}</StatusBadge>
            <span className={`gv-riskband ${vt}`}>{v.s.verdict} · score {v.s.score}</span>
          </div>
          <div className="at-path">
            <span><BookOpen size={13} strokeWidth={1.75} />Processing activity</span><span className="sep">·</span><span>{r.id} domain</span>
            <span className="sep">·</span><span>{v.systems.join(', ')}</span><span className="sep">·</span><span>{r.assets.length} assets</span>
          </div>
        </div>
        <div className="head-actions">
          <Fld label="Viewing as (test)"><select className="select" value={st.role} onChange={(e) => setRole(e.target.value)} aria-label="Viewing as">{VIEW_ROLES.map((x) => <option key={x} value={x}>{x} · {ROLE_PERSON[x]}</option>)}</select></Fld>
        </div>
      </div>
      <nav className="asset-tabs" role="tablist">
        {ACT_TABS.map(([k, l]) => (
          <button type="button" key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>
            {l}{k === 'findings' && nFind > 0 && <em>{nFind}</em>}{k === 'trail' && <em>{trail.length}</em>}{k === 'data' && <em>{r.assets.length}</em>}
          </button>
        ))}
      </nav>

      {tab === 'record' && <RopaForm key={`${r.id}-${r.status}-${r.history.length}`} rec={r} role={st.role} onSave={(rec, status) => { saveRecord(rec, status); toast(status === 'accepted' ? `Accepted “${rec.activity}” — written to the audit log` : 'Draft saved'); }} />}

      {tab === 'data' && (
        <Card icon={Database} tone="teal" title="Personal data in this activity" count={r.assets.length}>
          <div className="table-wrap">
            <table className="tbl">
              <thead><tr><th>Asset</th><th>Personal data</th><th>Shared with</th><th>Retention</th><th>Region</th><th>Steward</th></tr></thead>
              <tbody>{PD_MAP.filter((x) => r.assets.includes(x.asset)).map((x) => (
                <tr key={x.asset}>
                  <td><Mono>{x.asset}</Mono><span className="gv-sub">{x.system} · {classesOf(x.asset).join(', ')}</span></td>
                  <td><div className="gv-tags">{x.cols.map((c) => <span key={c} className={`tag mono ${colClass(c) === 'SPECIAL_CATEGORY' ? 'gv-tag-bad' : ''}`} title={colKind(c)}>{c}</span>)}</div></td>
                  <td style={{ whiteSpace: 'normal' }}>{[...x.shared, ...productsOf(x.asset).map((p) => `product ${p}`), ...modelsOf(x.asset).map((m) => `model ${m}`)].join(', ') || '—'}</td>
                  <td>{retentionOf(x.asset).map(retentionText).join('; ') || <span className="gv-muted">none</span>}</td>
                  <td>{x.region === 'not recorded' ? <StatusBadge s="warn">not recorded</StatusBadge> : x.region}</td>
                  <td>{STEWARDED.includes(x.asset) ? 'named' : <StatusBadge s="warn">none</StatusBadge>}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </Card>
      )}

      {tab === 'flow' && <ActivityFlow r={r} />}

      {tab === 'assessment' && (<>
        <Card icon={Filter} tone="info" title="Screening" sub={`Score ${v.s.score} — ${v.s.verdict}. Indicators ticked on the Assessments tab are included.`}>
          <ul className="gv-lines">{v.s.found.length ? v.s.found.map(([f, why]) => <li key={f}><b>{f}</b> <span className="gv-faint">+{INDICATOR_WEIGHT[f] || 1}</span> — {why}</li>) : <li>No high-risk indicators.</li>}</ul>
          {!a && v.s.verdict !== 'Not required' && <Button variant="primary" size="md" icon={Plus} onClick={() => { startAssessment(r, st.ticked); toast('Assessment started from the template, pre-filled from GenMeta’s metadata'); }}>Start assessment</Button>}
          {!a && v.s.verdict === 'Not required' && <Note>No DPIA is required for this activity on current evidence.</Note>}
        </Card>
        {a && <AssessmentWorkspace a={a} st={st} />}
      </>)}

      {tab === 'findings' && (<>
        <Card icon={AlertTriangle} tone="bad" title="Data-handling rules failing for this activity" count={rules.reduce((n, x) => n + x.fail.length, 0)}>
          <div className="table-wrap"><table className="tbl"><thead><tr><th>Requirement</th><th>Asset</th><th>Finding</th><th>Responsible</th></tr></thead>
            <tbody>{rules.flatMap((x) => x.fail.map((as) => <tr key={x.key + as}><td>{x.req}</td><td><Mono>{as}</Mono></td><td className="gv-muted">{x.finding(as)}</td><td>{ownerOf(as)}</td></tr>))}
              {!rules.length && <tr><td colSpan={4}><Empty>Every rule passes for this activity’s assets.</Empty></td></tr>}</tbody></table></div>
        </Card>
        <div className="gv-two">
          <Card icon={ShieldAlert} tone="violet" title="Beyond the declared categories" count={r.status === 'accepted' ? beyondDeclared(r).length : 0}>
            {r.status !== 'accepted' ? <Empty>Checked once the record is accepted.</Empty> : beyondDeclared(r).length ? <ul className="gv-lines">{beyondDeclared(r).map((b) => <li key={b.asset + b.col}><Mono>{b.asset}.{b.col}</Mono> — {b.cls} held but not declared</li>)}</ul> : <Empty>Nothing held beyond what the record declares.</Empty>}
          </Card>
          <Card icon={Target} tone="warn" title="Purpose limitation" count={r.status === 'accepted' ? undeclared(r).length : 0}>
            {r.status !== 'accepted' ? <Empty>Checked once the record is accepted.</Empty> : undeclared(r).length ? <ul className="gv-lines">{undeclared(r).map((u) => <li key={u.v}><b>{u.v}</b> ({u.kind.toLowerCase()}) uses this data but is not named in Recipients</li>)}</ul> : <Empty>Every use matches a declared recipient.</Empty>}
          </Card>
        </div>
        {specialIn(r.assets).length > 0 && <Note>Special-category data: {specialIn(r.assets).map((x) => `${x.asset}.${x.col}`).join(', ')} — Article 9 condition: {r.special === 'not_applicable' ? 'none recorded' : SPECIAL_CONDITIONS.find(([k]) => k === r.special)[1]}.</Note>}
      </>)}

      {tab === 'trail' && <Card icon={History} tone="info" title="Audit trail" count={trail.length} sub="Changes to the record and its DPIA. The same events are written to the hash-chained audit log."><ul className="gv-lines">{trail.map(([at, who, what], k) => <li key={k}><b>{who}</b> · {what} <span className="gv-faint">· {at}</span></li>)}</ul></Card>}
    </div>
  );
}

/* data flow as a lineage graph: systems → assets → this activity → downstream assets, data products, models */
function ActivityFlow({ r }) {
  const { columns, edges } = useMemo(() => {
    const rows = PD_MAP.filter((x) => r.assets.includes(x.asset));
    const shown = rows.slice(0, 10); const more = rows.length - shown.length;
    const systems = [...new Set(rows.map((x) => x.system))];
    const rec = recipientsOf(r.assets);
    const kindIcon = { 'Downstream asset': Database, 'Data product': Package, Model: Cpu };
    const cols = [
      { title: 'Systems', nodes: systems.map((s) => ({ id: `sys:${s}`, label: s, kind: 'system', icon: Server, sub: `${rows.filter((x) => x.system === s).length} asset(s)` })) },
      { title: 'Assets holding personal data', nodes: [...shown.map((x) => ({ id: `as:${x.asset}`, label: x.asset, kind: x.system.split(' ')[0], icon: Database, sub: `${x.cols.length} cols · ${classesOf(x.asset).join(', ')}`, tag: specialIn([x.asset]).length ? 'Art. 9' : '' })), ...(more > 0 ? [{ id: 'as:more', label: `+ ${more} more`, kind: 'assets', icon: Database, sub: 'see Personal data' }] : [])] },
      { title: 'Processing activity', nodes: [{ id: 'act', label: r.activity, kind: basisLabel(r.basis).split(' — ')[0], icon: BookOpen, sub: statusWord(r.status), focus: true, flag: 'Activity' }] },
      { title: 'Recipients', nodes: rec.map(([k, x]) => ({ id: `rc:${x}`, label: x, kind: k.toLowerCase(), icon: kindIcon[k], sub: r.status === 'accepted' && !r.recipients.includes(x) ? 'not declared in the record' : 'declared', muted: false })) },
    ];
    const es = [];
    shown.forEach((x) => es.push({ s: `sys:${x.system}`, t: `as:${x.asset}`, rel: '' }));
    if (more > 0) es.push({ s: `sys:${systems[0]}`, t: 'as:more', rel: '' });
    [...shown.map((x) => `as:${x.asset}`), ...(more > 0 ? ['as:more'] : [])].forEach((id) => es.push({ s: id, t: 'act', rel: '' }));
    rec.forEach(([k, x]) => es.push({ s: 'act', t: `rc:${x}`, rel: k === 'Model' ? 'trains' : k === 'Data product' ? 'published in' : 'shared with' }));
    return { columns: cols, edges: es };
  }, [r]);
  return <RelGraph columns={columns} edges={edges} title={`Data flow — ${r.activity}`} hint="Where the personal data in this activity sits and who receives it. Hover to highlight · drag to pan." />;
}

/* ------------------------------------------------------------------ personal data map: one asset, in detail */
export const assetPath = (a) => `${DPIA_BASE}/assets/${encodeURIComponent(a)}`;

export function DpiaAssetPage() {
  const { asset } = useParams();
  const r = PD_MAP.find((x) => x.asset === asset);
  if (!r) return <Navigate to={`${DPIA_BASE}?tab=map`} replace />;
  return <AssetPage key={r.asset} r={r} />;
}

function AssetPage({ r }) {
  const st = useDpia();
  const nav = useNavigate();
  const onOpen = (a) => nav(assetPath(a));
  const [colsAll, setColsAll] = useState(false);
  const pdx = (a) => PD_MAP.find((x) => x.asset === a);
  const ups1 = PD_MAP.filter((x) => x.shared.includes(r.asset)).map((x) => x.asset);
  const ups2 = [...new Set(PD_MAP.filter((x) => x.shared.some((s) => ups1.includes(s))).map((x) => x.asset))].filter((a) => !ups1.includes(a) && a !== r.asset);
  const downs1 = r.shared;
  const downs2 = [...new Set(downs1.flatMap((a) => pdx(a)?.shared || []))].filter((a) => !downs1.includes(a) && a !== r.asset);
  const prods = productsOf(r.asset); const models = modelsOf(r.asset);
  const rec = st.records.find((x) => x.assets.includes(r.asset));
  const ret = retentionOf(r.asset);
  const classes = classesOf(r.asset);
  const sp = specialIn([r.asset]);
  const rules = handlingRules(st).filter((x) => x.scope.includes(r.asset));
  const failing = rules.filter((x) => x.fail.includes(r.asset));
  const assetNode = (a, extra = {}) => { const x = pdx(a); return { id: a, label: a, kind: x ? x.system.split(' ')[0] : 'asset', icon: Database, sub: x ? `${x.cols.length} cols · ${classesOf(a).join(', ')}` : 'no personal data', tag: specialIn([a]).length ? 'Art. 9' : '', asset: a, ...extra }; };
  const columns = [
    { title: 'Upstream (2 steps)', nodes: ups2.map((a) => assetNode(a)) },
    { title: 'Comes from', nodes: ups1.map((a) => assetNode(a)) },
    { title: 'This asset', nodes: [assetNode(r.asset, { focus: true, flag: 'This asset' })] },
    { title: 'Goes to', nodes: downs1.map((a) => assetNode(a)) },
    { title: 'Then to', nodes: downs2.map((a) => assetNode(a)) },
    { title: 'Products, models & processing', nodes: [
      ...prods.map((p) => ({ id: `p:${p}`, label: p, kind: 'data product', icon: Package, sub: 'published' })),
      ...models.map((m) => ({ id: `m:${m}`, label: m, kind: 'model', icon: Cpu, sub: 'trained on this data' })),
      ...(rec ? [{ id: `r:${rec.id}`, label: rec.activity, kind: 'processing activity', icon: BookOpen, sub: statusWord(rec.status), rec: rec.id }] : []),
    ] },
  ];
  const edges = [
    ...ups2.flatMap((a) => (pdx(a)?.shared || []).filter((b) => ups1.includes(b)).map((b) => ({ s: a, t: b, rel: 'feeds' }))),
    ...ups1.map((a) => ({ s: a, t: r.asset, rel: 'feeds' })),
    ...downs1.map((a) => ({ s: r.asset, t: a, rel: 'feeds' })),
    ...downs1.flatMap((a) => (pdx(a)?.shared || []).filter((b) => downs2.includes(b)).map((b) => ({ s: a, t: b, rel: 'feeds' }))),
    ...prods.map((p) => ({ s: r.asset, t: `p:${p}`, rel: 'published in' })),
    ...models.map((m) => ({ s: r.asset, t: `m:${m}`, rel: 'trains' })),
    ...(rec ? [{ s: r.asset, t: `r:${rec.id}`, rel: 'recorded in' }] : []),
  ];
  const shownCols = colsAll ? r.cols : r.cols.slice(0, 8);
  const facts = [
    ['Personal data', `${r.cols.length} column(s)`, classes.join(' · '), sp.length ? 'bad' : 'info'],
    ['Record of processing', rec ? statusWord(rec.status) : 'none', rec ? rec.activity : 'not in any record', rec?.status === 'accepted' ? 'ok' : 'warn'],
    ['Retention', ret.length ? (ret[0].retention || '').split(' · ')[0] : 'none', ret.length ? ret[0].title : 'no rule applies', ret.length ? 'ok' : 'bad'],
    ['Held in', r.region, r.system, r.region === 'not recorded' ? 'warn' : 'ok'],
    ['Steward', STEWARDED.includes(r.asset) ? 'named' : 'none', `owner ${r.owner}`, STEWARDED.includes(r.asset) ? 'ok' : 'warn'],
    ['Rules', `${rules.length - failing.length}/${rules.length} pass`, failing.length ? `${failing.length} failing` : 'all passing', failing.length ? 'bad' : 'ok'],
  ];
  return (
    <div className="page asset gv pd-page fade-in">
      <div className="asset-head">
        <button type="button" className="icon-btn back" onClick={() => nav(`${DPIA_BASE}?tab=map`)} aria-label="Back to personal data map"><ArrowLeft size={17} /></button>
        <div className="asset-title">
          <div className="at-row"><h1 className="mono">{r.asset}</h1></div>
          <div className="at-path">
            <span><Database size={13} strokeWidth={1.75} />Personal data asset</span><span className="sep">·</span><span>DPIA &amp; GDPR › Personal data map</span>
          </div>
        </div>
        <div className="head-actions">
          {rec && <Button variant="primary" size="md" icon={BookOpen} onClick={() => nav(`${DPIA_BASE}/${rec.id}`)}>Open {rec.activity}</Button>}
        </div>
      </div>
      <div className="pd-body">
      <div className="pd-head">
        <span className="tag">{r.system}</span><span className="tag">{r.domain}</span>
        <StatusBadge s="bad">{r.sensitivity}</StatusBadge>
        {classes.map((c) => <span key={c} className={`pd-cls ${CLASS_TONE[c]}`}>{c}</span>)}
        {sp.length > 0 && <span className="gv-badge bad"><i />Article 9 data</span>}
      </div>
      <div className="pd-facts">
        {facts.map(([l, v, s2, tn]) => <div key={l} className={tn}><span>{l}</span><b>{v}</b><small title={s2}>{s2}</small></div>)}
      </div>

      <div className="pd-sec-h"><h4>Where it flows</h4><small>Lineage two steps up and down, plus the products, models and processing activity that use it. Click an asset to open it.</small></div>
      {columns.some((c) => c.nodes.length && c.title !== 'This asset')
        ? <RelGraph minScale={0.55} columns={columns} edges={edges} onSelect={(n) => { if (n.asset && n.asset !== r.asset && pdx(n.asset)) onOpen(n.asset); else if (n.rec) nav(`${DPIA_BASE}/${n.rec}`); }} />
        : <Empty>No lineage recorded for this asset — it neither receives from nor feeds another asset.</Empty>}

      <div className="pd-two">
        <section>
          <div className="pd-sec-h"><h4>Personal data columns</h4><small>{r.cols.length} found by the classifier</small></div>
          <table className="tbl pd-cols">
            <tbody>{shownCols.map((c) => (
              <tr key={c}><td><Mono>{c}</Mono></td><td><span className={`pd-cls ${CLASS_TONE[colClass(c)]}`}>{colClass(c)}</span></td><td className="gv-muted">{colKind(c).replace(/ \(.*\)$/, '')}</td></tr>
            ))}</tbody>
          </table>
          {r.cols.length > 8 && <Button variant="link" onClick={() => setColsAll((v) => !v)}>{colsAll ? 'Show fewer' : `Show all ${r.cols.length}`}</Button>}
        </section>
        <section>
          <div className="pd-sec-h"><h4>Data-handling rules</h4><small>checked for this asset now</small></div>
          <ul className="pd-rules">
            {rules.map((x) => { const bad = x.fail.includes(r.asset); return (
              <li key={x.key} className={bad ? 'bad' : 'ok'}><i>{bad ? '✕' : '✓'}</i><div><b>{x.req}</b>{bad && <small>{x.finding(r.asset)}</small>}</div></li>
            ); })}
          </ul>
        </section>
      </div>

      <div className="pd-sec-h"><h4>Governance</h4></div>
      <KV rows={[
        ['Record of processing', rec ? <span key="r">{rec.activity} — {statusWord(rec.status)} · {basisLabel(rec.basis)}</span> : 'not in any record'],
        ['Article 9 condition', sp.length ? (rec && rec.special !== 'not_applicable' ? SPECIAL_CONDITIONS.find(([k]) => k === rec.special)[1] : <StatusBadge key="a9" s="bad">none recorded — needed for {sp.map((x) => x.col).join(', ')}</StatusBadge>) : 'not applicable'],
        ['Retention', ret.map((i) => `${i.title} — ${i.retention}`).join('; ') || 'no retention requirement applies'],
        ['Data products', prods.join(', ') || '—'], ['Models trained on it', models.join(', ') || '—'],
        ['Access', '0 active grant(s)'], ['Owner / steward', `${r.owner}${STEWARDED.includes(r.asset) ? ' · steward named' : ' · no steward'}`],
      ]} />
      </div>
    </div>
  );
}
