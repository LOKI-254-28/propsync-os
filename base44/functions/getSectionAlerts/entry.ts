import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { nairobiToday } from '../../shared/nairobiDates.ts';
import { documentAccess } from '../../shared/documentAccess.ts';
import { feedbackScope } from '../../shared/feedbackAccess.ts';
export default async function(req: Request): Promise<Response> {
  try {
    const b = createClientFromRequest(req), user = await b.auth.me();
    if (!user) return Response.json({ error: 'Please sign in.' }, { status: 401 });
    const { visited_path } = await req.json();
    const admin = user.role === 'admin', tenant = !admin && (user.account_type || user.data?.account_type) !== 'landowner';
    const prefix = tenant ? '/portal' : '', path = section => `${prefix}/${section}`;
    const routes = { Application: path('applications'), SiteVisit: tenant ? path('applications') : '/site-visits', Maintenance: path('maintenance'), Document: path('documents'), Inspection: path('inspections'), Notice: path('notices'), Payment: path('rent'), RentCharge: path('rent'), Feedback: path('feedback'), VacationRequest: tenant ? path('vacation') : '/vacation-requests', ChatMessage: path('chat'), ReportRequest: '/reports', User: '/admin/users', Tenancy: tenant ? '/portal/my-tenancies' : '/tenants' };
    const allowed = new Set([...Object.values(routes), '/notifications', '/portal/profile', '/arrears']);
    const routeFor = n => {
      const linked = typeof n.action_link === 'string' ? n.action_link.split(/[?#]/)[0] : '';
      if (!tenant && linked==='/tenancies') return '/tenants';
      if (allowed.has(linked)) return linked;
      return routes[n.related_entity] || routes[n.type] || null;
    };
    const buckets = new Map();
    const add = (route, key) => { if (!route) return; if (!buckets.has(route)) buckets.set(route, new Set()); buckets.get(route).add(key); };
    const scan = async (entity, query, handle, client = b, fields = ['id']) => {
      if (entity === 'User') {
        let skip = 0, rows;
        do { rows = await client.entities.User.filter(query, '-created_date', 200, skip, fields); await handle(rows); skip += rows.length; } while(rows.length === 200);
        return;
      }
      let cursor;
      do { const page = await client.entities[entity].filter(query, { limit: 200, cursor, fields }); await handle(page.items); cursor = page.has_more ? page.next_cursor : null; } while(cursor);
    };
    let unread = 0;
    await scan('Notification', { recipient_user_id: user.id, read: { $ne: true } }, async rows => {
      const seen = rows.filter(n => allowed.has(visited_path) && (visited_path === '/notifications' || routeFor(n) === visited_path));
      if (seen.length) await b.entities.Notification.updateMany({ recipient_user_id: user.id, read: { $ne: true }, id: { $in: seen.map(n => n.id) } }, { $set: { read: true } });
      for (const n of rows.filter(n => !seen.some(s => s.id === n.id))) { unread++; const route = routeFor(n); if (route !== path('chat')) add(route, n.related_id && n.related_entity ? `${n.related_entity}:${n.related_id}` : `Notification:${n.id}`); }
    }, b, ['id', 'related_entity', 'related_id', 'action_link', 'type']);
    const feedback = await feedbackScope(b.asServiceRole,user);
    const owned = tenant ? { tenant_user_id: user.id } : admin ? {} : { owner_user_id: user.id };
    const task = (entity, query, route) => scan(entity, { ...owned, ...query }, rows => rows.forEach(r => add(route, `${entity}:${r.id}`)));
    await Promise.all([
      task('Application', { status: { $in: tenant ? ['More Information Required', 'Agreement Issued', 'Payment Requested', 'Payment Rejected'] : ['Submitted', 'Pending', 'Under Review', 'Information Provided', 'Site Visit Completed', 'Agreement Executed', 'Payment Proof Submitted', 'Payment Verified'] } }, path('applications')),
      task('Application', { $or: [{ site_visit_status: { $in: ['Requested', 'Proposed', 'Rescheduled'] }, site_visit_proposed_by: tenant ? 'landlord' : 'tenant' }, ...(!tenant ? [{ site_visit_status: 'Confirmed', site_visit_date: { $lte: nairobiToday() } }] : [])] }, tenant ? path('applications') : '/site-visits'),
      ...(!tenant ? [task('Maintenance', { status: { $nin: ['Completed', 'Closed', 'Rejected'] } }, '/maintenance'), task('VacationRequest', { status: { $in: ['Submitted', 'Acknowledged', 'Final Inspection Scheduled'] } }, '/vacation-requests')] : [task('Notice', { acknowledged: { $ne: true }, status: { $ne: 'Draft' } }, path('notices')), task('RentCharge', { status: { $nin: ['Paid', 'Void'] }, outstanding: { $gt: 0 } }, path('rent'))]),
      ...(feedback.can_manage ? [scan('Feedback',{$and:[feedback.query,{status:{$in:['Open','Under Review']}}]},rows=>rows.forEach(r=>add(path('feedback'),`Feedback:${r.id}`)),b.asServiceRole)] : []),
      scan('ChatMessage', { ...owned, read: { $ne: true }, sender_user_id: { $ne: user.id } }, rows => rows.forEach(r => add(path('chat'), `ChatMessage:${r.id}`))),
      ...(admin ? [task('ReportRequest', { status: { $in: ['Requested', 'In Progress'] } }, '/reports'), scan('User', { approval_status: 'pending', account_type: 'landowner' }, rows => rows.forEach(r => add('/admin/users', `User:${r.id}`)))] : []),
    ]);
    if (!tenant) {
      const access = await documentAccess(b.asServiceRole, user);
      await scan('Document', { $and: [access.query, { status: 'pending' }] }, rows => rows.filter(access.canRead).forEach(r => add('/documents', `Document:${r.id}`)), b.asServiceRole, ['id', 'owner_user_id', 'tenant_id', 'tenancy_id', 'application_id', 'property_id', 'unit_id', 'uploaded_by_role']);
    }
    const counts = Object.fromEntries([...buckets].map(([route, set]) => [route, set.size]));
    counts['/notifications'] = unread;
    return Response.json({ counts, unread });
  } catch(error) { return Response.json({ error: error.message }, { status: 500 }); }
}