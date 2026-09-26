/* One list drives the sidebar, the page counter and the breadcrumb. */
export const NAV = [
  { to: '/app', label: 'Data estate', group: 'Discover', icon: 'Building2', end: true },
  { to: '/app/catalogue', label: 'Data catalogue', group: 'Discover', icon: 'Layers' },
  { to: '/app/graph', label: 'Knowledge graph', group: 'Discover', icon: 'Network' },
  { to: '/app/ask', label: 'Ask GenMeta', group: 'Discover', icon: 'MessagesSquare' },
  { to: '/app/governance', label: 'Governance', group: 'Govern', icon: 'Landmark' },
  { to: '/app/classification', label: 'Classification', group: 'Govern', icon: 'Tag' },
  { to: '/app/products', label: 'Data products', group: 'Govern', icon: 'Package' },
  { to: '/app/stewardship', label: 'Stewardship', group: 'Govern', icon: 'Users', badge: 73 },
  { to: '/app/sources', label: 'Data sources', group: 'Govern', icon: 'Database' },
  { to: '/app/admin', label: 'Admin', group: 'Admin', icon: 'ShieldCheck' },
];

/* Left-hand rail inside Admin. `section` starts a labelled sub-group. */
export const ADMIN_NAV = [
  { to: '', label: 'Overview', icon: 'LayoutDashboard' },
  { to: 'users', label: 'Users', icon: 'Users' },
  { to: 'groups', label: 'Groups', icon: 'UsersRound' },
  { to: 'api', label: 'API access', icon: 'KeyRound' },
  { to: 'authentication', label: 'Authentication', icon: 'LockKeyhole' },
  { to: 'sso', label: 'SSO', icon: 'Fingerprint' },
  { to: 'smtp', label: 'SMTP', icon: 'Mail' },
  { to: 'integrations', label: 'Integrations', icon: 'Blocks' },
  { to: 'webhooks', label: 'Webhooks', icon: 'Webhook' },
  { to: 'notifications', label: 'Notifications', icon: 'Bell' },
  { to: 'labs', label: 'Labs', icon: 'FlaskConical' },
  { section: 'Logs' },
  { to: 'logs/query', label: 'Query logs', icon: 'SquareTerminal' },
  { to: 'logs/events', label: 'Event logs', icon: 'ScrollText' },
];

/* Breadcrumb labels for admin sub-paths, including in-page tabs. */
export const ADMIN_CRUMBS = {
  ...Object.fromEntries(ADMIN_NAV.filter((n) => n.to).map((n) => [n.to, n.label])),
  'api/tokens': 'API tokens', 'api/oauth': 'OAuth clients',
  'sso/configure': 'SSO configure', 'sso/mapping': 'SSO group mapping',
};
NAV[NAV.length - 1].crumbs = ADMIN_CRUMBS;

export const pad3 = (n) => String(n).padStart(3, '0');
