import { NavLink, Routes, Route, Navigate } from 'react-router-dom';
import { Orbit, Share2 } from 'lucide-react';
import InnerLayout from '../components/InnerLayout.jsx';
import Galaxy from './graph/Galaxy.jsx';
import GraphExplorer from './graph/GraphExplorer.jsx';

const BASE = '/app/graph';
const GRAPH_NAV = [
  { to: '', label: 'Galaxy', icon: Orbit },
  { to: 'explorer', label: 'Graph explorer', icon: Share2 },
];

/* Knowledge graph is a section with its own docked inner menu (shared InnerLayout). */
export default function KnowledgeGraph() {
  const menu = GRAPH_NAV.map((n) => {
    const I = n.icon;
    return (
      <NavLink key={n.to} to={n.to ? `${BASE}/${n.to}` : BASE} end={!n.to} title={n.label}
        className={({ isActive }) => `admin-link ${isActive ? 'on' : ''}`}>
        <I size={16} strokeWidth={1.6} /><span>{n.label}</span>
      </NavLink>
    );
  });
  return (
    <InnerLayout title="Knowledge graph" menu={menu}>
      <Routes>
        <Route index element={<Galaxy />} />
        <Route path="explorer" element={<GraphExplorer />} />
        <Route path="*" element={<Navigate to={BASE} replace />} />
      </Routes>
    </InnerLayout>
  );
}
