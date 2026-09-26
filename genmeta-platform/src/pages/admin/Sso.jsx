import { useState } from 'react';
import { Routes, Route, Navigate, Link } from 'react-router-dom';
import { Fingerprint, LogIn, CircleAlert, CalendarClock, Plus, Trash2, Copy, Upload, RefreshCw } from 'lucide-react';
import { SSO, SSO_MAPPINGS, GROUPS } from '../../admin-data.js';
import { BASE, AdminHead, SubTabs, Stats, Settings, Row, Switch, SaveBar, useForm } from './kit.jsx';

const SSO_BASE = `${BASE}/sso`;

function CopyField({ value }) {
  return (
    <div className="copy-field">
      <code>{value}</code>
      <button className="icon-btn" title="Copy" aria-label="Copy" onClick={() => navigator.clipboard?.writeText(value)}><Copy size={14} /></button>
    </div>
  );
}

function SsoOverview() {
  return (
    <>
      <Stats items={[
        { icon: Fingerprint, v: SSO.enabled ? 'Enabled' : 'Off', l: 'Status', s: `${SSO.provider} · ${SSO.protocol}` },
        { icon: LogIn, v: SSO.signIns24h, l: 'SSO sign-ins', s: 'last 24 hours' },
        { icon: CircleAlert, v: SSO.failed24h, l: 'Failed sign-ins', s: 'last 24 hours' },
        { icon: RefreshCw, v: SSO.lastSync, l: 'Last group sync', s: 'SCIM · every 40 min' },
        { icon: CalendarClock, v: SSO.certExpires, l: 'Certificate expires', s: 'IdP signing certificate' },
      ]} />
      <section className="admin-split">
        <Settings title="Connection" sub="Current identity provider settings.">
          <Row label="Identity provider"><span>{SSO.provider}</span></Row>
          <Row label="Protocol"><span>{SSO.protocol}</span></Row>
          <Row label="Verified domains"><div className="chips">{SSO.domains.map((d) => <span key={d} className="chip">{d}</span>)}</div></Row>
          <Row label="IdP SSO URL"><span className="q-cell muted" title={SSO.idpSsoUrl}>{SSO.idpSsoUrl}</span></Row>
        </Settings>
        <article className="card pad admin-side">
          <h3 className="admin-h3">Group mapping</h3>
          <p className="muted small">{SSO_MAPPINGS.length} identity-provider groups map to GenMeta groups and roles.</p>
          <ul className="role-bars">
            {SSO_MAPPINGS.slice(0, 4).map((m) => <li key={m.idp}><span><code>{m.idp}</code></span><span className="muted">{m.group}</span><b>{m.users}</b></li>)}
          </ul>
          <Link className="bracket ghost" to={`${SSO_BASE}/mapping`}>All mappings</Link>
        </article>
      </section>
    </>
  );
}

