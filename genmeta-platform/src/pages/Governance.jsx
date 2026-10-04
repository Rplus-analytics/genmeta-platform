import { NavLink, Routes, Route, Navigate, useLocation, useSearchParams } from 'react-router-dom';
import { Landmark, ShieldCheck, ScrollText, KeyRound, Bot, Users } from 'lucide-react';
import { GOVERNANCE_NAV } from '../nav.js';
import InnerLayout from '../components/InnerLayout.jsx';
import { BASE } from '../governance/data.js';
import { Toaster, SubNav } from '../governance/kit.jsx';
import Stewardship from '../governance/Stewardship.jsx';
import GovernanceOverview from '../governance/Overview.jsx';
import Policies from '../governance/Policies.jsx';
import Dpia from '../governance/Dpia.jsx';
import Access from '../governance/Access.jsx';
import { ModelCatalogue, ModelPage, ModelFiltersPanel, useModelFilters, MODELS_BASE } from '../governance/Models.jsx';
import '../governance/governance.css';

const ICONS = { Landmark, ShieldCheck, ScrollText, KeyRound, Bot, Users };

/* DPIA and policies share one menu item; a switch under the page title moves between them. */
function DpiaAndPolicies() {
  const [sp, setSp] = useSearchParams();
  const view = sp.get('view') === 'policies' ? 'policies' : 'dpia';
  const switcher = (
    <SubNav value={view} onChange={(v) => setSp(v === 'policies' ? { view: 'policies' } : {})} items={[
      { value: 'dpia', label: 'DPIA & GDPR' },
      { value: 'policies', label: 'Policies' },
    ]} />
  );
  return view === 'policies' ? <Policies switcher={switcher} /> : <Dpia switcher={switcher} />;
}

/* Govern › Governance: inner vertical menu (Overview, AI model governance, DPIA & policies, Access & RBAC, Stewardship),
   docked to the sidebar like Admin and Data assets. Each section keeps its own tabs. */
export default function Governance() {
  const { pathname } = useLocation();
  const models = useModelFilters();
  const onModelList = pathname === MODELS_BASE || pathname === `${MODELS_BASE}/`;
  const links = GOVERNANCE_NAV.map((n) => {
    const I = ICONS[n.icon];
    return (
      <NavLink key={n.label} to={n.to ? `${BASE}/${n.to}` : BASE} end={!n.to} title={n.label}
        className={({ isActive }) => `admin-link ${isActive ? 'on' : ''}`}>
        <I size={16} strokeWidth={1.6} /><span>{n.label}</span>
      </NavLink>
    );
  });
  /* on the AI model list the catalogue-style filters sit under the links, as in Data assets */
  const menu = <>{links}{onModelList && <ModelFiltersPanel state={models} />}</>;
  return (
    <InnerLayout title="Governance" menu={menu}>
      <Routes>
        <Route index element={<GovernanceOverview />} />
        <Route path="models" element={<ModelCatalogue state={models} />} />
        <Route path="models/:modelId" element={<ModelPage />} />
        <Route path="dpia" element={<DpiaAndPolicies />} />
        <Route path="policies" element={<Navigate to={`${BASE}/dpia?view=policies`} replace />} />
        <Route path="stewardship" element={<Stewardship />} />
        <Route path="access" element={<Access />} />
        <Route path="*" element={<Navigate to={BASE} replace />} />
      </Routes>
      <Toaster />
    </InnerLayout>
  );
}
