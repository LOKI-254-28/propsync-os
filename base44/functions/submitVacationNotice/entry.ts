import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { waitUntil } from 'base44:runtime';
import { nairobiToday, addDays } from '../../shared/nairobiDates.ts';

export default async function(req: Request): Promise<Response> {
  try {
    const b = createClientFromRequest(req), user = await b.auth.me();
    if (!user) return Response.json({ error: 'Please sign in.' }, { status: 401 });
    const { tenancy_id, type, proposed_vacation_date, reason = '' } = await req.json();
    const today = nairobiToday();
    if (typeof tenancy_id !== 'string' || !tenancy_id || !['Vacation Notice', 'Termination Notice', 'Early Termination Request'].includes(type) || typeof proposed_vacation_date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(proposed_vacation_date) || !Number.isFinite(new Date(`${proposed_vacation_date}T00:00:00Z`).getTime()) || new Date(`${proposed_vacation_date}T00:00:00Z`).toISOString().slice(0,10) !== proposed_vacation_date || proposed_vacation_date < today || typeof reason !== 'string' || reason.length > 3000) return Response.json({ error: 'Choose a valid notice type and an exit date that is today or later.' }, { status: 400 });
    const ten = await b.entities.Tenancy.get(tenancy_id);
    if (ten.tenant_user_id !== user.id || !['Active', 'Expiring Soon', 'Notice Given'].includes(ten.status)) return Response.json({ error: 'You can only submit notice for your own active tenancy.' }, { status: 403 });
    const sr = b.asServiceRole;
    const property = await sr.entities.Property.get(ten.property_id);
    const previous = await b.entities.VacationRequest.filter({ tenancy_id, status: { $nin: ['Rejected', 'Completed'] } }, '-created_date', 1);
    let notice = previous[0];
    if (notice && (notice.type !== type || notice.proposed_vacation_date !== proposed_vacation_date)) return Response.json({ error: 'You already have an open notice for this tenancy. Contact your landlord to change it.' }, { status: 409 });
    if (!notice) {
      const days = Number(ten.notice_period_days ?? 30);
      notice = await sr.entities.VacationRequest.create({ request_reference: `VAC-${crypto.randomUUID().slice(0,8).toUpperCase()}`, type, tenant_id: ten.tenant_id, tenant_user_id: user.id, tenant_name: ten.tenant_name || user.full_name || user.email, tenancy_id: ten.id, tenancy_reference: ten.tenancy_reference || '', property_id: ten.property_id, property_name: ten.property_name || property.name, unit_id: ten.unit_id, unit_number: ten.unit_number || '', date_submitted: today, proposed_vacation_date, notice_period_days: days, calculated_notice_expiry: addDays(today, days), reason: reason.trim(), status: 'Submitted', owner_user_id: property.owner_user_id || ten.owner_user_id || '' });
    } else if (!notice.owner_user_id && property.owner_user_id) {
      notice = await sr.entities.VacationRequest.update(notice.id, { owner_user_id: property.owner_user_id });
    }
    if (ten.status !== 'Notice Given') await sr.entities.Tenancy.update(ten.id, { status: 'Notice Given' });
    const unit = await sr.entities.Unit.get(ten.unit_id);
    if (!unit.current_tenancy_id || unit.current_tenancy_id === ten.id) await sr.entities.Unit.update(unit.id, { status: 'Notice Given' });
    if (!previous.length) waitUntil(Promise.all([
      sr.entities.AuditLog.create({ user_id: user.id, user_email: user.email, user_role: user.role, action: 'Vacation Notice Submitted', entity: 'VacationRequest', entity_id: notice.id, entity_name: notice.request_reference, timestamp: new Date().toISOString() }),
      ...(notice.owner_user_id ? [sr.entities.Notification.create({ recipient_user_id: notice.owner_user_id, type: 'Vacation', title: 'Vacation Notice Submitted', message: `${notice.tenant_name} submitted a ${type}.`, related_entity: 'VacationRequest', related_id: notice.id, action_link: '/vacation-requests', date: new Date().toISOString(), read: false })] : []),
    ]));
    return Response.json({ notice });
  } catch(error) { return Response.json({ error: error.message }, { status: 500 }); }
}