import { ShieldCheck, KeyRound, ScrollText, Fingerprint, Lock, FileSearch } from 'lucide-react';
import { PageHead, Ring } from '../components/ui.jsx';

const POLICIES = [
  { icon: KeyRound, name: 'Role-based access', id: 'GOV-01', d: 'Least-privilege roles federated from Microsoft Entra ID; steward approval for PERSONAL assets.', cov: 0.96 },
  { icon: Fingerprint, name: 'Sensitive data masking', id: 'GOV-07', d: 'Dynamic masking on PERSONAL and FINANCIAL fields for non-steward roles.', cov: 0.91 },
  { icon: ScrollText, name: 'Retention & disposal', id: 'GOV-12', d: 'Retention schedules attached at table level, enforced through lifecycle rules.', cov: 0.74 },
  { icon: FileSearch, name: 'Lineage completeness', id: 'GOV-15', d: 'Every reporting asset must trace to a registered source system.', cov: 0.83 },
  { icon: Lock, name: 'Encryption at rest', id: 'SEC-02', d: 'AWS KMS customer-managed keys; key rotation every 365 days.', cov: 1 },
  { icon: ShieldCheck, name: 'Audit logging', id: 'SEC-05', d: 'Hash-chained audit log of every metadata change via CloudTrail.', cov: 1 },
];

export default function Governance() {
  return (
    <div className="page fade-in">
      <PageHead title="Governance" sub="Policies, controls and standards alignment across the estate." />
      <section className="rings card pad">
        {[['GDS Service Standard', 0.92], ['NCSC CAF', 0.88], ['Technology Code of Practice', 0.95], ['UK GDPR', 0.9], ['ISO 27001', 0.94]].map(([n, v]) => (
          <div key={n} className="ring-item"><Ring value={v} size={92} stroke={8}><b>{Math.round(v * 100)}%</b></Ring><span>{n}</span></div>
        ))}
      </section>
      <section className="policy-grid">
        {POLICIES.map((p) => (
          <article key={p.id} className="card policy">
            <span className="stat-ico"><p.icon size={19} /></span>
            <div className="policy-t"><b>{p.name}</b><small>{p.id}</small></div>
            <p>{p.d}</p>
            <div className="cov"><div className="cov-bar"><i style={{ width: `${p.cov * 100}%` }} /></div><span>{Math.round(p.cov * 100)}% enforced</span></div>
          </article>
        ))}
      </section>
    </div>
  );
}
