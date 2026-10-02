export async function allRelated(entity, query) {
  const rows = []; let cursor;
  do { const page = await entity.filter(query, { sort: '-created_date', limit: 200, cursor }); rows.push(...page.items); cursor = page.has_more ? page.next_cursor : null; } while (cursor);
  return rows;
}
export async function documentAccess(sr, user) {
  if (user.role === 'admin') return { query: {}, canRead: () => true, staff: true };
  const staff = (user.account_type || user.data?.account_type) === 'landowner';
  const tenants = staff ? [] : await allRelated(sr.entities.Tenant, { user_id: user.id });
  const tenantIds = tenants.map(t => t.id);
  const properties = staff ? await allRelated(sr.entities.Property, { owner_user_id: user.id }) : [];
  const propertyIds = properties.map(p => p.id);
  const tenancies = await allRelated(sr.entities.Tenancy, staff ? { $or: [{ owner_user_id: user.id }, { property_id: { $in: propertyIds } }] } : { $or: [{ tenant_user_id: user.id }, { tenant_id: { $in: tenantIds } }] });
  const applications = await allRelated(sr.entities.Application, staff ? { $or: [{ owner_user_id: user.id }, { property_id: { $in: propertyIds } }] } : { tenant_user_id: user.id });
  const units = staff ? await allRelated(sr.entities.Unit, { property_id: { $in: propertyIds } }) : [];
  const tenancyIds = tenancies.map(t => t.id), applicationIds = applications.map(a => a.id);
  const relatedTenants = staff ? [...new Set([...tenancies, ...applications].map(t => t.tenant_id).filter(Boolean))] : tenantIds;
  const current = tenancies.filter(t => ['Active', 'Expiring Soon', 'Notice Given'].includes(t.status));
  const sharedProperties = staff ? propertyIds : current.map(t => t.property_id);
  const sharedUnits = staff ? units.map(u => u.id) : current.map(t => t.unit_id);
  const query = { $or: [staff ? { owner_user_id: user.id } : { tenant_user_id: user.id }, { tenant_id: { $in: relatedTenants } }, { tenancy_id: { $in: tenancyIds } }, { application_id: { $in: applicationIds } }, { property_id: { $in: sharedProperties } }, { unit_id: { $in: sharedUnits } }] };
  const canRead = doc => {
    const linked = tenancyIds.includes(doc.tenancy_id) || applicationIds.includes(doc.application_id);
    if (staff) return doc.owner_user_id === user.id || linked || propertyIds.includes(doc.property_id) || sharedUnits.includes(doc.unit_id) || (!doc.tenancy_id && !doc.application_id && !doc.property_id && !doc.unit_id && doc.uploaded_by_role === 'tenant' && relatedTenants.includes(doc.tenant_id));
    const mine = doc.tenant_user_id === user.id || tenantIds.includes(doc.tenant_id);
    if (mine && doc.uploaded_by_role === 'tenant') return true;
    if (doc.visibility !== 'tenant_visible' || (doc.tenant_user_id && doc.tenant_user_id !== user.id) || (doc.tenant_id && !tenantIds.includes(doc.tenant_id))) return false;
    if (mine || linked) return true;
    if (doc.tenancy_id || doc.application_id) return false;
    return doc.unit_id ? sharedUnits.includes(doc.unit_id) : sharedProperties.includes(doc.property_id);
  };
  return { query, canRead, staff };
}