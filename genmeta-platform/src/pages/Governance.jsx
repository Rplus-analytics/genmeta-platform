import { NavLink, Routes, Route, Navigate, useLocation, useSearchParams } from 'react-router-dom';
import { Landmark, ShieldCheck, ScrollText, KeyRound, Bot, Users, Workflow } from 'lucide-react';
import { GOVERNANCE_NAV } from '../nav.js';
import InnerLayout from '../components/InnerLayout.jsx';
import { BASE } from '../governance/data.js';
import { Toaster } from '../governance/kit.jsx';
import Stewardship from '../governance/Stewardship.jsx';
import RegisterModel from '../governance/RegisterModel.jsx';
import GovernanceOverview from '../governance/Overview.jsx';
import Policies, { PolicyItemPage, usePolicyFilters, POLICIES_BASE } from '../governance/Policies.jsx';
import Dpia, { DpiaActivityPage, useDpiaFilters, DPIA_BASE } from '../governance/Dpia.jsx';
import { FacetPanel } from '../governance/catalog.jsx';
import Access from '../governance/Access.jsx';
import Workflows from '../governance/Workflows.jsx';
import { ModelCatalogue, ModelPage, ModelFiltersPanel, useModelFilters, MODELS_BASE } from '../governance/Models.jsx';
import '../governance/governance.css';

const ICONS = { Landmark, ShieldCheck, ScrollText, KeyRound, Bot, Users, Workflow };

/* old links (?view=policies) go to the Policies section, which now has its own menu item */
function DpiaRoute({ filters }) {
  const [sp] = useSearchParams();
  if (sp.get('view') === 'policies') return <Navigate to={`${BASE}/policies`} replace />;
  return <Dpia filters={filters} />;
}

/* Govern › Governance: inner vertical menu (Overview, AI model governance, DPIA & GDPR, Policies, Access & RBAC, Stewardship, Workflows),
   docked to the sidebar like Admin and Data assets. Each section keeps its own tabs. */
export default function Governance() {
  const { pathname } = useLocation();
  const models = useModelFilters();
  const onModelList = pathname === MODELS_BASE || pathname === `${MODELS_BASE}/`;
  const pol = usePolicyFilters();
  const dp = useDpiaFilters();
  const [sp] = useSearchParams();
  const onPolicyList = (pathname === POLICIES_BASE || pathname === `${POLICIES_BASE}/`) && !sp.get('tab');
  const onDpiaList = (pathname === DPIA_BASE || pathname === `${DPIA_BASE}/`) && !sp.get('tab') && sp.get('view') !== 'policies';
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
  const menu = <>{links}{onModelList && <ModelFiltersPanel state={models} />}{onPolicyList && <FacetPanel state={pol} sourceLabel="Regulation" />}{onDpiaList && <FacetPanel state={dp} sourceLabel="Where and why" />}</>;
  return (
    <InnerLayout title="Governance" menu={menu}>
      <Routes>
        <Route index element={<GovernanceOverview />} />
        <Route path="models" element={<ModelCatalogue state={models} />} />
        <Route path="models/register" element={<RegisterModel base={MODELS_BASE} onRegistered={models.refresh} />} />
        <Route path="models/:modelId" element={<ModelPage />} />
        <Route path="dpia" element={<DpiaRoute filters={dp} />} />
        <Route path="dpia/:activityId" element={<DpiaActivityPage />} />
        <Route path="policies" element={<Policies filters={pol} />} />
        <Route path="policies/:itemId" element={<PolicyItemPage />} />
        <Route path="stewardship" element={<Stewardship />} />
        <Route path="access" element={<Access />} />
        <Route path="workflows" element={<Workflows />} />
        <Route path="workflows/:wfId" element={<Workflows />} />
        <Route path="*" element={<Navigate to={BASE} replace />} />
      </Routes>
      <Toaster />
    </InnerLayout>
  );
}
