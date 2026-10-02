import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { waitUntil } from 'base44:runtime';
import { nairobiToday } from '../../shared/nairobiDates.ts';
export default async function(req: Request): Promise<Response> {
  try {
    const b = createClientFromRequest(req), user = await b.auth.me();
    if (!user) return Response.json({ error: 'Please sign in.' }, { status: 401 });
    const body = await req.json(), images = body.images || [];
    if (typeof body.tenancy_id !== 'string' || !body.tenancy_id || typeof body.ticket_number !== 'string' || !/^MNT[-A-Za-z0-9]{1,70}$/.test(body.ticket_number) || typeof body.title !== 'string' || !body.title.trim() || body.title.length > 200 || typeof (body.description || '') !== 'string' || (body.description || '').length > 5000 || !['Plumbing','Electrical','Structural','Appliance','Security','Cleaning','Other'].includes(body.category) || !['Low','Medium','High','Urgent'].includes(body.priority) || !Array.isArray(images) || images.length > 6 || images.some(uri => typeof uri !== 'string' || !uri || uri.length > 2048 || /^https?:/i.test(uri))) return Response.json({ error: 'Enter a title, valid category and priority, and up to six private photos.' }, { status: 400 });
    const tenancy = await b.entities.Tenancy.get(body.tenancy_id);
    if (tenancy.tenant_user_id !== user.id || !['Active','Expiring Soon','Notice Given'].includes(tenancy.status)) return Response.json({ error: 'Choose your own active tenancy.' }, { status: 403 });
    const sr = b.asServiceRole, property = await sr.entities.Property.get(tenancy.property_id);
    const existing = await b.entities.Maintenance.filter({ tenant_user_id: user.id, tenancy_id: tenancy.id, ticket_number: body.ticket_number }, '-created_date', 1);
    const created = !existing.length;
    const ticket = existing[0] || await sr.entities.Maintenance.create({ ticket_number: body.ticket_number, title: body.title.trim(), description: body.description || '', category: body.category, priority: body.priority, date_reported: nairobiToday(), property_id: tenancy.property_id, property_name: tenancy.property_name || property.name, unit_id: tenancy.unit_id, unit_number: tenancy.unit_number || '', tenant_id: tenancy.tenant_id, tenant_user_id: user.id, tenant_name: tenancy.tenant_name || user.full_name || user.email, tenancy_id: tenancy.id, owner_user_id: property.owner_user_id || tenancy.owner_user_id || '', status: 'Submitted', public_updates: [], images: [...new Set(images)] });
    const docs = await sr.entities.Document.filter({ maintenance_id: ticket.id }, '-created_date', 20);
    const missing = (ticket.images || []).filter(uri => !docs.some(d => d.file_uri === uri));
    if (missing.length) await sr.entities.Document.bulkCreate(missing.map((uri, i) => ({ title: `Repair photo ${docs.length + i + 1} — ${ticket.title}`, category: 'Other', file_uri: uri, file_name: `repair-photo-${docs.length + i + 1}`, maintenance_id: ticket.id, tenancy_id: tenancy.id, tenant_id: tenancy.tenant_id, tenant_user_id: user.id, owner_user_id: property.owner_user_id || tenancy.owner_user_id || '', property_id: tenancy.property_id, unit_id: tenancy.unit_id, uploaded_by: user.email || user.id, uploaded_by_role: 'tenant', visibility: 'tenant_visible', status: 'verified', date_uploaded: nairobiToday() })));
    if (created) waitUntil(Promise.all([
      sr.entities.AuditLog.create({ user_id: user.id, user_email: user.email, user_role: user.role, action: 'Maintenance Submitted', entity: 'Maintenance', entity_id: ticket.id, entity_name: ticket.ticket_number, timestamp: new Date().toISOString() }),
      ...(ticket.owner_user_id ? [sr.entities.Notification.create({ recipient_user_id: ticket.owner_user_id, type: 'Maintenance', title: 'New Maintenance Request', message: `${ticket.title} — ${ticket.unit_number}`, related_entity: 'Maintenance', related_id: ticket.id, action_link: '/maintenance', date: new Date().toISOString(), read: false })] : []),
    ]));
    return Response.json({ ticket });
  } catch(error) { return Response.json({ error: error.message }, { status: 500 }); }
}