import { Package, Users, Star } from 'lucide-react';
import { PageHead } from '../components/ui.jsx';

const DP = [
  { n: 'Customer 360', d: 'Unified customer profile across orders, events and casework.', o: 'Raghav', src: 3, users: 128, q: 96 },
  { n: 'Finance Ledger', d: 'Certified general ledger and payments for month-end reporting.', o: 'Madhavi', src: 2, users: 64, q: 98 },
  { n: 'Casework Insights', d: 'Case volumes, SLAs and outcomes for operational reporting.', o: 'Rajesh', src: 2, users: 91, q: 92 },
  { n: 'Web Engagement', d: 'Sessionised web and campaign events for product analytics.', o: 'Raghav', src: 2, users: 47, q: 89 },
  { n: 'Document Index', d: 'Searchable index of scanned forms and documents in S3.', o: 'PK', src: 1, users: 23, q: 85 },
  { n: 'Streaming Orders', d: 'Real-time order events for fulfilment dashboards.', o: 'Rajesh', src: 2, users: 36, q: 90 },
];

export default function DataProducts() {
  return (
    <div className="page fade-in">
      <PageHead title="Data products" sub="Curated, owned and certified datasets ready for reuse." />
      <section className="policy-grid">
        {DP.map((p) => (
          <article key={p.n} className="card policy">
            <span className="stat-ico"><Package size={19} /></span>
            <div className="policy-t"><b>{p.n}</b><small>Owner · {p.o}</small></div>
            <p>{p.d}</p>
            <div className="dp-meta">
              <span><Users size={14} />{p.users} consumers</span>
              <span>{p.src} sources</span>
              <span><Star size={14} />{p.q}% quality</span>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
