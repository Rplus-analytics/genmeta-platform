import { useMemo, useState } from 'react';
import { UsersRound, UserPlus, Plus, Search, ShieldCheck } from 'lucide-react';
import { USERS, GROUPS, ADMIN_TOTALS as T, membersOf } from '../../admin-data.js';
import { AdminHead, Pill, USER_STATUS } from './kit.jsx';
import { Segmented } from '../../components/ui.jsx';

export function UsersPage() {
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('all');
  const counts = useMemo(() => USERS.reduce((m, u) => ({ ...m, [u.status]: (m[u.status] || 0) + 1 }), {}), []);
  const statusOpts = [
    { value: 'all', label: `All ${USERS.length}` },
    { value: 'active', label: `Active ${counts.active || 0}` },
    { value: 'invited', label: `Invited ${counts.invited || 0}` },
    { value: 'suspended', label: `Suspended ${counts.suspended || 0}` },
  ];
  const list = useMemo(() => USERS.filter((u) =>
    (status === 'all' || u.status === status) && (u.name + u.email + u.role).toLowerCase().includes(q.toLowerCase())), [q, status]);
  return (
    <>
      <AdminHead title="Users" sub="Everyone with access to GenMeta, their roles and group membership.">
        <button className="btn primary"><UserPlus size={14} />Invite user</button>
      </AdminHead>
      <div className="filters">
        <label className="search sm"><Search size={16} /><input placeholder="Search users…" value={q} onChange={(e) => setQ(e.target.value)} /></label>
        <Segmented options={statusOpts} value={status} onChange={setStatus} ariaLabel="Filter by status" />
      </div>
      <article className="card">
        <div className="table-wrap">
          <table className="tbl static">
            <thead><tr><th>User</th><th>Role</th><th>Groups</th><th>MFA</th><th>Last active</th><th>Status</th></tr></thead>
            <tbody>
              {list.map((u) => (
                <tr key={u.id}>
                  <td><div className="sys"><span className="ini">{u.ini}</span><div><b>{u.name}</b><small>{u.email}</small></div></div></td>
                  <td>{u.role}</td>
                  <td><div className="chips">{u.groups.map((g) => <span key={g} className="chip">{g}</span>)}</div></td>
                  <td>{u.mfa ? <ShieldCheck size={16} className="ok-ico" aria-label="Enabled" /> : <span className="muted">Off</span>}</td>
                  <td className="muted">{u.last}</td>
                  <td><Pill map={USER_STATUS} s={u.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="tbl-foot">{list.length} of {USERS.length} users</div>
      </article>
    </>
  );
}

export function GroupsPage() {
  return (
    <>
      <AdminHead title="Groups" sub={`${T.groups} groups · ${T.entraGroups} synced from Microsoft Entra ID`}>
        <button className="btn primary"><Plus size={14} />New group</button>
      </AdminHead>
      <section className="policy-grid admin-grid">
        {GROUPS.map((g) => {
          const members = membersOf(g.name);
          return (
            <article key={g.id} className="card policy">
              <span className="stat-ico"><UsersRound size={19} /></span>
              <div className="policy-t"><b>{g.name}</b><small>{g.source} · created {g.created}</small></div>
              <p>{g.d}</p>
              <div className="chips">{g.perms.map((p) => <span key={p} className="chip">{p}</span>)}</div>
              <div className="group-members">
                <div className="avatars">{members.slice(0, 5).map((m) => <span key={m.id} className="ini" title={m.name}>{m.ini}</span>)}</div>
                <span className="muted">{members.length} member{members.length === 1 ? '' : 's'}</span>
              </div>
            </article>
          );
        })}
      </section>
    </>
  );
}
