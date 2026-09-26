import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowDown, Archive, GitBranch, ShieldCheck, CircleCheck, Search, Lock } from 'lucide-react';
import { BRAND } from '../brand.js';
import { TOTALS, fmt } from '../data.js';
import Tablet from '../components/Tablet.jsx';
import EstateFrame from '../components/EstateFrame.jsx';

const AGENTS = [
  [Archive, 'Catalog', 'Automated discovery and classification of assets across databases, lakes and warehouses, kept current without manual tagging.'],
  [GitBranch, 'Lineage', 'End-to-end traceability from source to report, so every field’s origin and every transformation stays visible.'],
  [ShieldCheck, 'Governance', 'Policy-driven stewardship with role-based access, audit trails and lineage-aware controls aligned to public-sector standards.'],
  [CircleCheck, 'Quality', 'Continuous validation rules flag drift, duplication and schema breaks before they reach downstream reporting.'],
  [Search, 'Discovery', 'Natural-language search across the whole estate — find the right dataset by meaning, not just by name.'],
  [Lock, 'Security', 'Sensitive-data identification and access controls embedded at the metadata layer, with NCSC-aligned IAM patterns.'],
];
const STANDARDS = ['GDS Service Standard', 'NCSC-aligned IAM', 'Technology Code of Practice', 'UK GDPR', 'Hybrid & multi-cloud'];
const SECTIONS = [['platform', 'Platform'], ['estate', 'Data estate'], ['agents', 'Agents'], ['public', 'Public sector']];

export default function Website() {
  const nav = useNavigate();
  const scroller = useRef(null);
  const frame = useRef(null);
  const [mode, setMode] = useState('2d');
  const go = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  useEffect(() => {
    const onMsg = (e) => { if (e.data && e.data.type === 'genmeta:open') nav('/login'); };
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, [nav]);
  const switchMode = (m) => { setMode(m); frame.current?.contentWindow?.postMessage({ type: 'genmeta:mode', mode: m }, '*'); };

  return (
    <div className="site" ref={scroller}>
      <header className="hdr">
        <div className="brand">
          <button onClick={() => go('platform')} aria-label="GenMeta home"><img src={BRAND.lockup} alt="Rplus | GenMeta" /></button>
          <span className="brand-tag">The metadata layer<br />for the whole estate</span>
        </div>
        <nav className="hdr-nav">
          {SECTIONS.map(([id, l]) => <button key={id} className="menu-btn" onClick={() => go(id)}>{l}</button>)}
        </nav>
        <div className="hdr-right">
          <Link to="/login" className="menu-btn">Sign in</Link>
          <Link to="/login" className="bracket">Request a demo</Link>
        </div>
      </header>

      <div className="page">
        <section className="hero" id="platform">
          <div className="hero-copy">
            <span className="eyebrow">001 / AI-native metadata management</span>
            <h1 className="reveal">{'See your entire data estate, built and governed automatically.'.split(' ').map((w, i) => <span key={i} style={{ '--i': i }}>{w} </span>)}</h1>
            <p>GenMeta deploys autonomous agents that continuously discover, catalogue, tag and govern data assets across cloud and on-premise estates — turning scattered metadata into one living, explorable map.</p>
            <div className="hero-links">
              <Link className="bracket" to="/login">Sign in to GenMeta</Link>
              <button className="bracket ghost" onClick={() => go('estate')}>Explore the estate</button>
            </div>
            <dl className="hero-figs">
              <div><dt>Built for</dt><dd className="sm">Azure · GCP · AWS · on-premise</dd></div>
              <div><dt>Aligned to</dt><dd className="sm">GDS · NCSC · TCoP</dd></div>
            </dl>
            <button className="scroll" onClick={() => go('estate')}><ArrowDown size={13} strokeWidth={1.5} />Scroll</button>
          </div>
          <Tablet />
        </section>

        <section className="block" id="estate">
          <header className="block-head">
            <div>
              <span className="eyebrow">002 / The data estate, mapped live</span>
              <h2>Every source system as a landmark, at its true relative size.</h2>
            </div>
            <div className="block-tools">
              <div className="toggle" role="group" aria-label="View">
                <button className={mode === '2d' ? 'on' : ''} onClick={() => switchMode('2d')}>2D</button><span>/</span>
                <button className={mode === '3d' ? 'on' : ''} onClick={() => switchMode('3d')}>3D</button>
              </div>
            </div>
          </header>
          <div className="bezel"><div className="estate-frame"><EstateFrame ref={frame} title="GenMeta data estate preview" params="?embed=1" /></div></div>
          <div className="facts">
            <div><b className="fact-n">{TOTALS.systems}</b><p><span>Systems</span>connected in the demo estate</p></div>
            <div><b className="fact-n">{fmt(TOTALS.tables)}</b><p><span>Tables</span>discovered and profiled</p></div>
            <div><b className="fact-n">{fmt(TOTALS.fields)}</b><p><span>Fields</span>classified by agents</p></div>
            <div><b className="fact-n">{TOTALS.pb.toFixed(2)}<small>PB</small></b><p><span>Estate size</span>across {TOTALS.databases} databases</p></div>
          </div>
        </section>

        <section className="block" id="agents">
          <header className="block-head">
            <div><span className="eyebrow">003 / The metadata estate</span><h2>Six agents. One continuously updated estate.</h2></div>
          </header>
          <div className="agents">
            {AGENTS.map(([I, t, d]) => (
              <article key={t}>
                <I size={18} strokeWidth={1.4} />
                <h3>{t}</h3>
                <p>{d}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="band" id="public">
          <div>
            <span className="eyebrow">004 / Public sector</span>
            <h2>Built for regulated, public-sector data estates.</h2>
            <p>Delivered by Rplus Analytics for central government — hybrid and multi-cloud, UK data residency, and controls mapped to the standards assessors check.</p>
          </div>
          <ul>{STANDARDS.map((s) => <li key={s}>{s}</li>)}</ul>
        </section>

        <section className="cta">
          <img className="cta-burst" src={BRAND.burst} alt="" aria-hidden="true" />
          <span className="eyebrow">005 / Get started</span>
          <h2>Ready to see your estate?</h2>
          <div className="hero-links center">
            <Link className="bracket" to="/login">Sign in</Link>
            <Link className="bracket ghost" to="/login">Request a demo</Link>
          </div>
        </section>

        <footer className="foot">
          <span>© Rplus Analytics Solutions Ltd · Preston, UK</span>
          <span>GenMeta v1.0.0</span>
          <span className="push">Aligned to GDS · NCSC · Technology Code of Practice</span>
        </footer>
      </div>
    </div>
  );
}
