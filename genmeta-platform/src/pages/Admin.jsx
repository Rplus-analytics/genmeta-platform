import { NavLink, Routes, Route, Navigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, UsersRound, KeyRound, LockKeyhole, Fingerprint, Mail, Blocks, Webhook, Bell, FlaskConical, SquareTerminal, ScrollText,
} from 'lucide-react';
import { ADMIN_NAV } from '../nav.js';
import { BASE } from './admin/kit.jsx';
import { RailHead } from '../components/Rail.jsx';
import Overview from './admin/Overview.jsx';
import { UsersPage, GroupsPage } from './admin/Directory.jsx';
import ApiAccess from './admin/ApiAccess.jsx';
import Authentication from './admin/Authentication.jsx';
import Sso from './admin/Sso.jsx';
import { SmtpPage, IntegrationsPage, WebhooksPage, NotificationsPage, LabsPage } from './admin/Platform.jsx';
import { QueryLogs, EventLogs } from './admin/Logs.jsx';

const ICONS = { LayoutDashboard, Users, UsersRound, KeyRound, LockKeyhole, Fingerprint, Mail, Blocks, Webhook, Bell, FlaskConical, SquareTerminal, ScrollText };

function AdminNav() {
  return (
    <nav className="admin-nav" aria-label="Admin">
      <RailHead title="Admin" />
      {ADMIN_NAV.map((n) => {
        if (n.section) return <div key={n.section} className="admin-nav-sec">{n.section}</div>;
        const I = ICONS[n.icon];
        return (
          <NavLink key={n.to} to={n.to ? `${BASE}/${n.to}` : BASE} end={!n.to} title={n.label}
            className={({ isActive }) => `admin-link ${isActive ? 'on' : ''} ${n.to.startsWith('logs/') ? 'nested' : ''}`}>
            <I size={16} strokeWidth={1.6} /><span>{n.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}

export default function Admin() {
  /* The Admin rail is always open. */
  return (
    <div className="page fade-in admin-page">
      <div className="admin-layout">
        <AdminNav />
        <div className="admin-body">
          <Routes>
            <Route index element={<Overview />} />
            <Route path="users" element={<UsersPage />} />
            <Route path="groups" element={<GroupsPage />} />
            <Route path="api/*" element={<ApiAccess />} />
            <Route path="authentication" element={<Authentication />} />
            <Route path="sso/*" element={<Sso />} />
            <Route path="smtp" element={<SmtpPage />} />
            <Route path="integrations" element={<IntegrationsPage />} />
            <Route path="webhooks" element={<WebhooksPage />} />
            <Route path="notifications" element={<NotificationsPage />} />
            <Route path="labs" element={<LabsPage />} />
            <Route path="logs" element={<Navigate to={`${BASE}/logs/query`} replace />} />
            <Route path="logs/query" element={<QueryLogs />} />
            <Route path="logs/events" element={<EventLogs />} />
            <Route path="*" element={<Navigate to={BASE} replace />} />
          </Routes>
        </div>
      </div>
    </div>
  );
}
