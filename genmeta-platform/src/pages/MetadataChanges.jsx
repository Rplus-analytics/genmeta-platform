import { useState } from 'react';
import { ChevronDown, RefreshCw } from 'lucide-react';
import { PageHead, Segmented, Badge } from '../components/ui.jsx';
import { VERSIONS } from '../data/metadataChanges.js';

/* Compare two captured versions of the technical metadata, plus the full version history.
   Styled with the shared app classes (see docs/ui-design-rules.md); shares its data and
   logic with the Data sources > Metadata changes tab. */
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = { '1w': 7, '1m': 30, '3m': 91 };
const augment = (list) => list.map((x, i) => ({ ...x, dt: new Date(x.d), audit: 1034 + i * 4 }));
const fmt = (x) => `${x.dt.getDate()} ${MON[x.dt.getMonth()]} ${x.dt.getFullYear()}, ${String(x.dt.getHours()).padStart(2, '0')}:${String(x.dt.getMinutes()).padStart(2, '0')}`;
const num = (n) => n.toLocaleString('en-GB');

function presetRange(list, p) {
  const to = list[list.length - 1];
  const lim = new Date(to.dt.getTime() - DAYS[p] * 864e5);
  let f = [...list].reverse().find((x) => x.dt <= lim) || list[0];
  if (f === to) f = list[list.length - 2];
  return { from: f.v, to: to.v };
}
function diff(list, f, t) {
  const d = { aa: [], ar: [], ac: {}, mp: [] };
  list.filter((x) => x.v > f && x.v <= t && x.ch).forEach((x) => {
    d.aa.push(...x.ch.aa); d.ar.push(...x.ch.ar); d.mp.push(...x.ch.mp.map((m) => [...m, x.v]));
    x.ch.ac.forEach((c) => { const o = d.ac[c.a] || (d.ac[c.a] = { add: [], rem: [], rt: [], key: [], part: [] }); ['add', 'rem', 'rt', 'key', 'part'].forEach((k) => o[k].push(...c[k])); });
  });
  return d;
}
const nChanges = (x) => (x.ch ? x.ch.aa.length + x.ch.ar.length + x.ch.ac.length + x.ch.mp.length : 0);
const CHANGE_TONE = { added: 'ok', removed: 'neutral', 're-expressed': 'warn' };

