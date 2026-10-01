import { useProducts, Crumbs, ProductCard } from './shared.jsx';

export default function Drafts() {
  const store = useProducts();
  const list = store.products.filter((p) => p.status === 'draft');
  return (
    <div className="dp">
      <Crumbs parts={[<b className="crb">My drafts</b>]} />
      <div className="pad">
        <div className="hhead"><div><h1>My drafts</h1><p className="muted">Products only owners can see. Publish them to list them in the marketplace.</p></div></div>
        <div className="agrid">{list.map((p) => <ProductCard key={p.id} p={p} />)}</div>
      </div>
    </div>
  );
}
