import { useState } from 'react';
import { Download, Play, Copy } from 'lucide-react';
import { PageHead, Tabs, Button } from '../components/ui.jsx';
import {
  ORG, PD_MAP, colKind, DPIA_TILES, DOMAIN_SYSTEMS, ROPA_DOMAINS, LAWFUL_BASES, SPECIAL_CONDITIONS, SECURITY_DEFAULT,
  HANDLING_RULES, ownerOf, UNUSED, SCREEN_INDICATORS, ICO_TEMPLATE, SYSTEMS, AUDIT,
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
    : t.l === 'Assessments required' ? { ...t, v: assessments.filter((a) => a.stage !== 'Approved').length, s: `${accepted.length} activities screened` } : t));
  return (
    <div className="page gv">
      <PageHead eyebrow="Govern" title="DPIA & GDPR"
        sub="Where personal data is identified, processed, stored and shared; the records of processing and the basis for each; the rules that govern personal data, monitored; and the impact assessments behind them." />
      <Tabs items={TABS} value={tab} onChange={setTab} />
      {tab !== 'assess' && tab !== 'templates' && tab !== 'pack' && <Tiles items={tiles} />}
      {tab === 'map' && <PersonalDataMap />}
      {tab === 'ropa' && <Ropa records={records} setRecords={setRecords} />}
      {tab === 'lawful' && <Lawful accepted={accepted} />}
      {tab === 'rules' && <HandlingRules />}
      {tab === 'assess' && <Assessments accepted={accepted} list={assessments} setList={setAssessments} />}
      {tab === 'templates' && <Templates />}
      {tab === 'pack' && <Pack records={records} assessments={assessments} />}
    </div>
  );
}

