import { Link } from 'react-router-dom';
import { Users, UsersRound, Fingerprint, Mail, KeyRound } from 'lucide-react';
import { Ring } from '../../components/ui.jsx';
import { USERS, TOKENS, EVENT_LOGS, SSO, SMTP, ADMIN_TOTALS as T } from '../../admin-data.js';
import { BASE, AdminHead, Stats, Pill, TOKEN_STATUS } from './kit.jsx';

export default function Overview() {
  const roles = Object.entries(USERS.reduce((m, u) => ({ ...m, [u.role]: (m[u.role] || 0) + 1 }), {})).sort((a, b) => b[1] - a[1]);
  return (
    <>
      <AdminHead title="Overview" sub="Platform health across identity, access and delivery." />
      <Stats items={[
        { icon: Users, v: T.users, l: 'Total users', s: `${T.activeUsers} active · ${T.invited} invited` },
        { icon: UsersRound, v: T.groups, l: 'Total groups', s: `${T.entraGroups} synced from Entra ID` },
        { icon: Fingerprint, v: SSO.enabled ? 'Enabled' : 'Off', l: 'SSO', s: `${SSO.provider} · ${SSO.protocol}` },
        { icon: Mail, v: SMTP.configured ? 'Connected' : 'Not set', l: 'SMTP', s: SMTP.host },
        { icon: KeyRound, v: T.tokens, l: 'Total API tokens', s: `${T.expiring} expiring within 30 days` },
      ]} />

      <section className="admin-split">
        <article className="card">
          <header className="card-head">
            <div><h2>API tokens</h2><p>Service credentials with scoped access to the GenMeta API.</p></div>
            <Link className="bracket ghost" to={`${BASE}/api/tokens`}>API access</Link>
          </header>
          <div className="table-wrap">
            <table className="tbl static">
              <thead><tr><th>Name</th><th>Owner</th><th>Expires</th><th>Last used</th><th>Status</th></tr></thead>
              <tbody>
                {TOKENS.map((t) => (
                  <tr key={t.id}>
                    <td><code>{t.name}</code></td>
                    <td>{t.owner}</td>
                    <td className="muted">{t.expires}</td>
                    <td className="muted">{t.last}</td>
                    <td><Pill map={TOKEN_STATUS} s={t.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

        <article className="card pad admin-side">
          <div className="admin-mfa">
            <Ring value={T.mfa} size={72} stroke={7}><b>{Math.round(T.mfa * 100)}%</b></Ring>
            <p><b>MFA enrolment</b><small>{USERS.filter((u) => !u.mfa).length} users without MFA</small></p>
          </div>
          <h3 className="admin-h3">Users by role</h3>
          <ul className="role-bars">
            {roles.map(([r, n]) => (
              <li key={r}><span>{r}</span><div className="cov-bar"><i style={{ width: `${(n / T.users) * 100}%` }} /></div><b>{n}</b></li>
            ))}
          </ul>
        </article>
      </section>

      <section className="card">
        <header className="card-head">
          <div><h2>Recent events</h2><p>Latest entries from the audit log.</p></div>
          <Link className="bracket ghost" to={`${BASE}/logs/events`}>Event logs</Link>
        </header>
        <ul className="log admin-log">
          {EVENT_LOGS.slice(0, 5).map((e, i) => (
            <li key={i} className={e.sev !== 'info' ? 'flag' : ''}>
              <time>{e.t}</time>
              <p><b>{e.actor}</b> {e.ev.toLowerCase()} <code>{e.target}</code><small>{e.cat} · {e.ip}</small></p>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
