import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  Inbox, Workflow as WorkflowIcon, History, Plus, Check, X, Bot, ScrollText, KeyRound, Package, ShieldCheck, BookOpen, Gauge, Zap, UserCheck,
  ListChecks, Bell, ArrowUp, ArrowDown, Trash2, FlaskConical, ChevronRight, Filter, CircleSlash, Clock, Flag, Play, Save, Rocket, ArrowLeft, Lock,
} from 'lucide-react';
import { PageHead, Tabs, Button } from '../components/ui.jsx';
import { Card, Tiles, StatusBadge, Empty, Note, Fld, Drawer, KV, toast, SubNav } from './kit.jsx';
import { BASE } from './data.js';
import {
  MODULES, moduleOf, STEP_KINDS, RULES, ACTORS, ROLE_LABEL, APPROVER_ROLES, TODAY, fmt, fmtDay, condText, pathFor, stateOf, canAct, approverText, waitingOn,
  useWorkflowStore, saveWorkflow, newWorkflowId, decide,
} from './workflows.js';

export const WF_BASE = `${BASE}/workflows`;
const MOD_ICON = { Bot, ScrollText, KeyRound, Package, ShieldCheck, BookOpen, Gauge };
const KIND_ICON = { approval: UserCheck, automated: Zap, task: ListChecks, notify: Bell };
const KIND_TONE = { approval: 'violet', automated: 'teal', task: 'info', notify: 'warn' };
const STATUS_TONE = { 'in progress': 'warn', approved: 'ok', rejected: 'bad' };
const days = (a, b) => Math.round((b - a) / 864e5);
const dueText = (due) => { const n = days(TODAY, due); return n < 0 ? [`overdue ${-n} day${n === -1 ? '' : 's'}`, 'bad'] : n === 0 ? ['due today', 'warn'] : [`due in ${n} day${n === 1 ? '' : 's'}`, n <= 1 ? 'warn' : 'ok']; };

/* ================================================================== page */
export default function Workflows() {
  const { wfId } = useParams();
  if (wfId) return <Designer key={wfId} wfId={wfId} />;
  return <WorkflowsHome />;
}

function WorkflowsHome() {
  const { workflows, requests } = useWorkflowStore();
  const [sp, setSp] = useSearchParams();
  const tab = sp.get('tab') || 'approvals';
  const [actor, setActor] = useState('Admin');
  const states = requests.map((r) => ({ r, st: stateOf(r, workflows) }));
  const open = states.filter((x) => x.st.status === 'in progress');
  const mine = open.filter((x) => canAct(x.r, actor)[0]);
  const overdue = open.filter((x) => x.st.cur && x.st.cur.due < TODAY);
  const setTab = (t) => setSp(t === 'approvals' ? {} : { tab: t });
  return (
    <div className="page gv">
      <PageHead eyebrow="Govern" title="Workflows"
        sub="Design an approval workflow once and attach it wherever GenMeta needs a decision. AI model governance is the first module; policies, access, data products, DPIA, glossary and quality use the same engine." />
      <Tiles items={[
        { l: 'Active workflows', v: workflows.filter((w) => w.status === 'active').length, s: `${workflows.filter((w) => w.status === 'draft').length} draft · ${new Set(workflows.map((w) => w.module)).size} modules` },
        { l: 'Waiting for you', v: mine.length, s: `acting as ${actor}` },
        { l: 'Requests in progress', v: open.length, s: `${states.length} requests in total` },
        { l: 'Overdue', v: overdue.length, s: 'past the step’s SLA' },
        { l: 'Approved', v: states.filter((x) => x.st.status === 'approved').length, s: `${states.filter((x) => x.st.status === 'rejected').length} rejected` },
      ]} />
      <Tabs items={[{ value: 'approvals', label: `Approvals (${open.length})`, icon: Inbox }, { value: 'workflows', label: 'Workflows', icon: WorkflowIcon }, { value: 'activity', label: 'Activity', icon: History }]} value={tab} onChange={setTab} />
      {tab === 'approvals' && <Approvals states={states} actor={actor} setActor={setActor} openId={sp.get('req')} />}
      {tab === 'workflows' && <Library workflows={workflows} requests={requests} />}
      {tab === 'activity' && <Activity states={states} />}
    </div>
  );
}

