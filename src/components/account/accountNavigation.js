export function isAccountPathActive(path, pathname) {
  return path === pathname || (!['/admin', '/portal', '/dashboard'].includes(path) && pathname.startsWith(`${path}/`));
}

const groups = [
  { label: 'Overview', paths: ['/dashboard', '/admin', '/portal', '/notifications'] },
  { label: 'Portfolio & leasing', paths: ['/properties', '/units', '/tenants', '/my-listings', '/applications', '/site-visits'] },
  { label: 'Finance', paths: ['/rent', '/arrears', '/payment-details', '/expenses', '/reports', '/comparison'] },
  { label: 'Property care', paths: ['/maintenance', '/inspections', '/contractors'] },
  { label: 'Communication', paths: ['/chat', '/notices', '/vacation-requests', '/feedback', '/documents'] },
  { label: 'Administration', paths: ['/admin/users', '/admin/contact-page', '/staff', '/settings', '/profile'] },
];
const tenantGroups = [
  { label: 'Overview', paths: ['/portal'] },
  { label: 'My home', paths: ['/portal/my-tenancies', '/portal/rent', '/portal/documents'] },
  { label: 'Find a home', paths: ['/portal/listings', '/portal/units', '/portal/applications'] },
  { label: 'Support & updates', paths: ['/portal/maintenance', '/portal/inspections', '/portal/notices', '/portal/chat', '/portal/feedback', '/portal/vacation'] },
  { label: 'Account', paths: ['/portal/profile'] },
];
export function accountNavigation(items, role) {
  const definitions = role === 'Tenant' ? tenantGroups : groups;
  const grouped = definitions.map(group => ({ ...group, items: group.paths.map(path => items.find(item => item.path === path)).filter(Boolean) }));
  const remaining = items.filter(item => !definitions.some(group => group.paths.includes(item.path)));
  if (remaining.length) grouped.push({ label: 'More', items: remaining });
  return grouped.filter(group => group.items.length);
}