/* ------------------------------------------------------------------ personal data map */
function PersonalDataMap() {
  const [sel, setSel] = useState(null);
  const r = sel && PD_MAP.find((x) => x.asset === sel);
  const comesFrom = (a) => PD_MAP.filter((x) => x.shared.includes(a)).map((x) => x.asset);
  return (
    <Card title="Personal data map" count={PD_MAP.length}
      sub={`Built from the classifier, lineage, data products, models, the ownership register and access grants — 25 of 37 catalogued assets hold personal data (${piiCols} PII, ${finCols} FINANCIAL columns) across ${[...SYSTEMS].sort().join(', ')}.`}>
      <div className="table-wrap">
        <table className="tbl">
          <thead><tr><th>Asset</th><th>Personal data</th><th>Shared with</th><th>Owner / steward</th><th>Retention</th><th>Region</th></tr></thead>
          <tbody>{PD_MAP.map((x) => (
            <tr key={x.asset} className={`click ${sel === x.asset ? 'on' : ''}`} onClick={() => setSel(x.asset)}>
              <td><Mono>{x.asset}</Mono><span className="gv-sub">{x.system} · {x.sensitivity}</span></td>
              <td><div className="gv-tags">{x.cols.map((c) => <span key={c} className="tag mono">{c}</span>)}</div></td>
              <td>{x.shared.join(', ') || '—'}</td><td>{x.owner}</td><td className="gv-muted">none</td><td>{x.region}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      <Note>Select an asset to see where its personal data comes from and goes.</Note>
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
    </Card>
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

/* ------------------------------------------------------------------ assessments */
function Assessments({ accepted, list, setList }) {
  const [ind, setInd] = useState({});
  const ticked = SCREEN_INDICATORS.filter((i) => ind[i]);
  const verdict = (r) => (r.special !== 'not_applicable' || ticked.length >= 2 ? ['DPIA required', `${ticked.length} indicator(s)${r.special !== 'not_applicable' ? ' · special category data' : ''}`] : ticked.length === 1 ? ['Consider a DPIA', ticked[0]] : ['Not required', 'no high-risk indicators']);
  const start = (r) => { setList((l) => [...l, { id: r.id, name: `DPIA — ${r.activity}`, stage: 'Completion', template: 'ICO standard DPIA v1', risks: 0, assignees: 'assessor' }]); toast('Assessment started from the ICO template'); };
  const covered = new Set(accepted.flatMap((r) => r.assets));
  const notIn = PD_ASSETS.filter((a) => !covered.has(a));
  return (
    <>
      <Tiles items={[
        { l: 'DPIA required, not started', v: accepted.filter((r) => verdict(r)[0] === 'DPIA required' && !list.some((a) => a.id === r.id)).length, s: 'from sensitivity, processing and risk indicators' },
        { l: 'In progress', v: list.filter((a) => a.stage !== 'Approved').length, s: 'completion, review or approval' },
        { l: 'Approved', v: list.filter((a) => a.stage === 'Approved').length, s: '0 overdue review(s)' },
        { l: 'Risks recorded', v: 0, s: '0 high residual' },
      ]} />
      <Card title="When a DPIA may be needed" sub="Screened automatically for each record of processing from data sensitivity, the kind of processing and risk indicators GenMeta can see. Tick anything it cannot see before starting, and it is added to the assessment.">
        <div className="gv-checks" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))' }}>
          {SCREEN_INDICATORS.map((i) => <label key={i}><input type="checkbox" checked={!!ind[i]} onChange={(e) => setInd((o) => ({ ...o, [i]: e.target.checked }))} />{i}</label>)}
        </div>
        <div className="table-wrap">
          <table className="tbl">
            <thead><tr><th>Activity</th><th>Verdict</th><th>Why</th><th>Assessment</th><th /></tr></thead>
            <tbody>
              {accepted.map((r) => { const [v, why] = verdict(r); const a = list.find((x) => x.id === r.id); return (
                <tr key={r.id}><td className="gv-strong">{r.activity}</td><td><StatusBadge s={v === 'Not required' ? 'ok' : v === 'DPIA required' ? 'fail' : 'warn'}>{v}</StatusBadge></td><td className="gv-muted">{why}</td><td>{a ? a.stage : '—'}</td>
                  <td>{!a && v !== 'Not required' && <Button variant="secondary" size="sm" onClick={() => start(r)}>Start assessment</Button>}</td></tr>
              ); })}
              {!accepted.length && <tr><td colSpan={5}><Empty>No accepted records of processing to screen yet.</Empty></td></tr>}
            </tbody>
          </table>
        </div>
        {notIn.length > 0 && <Note>Personal data not in any record of processing yet: {notIn.join(', ')}</Note>}
      </Card>
      <Card title="Assessments" count={list.length} actions={<Button variant="secondary" size="md" icon={Download} onClick={() => downloadCsv('dpia-register.csv', [['Assessment', 'Stage', 'Template', 'Risks', 'Assignees'], ...list.map((a) => [a.name, a.stage, a.template, a.risks, a.assignees])])}>Export register (CSV)</Button>}>
        <div className="table-wrap">
          <table className="tbl">
            <thead><tr><th>Assessment</th><th>Stage</th><th>Template</th><th className="num">Risks</th><th>Assignees</th><th /></tr></thead>
            <tbody>
              {list.map((a) => (
                <tr key={a.id}><td className="gv-strong">{a.name}</td><td><StatusBadge s={a.stage === 'Approved' ? 'approved' : 'pending'}>{a.stage}</StatusBadge></td><td>{a.template}</td><td className="num">{a.risks}</td><td>{a.assignees}</td>
                  <td>{a.stage !== 'Approved' && <Button variant="secondary" size="sm" onClick={() => setList((l) => l.map((x) => (x.id === a.id ? { ...x, stage: x.stage === 'Completion' ? 'DPO review' : 'Approved', assignees: x.stage === 'Completion' ? 'dpo' : 'governance-lead' } : x)))}>{a.stage === 'Completion' ? 'Send to DPO review' : 'Approve'}</Button>}</td></tr>
              ))}
              {!list.length && <tr><td colSpan={6}><Empty>No assessments yet.</Empty></td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </>
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