/* ================================================================== approvals inbox */
function ActorPick({ actor, setActor }) {
  return (
    <label className="gv-inline" style={{ alignItems: 'center', gap: 6, fontSize: 13 }}>
      <span className="gv-muted">Acting as</span>
      <select className="select" value={actor} onChange={(e) => setActor(e.target.value)} aria-label="Acting as">{ACTORS.map(([n, r]) => <option key={n} value={n}>{n} ({ROLE_LABEL[r]})</option>)}</select>
    </label>
  );
}
function Approvals({ states, actor, setActor, openId }) {
  const [view, setView] = useState('mine');
  const [mod, setMod] = useState('all');
  const [sel, setSel] = useState(openId || null);
  useEffect(() => { if (openId) setSel(openId); }, [openId]);
  const inMod = states.filter((x) => mod === 'all' || x.st.wf.module === mod);
  const lists = {
    mine: inMod.filter((x) => x.st.status === 'in progress' && canAct(x.r, actor)[0]),
    open: inMod.filter((x) => x.st.status === 'in progress'),
    mineReq: inMod.filter((x) => x.r.requestedBy === actor),
    done: inMod.filter((x) => x.st.status !== 'in progress'),
  };
  const rows = lists[view];
  const cur = states.find((x) => x.r.id === sel);
  return (
    <>
      <Card icon={Inbox} tone="warn" title="Approvals" count={rows.length} sub="Every decision across GenMeta in one inbox. Switch who you are acting as to see what each role can approve."
        actions={<ActorPick actor={actor} setActor={setActor} />}>
        <div className="gv-toolbar" style={{ alignItems: 'center', justifyContent: 'space-between' }}>
          <SubNav value={view} onChange={setView} items={[
            { value: 'mine', label: 'Waiting for me', count: lists.mine.length, countTone: lists.mine.length ? 'warn' : '' },
            { value: 'open', label: 'All open', count: lists.open.length },
            { value: 'mineReq', label: 'Requested by me', count: lists.mineReq.length },
            { value: 'done', label: 'Completed', count: lists.done.length },
          ]} />
          <select className="select" value={mod} onChange={(e) => setMod(e.target.value)} aria-label="Module"><option value="all">All modules</option>{MODULES.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}</select>
        </div>
        <div className="table-wrap">
          <table className="tbl">
            <thead><tr><th>Request</th><th>Workflow</th><th>Step</th><th>Waiting on</th><th>Due</th><th>Requested</th></tr></thead>
            <tbody>
              {rows.map(({ r, st }) => {
                const [dt, dtn] = st.cur ? dueText(st.cur.due) : ['—', ''];
                return (
                  <tr key={r.id} className="click" onClick={() => setSel(r.id)}>
                    <td><span className="gv-strong">{r.subject.label}</span><span className="gv-sub mono">{r.id}</span></td>
                    <td>{st.wf.name}<span className="gv-sub">{moduleOf(st.wf.module).label}</span></td>
                    <td>{st.cur ? st.cur.step.name : <StatusBadge s={STATUS_TONE[st.status]}>{st.status}</StatusBadge>}</td>
                    <td style={{ whiteSpace: 'normal' }}>{st.cur ? waitingOn(r, st) : '—'}</td>
                    <td>{st.cur ? <StatusBadge s={dtn}>{dt}</StatusBadge> : '—'}</td>
                    <td>{r.requestedBy}<span className="gv-sub">{fmtDay(r.requestedAt)}</span></td>
                  </tr>
                );
              })}
              {!rows.length && <tr><td colSpan={6}><Empty>{view === 'mine' ? `Nothing is waiting for ${actor}. Try acting as another role.` : 'No requests here.'}</Empty></td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
      {cur && <RequestDrawer r={cur.r} actor={actor} setActor={setActor} onClose={() => setSel(null)} />}
    </>
  );
}

export function Timeline({ r, st }) {
  return (
    <ol className="wf-tl">
      <li className="done"><i><Play size={11} /></i><div><b>Requested by {r.requestedBy}</b><small>{fmt(r.requestedAt)} · {st.wf.event.toLowerCase()}</small></div></li>
      {st.steps.map((x) => {
        const I = KIND_ICON[x.step.kind];
        return (
          <li key={x.step.id} className={x.status.replace(' ', '-')}>
            <i>{x.status === 'done' ? <Check size={11} strokeWidth={3} /> : x.status === 'rejected' ? <X size={11} strokeWidth={3} /> : x.status === 'skipped' ? <CircleSlash size={11} /> : <I size={11} />}</i>
            <div>
              <b>{x.step.name}</b>
              <small>
                {x.status === 'done' && (x.auto ? 'GenMeta · passed automatically' : `${x.step.kind === 'task' ? 'Completed' : 'Approved'} by ${x.who} · ${fmt(x.at)}`)}
                {x.status === 'rejected' && `Rejected by ${x.who} · ${fmt(x.at)}`}
                {x.status === 'current' && <>Waiting on {waitingOn(r, st)} · since {fmtDay(x.since)} · <span className={`wf-due ${dueText(x.due)[1]}`}>{dueText(x.due)[0]}</span>{x.step.sod && ' · not the requester'}</>}
                {x.status === 'skipped' && `Skipped — only runs if ${condText(x.step.runIf)}`}
                {x.status === 'not reached' && `${approverText(x.step, r) || STEP_KINDS[x.step.kind].label}`}
              </small>
              {x.comment && <q>{x.comment}</q>}
            </div>
          </li>
        );
      })}
      <li className={st.status === 'approved' ? 'done' : st.status === 'rejected' ? 'rejected' : 'not-reached'}><i><Flag size={11} /></i><div><b>{st.status === 'rejected' ? 'Rejected' : st.status === 'approved' ? 'Approved' : 'Outcome'}</b><small>{st.status === 'rejected' ? st.wf.outcome.rejected : st.wf.outcome.approved}</small></div></li>
    </ol>
  );
}

function RequestDrawer({ r, actor, setActor, onClose }) {
  const { workflows } = useWorkflowStore();
  const nav = useNavigate();
  const st = stateOf(r, workflows);
  const [ok, why] = canAct(r, actor);
  const [comment, setComment] = useState('');
  const [checked, setChecked] = useState({});
  const s = st.cur?.step;
  const evidence = s?.evidence || [];
  const allChecked = evidence.every((e) => checked[e]);
  const act = (verdict) => { decide(r.id, actor, verdict, comment.trim()); toast(`${verdict === 'rejected' ? 'Rejected' : verdict === 'done' ? 'Task completed' : 'Approved'} — ${s.name}`); setComment(''); setChecked({}); };
  const subjectLink = r.subject.kind === 'model' ? `${BASE}/models/${r.subject.id}` : r.subject.kind === 'policy' ? `${BASE}/dpia?view=policies` : r.subject.kind === 'access' ? `${BASE}/access` : null;
  return (
    <Drawer wide title={r.subject.label} onClose={onClose} footer={st.cur ? <>
      <Button variant="secondary" size="md" icon={X} disabled={!ok || !comment.trim()} onClick={() => act('rejected')}>Reject</Button>
      <Button variant="primary" size="md" icon={Check} disabled={!ok || !allChecked} onClick={() => act(s.kind === 'task' ? 'done' : 'approved')}>{s.kind === 'task' ? 'Mark complete' : 'Approve'}</Button>
    </> : null}>
      <div className="gv-inline" style={{ alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <span className="gv-inline" style={{ alignItems: 'center', gap: 8 }}><StatusBadge s={STATUS_TONE[st.status]}>{st.status}</StatusBadge><span className="gv-faint mono">{r.id}</span></span>
        <ActorPick actor={actor} setActor={setActor} />
      </div>
      <KV rows={[
        ['Workflow', <Button key="w" variant="link" onClick={() => nav(`${WF_BASE}/${st.wf.id}`)}>{st.wf.name} · v{st.wf.version}</Button>],
        ['Module', moduleOf(st.wf.module).label], ['Requested by', `${r.requestedBy} · ${fmt(r.requestedAt)}`],
        ...Object.entries(r.ctx).map(([k, v]) => [k, v]),
        ...(subjectLink ? [['Item', <Button key="s" variant="link" onClick={() => nav(subjectLink)}>Open {r.subject.label}</Button>]] : []),
      ]} />
      <div className="gv-section-label">Progress</div>
      <Timeline r={r} st={st} />
      {st.cur && (
        <div className="wf-decide">
          <div className="gv-section-label" style={{ marginTop: 0 }}>Your decision — {s.name}</div>
          {!ok && <div className="gv-banner warn" style={{ marginTop: 0, marginBottom: 10 }}><Lock size={15} /><span>{why}</span></div>}
          {evidence.length > 0 && (
            <div className="gv-checks" style={{ marginBottom: 10 }}>
              {evidence.map((e) => <label key={e}><input type="checkbox" disabled={!ok} checked={!!checked[e]} onChange={(ev) => setChecked((o) => ({ ...o, [e]: ev.target.checked }))} />{e}</label>)}
            </div>
          )}
          <Fld label="Comment (required to reject; recorded in the audit log)"><textarea className="input" rows={3} value={comment} disabled={!ok} onChange={(e) => setComment(e.target.value)} placeholder="Reason, conditions or evidence references…" /></Fld>
        </div>
      )}
    </Drawer>
  );
}

/* ================================================================== library */
function Library({ workflows, requests }) {
  const nav = useNavigate();
  const [mod, setMod] = useState('ai-models');
  const [creating, setCreating] = useState(false);
  const m = moduleOf(mod);
  const list = workflows.filter((w) => w.module === mod);
  return (
    <div className="wf-lib">
      <nav className="wf-mods" aria-label="Modules">
        <div className="gv-section-label" style={{ margin: '0 0 6px' }}>Modules</div>
        {MODULES.map((x) => {
          const I = MOD_ICON[x.icon];
          const n = workflows.filter((w) => w.module === x.key).length;
          return <button key={x.key} type="button" className={mod === x.key ? 'on' : ''} onClick={() => setMod(x.key)}><I size={15} /><span>{x.label}</span><em>{n || '—'}</em></button>;
        })}
        <Note>Any part of GenMeta that needs a decision can start a workflow. New modules appear here as they connect.</Note>
      </nav>
      <div>
        <Card icon={MOD_ICON[m.icon]} tone="violet" title={m.label} count={list.length}
          sub={`Starts on: ${m.events.join(' · ')}`}
          actions={<Button variant="primary" size="md" icon={Plus} onClick={() => setCreating(true)}>New workflow</Button>}>
          {list.length ? (
            <div className="wf-cards">
              {list.map((w) => {
                const running = requests.filter((r) => r.wfId === w.id && stateOf(r, workflows).status === 'in progress').length;
                const approvals = w.steps.filter((s) => s.kind === 'approval').length;
                return (
                  <button key={w.id} type="button" className="wf-card" onClick={() => nav(`${WF_BASE}/${w.id}`)}>
                    <div className="wf-card-h"><b>{w.name}</b><StatusBadge s={w.status === 'active' ? 'active' : 'draft'}>{w.status}</StatusBadge></div>
                    <p>{w.desc}</p>
                    <div className="wf-mini">{w.steps.map((s) => { const I = KIND_ICON[s.kind]; return <span key={s.id} className={`gv-chip sm ${KIND_TONE[s.kind]} ${s.runIf ? 'cond' : ''}`} title={`${s.name}${s.runIf ? ` — only if ${condText(s.runIf)}` : ''}`}><I size={12} /></span>; })}</div>
                    <small><Zap size={12} /> {w.event} · {approvals} approval step{approvals === 1 ? '' : 's'} · v{w.version} · {running} running</small>
                    {w.usedBy.length > 0 && <small className="gv-faint">Used by {w.usedBy.join('; ')}</small>}
                  </button>
                );
              })}
            </div>
          ) : (
            <Empty>{m.live ? 'No workflows yet.' : `${m.label} is not connected to workflows yet.`} Create one and it will run when “{m.events[0]}” happens.</Empty>
          )}
        </Card>
      </div>
      {creating && <NewWorkflow mod={mod} workflows={workflows} onClose={() => setCreating(false)} />}
    </div>
  );
}

function NewWorkflow({ mod, workflows, onClose }) {
  const nav = useNavigate();
  const [f, setF] = useState({ name: '', module: mod, event: moduleOf(mod).events[0], from: '' });
  const set = (k) => (e) => setF((o) => ({ ...o, [k]: e.target.value, ...(k === 'module' ? { event: moduleOf(e.target.value).events[0], from: '' } : {}) }));
  const create = () => {
    const src = workflows.find((w) => w.id === f.from);
    const wf = {
      id: newWorkflowId(f.name), name: f.name.trim(), module: f.module, event: f.event, status: 'draft', version: 1, desc: src ? src.desc : '',
      usedBy: [], outcome: src ? { ...src.outcome } : { approved: 'Request is approved', rejected: 'Request is rejected' },
      steps: src ? src.steps.map((s) => ({ ...s, approvers: [...s.approvers], evidence: [...s.evidence] })) : [{ id: 'n1', kind: 'approval', name: 'Governance lead approves', approvers: ['governance-lead'], rule: 'any', sla: 3, escalateTo: 'governance-lead', sod: true, runIf: null, evidence: [], message: '' }],
    };
    saveWorkflow(wf, 'Admin', false);
    toast(`Created “${wf.name}” as a draft`);
    nav(`${WF_BASE}/${wf.id}`);
  };
  return (
    <Drawer title="New workflow" onClose={onClose} footer={<><Button variant="secondary" size="md" onClick={onClose}>Cancel</Button><Button variant="primary" size="md" disabled={!f.name.trim()} onClick={create}>Create and design</Button></>}>
      <div className="gv-form">
        <div className="full"><Fld label="Name"><input className="input" value={f.name} onChange={set('name')} placeholder="e.g. High-risk model approval" autoFocus /></Fld></div>
        <Fld label="Module"><select className="select" value={f.module} onChange={set('module')}>{MODULES.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}</select></Fld>
        <Fld label="Starts when"><select className="select" value={f.event} onChange={set('event')}>{moduleOf(f.module).events.map((e) => <option key={e}>{e}</option>)}</select></Fld>
        <div className="full"><Fld label="Start from"><select className="select" value={f.from} onChange={set('from')}><option value="">A blank workflow (one approval step)</option>{workflows.filter((w) => w.module === f.module).map((w) => <option key={w.id} value={w.id}>Copy of {w.name}</option>)}</select></Fld></div>
      </div>
      <Note>New workflows start as drafts. Publish one to make it run; if two active workflows start on the same event, the requester chooses which applies.</Note>
    </Drawer>
  );
}

/* ================================================================== activity */
function Activity({ states }) {
  const rows = states.flatMap(({ r, st }) => [
    { at: r.requestedAt, who: r.requestedBy, what: `requested ${st.wf.name}`, sub: r.subject.label, id: r.id },
    ...st.steps.filter((x) => (x.status === 'done' && !x.auto) || x.status === 'rejected').map((x) => ({ at: x.at, who: x.who, what: `${x.status === 'rejected' ? 'rejected' : x.step.kind === 'task' ? 'completed' : 'approved'} “${x.step.name}”`, sub: r.subject.label, id: r.id, comment: x.comment, bad: x.status === 'rejected' })),
  ]).sort((a, b) => b.at - a.at);
  return (
    <Card icon={History} tone="info" title="Activity" count={rows.length} sub="Every request and decision, newest first. The same entries are written to the hash-chained audit log.">
      <ul className="gv-lines">
        {rows.map((x, k) => <li key={k}><b>{x.who}</b> {x.what} — {x.sub} <span className="gv-faint">· {x.id} · {fmt(x.at)}</span>{x.comment && <span className="gv-sub">“{x.comment}”</span>}</li>)}
      </ul>
    </Card>
  );
}

/* ================================================================== designer */
const blankStep = (kind, n) => ({ id: `x${Date.now().toString(36)}${n}`, kind, name: { approval: 'New approval', automated: 'New automated check', task: 'New task', notify: 'Notify' }[kind], approvers: kind === 'approval' || kind === 'task' ? ['governance-lead'] : [], rule: 'any', sla: 3, escalateTo: 'governance-lead', sod: false, runIf: null, evidence: [], message: kind === 'notify' ? 'The request has moved on.' : '', desc: kind === 'automated' ? 'Describe what GenMeta checks.' : '' });

function Designer({ wfId }) {
  const nav = useNavigate();
  const { workflows, requests } = useWorkflowStore();
  const orig = workflows.find((w) => w.id === wfId);
  const [wf, setWf] = useState(orig);
  const [sel, setSel] = useState('trigger');
  const [adding, setAdding] = useState(null);
  const [testing, setTesting] = useState(false);
  const dirty = useMemo(() => JSON.stringify(wf) !== JSON.stringify(orig), [wf, orig]);
  if (!orig) return <div className="page gv"><Empty>That workflow no longer exists.</Empty><Button variant="secondary" onClick={() => nav(`${WF_BASE}?tab=workflows`)}>Back to workflows</Button></div>;
  const m = moduleOf(wf.module);
  const upd = (patch) => setWf((w) => ({ ...w, ...patch }));
  const updStep = (id, patch) => setWf((w) => ({ ...w, steps: w.steps.map((s) => (s.id === id ? { ...s, ...patch } : s)) }));
  const insert = (at, kind) => { const s = blankStep(kind, at); setWf((w) => { const steps = [...w.steps]; steps.splice(at, 0, s); return { ...w, steps }; }); setSel(s.id); setAdding(null); };
  const move = (k, dir) => setWf((w) => { const steps = [...w.steps]; const [s] = steps.splice(k, 1); steps.splice(k + dir, 0, s); return { ...w, steps }; });
  const remove = (id) => { setWf((w) => ({ ...w, steps: w.steps.filter((s) => s.id !== id) })); setSel('trigger'); };
  const running = requests.filter((r) => r.wfId === wf.id && stateOf(r, workflows).status === 'in progress').length;
  const save = (publish) => { const saved = saveWorkflow(wf, 'Admin', publish); setWf(saved); toast(publish ? `Published “${saved.name}” — version ${saved.version} is live${running ? `; ${running} running request(s) finish on their current version` : ''}` : 'Draft saved'); };
  const selStep = wf.steps.find((s) => s.id === sel);
  const Plus1 = ({ at }) => (
    <div className="wf-add">
      <button type="button" aria-label="Add a step here" onClick={() => setAdding(adding === at ? null : at)}><Plus size={13} /></button>
      {adding === at && (
        <div className="wf-addmenu">
          {Object.entries(STEP_KINDS).map(([k, v]) => { const I = KIND_ICON[k]; return <button key={k} type="button" onClick={() => insert(at, k)}><span className={`gv-chip sm ${KIND_TONE[k]}`}><I size={13} /></span><span><b>{v.label}</b><small>{v.desc}</small></span></button>; })}
        </div>
      )}
    </div>
  );
  return (
    <div className="page gv">
      <div className="wf-dhead">
        <div>
          <Button variant="link" icon={ArrowLeft} onClick={() => nav(`${WF_BASE}?tab=workflows`)}>Workflows · {m.label}</Button>
          <input className="wf-title" value={wf.name} onChange={(e) => upd({ name: e.target.value })} aria-label="Workflow name" />
          <div className="gv-inline" style={{ alignItems: 'center', gap: 8 }}>
            <StatusBadge s={wf.status === 'active' ? 'active' : 'draft'}>{wf.status}</StatusBadge>
            <span className="gv-faint">version {wf.version} · last saved by {wf.updatedBy} · {fmt(new Date(wf.updatedAt))}{dirty && ' · unsaved changes'}</span>
          </div>
        </div>
        <div className="gv-inline" style={{ gap: 8 }}>
          <Button variant="secondary" size="md" icon={FlaskConical} onClick={() => setTesting(true)}>Test run</Button>
          <Button variant="secondary" size="md" icon={Save} disabled={!dirty} onClick={() => save(false)}>Save draft</Button>
          <Button variant="primary" size="md" icon={Rocket} disabled={!dirty && wf.status === 'active'} onClick={() => save(true)}>{wf.status === 'active' ? 'Publish new version' : 'Publish'}</Button>
        </div>
      </div>

      <div className="wf-design">
        <div className="wf-canvas">
          <button type="button" className={`wf-node trigger ${sel === 'trigger' ? 'on' : ''}`} onClick={() => setSel('trigger')}>
            <span className="gv-chip sm info"><Zap size={14} /></span>
            <span className="wf-node-b"><small>When</small><b>{wf.event}</b><em>{m.label}{wf.usedBy.length ? ` · used by ${wf.usedBy[0]}` : ''}</em></span>
          </button>
          <Plus1 at={0} />
          {wf.steps.map((s, k) => {
            const I = KIND_ICON[s.kind];
            return (
              <div key={s.id} className="wf-stepwrap">
                {s.runIf && <div className="wf-cond"><Filter size={12} /> Only if {condText(s.runIf)}</div>}
                <div className={`wf-node ${sel === s.id ? 'on' : ''} ${s.runIf ? 'conditional' : ''}`} role="button" tabIndex={0} onClick={() => setSel(s.id)} onKeyDown={(e) => e.key === 'Enter' && setSel(s.id)}>
                  <span className={`gv-chip sm ${KIND_TONE[s.kind]}`}><I size={14} /></span>
                  <span className="wf-node-b">
                    <small>{k + 1} · {STEP_KINDS[s.kind].label}</small>
                    <b>{s.name}</b>
                    <em>
                      {(s.kind === 'approval' || s.kind === 'task') && <>{approverText(s)}{s.approvers.length > 1 && ` · ${RULES[s.rule].toLowerCase()}`} · <Clock size={11} /> {s.sla} day{s.sla === 1 ? '' : 's'}</>}
                      {s.kind === 'automated' && (s.desc || 'Automated')}
                      {s.kind === 'notify' && (s.message || 'Message')}
                    </em>
                    {(s.sod || s.evidence.length > 0) && <span className="wf-tags">{s.sod && <span className="tag"><Lock size={10} /> not the requester</span>}{s.evidence.length > 0 && <span className="tag">{s.evidence.length} evidence item{s.evidence.length === 1 ? '' : 's'}</span>}</span>}
                  </span>
                  <span className="wf-node-tools" onClick={(e) => e.stopPropagation()} role="presentation">
                    <button type="button" aria-label="Move up" disabled={k === 0} onClick={() => move(k, -1)}><ArrowUp size={13} /></button>
                    <button type="button" aria-label="Move down" disabled={k === wf.steps.length - 1} onClick={() => move(k, 1)}><ArrowDown size={13} /></button>
                    <button type="button" aria-label="Delete step" onClick={() => remove(s.id)}><Trash2 size={13} /></button>
                  </span>
                </div>
                <Plus1 at={k + 1} />
              </div>
            );
          })}
          <button type="button" className={`wf-node end ${sel === 'end' ? 'on' : ''}`} onClick={() => setSel('end')}>
            <span className="gv-chip sm ok"><Flag size={14} /></span>
            <span className="wf-node-b"><small>Outcome</small><b>Approved → {wf.outcome.approved}</b><em>Rejected at any step → {wf.outcome.rejected}</em></span>
          </button>
        </div>

        <aside className="dash-card wf-insp">
          {sel === 'trigger' && (
            <>
              <h3><Zap size={15} /> Trigger</h3>
              <Fld label="Module"><select className="select" value={wf.module} disabled><option>{m.label}</option></select></Fld>
              <Fld label="Starts when"><select className="select" value={wf.event} onChange={(e) => upd({ event: e.target.value })}>{m.events.map((e) => <option key={e}>{e}</option>)}</select></Fld>
              <Fld label="Description"><textarea className="input" rows={3} value={wf.desc} onChange={(e) => upd({ desc: e.target.value })} /></Fld>
              <div className="gv-section-label">Fields a step can test</div>
              <ul className="wf-fields">{Object.entries(m.fields).map(([k, v]) => <li key={k}><b>{k}</b><span>{v.join(' · ')}</span></li>)}</ul>
              <div className="gv-section-label">Where this workflow is used</div>
              {wf.usedBy.length ? <ul className="gv-lines">{wf.usedBy.map((u) => <li key={u}>{u}</li>)}</ul> : <p className="gv-muted" style={{ fontSize: 13 }}>Not attached yet. Publish it and it runs whenever “{wf.event}” happens.</p>}
            </>
          )}
          {sel === 'end' && (
            <>
              <h3><Flag size={15} /> Outcome</h3>
              <Fld label="When approved"><textarea className="input" rows={2} value={wf.outcome.approved} onChange={(e) => upd({ outcome: { ...wf.outcome, approved: e.target.value } })} /></Fld>
              <Fld label="When rejected"><textarea className="input" rows={2} value={wf.outcome.rejected} onChange={(e) => upd({ outcome: { ...wf.outcome, rejected: e.target.value } })} /></Fld>
              <Note>The requester and the item’s owners are told either way. Every decision is written to the audit log.</Note>
            </>
          )}
          {selStep && <StepEditor key={selStep.id} s={selStep} m={m} onChange={(p) => updStep(selStep.id, p)} />}
        </aside>
      </div>
      {testing && <TestRun wf={wf} m={m} onClose={() => setTesting(false)} />}
    </div>
  );
}

function StepEditor({ s, m, onChange }) {
  const I = KIND_ICON[s.kind];
  const fields = Object.keys(m.fields);
  const togRole = (r) => onChange({ approvers: s.approvers.includes(r) ? s.approvers.filter((x) => x !== r) : [...s.approvers, r] });
  const setCond = (patch) => onChange({ runIf: { field: fields[0], op: 'is', value: [m.fields[fields[0]][0]], ...s.runIf, ...patch } });
  const [ev, setEv] = useState('');
  return (
    <>
      <h3><span className={`gv-chip sm ${KIND_TONE[s.kind]}`}><I size={13} /></span> {STEP_KINDS[s.kind].label}</h3>
      <Fld label="Step name"><input className="input" value={s.name} onChange={(e) => onChange({ name: e.target.value })} /></Fld>
      {(s.kind === 'approval' || s.kind === 'task') && (
        <>
          <Fld label={s.kind === 'task' ? 'Done by' : 'Approvers'}>
            <div className="gv-chips">{APPROVER_ROLES.map((r) => <button key={r} type="button" className={`chip ${s.approvers.includes(r) ? 'on' : ''}`} onClick={() => togRole(r)}>{ROLE_LABEL[r]}</button>)}</div>
          </Fld>
          {s.approvers.length > 1 && <Fld label="Who must approve"><select className="select" value={s.rule} onChange={(e) => onChange({ rule: e.target.value })}>{Object.entries(RULES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Fld>}
          <div className="gv-form" style={{ margin: 0 }}>
            <Fld label="Decide within (days)"><input className="input" type="number" min={1} max={60} value={s.sla} onChange={(e) => onChange({ sla: Math.max(1, +e.target.value || 1) })} /></Fld>
            <Fld label="If late, escalate to"><select className="select" value={s.escalateTo} onChange={(e) => onChange({ escalateTo: e.target.value })}>{APPROVER_ROLES.filter((r) => r !== 'owner').map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}</select></Fld>
          </div>
          <label className="gv-check"><input type="checkbox" checked={s.sod} onChange={(e) => onChange({ sod: e.target.checked })} />The requester can’t approve this step (separation of duties)</label>
          <Fld label="Evidence the approver confirms">
            <ul className="wf-ev">{s.evidence.map((e) => <li key={e}>{e}<button type="button" className="gv-x" aria-label={`Remove ${e}`} onClick={() => onChange({ evidence: s.evidence.filter((x) => x !== e) })}><X size={12} /></button></li>)}</ul>
            <div className="gv-inline"><input className="input" style={{ flex: 1 }} value={ev} onChange={(e) => setEv(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && ev.trim()) { onChange({ evidence: [...s.evidence, ev.trim()] }); setEv(''); } }} placeholder="Add an item and press Enter" /></div>
          </Fld>
        </>
      )}
      {s.kind === 'automated' && <Fld label="What GenMeta checks"><textarea className="input" rows={3} value={s.desc || ''} onChange={(e) => onChange({ desc: e.target.value })} /></Fld>}
      {s.kind === 'notify' && <Fld label="Message to the requester and owners"><textarea className="input" rows={3} value={s.message} onChange={(e) => onChange({ message: e.target.value })} /></Fld>}
      <div className="gv-section-label">Condition</div>
      <label className="gv-check"><input type="checkbox" checked={!!s.runIf} onChange={(e) => onChange({ runIf: e.target.checked ? { field: fields[0], op: 'is', value: [m.fields[fields[0]][0]] } : null })} />Only run this step if…</label>
      {s.runIf && (
        <div className="wf-condedit">
          <select className="select" value={s.runIf.field} onChange={(e) => setCond({ field: e.target.value, value: [m.fields[e.target.value][0]] })}>{fields.map((f) => <option key={f}>{f}</option>)}</select>
          <select className="select" value={s.runIf.op === 'is any of' ? 'is' : s.runIf.op} onChange={(e) => setCond({ op: e.target.value })}><option value="is">is</option><option value="is not">is not</option></select>
          <div className="gv-chips">{(m.fields[s.runIf.field] || []).map((v) => <button key={v} type="button" className={`chip ${s.runIf.value.includes(v) ? 'on' : ''}`} onClick={() => setCond({ value: s.runIf.value.includes(v) ? s.runIf.value.filter((x) => x !== v).length ? s.runIf.value.filter((x) => x !== v) : s.runIf.value : [...s.runIf.value, v] })}>{v}</button>)}</div>
        </div>
      )}
    </>
  );
}

function TestRun({ wf, m, onClose }) {
  const fields = Object.entries(m.fields);
  const [ctx, setCtx] = useState(Object.fromEntries(fields.map(([k, v]) => [k, v[v.length - 1]])));
  const path = pathFor(wf, ctx);
  const total = path.filter((p) => p.applies && (p.step.kind === 'approval' || p.step.kind === 'task')).reduce((n, p) => n + p.step.sla, 0);
  return (
    <Drawer wide title={`Test run — ${wf.name}`} onClose={onClose}>
      <p className="gv-muted" style={{ marginTop: 0, fontSize: 13 }}>Pick example answers to see which steps would run, who would be asked and how long it could take. Nothing is sent.</p>
      <div className="gv-form">
        {fields.map(([k, v]) => <Fld key={k} label={k}><select className="select" value={ctx[k]} onChange={(e) => setCtx((o) => ({ ...o, [k]: e.target.value }))}>{v.map((x) => <option key={x}>{x}</option>)}</select></Fld>)}
      </div>
      <div className="gv-section-label">Path</div>
      <ol className="wf-tl">
        {path.map(({ step: s, applies }) => {
          const I = KIND_ICON[s.kind];
          return (
            <li key={s.id} className={applies ? 'done' : 'skipped'}>
              <i>{applies ? <I size={11} /> : <CircleSlash size={11} />}</i>
              <div><b>{s.name}</b><small>{applies ? (s.kind === 'approval' || s.kind === 'task' ? `${approverText(s)} · ${s.sla} day(s)${s.sod ? ' · not the requester' : ''}` : STEP_KINDS[s.kind].label) : `Skipped — only runs if ${condText(s.runIf)}`}</small></div>
            </li>
          );
        })}
      </ol>
      <Note>{path.filter((p) => p.applies && p.step.kind === 'approval').length} approval step(s) would run · up to {total} working day(s) if every approver uses their full time.</Note>
    </Drawer>
  );
}

/* ================================================================== used from other pages */
/* the approval panel on a model page: the latest request for it, or the workflow that would apply */
export function ApprovalPanel({ kind, id, event, module = 'ai-models' }) {
  const nav = useNavigate();
  const { workflows, requests } = useWorkflowStore();
  const mine = requests.filter((r) => r.subject.kind === kind && r.subject.id === id);
  const latest = mine[0];
  if (!latest) {
    const wf = workflows.find((w) => w.module === module && w.event === event && w.status === 'active');
    return (
      <div className="wf-panel">
        <div className="gv-subhead">Approval workflow</div>
        {wf ? <p className="gv-muted" style={{ fontSize: 13, margin: '4px 0 8px' }}><b>{wf.name}</b> runs when “{event.toLowerCase()}” happens · {wf.steps.filter((s) => s.kind === 'approval').length} approval steps.</p> : <p className="gv-muted" style={{ fontSize: 13 }}>No active workflow for “{event}”.</p>}
        {wf && <Button variant="link" iconRight icon={ChevronRight} onClick={() => nav(`${WF_BASE}/${wf.id}`)}>Open in Workflows</Button>}
      </div>
    );
  }
  const st = stateOf(latest, workflows);
  return (
    <div className="wf-panel">
      <div className="gv-inline" style={{ alignItems: 'center', justifyContent: 'space-between' }}>
        <div className="gv-subhead" style={{ margin: 0 }}>Approval — {st.wf.name} <span className="gv-faint">· {latest.id}</span></div>
        <StatusBadge s={STATUS_TONE[st.status]}>{st.status}{st.cur ? ` · ${st.cur.step.name}` : ''}</StatusBadge>
      </div>
      <Timeline r={latest} st={st} />
      <div className="gv-inline" style={{ gap: 8 }}>
        <Button variant="secondary" size="sm" icon={Inbox} onClick={() => nav(`${WF_BASE}?req=${latest.id}`)}>Open in Approvals</Button>
        <Button variant="link" onClick={() => nav(`${WF_BASE}/${st.wf.id}`)}>View workflow</Button>
      </div>
    </div>
  );
}

/* one-line approval status shown at the top of a model's Overview */
export function ApprovalBanner({ kind, id }) {
  const nav = useNavigate();
  const { workflows, requests } = useWorkflowStore();
  const latest = requests.find((r) => r.subject.kind === kind && r.subject.id === id);
  if (!latest) return null;
  const st = stateOf(latest, workflows);
  const tn = st.status === 'approved' ? 'ok' : st.status === 'rejected' ? 'warn' : 'info';
  const done = st.steps.filter((x) => x.status === 'done' && !x.auto && x.step.kind !== 'notify').length;
  const total = st.steps.filter((x) => x.status !== 'skipped' && (x.step.kind === 'approval' || x.step.kind === 'task')).length;
  return (
    <div className={`gv-banner ${tn}`} style={{ marginTop: 0, marginBottom: 14, alignItems: 'center' }}>
      {st.status === 'approved' ? <Check size={15} /> : st.status === 'rejected' ? <X size={15} /> : <Clock size={15} />}
      <span style={{ flex: 1 }}>
        <b>{st.status === 'in progress' ? 'Awaiting approval' : st.status === 'approved' ? 'Approved' : 'Rejected'}</b> — {st.wf.name} ({latest.id}) · {done} of {total} approval steps done
        {st.cur && <> · waiting on <b>{waitingOn(latest, st)}</b> for “{st.cur.step.name}”, {dueText(st.cur.due)[0]}</>}
      </span>
      <Button variant="secondary" size="sm" icon={Inbox} onClick={() => nav(`${WF_BASE}?req=${latest.id}`)}>Open in Approvals</Button>
    </div>
  );
}