function SsoConfigure() {
  const form = useForm({
    enabled: SSO.enabled, protocol: 'saml', idpEntityId: SSO.idpEntityId, idpSsoUrl: SSO.idpSsoUrl,
    enforce: true, jit: true, scim: true, defaultGroup: 'Read-only',
  });
  const { v, set } = form;
  return (
    <div className="settings-stack">
      <div className="save-row"><SaveBar form={form} /></div>
      <Settings title="Single sign-on">
        <Row label="Enable SSO" hint="Let users sign in through your identity provider.">
          <Switch on={v.enabled} onChange={set('enabled')} label="Enable SSO" />
        </Row>
        <Row label="Protocol">
          <select className="input" value={v.protocol} onChange={set('protocol')}>
            <option value="saml">SAML 2.0</option><option value="oidc">OpenID Connect</option>
          </select>
        </Row>
        <Row label="Require SSO" hint="Disable password sign-in for users on verified domains. Admins keep a break-glass account.">
          <Switch on={v.enforce} onChange={set('enforce')} label="Require SSO" />
        </Row>
      </Settings>

      <Settings title="Service provider details" sub="Give these values to your identity provider.">
        <Row label="Entity ID"><CopyField value={SSO.entityId} /></Row>
        <Row label="ACS (reply) URL"><CopyField value={SSO.acsUrl} /></Row>
        <Row label="Metadata"><button className="btn ghost sm"><Copy size={14} />Download SP metadata</button></Row>
      </Settings>

      <Settings title="Identity provider details" sub="Paste from your identity provider, or upload its metadata file.">
        <Row label="IdP metadata"><button className="btn ghost sm"><Upload size={14} />Upload XML</button></Row>
        <Row label="IdP entity ID"><input className="input" value={v.idpEntityId} onChange={set('idpEntityId')} /></Row>
        <Row label="IdP SSO URL"><input className="input" value={v.idpSsoUrl} onChange={set('idpSsoUrl')} /></Row>
        <Row label="Signing certificate" hint={`Expires ${SSO.certExpires}`}><button className="btn ghost sm"><Upload size={14} />Replace certificate</button></Row>
      </Settings>

      <Settings title="Provisioning">
        <Row label="Just-in-time provisioning" hint="Create a GenMeta account on first SSO sign-in.">
          <Switch on={v.jit} onChange={set('jit')} label="Just-in-time provisioning" />
        </Row>
        <Row label="SCIM sync" hint="Keep users and group membership in step with the identity provider.">
          <Switch on={v.scim} onChange={set('scim')} label="SCIM sync" />
        </Row>
        <Row label="Default group" hint="For users who match no group mapping.">
          <select className="input" value={v.defaultGroup} onChange={set('defaultGroup')}>
            {GROUPS.map((g) => <option key={g.id}>{g.name}</option>)}
          </select>
        </Row>
      </Settings>
    </div>
  );
}

function SsoMapping() {
  const [rows, setRows] = useState(SSO_MAPPINGS);
  const update = (i, k) => (e) => setRows(rows.map((r, j) => (j === i ? { ...r, [k]: e.target.value } : r)));
  return (
    <article className="card">
      <header className="card-head">
        <div><h2>Group mapping</h2><p>Members of an identity-provider group join the matching GenMeta group on sign-in.</p></div>
        <button className="btn primary sm" onClick={() => setRows([...rows, { idp: '', group: 'Read-only', role: 'Viewer', users: 0 }])}><Plus size={14} />Add mapping</button>
      </header>
      <div className="table-wrap">
        <table className="tbl static">
          <thead><tr><th>Identity-provider group</th><th>GenMeta group</th><th>Role</th><th className="num">Users</th><th /></tr></thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                <td><input className="input mono" value={r.idp} placeholder="SG-Group-Name" onChange={update(i, 'idp')} /></td>
                <td>
                  <select className="input" value={r.group} onChange={update(i, 'group')}>
                    {GROUPS.map((g) => <option key={g.id}>{g.name}</option>)}
                  </select>
                </td>
                <td>
                  <select className="input" value={r.role} onChange={update(i, 'role')}>
                    {['Platform Admin', 'Governance Lead', 'Data Steward', 'Data Engineer', 'Analyst', 'Viewer'].map((x) => <option key={x}>{x}</option>)}
                  </select>
                </td>
                <td className="num">{r.users}</td>
                <td className="row-acts"><button className="icon-btn" aria-label="Remove mapping" onClick={() => setRows(rows.filter((_, j) => j !== i))}><Trash2 size={15} /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="tbl-foot">Mappings apply at next sign-in or SCIM sync · last sync {SSO.lastSync}</div>
    </article>
  );
}

export default function Sso() {
  return (
    <>
      <AdminHead title="SSO" sub={`Single sign-on through ${SSO.provider}.`} />
      <SubTabs base={SSO_BASE} tabs={[['', 'Overview'], ['configure', 'Configure'], ['mapping', 'Group mapping']]} />
      <Routes>
        <Route index element={<SsoOverview />} />
        <Route path="configure" element={<SsoConfigure />} />
        <Route path="mapping" element={<SsoMapping />} />
        <Route path="*" element={<Navigate to={SSO_BASE} replace />} />
      </Routes>
    </>
  );
}
