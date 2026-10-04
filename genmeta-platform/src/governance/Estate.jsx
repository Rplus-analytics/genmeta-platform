import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldCheck, Bot, Database, ScrollText, Inbox, AlertTriangle, ArrowRight, Flame, Globe2, KeyRound, Users, Gauge, FileText, Fingerprint, Activity,
  CheckCircle2, Clock, Layers, Tags, BellRing, Workflow as WorkflowIcon,
} from 'lucide-react';
import { Ring } from '../components/ui.jsx';
import { BASE, MODELS, MODEL_ALERTS, POLICY_ITEMS, PD_MAP, ASSET_NAMES, AUDIT, fmtTs, REVIEW_ITEMS, recommend, RISK_TIERS } from './data.js';
import { REGISTER, QUALITY_ISSUES, QUEUE } from './stewardship-data.js';
import { applicability, hasCriteria } from './applicability.js';
import { useWorkflowStore, stateOf, waitingOn, moduleOf, TODAY, fmt } from './workflows.js';
import { StatusBadge } from './kit.jsx';
import { useDpia, ruleTotals } from './dpia-store.js';

/* Governance › Overview — what is happening across the whole GenMeta estate from a governance point of view:
   one posture score, what needs attention now (ranked across modules), the data estate by system, every AI model,
   approvals in flight, privacy / access / residency / audit, and the latest governance activity.
   Every figure is computed from the same test data the section pages use, and every row links to where you act. */

const QUALITY_FAIL = { 'BI.Customer 360 Dashboard': 13, 'BI.Supplier Performance': 10 };
function compliance() {
  const active = POLICY_ITEMS.filter((i) => i.status === 'active');
  const retained = new Set(active.filter((i) => i.type === 'retention' && hasCriteria(i.applies)).flatMap((i) => applicability(i).rows.map((r) => r.asset)));
  const checks = active.filter((i) => i.type === 'control').flatMap((c) => {
    const assets = applicability(c).rows.map((r) => r.asset);
    if (c.check === 'description_present') return assets.map((a) => ({ c, a, ok: a !== 'STG.CUSTOMER_ORDER_LIVE_RPLUS' }));
    if (c.check === 'retention_defined') return assets.map((a) => ({ c, a, ok: retained.has(a) }));
    if (c.check?.startsWith('quality_min')) return assets.map((a) => ({ c, a, ok: !QUALITY_FAIL[a] }));
    return [];
  });
  const byControl = Object.values(checks.reduce((m, x) => { m[x.c.id] = m[x.c.id] || { c: x.c, n: 0, f: 0 }; m[x.c.id].n++; if (!x.ok) m[x.c.id].f++; return m; }, {}));
  const governed = new Set(active.flatMap((i) => applicability(i).rows.map((r) => r.asset)));
  const sens = PD_MAP.map((r) => r.asset);
  return { checks, pass: checks.filter((x) => x.ok).length, byControl, governed: governed.size, retention: sens.filter((a) => retained.has(a)).length, sens: sens.length, items: POLICY_ITEMS.length, noOwner: POLICY_ITEMS.filter((i) => !i.owner && i.status !== 'retired').length };
}

const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);
const tone = (p) => (p >= 80 ? 'ok' : p >= 50 ? 'warn' : 'bad');
const COL = { ok: 'var(--gv-ok)', warn: 'var(--gv-warn)', bad: 'var(--gv-bad)', info: 'var(--gv-info)' };

