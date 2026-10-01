import { NavLink, Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { BookMarked, Waypoints, Gauge, Landmark, Compass, History } from 'lucide-react';
import { DATA_ASSETS_NAV } from '../nav.js';
import InnerLayout from '../components/InnerLayout.jsx';
import { PageHead } from '../components/ui.jsx';
import AssetDetail from './AssetDetail.jsx';
import { CatalogueResults, FiltersPanel, useCatalogueState } from './Catalogue.jsx';
import Glossary, { GlossaryMenu, useGlossaryUI } from './Glossary.jsx';
import { ASSETS } from '../catalogue/model.js';
import DataQualitySection, { SUBTABS } from '../catalogue/quality/DataQualitySection.jsx';

const ICONS = { BookMarked, Waypoints, Gauge, Landmark, Compass, History };
const COMING = {
  '/app/lineage': 'Data lineage',
  '/app/data-governance': 'Data governance',
  '/app/data-explorer': 'Data explorer',
  '/app/metadata-changes': 'Metadata changes',
};
/* estate-wide representative asset for the standalone /app/quality view */
const ESTATE_ASSET = ASSETS.find((x) => x.key === 'SRC.CUSTOMER') || ASSETS[0];

export default function DataAssets() {
  const { pathname } = useLocation();
  const nav = useNavigate();
  const [sp] = useSearchParams();
  const state = useCatalogueState();
  const onQuality = pathname === '/app/quality';
  const curSub = sp.get('quality') || 'overview';
  const glossary = useGlossaryUI();
  const onList = pathname === '/app/catalogue';
  const onGlossary = pathname === '/app/glossary' || pathname.startsWith('/app/glossary/');

  /* The glossary lives in the outer menu now, so its inner panel shows only its own
     tree + filters — not the Data assets link list. */
  const menu = onGlossary ? (
    <GlossaryMenu ui={glossary} />
  ) : (
    <>
      {DATA_ASSETS_NAV.map((n) => {
        const I = ICONS[n.icon];
        return (
          <div key={n.to}>
            <NavLink to={n.to} title={n.label} className={({ isActive }) => `admin-link ${isActive ? 'on' : ''}`}>
              <I size={16} strokeWidth={1.6} /><span>{n.label}</span>
            </NavLink>
            {n.to === '/app/quality' && onQuality && SUBTABS.map(([key, label]) => (
              <Link key={key} to={`/app/quality?quality=${key}`} title={label} className={`admin-link admin-subitem ${curSub === key ? 'on' : ''}`}>
                <span>{label}</span>
              </Link>
            ))}
          </div>
        );
      })}
      {onList && <FiltersPanel state={state} />}
    </>
  );

  let content;
  if (onList) content = <CatalogueResults state={state} />;
  else if (onGlossary) content = <Glossary ui={glossary} />;
  else if (onQuality) content = <DataQualitySection a={ESTATE_ASSET} onOpenAsset={(id) => nav(`/app/catalogue/${id}`)} />;
  else if (pathname.startsWith('/app/catalogue/')) content = <AssetDetail />;
  else content = <PageHead eyebrow="Data assets" title={COMING[pathname] || 'Data assets'} sub="Coming soon" />;

  return <InnerLayout title={onGlossary ? 'Business glossary' : 'Data assets'} menu={menu}>{content}</InnerLayout>;
}
