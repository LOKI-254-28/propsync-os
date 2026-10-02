import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { waitUntil } from 'base44:runtime';
import { buildReportSnapshot } from '../../shared/reportSnapshot.ts';
export default async function(req: Request): Promise<Response> {
  try {
    const b = createClientFromRequest(req), user = await b.auth.me();
    if (!user) return Response.json({ error: 'Please sign in.' }, { status: 401 });
    const body = await req.json(), sr = b.asServiceRole;
    if (body.action === 'create') {
      if ((user.account_type || user.data?.account_type) !== 'landowner') return Response.json({ error: 'Only landlords can request property reports.' }, { status: 403 });
      if (!['Portfolio', 'Property'].includes(body.scope) || typeof (body.message || '') !== 'string' || (body.message || '').length > 2000) return Response.json({ error: 'Choose a report scope and keep your request under 2,000 characters.' }, { status: 400 });
      let property = null;
      if (body.scope === 'Property') {
        if (typeof body.property_id !== 'string' || !body.property_id) return Response.json({ error: 'Choose a property.' }, { status: 400 });
        property = await b.entities.Property.get(body.property_id);
        if (property.owner_user_id !== user.id) return Response.json({ error: 'Choose one of your own properties.' }, { status: 403 });
      }
      const properties = await b.entities.Property.filter({ owner_user_id: user.id }, '-created_date', 1);
      if (!properties.length) return Response.json({ error: 'Add a property before requesting a report.' }, { status: 400 });
      const existing = await b.entities.ReportRequest.filter({ owner_user_id: user.id, scope: body.scope, property_id: property?.id || '', status: { $in: ['Requested', 'In Progress'] } }, '-created_date', 1);
      if (existing.length) return Response.json({ error: 'You already have an open request for this scope.' }, { status: 409 });
      const request = await sr.entities.ReportRequest.create({ owner_user_id: user.id, requester_name: user.full_name || user.email, requester_email: user.email, scope: body.scope, property_id: property?.id || '', property_name: property?.name || 'All my properties', message: (body.message || '').trim(), status: 'Requested' });
      return Response.json({ request });
    }
    if (user.role !== 'admin') return Response.json({ error: 'Only admins can process report requests.' }, { status: 403 });
    if (!['start', 'complete', 'decline'].includes(body.action) || typeof body.request_id !== 'string' || !body.request_id || typeof (body.admin_note || '') !== 'string' || (body.admin_note || '').length > 2000) return Response.json({ error: 'Choose a valid request and action.' }, { status: 400 });
    const request = await b.entities.ReportRequest.get(body.request_id);
    if (!['Requested', 'In Progress'].includes(request.status)) return Response.json({ error: 'This request has already been closed.' }, { status: 409 });
    const status = body.action === 'complete' ? 'Completed' : body.action === 'decline' ? 'Declined' : 'In Progress';
    const updates = { status, admin_note: body.admin_note || '' };
    if (status === 'Completed') { updates.snapshot = await buildReportSnapshot(sr, request); updates.completed_date = new Date().toISOString(); }
    const updated = await b.entities.ReportRequest.update(request.id, updates);
    waitUntil(sr.entities.Notification.create({ recipient_user_id: request.owner_user_id, type: 'Report', title: `Report request ${status.toLowerCase()}`, message: `${request.property_name}: ${status.toLowerCase()}.`, related_entity: 'ReportRequest', related_id: request.id, action_link: '/reports', date: new Date().toISOString(), read: false }));
    return Response.json({ request: updated });
  } catch(error) { return Response.json({ error: error.message }, { status: 500 }); }
}