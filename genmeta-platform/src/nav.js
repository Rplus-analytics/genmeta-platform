/* Inner-menu links for the Data assets section (like ADMIN_NAV). */
export const DATA_ASSETS_NAV = [
  { to: '/app/catalogue', label: 'Data catalogue', icon: 'BookMarked' },
  { to: '/app/lineage', label: 'Data lineage', icon: 'Waypoints' },
  { to: '/app/quality', label: 'Data quality', icon: 'Gauge' },
  { to: '/app/data-governance', label: 'Data governance', icon: 'Landmark' },
  { to: '/app/data-explorer', label: 'Data explorer', icon: 'Compass' },
  { to: '/app/metadata-changes', label: 'Metadata changes', icon: 'History' },
];

/* One list drives the sidebar, the breadcrumb and the routes. "Data assets" is a single
   sidebar item (opens /app/catalogue) that stays highlighted across all its section routes. */
export const NAV = [
  { to: '/app', label: 'Data estate', group: 'Discover', icon: 'Building2', end: true },
  { to: '/app/catalogue', label: 'Data assets', group: 'Discover', icon: 'Layers', assets: true },
  { to: '/app/glossary', label: 'Business glossary', group: 'Discover', icon: 'BookA' },
  { to: '/app/products', label: 'Data products', group: 'Discover', icon: 'Package' },
  { to: '/app/graph', label: 'Knowledge graph', group: 'Discover', icon: 'Network', crumbs: { explorer: 'Graph explorer' } },
  { to: '/app/ask', label: 'Ask GenMeta', group: 'Discover', icon: 'MessagesSquare' },
  { to: '/app/governance', label: 'Governance', group: 'Govern', icon: 'Landmark' },
  { to: '/app/classification', label: 'Classification', group: 'Govern', icon: 'Tag' },
  { to: '/app/stewardship', label: 'Stewardship', group: 'Govern', icon: 'Users', badge: 73 },
  { to: '/app/code-analyzer', label: 'Code analyzer', group: 'Govern', icon: 'FileCode2' },
  { to: '/app/sources', label: 'Data sources', group: 'Govern', icon: 'Database' },
  { to: '/app/admin', label: 'Admin', group: 'Admin', icon: 'ShieldCheck' },
];

/* Inner menu for the Governance section (Govern › Governance). */
export const GOVERNANCE_NAV = [
  { to: '', label: 'Governance overview', icon: 'Landmark' },
  { to: 'policies', label: 'Policies', icon: 'ShieldCheck' },
  { to: 'dpia', label: 'DPIA', icon: 'ScrollText' },
  { to: 'access', label: 'Access', icon: 'KeyRound' },
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
NAV.find((n) => n.to === '/app/admin').crumbs = ADMIN_CRUMBS;
NAV.find((n) => n.to === '/app/governance').crumbs = { policies: 'Policies', dpia: 'DPIA', access: 'Access' };

/* Is this path part of the Data assets section? */
export const isDataAssets = (pathname) => DATA_ASSETS_NAV.some((c) => pathname === c.to || pathname.startsWith(`${c.to}/`));

/* Resolve a pathname to its nav entry (handling the "Data assets" section). */
export function navMatch(pathname) {
  const child = DATA_ASSETS_NAV.find((c) => pathname === c.to || pathname.startsWith(`${c.to}/`));
  if (child) return { group: 'Discover', parent: { label: 'Data assets' }, item: child, rest: pathname.slice(child.to.length + 1) };
  for (const n of NAV) {
    if (n.assets || !n.to) continue;
    const m = n.end ? n.to === pathname : (pathname === n.to || pathname.startsWith(`${n.to}/`));
    if (m) return { group: n.group, parent: null, item: n, rest: pathname.slice(n.to.length + 1) };
  }
  return { group: NAV[0].group, parent: null, item: NAV[0], rest: '' };
}

export const pad3 = (n) => String(n).padStart(3, '0');