export default function MetadataChanges() {
  const [vers, setVers] = useState(() => augment(VERSIONS));
  const init = presetRange(augment(VERSIONS), '1w');
  const [from, setFrom] = useState(init.from);
  const [to, setTo] = useState(init.to);
  const [preset, setPreset] = useState('1w');
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [toast, setToastMsg] = useState(null);

  const showToast = (t) => { setToastMsg(t); clearTimeout(window._mct); window._mct = setTimeout(() => setToastMsg(null), 2600); };
  const applyPreset = (p) => { const r = presetRange(vers, p); setPreset(p); setFrom(r.from); setTo(r.to); };
  const onFrom = (v) => { setFrom(v); setPreset(null); };
  const onTo = (v) => { setTo(v); if (from >= v) setFrom(v - 1); setPreset(null); };
  const pickTo = (v) => { if (v === 1) { setFrom(1); setTo(2); } else { setTo(v); if (from >= v) setFrom(v - 1); } setPreset(null); };
  const refresh = () => {
    const L = vers[vers.length - 1];
    if (!pending) { showToast('Harvest complete. Fingerprint unchanged, so no new version was created.'); return; }
    const nv = { v: L.v + 1, d: '', dt: new Date(L.dt.getTime() + 36e5 * 5), trig: 'Manual', a: L.a, c: L.c + 1, m: L.m, fp: Math.random().toString(16).slice(2, 12), audit: L.audit + 4, ch: { aa: [], ar: [], ac: [{ a: 'INT.CUSTOMER', add: ['EMAIL_OPT_IN'], rem: [], rt: [], key: [], part: [] }], mp: [] } };
    const next = [...vers, nv]; setVers(next);
    const r = presetRange(next, preset || '1w'); setPending(false); setPreset(preset || '1w'); setFrom(r.from); setTo(r.to);
    showToast(`Fingerprint changed. v${L.v + 1} created and written to the audit log.`);
  };

  const fv = vers.find((x) => x.v === from), tv = vers.find((x) => x.v === to);
  const d = diff(vers, from, to), acs = Object.entries(d.ac);
  const rtN = acs.reduce((a, [, o]) => a + o.rt.length, 0);
  const cAdd = acs.reduce((a, [, o]) => a + o.add.length, 0);
  const cRem = acs.reduce((a, [, o]) => a + o.rem.length, 0);
  const mAdd = d.mp.filter((m) => m[0] === 'added').length, mRem = d.mp.filter((m) => m[0] === 'removed').length, mRe = d.mp.length - mAdd - mRem;
  const days = Math.round((tv.dt - fv.dt) / 864e5);
  const nver = vers.filter((x) => x.v > from && x.v <= to).length;
  const rows = [...vers].reverse();
  const da = tv.a - fv.a, dc = tv.c - fv.c;

  const fromOpts = [...vers].reverse().filter((x) => x.v <= to - 1 && x.v >= 1);
  const toOpts = [...vers].reverse().filter((x) => x.v <= vers.length && x.v >= 2);
  const tiles = [
    ['Assets added', d.aa.length, 'since v' + from],
    ['Assets removed', d.ar.length, 'since v' + from],
    ['Assets changed', acs.length, 'schema or keys'],
    ['Columns retyped', rtN, `${cAdd} added · ${cRem} removed`],
    ['Mappings changed', d.mp.length, `${mAdd} added · ${mRem} removed${mRe ? ` · ${mRe} re-expressed` : ''}`],
  ];

  return (
    <div className="page fade-in mc">
      <PageHead eyebrow="Data assets" title="Metadata changes" sub="Compare any two versions of the technical metadata." />

      <div className="card mc-bar">
        <span className="mc-lbl">Compare</span>
        <select className="select" aria-label="From version" value={from} onChange={(e) => onFrom(+e.target.value)}>
          {fromOpts.map((x) => <option key={x.v} value={x.v}>v{x.v} · {fmt(x)}</option>)}
        </select>
        <span className="mc-arrow">→</span>
        <select className="select" aria-label="To version" value={to} onChange={(e) => onTo(+e.target.value)}>
          {toOpts.map((x) => <option key={x.v} value={x.v}>v{x.v} · {fmt(x)}</option>)}
        </select>
        <Segmented ariaLabel="Quick range" size="md" value={preset || ''} onChange={applyPreset}
          options={[{ value: '1w', label: '1 week' }, { value: '1m', label: '1 month' }, { value: '3m', label: '3 months' }]} />
        <span className="mc-range"><b className="mono">v{from} → v{to}</b>{days} days · {nver} version{nver === 1 ? '' : 's'}</span>
      </div>

      <div className="tiles-sm">
        {tiles.map(([l, v, s]) => <div key={l}><b>{v}</b><span>{l}</span><small>{s}</small></div>)}
      </div>

      <div className="dash-card">
        <div className="block-head"><div><h2>Changed assets</h2><p className="block-sub">{da >= 0 ? '+' : ''}{num(da)} assets · {dc >= 0 ? '+' : ''}{num(dc)} columns between v{from} and v{to}</p></div></div>
        {(d.aa.length || d.ar.length) ? (
          <p className="mc-added">
            {d.aa.length ? <><b>Added:</b> <span className="mono">{d.aa.join(', ')}</span></> : null}
            {d.aa.length && d.ar.length ? <br /> : null}
            {d.ar.length ? <><b>Removed:</b> <span className="mono">{d.ar.join(', ')}</span></> : null}
          </p>
        ) : null}
        <div className="table-wrap">
          <table className="tbl static mc-ca">
            <thead><tr><th>Asset</th><th>Columns added</th><th>Columns removed</th><th>Columns retyped</th><th>Key / partition changes</th></tr></thead>
            <tbody>
              {acs.length ? acs.map(([a, o]) => (
                <tr key={a}>
                  <td className="mono">{a}</td>
                  <td className="mono">{o.add.join(', ') || '—'}</td>
                  <td className="mono">{o.rem.join(', ') || '—'}</td>
                  <td className="mono">{o.rt.length ? o.rt.map((r, i) => <div key={i}>{r[0]}: {r[1]} → {r[2]}</div>) : '—'}</td>
                  <td className="muted">{[...o.key, ...o.part].length ? [...o.key, ...o.part].map((s, i) => <div key={i}>{s}</div>) : '—'}</td>
                </tr>
              )) : <tr><td colSpan={5} className="muted">No asset changes between these versions.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <div className="dash-card">
        <div className="block-head"><div><h2>Mappings</h2></div><span className="tag">{d.mp.length} mapping change{d.mp.length === 1 ? '' : 's'}</span></div>
        <div className="table-wrap">
          <table className="tbl static mc-mp">
            <thead><tr><th>Change</th><th>Target</th><th>Transformation</th><th>In version</th></tr></thead>
            <tbody>
              {d.mp.length ? d.mp.map((m, i) => (
                <tr key={i}>
                  <td><Badge tone={CHANGE_TONE[m[0]] || 'ok'}>{m[0][0].toUpperCase() + m[0].slice(1)}</Badge></td>
                  <td className="mono">{m[1]}</td>
                  <td className="mono">{m[2]}</td>
                  <td>v{m[3]}</td>
                </tr>
              )) : <tr><td colSpan={4} className="muted">No mapping changes between these versions.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <div className={`dash-card mc-hist ${open ? 'open' : ''}`}>
        <button type="button" className="block-head mc-histhead" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
          <div><h2>Version history</h2><p className="block-sub">A new version is stored only when a harvest's fingerprint changes.</p></div>
          <span className="mc-hsum">{vers.length} versions · latest v{vers.length}, {fmt(vers[vers.length - 1])}<ChevronDown className="mc-chev" size={18} /></span>
        </button>
        {open && (
          <>
            <div className="mc-histctl">
              <label className="mc-sim"><input type="checkbox" checked={pending} onChange={(e) => setPending(e.target.checked)} />Simulate a source change</label>
              <button className="btn secondary sm" onClick={refresh}><RefreshCw size={14} />Trigger refresh</button>
              <button className="btn secondary sm" onClick={() => showToast("Opens Dashboard → Audit evidence: each version holds its fingerprint and the previous entry's hash")}>View audit evidence</button>
              <span className="muted mc-ctlnote">Click a row to compare up to it</span>
            </div>
            <div className="table-wrap mc-scroll">
              <table className="tbl mc-vtable">
                <thead><tr><th>Version</th><th>Captured</th><th>Trigger</th><th className="num">Assets</th><th className="num">Columns</th><th className="num">Mappings</th><th>Changes</th><th>Fingerprint</th><th>Audit</th></tr></thead>
                <tbody>
                  {rows.map((x, i) => {
                    const n = nChanges(x);
                    return (
                      <tr key={x.v} onClick={() => pickTo(x.v)}>
                        <td><b style={{ fontWeight: 600 }}>v{x.v}</b>{i === 0 ? <> <span className="tag">Current</span></> : null}{x.v === from ? <> <span className="tag">From</span></> : null}{x.v === to && i !== 0 ? <> <span className="tag">To</span></> : null}</td>
                        <td className="nw">{fmt(x)}</td>
                        <td><Badge tone="ok">{x.trig}</Badge></td>
                        <td className="num">{num(x.a)}</td>
                        <td className="num">{num(x.c)}</td>
                        <td className="num">{x.m}</td>
                        <td className="muted">{x.ch ? `${n} change${n === 1 ? '' : 's'}` : 'Baseline'}</td>
                        <td className="mono">sha256:{x.fp}…</td>
                        <td className="mono muted">#{x.audit}{x.v > 1 ? ` ← #${x.audit - 4}` : ' (genesis)'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {toast && <div className="mc-toast">{toast}</div>}
    </div>
  );
}
