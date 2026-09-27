import { NavLink, Routes, Route, Navigate } from 'react-router-dom';
import { Orbit, Share2 } from 'lucide-react';
import { RailHead } from '../components/Rail.jsx';
import { useShell } from '../app/shell.js';
import Galaxy from './graph/Galaxy.jsx';
import GraphExplorer from './graph/GraphExplorer.jsx';

const BASE = '/app/graph';
const GRAPH_NAV = [
  { to: '', label: 'Galaxy', icon: Orbit },
  { to: 'explorer', label: 'Graph explorer', icon: Share2 },
];

function GraphNav({ collapsed, onToggle }) {
  return (
    <nav className={`admin-nav ${collapsed ? 'collapsed' : ''}`} aria-label="Knowledge graph">
      <RailHead title="Knowledge graph" collapsed={collapsed} onToggle={onToggle} />
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

/* Knowledge graph is a section with its own left rail (same pattern as Admin):
   opening the GenMeta sidebar collapses this rail, and opening this rail collapses the sidebar. */
export default function KnowledgeGraph() {
  const shell = useShell();
  const collapsed = !shell.collapsed;
  return (
    <div className="page fade-in admin-page">
      <div className={`admin-layout ${collapsed ? 'rail-collapsed' : ''}`}>
        <GraphNav collapsed={collapsed} onToggle={() => shell.setCollapsed((c) => !c)} />
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
