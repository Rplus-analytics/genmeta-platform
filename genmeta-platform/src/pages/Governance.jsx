import { NavLink, Routes, Route, Navigate } from 'react-router-dom';
import { Landmark, ShieldCheck, ScrollText, KeyRound } from 'lucide-react';
import { GOVERNANCE_NAV } from '../nav.js';
import InnerLayout from '../components/InnerLayout.jsx';
import { BASE } from '../governance/data.js';
import { Toaster } from '../governance/kit.jsx';
import GovernanceOverview from '../governance/Overview.jsx';
import Policies from '../governance/Policies.jsx';
import Dpia from '../governance/Dpia.jsx';
import Access from '../governance/Access.jsx';
import '../governance/governance.css';

const ICONS = { Landmark, ShieldCheck, ScrollText, KeyRound };

/* Govern › Governance: inner vertical menu (Governance overview, Policies, DPIA, Access),
   docked to the sidebar like Admin and Data assets. Each section keeps its own tabs. */
export default function Governance() {
  const menu = GOVERNANCE_NAV.map((n) => {
    const I = ICONS[n.icon];
    return (
      <NavLink key={n.label} to={n.to ? `${BASE}/${n.to}` : BASE} end={!n.to} title={n.label}
        className={({ isActive }) => `admin-link ${isActive ? 'on' : ''}`}>
        <I size={16} strokeWidth={1.6} /><span>{n.label}</span>
      </NavLink>
    );
  });
  return (
    <InnerLayout title="Governance" menu={menu}>
      <Routes>
        <Route index element={<GovernanceOverview />} />
        <Route path="policies" element={<Policies />} />
        <Route path="dpia" element={<Dpia />} />
        <Route path="access" element={<Access />} />
        <Route path="*" element={<Navigate to={BASE} replace />} />
      </Routes>
      <Toaster />
    </InnerLayout>
  );
}
