import { Routes, Route, Navigate } from 'react-router-dom';
import { Plus, RotateCw, Trash2, Copy } from 'lucide-react';
import { TOKENS, OAUTH_CLIENTS } from '../../admin-data.js';
import { BASE, AdminHead, SubTabs, Pill, TOKEN_STATUS } from './kit.jsx';

const CLIENT_STATUS = { active: ['ok', 'Active'], revoked: ['off', 'Revoked'] };

function Tokens() {
  return (
    <article className="card">
      <header className="card-head">
        <div><h2>API tokens</h2><p>Personal and service tokens. Secrets are shown once at creation.</p></div>
        <button className="btn primary sm"><Plus size={14} />New token</button>
      </header>
      <div className="table-wrap">
        <table className="tbl static">
          <thead><tr><th>Name</th><th>Owner</th><th>Scopes</th><th>Created</th><th>Expires</th><th>Last used</th><th>Status</th><th /></tr></thead>
          <tbody>
            {TOKENS.map((t) => (
              <tr key={t.id}>
                <td><code>{t.name}</code></td>
                <td>{t.owner}</td>
                <td><div className="chips">{t.scopes.map((s) => <span key={s} className="chip">{s}</span>)}</div></td>
                <td className="muted">{t.created}</td>
                <td className="muted">{t.expires}</td>
                <td className="muted">{t.last}</td>
                <td><Pill map={TOKEN_STATUS} s={t.status} /></td>
                <td className="row-acts">
                  {t.status !== 'revoked' && <>
                    <button className="icon-btn" title="Rotate" aria-label="Rotate"><RotateCw size={15} /></button>
                    <button className="icon-btn" title="Revoke" aria-label="Revoke"><Trash2 size={15} /></button>
                  </>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </article>
  );
}

function OAuthClients() {
  return (
    <article className="card">
      <header className="card-head">
        <div><h2>OAuth clients</h2><p>Applications that sign users in or call the API on their own behalf.</p></div>
        <button className="btn primary sm"><Plus size={14} />Register client</button>
      </header>
      <div className="table-wrap">
        <table className="tbl static">
          <thead><tr><th>Application</th><th>Client ID</th><th>Grant type</th><th>Redirect URI</th><th>Scopes</th><th>Status</th></tr></thead>
          <tbody>
            {OAUTH_CLIENTS.map((c) => (
              <tr key={c.id}>
                <td><div className="sys"><div><b>{c.name}</b><small>Created {c.created}</small></div></div></td>
                <td><code>{c.clientId}</code> <button className="icon-btn inline" title="Copy" aria-label="Copy client ID" onClick={() => navigator.clipboard?.writeText(c.clientId)}><Copy size={13} /></button></td>
                <td>{c.grant}</td>
                <td className="muted"><span className="q-cell" title={c.redirect}>{c.redirect}</span></td>
                <td><div className="chips">{c.scopes.map((s) => <span key={s} className="chip">{s}</span>)}</div></td>
                <td><Pill map={CLIENT_STATUS} s={c.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </article>
  );
}

export default function ApiAccess() {
  const base = `${BASE}/api`;
  return (
    <>
      <AdminHead title="API access" sub="Tokens and OAuth clients that can reach the GenMeta API." />
      <SubTabs base={base} tabs={[['tokens', 'API tokens'], ['oauth', 'OAuth clients']]} />
      <Routes>
        <Route index element={<Navigate to="tokens" replace />} />
        <Route path="tokens" element={<Tokens />} />
        <Route path="oauth" element={<OAuthClients />} />
        <Route path="*" element={<Navigate to="tokens" replace />} />
      </Routes>
    </>
  );
}
