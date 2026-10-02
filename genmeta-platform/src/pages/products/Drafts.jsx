import { PageHead } from '../../components/ui.jsx';
import { useProducts, ProductCard } from './shared.jsx';

export default function Drafts() {
  const store = useProducts();
  const list = store.products.filter((p) => p.status === 'draft');
  return (
    <div className="page fade-in dp">
      <PageHead eyebrow="Discover" title="My drafts" sub="Products only owners can see. Publish them to list them in the marketplace." />
      {list.length ? <div className="dp-pgrid">{list.map((p) => <ProductCard key={p.id} p={p} />)}</div>
        : <div className="dash-card">No drafts yet.</div>}
    </div>
  );
}
