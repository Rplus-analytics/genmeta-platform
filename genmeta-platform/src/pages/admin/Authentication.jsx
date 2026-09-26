import { AdminHead, Settings, Row, Switch, SaveBar, useForm } from './kit.jsx';

export default function Authentication() {
  const form = useForm({
    password: true, minLength: '14', complexity: true, rotation: 'never',
    mfa: 'required', mfaMethods: 'authenticator',
    session: '8h', idle: '30m', remember: false,
    lockout: '5', lockoutFor: '15m',
    domains: 'rplus.gov.uk', ipAllow: false, ipRanges: '10.12.0.0/16',
  });
  const { v, set } = form;
  return (
    <>
      <AdminHead title="Authentication" sub="How people sign in, how long sessions last and what happens after failed attempts.">
        <SaveBar form={form} />
      </AdminHead>

      <div className="settings-stack">
        <Settings title="Sign-in methods">
          <Row label="Email and password" hint="Allow local accounts alongside SSO. Turn off to force SSO for everyone.">
            <Switch on={v.password} onChange={set('password')} label="Email and password" />
          </Row>
          <Row label="Minimum password length" hint="NCSC guidance recommends at least 12 characters.">
            <input className="input" type="number" min="8" max="64" value={v.minLength} onChange={set('minLength')} disabled={!v.password} />
          </Row>
          <Row label="Block common passwords" hint="Reject passwords found in known breach lists.">
            <Switch on={v.complexity} onChange={set('complexity')} label="Block common passwords" />
          </Row>
          <Row label="Password expiry" hint="Forced rotation is no longer recommended unless a compromise is suspected.">
            <select className="input" value={v.rotation} onChange={set('rotation')} disabled={!v.password}>
              <option value="never">Never</option><option value="90">Every 90 days</option><option value="180">Every 180 days</option>
            </select>
          </Row>
        </Settings>

        <Settings title="Multi-factor authentication">
          <Row label="MFA requirement" hint="Applies to local accounts. SSO users follow the identity provider's policy.">
            <select className="input" value={v.mfa} onChange={set('mfa')}>
              <option value="off">Off</option><option value="optional">Optional</option><option value="admins">Required for admins</option><option value="required">Required for everyone</option>
            </select>
          </Row>
          <Row label="Allowed methods">
            <select className="input" value={v.mfaMethods} onChange={set('mfaMethods')}>
              <option value="authenticator">Authenticator app</option><option value="passkey">Passkeys and authenticator app</option><option value="any">Any, including SMS</option>
            </select>
          </Row>
        </Settings>

        <Settings title="Sessions">
          <Row label="Maximum session length" hint="Users sign in again after this period.">
            <select className="input" value={v.session} onChange={set('session')}>
              <option value="1h">1 hour</option><option value="8h">8 hours</option><option value="24h">24 hours</option><option value="7d">7 days</option>
            </select>
          </Row>
          <Row label="Idle timeout">
            <select className="input" value={v.idle} onChange={set('idle')}>
              <option value="15m">15 minutes</option><option value="30m">30 minutes</option><option value="1h">1 hour</option><option value="never">Never</option>
            </select>
          </Row>
          <Row label="Remember this device" hint="Skip MFA on trusted devices for 30 days.">
            <Switch on={v.remember} onChange={set('remember')} label="Remember this device" />
          </Row>
        </Settings>

        <Settings title="Protection">
          <Row label="Lock account after" hint="Failed attempts before a temporary lock.">
            <select className="input" value={v.lockout} onChange={set('lockout')}>
              {['3', '5', '10'].map((n) => <option key={n} value={n}>{n} failed attempts</option>)}
            </select>
          </Row>
          <Row label="Lock duration">
            <select className="input" value={v.lockoutFor} onChange={set('lockoutFor')}>
              <option value="15m">15 minutes</option><option value="1h">1 hour</option><option value="manual">Until an admin unlocks</option>
            </select>
          </Row>
          <Row label="Allowed email domains" hint="Comma-separated. Invites outside these domains are blocked.">
            <input className="input" value={v.domains} onChange={set('domains')} />
          </Row>
          <Row label="Restrict by IP address" hint="Only allow sign-in from these CIDR ranges.">
            <Switch on={v.ipAllow} onChange={set('ipAllow')} label="Restrict by IP address" />
          </Row>
          {v.ipAllow && (
            <Row label="Allowed IP ranges">
              <input className="input" value={v.ipRanges} onChange={set('ipRanges')} />
            </Row>
          )}
        </Settings>
      </div>
    </>
  );
}
