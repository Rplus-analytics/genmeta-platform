import { NavLink, useLocation } from 'react-router-dom';
import { BookMarked, BookA, Waypoints, Gauge, Landmark, Compass, History } from 'lucide-react';
import { DATA_ASSETS_NAV } from '../nav.js';
import InnerLayout from '../components/InnerLayout.jsx';
import { PageHead } from '../components/ui.jsx';
import AssetDetail from './AssetDetail.jsx';
import { CatalogueResults, FiltersPanel, useCatalogueState } from './Catalogue.jsx';
import Glossary, { GlossaryMenu, useGlossaryUI } from './Glossary.jsx';

const ICONS = { BookMarked, BookA, Waypoints, Gauge, Landmark, Compass, History };
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
  const glossary = useGlossaryUI();
  const onList = pathname === '/app/catalogue';
  const onGlossary = pathname === '/app/glossary' || pathname.startsWith('/app/glossary/');

  const menu = (
    <>
      {DATA_ASSETS_NAV.map((n) => {
        const I = ICONS[n.icon];
        /* Business glossary stays highlighted across its glossary/term routes */
        const active = n.to === '/app/glossary'
          ? (cls) => `admin-link ${onGlossary ? 'on' : ''}`
          : ({ isActive }) => `admin-link ${isActive ? 'on' : ''}`;
        return (
          <NavLink key={n.to} to={n.to} title={n.label} end={n.to === '/app/glossary'} className={active}>
            <I size={16} strokeWidth={1.6} /><span>{n.label}</span>
          </NavLink>
        );
      })}
      {onList && <FiltersPanel state={state} />}
      {onGlossary && <GlossaryMenu ui={glossary} />}
    </>
  );

  let content;
  if (onList) content = <CatalogueResults state={state} />;
  else if (onGlossary) content = <Glossary ui={glossary} />;
  else if (pathname.startsWith('/app/catalogue/')) content = <AssetDetail />;
  else content = <PageHead eyebrow="Data assets" title={COMING[pathname] || 'Data assets'} sub="Coming soon" />;

  return <InnerLayout title="Data assets" menu={menu}>{content}</InnerLayout>;
}
