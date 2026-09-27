import { NavLink, useLocation } from 'react-router-dom';
import { BookMarked, Waypoints, Gauge, Landmark, Compass, History } from 'lucide-react';
import { DATA_ASSETS_NAV } from '../nav.js';
import InnerLayout from '../components/InnerLayout.jsx';
import { PageHead } from '../components/ui.jsx';
import AssetDetail from './AssetDetail.jsx';
import { CatalogueResults, FiltersPanel, useCatalogueState } from './Catalogue.jsx';

const ICONS = { BookMarked, Waypoints, Gauge, Landmark, Compass, History };
const COMING = {
  '/app/lineage': 'Data lineage',
  '/app/quality': 'Data quality',
  '/app/data-governance': 'Data governance',
  '/app/data-explorer': 'Data explorer',
  '/app/metadata-changes': 'Metadata changes',
};

export default function DataAssets() {
  const { pathname } = useLocation();
  const state = useCatalogueState();
  const onList = pathname === '/app/catalogue';

  const menu = (
    <>
      {DATA_ASSETS_NAV.map((n) => {
        const I = ICONS[n.icon];
        return (
          <NavLink key={n.to} to={n.to} title={n.label}
            className={({ isActive }) => `admin-link ${isActive ? 'on' : ''}`}>
            <I size={16} strokeWidth={1.6} /><span>{n.label}</span>
          </NavLink>
        );
      })}
      {onList && <FiltersPanel state={state} />}
    </>
  );

  let content;
  if (onList) content = <CatalogueResults state={state} />;
  else if (pathname.startsWith('/app/catalogue/')) content = <AssetDetail />;
  else content = <PageHead eyebrow="Data assets" title={COMING[pathname] || 'Data assets'} sub="Coming soon" />;

  return <InnerLayout title="Data assets" menu={menu}>{content}</InnerLayout>;
}
