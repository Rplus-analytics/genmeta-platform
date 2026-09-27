import { NavLink, Routes, Route, Navigate } from 'react-router-dom';
import { Orbit, Share2 } from 'lucide-react';
import { RailHead } from '../components/Rail.jsx';
import Galaxy from './graph/Galaxy.jsx';
import GraphExplorer from './graph/GraphExplorer.jsx';

const BASE = '/app/graph';
const GRAPH_NAV = [
  { to: '', label: 'Galaxy', icon: Orbit },
  { to: 'explorer', label: 'Graph explorer', icon: Share2 },
];

function GraphNav() {
  return (
    <nav className="admin-nav" aria-label="Knowledge graph">
      <RailHead title="Knowledge graph" />
      {GRAPH_NAV.map((n) => {
        const I = n.icon;
        return (
          <NavLink key={n.to} to={n.to ? `${BASE}/${n.to}` : BASE} end={!n.to} title={n.label}
            className={({ isActive }) => `admin-link ${isActive ? 'on' : ''}`}>
            <I size={16} strokeWidth={1.6} /><span>{n.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}

/* Knowledge graph is a section with its own left rail (same pattern as Admin); the rail is always open. */
export default function KnowledgeGraph() {
  return (
    <div className="page fade-in admin-page">
      <div className="admin-layout">
        <GraphNav />
        <div className="admin-body">
          <Routes>
            <Route index element={<Galaxy />} />
            <Route path="explorer" element={<GraphExplorer />} />
            <Route path="*" element={<Navigate to={BASE} replace />} />
          </Routes>
        </div>
      </div>
    </div>
  );
}
