/* One list drives the sidebar, the page counter and the breadcrumb. */
export const NAV = [
  { to: '/app', label: 'Dashboard', group: 'Discover', icon: 'LayoutDashboard', end: true },
  { to: '/app/data-estate', label: 'Data estate', group: 'Discover', icon: 'Building2' },
  { to: '/app/sources', label: 'Data sources', group: 'Discover', icon: 'Database' },
  { to: '/app/catalogue', label: 'Data catalogue', group: 'Discover', icon: 'Layers' },
  { to: '/app/graph', label: 'Knowledge graph', group: 'Discover', icon: 'Network' },
  { to: '/app/ask', label: 'Ask GenMeta', group: 'Discover', icon: 'MessagesSquare' },
  { to: '/app/governance', label: 'Governance', group: 'Govern', icon: 'Landmark' },
  { to: '/app/classification', label: 'Classification', group: 'Govern', icon: 'Tag' },
  { to: '/app/products', label: 'Data products', group: 'Govern', icon: 'Package' },
  { to: '/app/stewardship', label: 'Stewardship', group: 'Govern', icon: 'Users', badge: 73 },
];

export const pad3 = (n) => String(n).padStart(3, '0');
