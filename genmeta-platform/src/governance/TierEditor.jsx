import { useState } from 'react';
import { ChevronRight, Save, Check, Lock, ShieldCheck } from 'lucide-react';
import { Button } from '../components/ui.jsx';
import { RISK_TIERS } from './data.js';
import { WORKFLOW_STAGES, useTemplates, saveTemplate, tierSummary, ROLES } from './tiers.js';
import { Drawer, Fld, toast } from './kit.jsx';

/* Governance › AI model governance › "Risk tiers & review policy" — the workflow template editor (MLG-06).
   One card per risk tier; each opens to its review period, approvals, evidence and sign-off per stage,
   and the regulatory and HMRC requirements the workflow maps to. Only a governance lead can save. */

const riskTone = (r) => (r === 'High risk' ? 'bad' : r === 'Low risk' ? 'ok' : 'warn');
const lines = (a) => a.join('\n');
const split = (s) => s.split('\n').map((x) => x.trim()).filter(Boolean);

export default function TierEditor({ onClose }) {
  const templates = useTemplates();
  const [role, setRole] = useState('governance-lead');
  const [open, setOpen] = useState('High risk');
  const canEdit = role === 'governance-lead';
  return (
    <Drawer wide title="Risk tiers and review policy" onClose={onClose}>
      <div className="gv-tiered-top">
        <p className="gv-muted">Each risk tier has its own workflow: how often models are reviewed, how many people must approve, the evidence each stage needs, who signs it off, and the regulations it answers to.</p>
        <Fld label="Viewing as (test)">
          <select className="select" value={role} onChange={(e) => setRole(e.target.value)}>{ROLES.map((r) => <option key={r}>{r}</option>)}</select>
        </Fld>
      </div>
      {!canEdit && <div className="gv-callout info"><Lock size={15} /><span>You are {role}. Templates are read-only; only a governance lead can change them.</span></div>}
      <div className="gv-tiers">
        {RISK_TIERS.map(([name, desc]) => (
          <TierCard key={name} name={name} desc={desc} tpl={templates[name]} open={open === name} canEdit={canEdit} role={role}
            onToggle={() => setOpen((o) => (o === name ? null : name))} />
        ))}
      </div>
    </Drawer>
  );
}

function TierCard({ name, desc, tpl, open, canEdit, role, onToggle }) {
  const toForm = (t) => ({
    days: String(t.days), approvers: String(t.approvers),
    stages: Object.fromEntries(WORKFLOW_STAGES.map((s) => [s, { evidence: lines(t.stages[s].evidence), roles: lines(t.stages[s].roles) }])),
    regulations: lines(t.regulations),
  });
  const [f, setF] = useState(() => toForm(tpl));
  const [saved, setSaved] = useState(false);
  const setStage = (s, k) => (e) => { setSaved(false); setF((o) => ({ ...o, stages: { ...o.stages, [s]: { ...o.stages[s], [k]: e.target.value } } })); };
  const setTop = (k) => (e) => { setSaved(false); setF((o) => ({ ...o, [k]: e.target.value })); };
  const days = parseInt(f.days, 10);
  const approvers = parseInt(f.approvers, 10);
  const valid = days > 0 && approvers > 0;
  const save = () => {
    saveTemplate(name, {
      days, approvers,
      stages: Object.fromEntries(WORKFLOW_STAGES.map((s) => [s, { evidence: split(f.stages[s].evidence), roles: split(f.stages[s].roles) }])),
      regulations: split(f.regulations),
    }, role);
    setSaved(true);
    toast(`${name} template saved — ${tierSummary({ days, approvers })}`);
  };
  return (
    <section className={`dash-card gv-tier ${open ? 'open' : ''} ${riskTone(name)}`}>
      <button type="button" className="gv-tier-h" onClick={onToggle} aria-expanded={open}>
        <ChevronRight size={16} className="gv-collapse-ic" />
        <span className={`gv-riskband ${riskTone(name)}`}>{name}</span>
        <span className="gv-tier-sum">{tierSummary(tpl)}</span>
        <span className="gv-tier-desc">{desc}</span>
        {tpl.savedAt && <span className="gv-faint gv-tier-saved">saved {tpl.savedAt} by {tpl.savedBy}</span>}
      </button>
      {open && (
        <div className="gv-tier-b">
          <div className="gv-tier-nums">
            <Fld label="Review every (days)"><input className="input" type="number" min="1" value={f.days} onChange={setTop('days')} disabled={!canEdit} /></Fld>
            <Fld label="Approvals required"><input className="input" type="number" min="1" value={f.approvers} onChange={setTop('approvers')} disabled={!canEdit} /></Fld>
          </div>
          <div className="gv-stages">
            {WORKFLOW_STAGES.map((s, i) => (
              <div key={s} className="gv-stage">
                <div className="gv-stage-h"><i>{i + 1}</i><b>{s}</b><span className="gv-faint">{split(f.stages[s].evidence).length} evidence item(s) · {split(f.stages[s].roles).length} role(s)</span></div>
                <div className="gv-stage-b">
                  <Fld label="Evidence required (one per line)"><textarea className="input gv-ta" rows={Math.max(3, split(f.stages[s].evidence).length + 1)} value={f.stages[s].evidence} onChange={setStage(s, 'evidence')} disabled={!canEdit} /></Fld>
                  <Fld label="Signed off by (roles, one per line)"><textarea className="input gv-ta" rows={Math.max(3, split(f.stages[s].roles).length + 1)} value={f.stages[s].roles} onChange={setStage(s, 'roles')} disabled={!canEdit} /></Fld>
                </div>
              </div>
            ))}
          </div>
          <Fld label="Regulatory and HMRC requirements this workflow maps to (one per line)">
            <textarea className="input gv-ta" rows={Math.max(4, split(f.regulations).length + 1)} value={f.regulations} onChange={setTop('regulations')} disabled={!canEdit} />
          </Fld>
          {canEdit ? (
            <div className="gv-tier-save">
              <div className="gv-inline" style={{ alignItems: 'center', gap: 10 }}>
                <Button variant="primary" icon={Save} disabled={!valid} onClick={save}>Save template</Button>
                {saved && <span className="gv-saved"><Check size={14} />Template saved.</span>}
                {!valid && <span className="gv-bad-t" style={{ fontSize: 12.5 }}>Review period and approvals must be at least 1.</span>}
              </div>
              <p className="gv-faint"><ShieldCheck size={13} /> Only a governance lead can change templates. You are governance-lead.</p>
            </div>
          ) : (
            <p className="gv-faint" style={{ margin: 0 }}><Lock size={13} /> Read-only — only a governance lead can change templates. You are {role}.</p>
          )}
        </div>
      )}
    </section>
  );
}
