import { useState } from 'react';
import { Send, Plus, Trash2, Plug } from 'lucide-react';
import { SMTP, INTEGRATIONS, WEBHOOKS, NOTIFICATION_EVENTS, LABS } from '../../admin-data.js';
import { AdminHead, Settings, Row, Switch, SaveBar, useForm, Pill } from './kit.jsx';

export function SmtpPage() {
  const form = useForm({ ...SMTP, password: '••••••••••••' });
  const { v, set } = form;
  const [test, setTest] = useState(SMTP.lastTest);
  return (
    <>
      <AdminHead title="SMTP" sub="Outgoing mail server for invitations, notifications and digests.">
        <SaveBar form={form} />
      </AdminHead>
      <div className="settings-stack">
        <Settings title="Server">
          <Row label="Host"><input className="input" value={v.host} onChange={set('host')} /></Row>
          <Row label="Port"><input className="input" type="number" value={v.port} onChange={set('port')} /></Row>
          <Row label="Security">
            <select className="input" value={v.security} onChange={set('security')}>
              <option>STARTTLS</option><option>SSL/TLS</option><option>None</option>
            </select>
          </Row>
          <Row label="Username"><input className="input" value={v.username} onChange={set('username')} /></Row>
          <Row label="Password" hint="Stored encrypted with AWS KMS."><input className="input" type="password" value={v.password} onChange={set('password')} /></Row>
        </Settings>
        <Settings title="Sender">
          <Row label="From name"><input className="input" value={v.fromName} onChange={set('fromName')} /></Row>
          <Row label="From address"><input className="input" type="email" value={v.fromEmail} onChange={set('fromEmail')} /></Row>
        </Settings>
        <Settings title="Test delivery">
          <Row label="Send a test email" hint={`Last test: ${test}`}>
            <button className="btn ghost sm" onClick={() => setTest('Delivered · just now')}><Send size={14} />Send test</button>
          </Row>
        </Settings>
      </div>
    </>
  );
}

export function IntegrationsPage() {
  const [state, setState] = useState(Object.fromEntries(INTEGRATIONS.map((i) => [i.id, i.connected])));
  return (
    <>
      <AdminHead title="Integrations" sub="Connect GenMeta to the tools your teams already use." />
      <section className="policy-grid admin-grid">
        {INTEGRATIONS.map((i) => (
          <article key={i.id} className="card policy">
            <div className="int-head">
              <span className="ini">{i.ini}</span>
              <div className="policy-t"><b>{i.name}</b><small>{state[i.id] ? i.detail || 'Connected' : 'Not connected'}</small></div>
              {state[i.id] && <span className="pill ok"><i />Connected</span>}
            </div>
            <p>{i.d}</p>
            <div className="int-foot">
              {state[i.id]
                ? <button className="btn ghost sm" onClick={() => setState({ ...state, [i.id]: false })}>Disconnect</button>
                : <button className="btn primary sm" onClick={() => setState({ ...state, [i.id]: true })}><Plug size={14} />Connect</button>}
            </div>
          </article>
        ))}
      </section>
    </>
  );
}

const HOOK_STATUS = { ok: ['ok', 'Healthy'], failing: ['warn', 'Failing'], disabled: ['off', 'Disabled'] };

export function WebhooksPage() {
  const [hooks, setHooks] = useState(WEBHOOKS);
  return (
    <>
      <AdminHead title="Webhooks" sub="Send signed HTTP callbacks when things change in GenMeta.">
        <button className="btn primary"><Plus size={14} />Add endpoint</button>
      </AdminHead>
      <article className="card">
        <div className="table-wrap">
          <table className="tbl static">
            <thead><tr><th>Endpoint</th><th>Events</th><th>Last delivery</th><th>Status</th><th>Enabled</th><th /></tr></thead>
            <tbody>
              {hooks.map((h, i) => (
                <tr key={h.id}>
                  <td><code className="q-cell" title={h.url}>{h.url}</code></td>
                  <td><div className="chips">{h.events.map((e) => <span key={e} className="chip">{e}</span>)}</div></td>
                  <td className="muted">{h.last}</td>
                  <td><Pill map={HOOK_STATUS} s={h.status} /></td>
                  <td>
                    <Switch on={h.status !== 'disabled'} label={`Enable ${h.url}`}
                      onChange={(on) => setHooks(hooks.map((x, j) => (j === i ? { ...x, status: on ? 'ok' : 'disabled' } : x)))} />
                  </td>
                  <td className="row-acts"><button className="icon-btn" aria-label="Delete endpoint" onClick={() => setHooks(hooks.filter((_, j) => j !== i))}><Trash2 size={15} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="tbl-foot">Payloads are signed with HMAC-SHA256 in the <code>X-GenMeta-Signature</code> header · failed deliveries retry for 24 hours</div>
      </article>
    </>
  );
}

export function NotificationsPage() {
  const form = useForm(Object.fromEntries(NOTIFICATION_EVENTS.map((e) => [e.id, { email: e.email, slack: e.slack, app: e.app }])));
  const { v, set } = form;
  const toggle = (id, ch) => (on) => set(id)({ ...v[id], [ch]: on });
  return (
    <>
      <AdminHead title="Notifications" sub="Choose which events notify people, and where.">
        <SaveBar form={form} />
      </AdminHead>
      <article className="card">
        <div className="table-wrap">
          <table className="tbl static">
            <thead><tr><th>Event</th><th>Email</th><th>Slack</th><th>In-app</th></tr></thead>
            <tbody>
              {NOTIFICATION_EVENTS.map((e) => (
                <tr key={e.id}>
                  <td><div className="sys"><div><b>{e.l}</b><small>{e.d}</small></div></div></td>
                  {['email', 'slack', 'app'].map((ch) => (
                    <td key={ch}><Switch on={v[e.id][ch]} onChange={toggle(e.id, ch)} label={`${e.l} by ${ch}`} /></td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>
    </>
  );
}

export function LabsPage() {
  const form = useForm(Object.fromEntries(LABS.map((l) => [l.id, l.on])));
  const { v, set } = form;
  return (
    <>
      <AdminHead title="Labs" sub="Try features before general release. They may change or be removed.">
        <SaveBar form={form} />
      </AdminHead>
      <Settings>
        {LABS.map((l) => (
          <Row key={l.id} label={<>{l.l} <span className="chip lab">{l.stage}</span></>} hint={l.d}>
            <Switch on={v[l.id]} onChange={set(l.id)} label={l.l} />
          </Row>
        ))}
      </Settings>
    </>
  );
}
