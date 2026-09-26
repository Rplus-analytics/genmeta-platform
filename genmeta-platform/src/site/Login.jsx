import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, KeyRound, Eye, EyeOff, ShieldCheck, Lock, MapPin } from 'lucide-react';
import { BRAND } from '../brand.js';
import { useAuth } from '../auth.jsx';
import { TOTALS, fmt } from '../data.js';
import Tablet from '../components/Tablet.jsx';
import { Overlay, Burst } from '../components/Loader.jsx';

const STEPS = ['Verifying your identity', 'Checking role and permissions', 'Loading your data estate', 'Waking the six agents'];

export default function Login() {
  const { signIn } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState('admin@rplusanalytics.com');
  const [pw, setPw] = useState('genmeta-demo');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [caps, setCaps] = useState(false);

  const go = (who) => {
    setErr(''); setBusy(true);
    setTimeout(() => { signIn(who); nav('/app'); }, STEPS.length * 650 + 300);
  };
  const submit = (e) => {
    e.preventDefault();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { setErr('Enter your work email address, for example name@organisation.gov.uk.'); return; }
    if (pw.length < 4) { setErr('Enter your password.'); return; }
    go(email);
  };

  return (
    <div className="login">
      {busy && <Overlay title="Signing you in" steps={STEPS} />}

      <div className="login-form">
        <div className="login-top">
          <img src={BRAND.lockup} alt="Rplus | GenMeta" />
          <Link to="/" className="menu-btn back"><ArrowLeft size={13} strokeWidth={1.6} />Website</Link>
        </div>

        <form onSubmit={submit} noValidate>
          <span className="eyebrow">Sign in · GenMeta Platform</span>
          <h1>Welcome<br />back.</h1>
          <p className="lede">Sign in to your organisation’s metadata estate.</p>

          <label className="field" htmlFor="email">
            <span>Work email</span>
            <input id="email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} />
            <i className="field-line" />
          </label>
          <label className="field" htmlFor="password">
            <span>Password <a href="#reset" className="field-link" onClick={(e) => { e.preventDefault(); setErr('Password reset is handled by your organisation’s identity provider.'); }}>Forgot password?</a></span>
            <div className="pw">
              <input id="password" type={show ? 'text' : 'password'} autoComplete="current-password" value={pw}
                onChange={(e) => setPw(e.target.value)} onKeyUp={(e) => setCaps(e.getModifierState && e.getModifierState('CapsLock'))} />
              <button type="button" onClick={() => setShow((v) => !v)} aria-label={show ? 'Hide password' : 'Show password'}>{show ? <EyeOff size={15} /> : <Eye size={15} />}</button>
            </div>
            <i className="field-line" />
            {caps && <small className="hint">Caps Lock is on</small>}
          </label>
          <label className="check" htmlFor="remember"><input id="remember" type="checkbox" defaultChecked /><span>Keep me signed in on this device</span></label>
          {err && <p className="err" role="alert">{err}</p>}

          <button className="btn primary wide shine" type="submit" disabled={busy}>
            {busy ? <><Burst size={16} />Signing in</> : <>Sign in<ArrowRight size={14} /></>}
          </button>
          <div className="or"><span>or</span></div>
          <button className="btn ghost wide" type="button" onClick={() => go(email || 'admin@rplusanalytics.com')} disabled={busy}><KeyRound size={14} />Continue with single sign-on</button>
          <p className="demo">Demo build — details are pre-filled. Press Sign in.</p>
        </form>

        <div className="login-foot">
          <span><ShieldCheck size={12} strokeWidth={1.5} />NCSC-aligned IAM</span>
          <span><MapPin size={12} strokeWidth={1.5} />UK data residency</span>
          <span><Lock size={12} strokeWidth={1.5} />Encrypted with AWS KMS</span>
        </div>
      </div>

      <div className="login-art">
        <img className="art-burst" src={BRAND.burst} alt="" aria-hidden="true" />
        <div className="art-stats">
          <div><span>Systems</span><b>{TOTALS.systems}</b></div>
          <div><span>Tables</span><b>{fmt(TOTALS.tables)}</b></div>
          <div><span>Fields</span><b>{fmt(TOTALS.fields)}</b></div>
          <div><span>Estate</span><b>{TOTALS.pb.toFixed(2)}<small> PB</small></b></div>
        </div>
        <Tablet small mode="parallax" />
        <div className="login-cap">
          <span className="eyebrow">Your estate, live</span>
          <p>Systems, tables, fields and size — refreshed every 30 minutes by six autonomous agents.</p>
        </div>
      </div>
    </div>
  );
}
