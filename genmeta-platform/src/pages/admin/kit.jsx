import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Check } from 'lucide-react';

export const BASE = '/app/admin';

export const USER_STATUS = { active: ['ok', 'Active'], invited: ['warn', 'Invited'], suspended: ['off', 'Suspended'] };
export const TOKEN_STATUS = { active: ['ok', 'Active'], expiring: ['warn', 'Expiring'], revoked: ['off', 'Revoked'] };

export const Pill = ({ map, s }) => <span className={`pill ${map[s][0]}`}><i />{map[s][1]}</span>;

/* Section title inside an admin page (the page's own H1 is the rail item). */
export function AdminHead({ title, sub, children }) {
  return (
    <div className="admin-head">
      <div><h2>{title}</h2>{sub && <p>{sub}</p>}</div>
      {children && <div className="head-actions">{children}</div>}
    </div>
  );
}

export function Stats({ items }) {
  return (
    <div className="stat-row">
      {items.map((s) => (
        <div key={s.l} className="stat">
          <span className="stat-ico"><s.icon size={19} /></span>
          <div><b>{s.v}</b><span>{s.l}</span><small>{s.s}</small></div>
        </div>
      ))}
    </div>
  );
}

/* In-page tabs that map to child routes, e.g. API tokens / OAuth clients. */
export function SubTabs({ base, tabs }) {
  const { pathname } = useLocation();
  const nav = useNavigate();
  return (
    <div className="tabs">
      {tabs.map(([k, l]) => {
        const to = k ? `${base}/${k}` : base;
        return <button key={l} className={pathname === to ? 'on' : ''} onClick={() => nav(to)}>{l}</button>;
      })}
    </div>
  );
}

export function Switch({ on, onChange, label }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} className={`switch ${on ? 'on' : ''}`} onClick={() => onChange(!on)}>
      <i />
    </button>
  );
}

/* One labelled setting: text on the left, control on the right. */
export function Row({ label, hint, children }) {
  return (
    <div className="set-row">
      <div className="set-l"><b>{label}</b>{hint && <small>{hint}</small>}</div>
      <div className="set-c">{children}</div>
    </div>
  );
}

export function Settings({ title, sub, children }) {
  return (
    <article className="card settings">
      {title && <header className="card-head"><div><h2>{title}</h2>{sub && <p>{sub}</p>}</div></header>}
      {children}
    </article>
  );
}

/* Local form state plus a save bar that confirms briefly. */
export function useForm(initial) {
  const [v, setV] = useState(initial);
  const [dirty, setDirty] = useState(false);
  const set = (k) => (val) => { setV((o) => ({ ...o, [k]: val?.target ? val.target.value : val })); setDirty(true); };
  return { v, set, dirty, setDirty };
}

export function SaveBar({ form }) {
  const [saved, setSaved] = useState(false);
  const save = () => { form.setDirty(false); setSaved(true); setTimeout(() => setSaved(false), 1800); };
  return (
    <div className="save-bar">
      {saved && <span className="pill ok"><Check size={13} />Saved</span>}
      {form.dirty && <span className="muted">Unsaved changes</span>}
      <button className="btn primary" onClick={save} disabled={!form.dirty}>Save changes</button>
    </div>
  );
}