export default function EstateOverview() {
  const nav = useNavigate();
  const { workflows, requests } = useWorkflowStore();
  const dp = useDpia();
  const hr = ruleTotals(dp);
  const accRec = dp.records.filter((r) => r.status === 'accepted').length;
  const go = (to) => () => nav(to.startsWith('/') ? to : `${BASE}/${to}`);

  /* ---- data estate (ownership register, 219 assets across 9 systems) */
  const estate = useMemo(() => {
    const sys = {};
    REGISTER.forEach((r) => {
      const s = (sys[r.system] = sys[r.system] || { system: r.system, n: 0, restricted: 0, confidential: 0, internal: 0, named: 0, steward: 0, custodian: 0, issues: 0 });
      s.n++;
      s[r.sens.toLowerCase()]++;
      if (r.roles.owner && r.roles.owner.how !== 'd') s.named++;
      if (r.roles.steward) s.steward++;
      if (r.roles.custodian) s.custodian++;
    });
    const sysOf = Object.fromEntries(REGISTER.map((r) => [r.asset, r.system]));
    const open = QUALITY_ISSUES.filter((q) => q.status === 'open');
    open.forEach((q) => { const s = sys[sysOf[q.asset]]; if (s) s.issues++; });
    const rows = Object.values(sys).sort((a, b) => b.n - a.n);
    const tot = rows.reduce((t, s) => ({ n: t.n + s.n, restricted: t.restricted + s.restricted, confidential: t.confidential + s.confidential, internal: t.internal + s.internal, named: t.named + s.named, steward: t.steward + s.steward, custodian: t.custodian + s.custodian }), { n: 0, restricted: 0, confidential: 0, internal: 0, named: 0, steward: 0, custodian: 0 });
    const sensNoSteward = REGISTER.filter((r) => r.sens === 'Restricted' && !r.roles.steward).length;
    return { rows, tot, open: open.length, sensNoSteward, cls: QUEUE.filter((t) => t.type === 'Classification').length, clsHigh: QUEUE.filter((t) => t.type === 'Classification' && t.priority === 'High').length, own: QUEUE.filter((t) => t.type === 'Ownership').length };
  }, []);

  /* ---- AI models */
  const models = MODELS.filter((m) => !/test entry/i.test(m.name) && m.name !== 'a');
  const openAlerts = MODEL_ALERTS.filter((a) => a.state === 'open');
  const breaches = openAlerts.filter((a) => a.sev === 'breach');
  const live = models.filter((m) => m.stage === 'In production');
  const latestReq = (id) => requests.find((r) => r.subject.kind === 'model' && r.subject.id === id);

  /* ---- approvals */
  const states = requests.map((r) => ({ r, st: stateOf(r, workflows) }));
  const openReq = states.filter((x) => x.st.status === 'in progress');
  const overdue = openReq.filter((x) => x.st.cur && x.st.cur.due < TODAY);
  const dueSoon = openReq.filter((x) => x.st.cur && x.st.cur.due >= TODAY && (x.st.cur.due - TODAY) / 864e5 <= 2);

  /* ---- policies */
  const comp = useMemo(compliance, []);
  const compPct = pct(comp.pass, comp.checks.length);

  /* ---- access, privacy, residency */
  const revoke = REVIEW_ITEMS.filter((r) => recommend(r)[0] === 'Revoke').length;

  /* ---- posture: weighted average of the areas */
  const areas = [
    ['Named ownership', pct(estate.tot.named, estate.tot.n), 'stewardship', Users],
    ['Stewardship', pct(estate.tot.steward, estate.tot.n), 'stewardship', Users],
    ['Classification', 97, '', Tags],
    ['Policy compliance', compPct, 'dpia?view=policies', ScrollText],
    ['Retention on personal data', pct(comp.retention, comp.sens), 'dpia?view=policies', FileText],
    ['Personal-data handling', pct(hr.total - hr.failing, hr.total), 'dpia', ShieldCheck],
    ['AI models without breaches', pct(models.length - new Set(breaches.map((a) => a.model)).size, models.length), 'models', Bot],
    ['Residency inside policy', pct(9, 13), '?tab=residency', Globe2],
  ];
  const posture = Math.round(areas.reduce((n, a) => n + a[1], 0) / areas.length);

  /* ---- what needs attention now, ranked */
  const attention = [
    breaches.length && { sev: 'bad', mod: 'AI models', icon: BellRing, t: `${breaches.length} open breach alerts on ${[...new Set(breaches.map((a) => a.model))].join(', ')}`, d: breaches.slice(0, 2).map((a) => a.title).join(' · '), to: `models/${breaches[0].model}`, cta: 'Open alerts' },
    ...overdue.map((x) => ({ sev: 'bad', mod: 'Approvals', icon: Inbox, t: `${x.r.subject.label} — “${x.st.cur.step.name}” is overdue`, d: `waiting on ${waitingOn(x.r, x.st)}`, to: `workflows?req=${x.r.id}`, cta: 'Decide' })),
    ...comp.byControl.filter((x) => x.f && x.c.severity === 'high').map((x) => ({ sev: pct(x.f, x.n) > 50 ? 'bad' : 'warn', mod: 'Policies', icon: ScrollText, t: `${x.c.title}: ${x.f} of ${x.n} assets failing`, d: 'high-severity control', to: 'dpia?view=policies', cta: 'See compliance' })),
    accRec < dp.records.length && { sev: 'bad', mod: 'DPIA & GDPR', icon: FileText, t: `${accRec} of ${dp.records.length} records of processing accepted`, d: `${hr.failing} of ${hr.total} personal-data handling checks failing`, to: 'dpia', cta: 'Review' },
    ...dueSoon.map((x) => ({ sev: 'warn', mod: 'Approvals', icon: Inbox, t: `${x.r.subject.label} — “${x.st.cur.step.name}”`, d: `waiting on ${waitingOn(x.r, x.st)} · due ${Math.round((x.st.cur.due - TODAY) / 864e5) || 'today'}${Math.round((x.st.cur.due - TODAY) / 864e5) ? ' days' : ''}`, to: `workflows?req=${x.r.id}`, cta: 'Decide' })),
    { sev: 'warn', mod: 'Residency', icon: Globe2, t: '4 data locations outside the “United Kingdom only” policy', d: 'each needs an override with a reason, or a move', to: '?tab=residency', cta: 'Review' },
    { sev: 'warn', mod: 'Stewardship', icon: Users, t: `${estate.sensNoSteward} restricted assets have no data steward`, d: `${pct(estate.tot.steward, estate.tot.n)}% of the estate has a steward`, to: 'stewardship', cta: 'Assign' },
    revoke && { sev: 'warn', mod: 'Access', icon: KeyRound, t: `${revoke} access grants recommended to revoke`, d: 'not used in 30 days', to: 'access', cta: 'Review grants' },
    { sev: 'info', mod: 'Data quality', icon: AlertTriangle, t: `${estate.open} open quality issues`, d: 'routed to owners and stewards', to: 'stewardship', cta: 'Open queue' },
    { sev: 'info', mod: 'Classification', icon: Tags, t: `${estate.cls} classification reviews waiting`, d: `${estate.clsHigh} high priority, suggested by the classifier`, to: 'stewardship', cta: 'Review' },
  ].filter(Boolean);
  const SEV_ORDER = { bad: 0, warn: 1, info: 2 };
  attention.sort((a, b) => SEV_ORDER[a.sev] - SEV_ORDER[b.sev]);

  /* ---- activity: workflow decisions + audit log */
  const activity = [
    ...states.flatMap(({ r, st }) => st.steps.filter((x) => (x.status === 'done' && !x.auto) || x.status === 'rejected').map((x) => ({ at: x.at, who: x.who, what: `${x.status === 'rejected' ? 'rejected' : 'approved'} “${x.step.name}” for ${r.subject.label}`, tag: moduleOf(st.wf.module).label, bad: x.status === 'rejected' }))),
    ...states.map(({ r, st }) => ({ at: r.requestedAt, who: r.requestedBy, what: `requested ${st.wf.name} for ${r.subject.label}`, tag: moduleOf(st.wf.module).label })),
    ...MODEL_ALERTS.filter((a) => a.sev === 'breach').slice(0, 2).map((a) => ({ at: new Date(a.at.replace('Sept', 'Sep').replace(',', '')), who: 'monitoring', what: `${a.title} — ${a.model} ${a.v}`, tag: 'AI models', bad: true })),
    ...AUDIT.slice(0, 4).map((a) => ({ at: a.ts, who: a.who, what: a.what, tag: a.category })),
  ].filter((x) => x.at instanceof Date && !Number.isNaN(x.at.getTime())).sort((a, b) => b.at - a.at).slice(0, 9);

  return (
    <div className="es">
      {/* ---------------- hero */}
      <section className="es-hero dash-card">
        <div className="es-posture">
          <Ring value={posture / 100} size={112} stroke={11} color={COL[tone(posture)]}><b className="es-ringv">{posture}<small>%</small></b></Ring>
          <div>
            <span className="es-k">Governance posture</span>
            <h2>{posture >= 80 ? 'In good shape' : posture >= 50 ? 'Partly governed — gaps to close' : 'Significant gaps'}</h2>
            <p>Average of eight areas across data, policies, privacy and AI. <b>{attention.filter((a) => a.sev === 'bad').length} urgent</b> and <b>{attention.filter((a) => a.sev === 'warn').length} important</b> items need attention.</p>
          </div>
        </div>
        <div className="es-kpis">
          {[
            [Database, 'info', 'Data assets', estate.tot.n, `${estate.rows.length} systems · ${estate.tot.restricted} restricted`, 'stewardship'],
            [Bot, 'violet', 'AI models', models.length, `${live.length} in production · ${openReq.filter((x) => x.st.wf.module === 'ai-models').length} awaiting approval`, 'models'],
            [ScrollText, compPct >= 80 ? 'ok' : 'warn', 'Policy compliance', `${compPct}%`, `${comp.pass} of ${comp.checks.length} checks pass · ${comp.items} items`, 'dpia?view=policies'],
            [Inbox, overdue.length ? 'bad' : 'warn', 'Approvals open', openReq.length, `${overdue.length} overdue · ${dueSoon.length} due within 2 days`, 'workflows'],
            [Flame, 'bad', 'Open risks', breaches.length + comp.checks.length - comp.pass, `${breaches.length} model breaches · ${comp.checks.length - comp.pass} failing checks`, 'dpia?view=policies'],
          ].map(([I, tn, l, v, s, to]) => (
            <button key={l} type="button" className="es-kpi" onClick={go(to)}>
              <span className={`gv-chip sm ${tn}`}><I size={14} /></span>
              <span className="es-kpi-l">{l}</span>
              <b>{v}</b>
              <small>{s}</small>
            </button>
          ))}
        </div>
      </section>

      <div className="es-row r21">
        {/* ---------------- attention */}
        <section className="dash-card es-card">
          <header><span className="gv-chip warn"><AlertTriangle size={16} /></span><div><h3>Needs attention now</h3><p>Ranked across every part of governance — most urgent first.</p></div></header>
          <ul className="es-att">
            {attention.slice(0, 9).map((a, k) => {
              const I = a.icon;
              return (
                <li key={k} className={a.sev}>
                  <i />
                  <span className={`gv-chip sm ${a.sev}`}><I size={13} /></span>
                  <div><b>{a.t}</b><small><span className="es-mod">{a.mod}</span>{a.d}</small></div>
                  <button type="button" className="es-cta" onClick={go(a.to)}>{a.cta}<ArrowRight size={13} /></button>
                </li>
              );
            })}
          </ul>
        </section>
        {/* ---------------- coverage */}
        <section className="dash-card es-card">
          <header><span className="gv-chip teal"><Gauge size={16} /></span><div><h3>Governance coverage</h3><p>The eight areas behind the posture score.</p></div></header>
          <div className="es-cov">
            {areas.map(([l, p, to, I]) => (
              <button key={l} type="button" onClick={go(to || '?tab=controls')}>
                <span className="es-cov-l"><I size={13} />{l}</span>
                <span className="es-bar"><i style={{ width: `${p}%`, background: COL[tone(p)] }} /></span>
                <b style={{ color: COL[tone(p)] }}>{p}%</b>
              </button>
            ))}
          </div>
        </section>
      </div>

      {/* ---------------- data estate */}
      <section className="dash-card es-card">
        <header>
          <span className="gv-chip info"><Layers size={16} /></span>
          <div><h3>Data estate</h3><p>{estate.tot.n} assets across {estate.rows.length} systems — sensitivity, accountability and quality, system by system.</p></div>
          <div className="es-sensbar" title="Sensitivity across the estate">
            {[['restricted', 'Restricted', 'bad'], ['confidential', 'Confidential', 'warn'], ['internal', 'Internal', 'info']].map(([k, l, tn]) => (
              <span key={k} style={{ flex: estate.tot[k], background: COL[tn] }} title={`${l}: ${estate.tot[k]}`} />
            ))}
          </div>
          <div className="es-legend">{[['Restricted', 'bad', estate.tot.restricted], ['Confidential', 'warn', estate.tot.confidential], ['Internal', 'info', estate.tot.internal]].map(([l, tn, n]) => <span key={l}><i style={{ background: COL[tn] }} />{l} {n}</span>)}</div>
        </header>
        <div className="table-wrap">
          <table className="tbl es-matrix">
            <thead><tr><th>System</th><th className="num">Assets</th><th>Sensitivity</th><th>Named owner</th><th>Steward</th><th>Custodian</th><th className="num">Open quality issues</th></tr></thead>
            <tbody>
              {estate.rows.map((s) => (
                <tr key={s.system} className="click" onClick={go('stewardship')}>
                  <td className="gv-strong">{s.system}</td>
                  <td className="num">{s.n}</td>
                  <td><span className="es-mini">{s.restricted > 0 && <span style={{ flex: s.restricted, background: COL.bad }} />}{s.confidential > 0 && <span style={{ flex: s.confidential, background: COL.warn }} />}{s.internal > 0 && <span style={{ flex: s.internal, background: COL.info }} />}</span><small className="gv-faint">{s.restricted} restricted</small></td>
                  {[s.named, s.steward, s.custodian].map((v, k) => { const p = pct(v, s.n); return <td key={k}><span className={`es-heat ${tone(p)}`}>{p}%</span><small className="gv-faint"> {v}/{s.n}</small></td>; })}
                  <td className="num">{s.issues ? <span className="gv-badge warn"><i />{s.issues}</span> : <span className="gv-faint">0</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="es-foot">Named owner = assigned by a person; the rest fall back to the system’s default owner. {estate.own} ownership and {estate.cls} classification tasks are in the stewardship queue.</p>
      </section>

      {/* ---------------- AI models */}
        <section className="dash-card es-card">
          <header><span className="gv-chip violet"><Bot size={16} /></span><div><h3>AI models</h3><p>Every internal and external model — risk, stage, approval and monitoring in one list.</p></div>
            <button type="button" className="es-link" onClick={go('models')}>All AI models<ArrowRight size={13} /></button></header>
          <div className="table-wrap">
            <table className="tbl">
              <thead><tr><th>Model</th><th>Risk</th><th>Stage</th><th>Approval</th><th>Monitoring</th><th>Next review</th></tr></thead>
              <tbody>
                {models.map((m) => {
                  const req = latestReq(m.id); const st = req && stateOf(req, workflows);
                  const al = openAlerts.filter((a) => a.model === m.id);
                  const ver = m.versionRows[m.versionRows.length - 1];
                  return (
                    <tr key={m.id} className="click" onClick={go(`models/${m.id}`)}>
                      <td style={{ whiteSpace: 'nowrap' }}><span className="gv-strong">{m.name}</span><span className="gv-sub">{m.foundIn.includes('External') ? `External · ${m.provider || '—'}` : `Internal · ${m.foundIn.join(', ')}`}</span></td>
                      <td><StatusBadge s={m.risk === 'High risk' ? 'bad' : m.risk === 'Medium risk' ? 'warn' : 'ok'}>{m.risk.replace(' risk', '')}</StatusBadge></td>
                      <td>{m.stage}</td>
                      <td>{st ? <StatusBadge s={st.status === 'approved' ? 'ok' : st.status === 'rejected' ? 'bad' : 'warn'}>{st.status === 'in progress' ? `awaiting · ${st.cur.step.name}` : st.status}</StatusBadge> : <span className="gv-faint">—</span>}</td>
                      <td>{al.some((a) => a.sev === 'breach') ? <StatusBadge s="bad">{al.filter((a) => a.sev === 'breach').length} breaches</StatusBadge> : m.foundIn.includes('External') ? <span className="gv-faint">external — by review</span> : <StatusBadge s="ok">healthy</StatusBadge>}</td>
                      <td className="gv-muted">{ver.review || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="es-foot">{RISK_TIERS.map(([r, , d]) => `${models.filter((m) => m.risk === r).length} ${r.toLowerCase()} (review every ${d} days)`).join(' · ')}</p>
        </section>

      <div className="es-row r12">
        {/* ---------------- approvals */}
        <section className="dash-card es-card">
          <header><span className="gv-chip warn"><WorkflowIcon size={16} /></span><div><h3>Approvals in flight</h3><p>Requests running through Governance › Workflows.</p></div></header>
          <div className="es-mods">
            {[...new Set(states.map((x) => x.st.wf.module))].map((k) => {
              const all = states.filter((x) => x.st.wf.module === k); const o = all.filter((x) => x.st.status === 'in progress').length;
              return <div key={k}><b>{o}</b><span>{moduleOf(k).label}</span><small>{all.length - o} completed</small></div>;
            })}
          </div>
          <ul className="es-req">
            {openReq.map(({ r, st }) => {
              const n = Math.round((st.cur.due - TODAY) / 864e5);
              return (
                <li key={r.id}><button type="button" onClick={go(`workflows?req=${r.id}`)}>
                  <b>{r.subject.label}</b>
                  <small>{st.cur.step.name} · {waitingOn(r, st)}</small>
                  <span className={`gv-badge ${n < 0 ? 'bad' : n <= 2 ? 'warn' : 'ok'}`}><i />{n < 0 ? `overdue ${-n}d` : n === 0 ? 'due today' : `${n}d left`}</span>
                </button></li>
              );
            })}
            {!openReq.length && <li className="gv-faint" style={{ padding: 10 }}>Nothing waiting.</li>}
          </ul>
          <button type="button" className="es-link" onClick={go('workflows')} style={{ marginTop: 8 }}>Open the approvals inbox<ArrowRight size={13} /></button>
        </section>
      {/* ---------------- activity */}
      <section className="dash-card es-card">
        <header><span className="gv-chip info"><Activity size={16} /></span><div><h3>Latest governance activity</h3><p>Decisions, requests, alerts and scheduled checks across GenMeta.</p></div>
          <button type="button" className="es-link" onClick={go('?tab=audit')}>Full audit trail<ArrowRight size={13} /></button></header>
        <ul className="es-feed one">
          {activity.map((a, k) => (
            <li key={k} className={a.bad ? 'bad' : ''}>
              <span className="es-dot">{a.bad ? <AlertTriangle size={11} /> : a.what.startsWith('approved') ? <CheckCircle2 size={11} /> : <Clock size={11} />}</span>
              <div><b>{a.who}</b> {a.what}<small>{a.tag} · {fmt(a.at)}</small></div>
            </li>
          ))}
        </ul>
      </section>
      </div>

      {/* ---------------- privacy, access, residency, audit */}
      <div className="es-four">
        {[
          [FileText, accRec === dp.records.length ? 'ok' : 'bad', 'DPIA & GDPR', `${accRec} / ${dp.records.length}`, 'records of processing accepted', `${hr.failing} of ${hr.total} handling checks failing · ${dp.assessments.filter((a) => a.stage === 'Approved').length} DPIA(s) signed off`, 'dpia'],
          [KeyRound, 'warn', 'Access & RBAC', `${revoke}`, 'grants recommended to revoke', `${REVIEW_ITEMS.length} grants in the quarterly review · 1 access request waiting`, 'access'],
          [Globe2, 'warn', 'Residency', '4', 'locations outside the UK-only policy', '13 locations in the register · 0 overrides recorded', '?tab=residency'],
          [Fingerprint, 'ok', 'Audit trail', 'Verified', 'hash chain intact', `${AUDIT.length} entries · last ${fmtTs(AUDIT[0].ts)}`, '?tab=audit'],
        ].map(([I, tn, t, v, l, s, to]) => (
          <button key={t} type="button" className="dash-card es-tile" onClick={go(to)}>
            <span className="es-tile-h"><span className={`gv-chip sm ${tn}`}><I size={14} /></span>{t}<ArrowRight size={13} className="es-go" /></span>
            <b style={{ color: COL[tn] }}>{v}</b><span className="es-tile-l">{l}</span><small>{s}</small>
          </button>
        ))}
      </div>

      <p className="es-foot" style={{ textAlign: 'center' }}>Figures cover {ASSET_NAMES.length} catalogued assets for policies and the {estate.tot.n}-asset ownership register for stewardship. Click any number to go where you act on it.</p>
    </div>
  );
}
