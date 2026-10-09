import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { nairobiToday } from '../../shared/nairobiDates.ts';
import { documentAccess } from '../../shared/documentAccess.ts';
import { feedbackScope } from '../../shared/feedbackAccess.ts';
import { assignedMaintenanceScope } from '../../shared/maintenanceAccess.ts';
import alertSeen from '../../shared/alertSeen.ts';
export default async function(req: Request): Promise<Response> {
  try {
    const b = createClientFromRequest(req), user = await b.auth.me();
    if (!user) return Response.json({ error: 'Please sign in.' }, { status: 401 });
    const { visited_path,notification_id } = await req.json();
    if(visited_path!=null&&(typeof visited_path!=='string'||visited_path.length>200))return Response.json({error:'Choose a valid section.'},{status:400});
    const tracker=alertSeen(user),{buckets,add}=tracker;
    const admin = user.role === 'admin', tenant = !admin && (user.account_type || user.data?.account_type) !== 'landowner';
    const prefix = tenant ? '/portal' : '', path = section => `${prefix}/${section}`;
    const routes = { Application: path('applications'), SiteVisit: tenant ? path('applications') : '/site-visits', Maintenance: path('maintenance'), Document: path('documents'), Inspection: path('inspections'), Notice: path('notices'), Payment: path('rent'), RentCharge: path('rent'), Feedback: path('feedback'), VacationRequest: tenant ? path('vacation') : '/vacation-requests', ChatMessage: path('chat'), ReportRequest: '/reports', User: '/admin/users', Tenancy: tenant ? '/portal/my-tenancies' : '/tenants' };
    const allowed = new Set([...Object.values(routes), ...(!tenant?['/notifications','/profile','/arrears']:['/portal/profile']), '/assigned-maintenance']);
    const wrongRole=n=>{const link=typeof n.action_link==='string'?n.action_link.split(/[?#]/)[0]:'';return link&&(tenant?!link.startsWith('/portal/')&&link!=='/assigned-maintenance':link.startsWith('/portal/'));};
    const routeFor = n => {
      if(wrongRole(n))return null;
      const linked = typeof n.action_link === 'string' ? n.action_link.split(/[?#]/)[0] : '';
      if (!tenant && linked==='/tenancies') return '/tenants';
      if (allowed.has(linked)) return linked;
      return routes[n.related_entity] || routes[n.type] || null;
    };
    if(notification_id!=null) {
      if(typeof notification_id!=='string'||notification_id.length>100)return Response.json({error:'Choose a valid notification.'},{status:400});
      const notification=(await b.entities.Notification.filter({id:notification_id,recipient_user_id:user.id},'-created_date',1))[0];
      if(!notification)return Response.json({error:'This notification does not belong to your account.'},{status:403});
      if(!notification.read)await b.asServiceRole.entities.Notification.update(notification.id,{read:true});
      if(notification.related_entity&&notification.related_id)tracker.remember(`${notification.related_entity}:${notification.related_id}`);
    }
    const scan = async (entity, query, handle, client = b, fields = ['id','updated_date','created_date']) => {
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
      const seen = rows.filter(n => wrongRole(n)||(allowed.has(visited_path) && (visited_path === '/notifications' || routeFor(n) === visited_path)));
      seen.filter(n=>!wrongRole(n)&&n.related_entity&&n.related_id).forEach(n=>tracker.remember(`${n.related_entity}:${n.related_id}`));
      if (seen.length) await b.asServiceRole.entities.Notification.updateMany({ recipient_user_id: user.id, read: { $ne: true }, id: { $in: seen.map(n => n.id) } }, { $set: { read: true } });
      for (const n of rows.filter(n => !seen.some(s => s.id === n.id))) { unread++; const route = routeFor(n); if (route !== path('chat')) add(route, n.related_id && n.related_entity ? `${n.related_entity}:${n.related_id}` : `Notification:${n.id}`,n.date||n.created_date); }
    }, b, ['id', 'related_entity', 'related_id', 'action_link', 'type','date','created_date']);
    const [feedback,assignedWork] = await Promise.all([feedbackScope(b.asServiceRole,user),assignedMaintenanceScope(b.asServiceRole,user)]);
    const owned = tenant ? { tenant_user_id: user.id } : admin ? {} : { owner_user_id: user.id };
    const task = (entity, query, route) => scan(entity, { ...owned, ...query }, rows => rows.forEach(r => add(route, `${entity}:${r.id}`,r.updated_date||r.created_date)));
    await Promise.all([
      task('Application', { status: { $in: tenant ? ['More Information Required', 'Agreement Issued', 'Payment Requested', 'Payment Rejected'] : ['Submitted', 'Pending', 'Under Review', 'Information Provided', 'Site Visit Completed', 'Agreement Executed', 'Payment Proof Submitted', 'Payment Verified'] } }, path('applications')),
      task('Application', { $or: [{ site_visit_status: { $in: ['Requested', 'Proposed', 'Rescheduled'] }, site_visit_proposed_by: tenant ? 'landlord' : 'tenant' }, ...(!tenant ? [{ site_visit_status: 'Confirmed', site_visit_date: { $lte: nairobiToday() } }] : [])] }, tenant ? path('applications') : '/site-visits'),
      ...(!tenant ? [task('Maintenance', { status: { $nin: ['Completed', 'Closed', 'Rejected'] } }, '/maintenance'), task('VacationRequest', { status: { $in: ['Submitted', 'Acknowledged', 'Final Inspection Scheduled'] } }, '/vacation-requests')] : [task('Notice', { acknowledged: { $ne: true }, status: { $ne: 'Draft' } }, path('notices')), task('RentCharge', { status: { $nin: ['Paid', 'Void'] }, outstanding: { $gt: 0 } }, path('rent'))]),
      ...(assignedWork.is_contractor?[scan('Maintenance',{$and:[assignedWork.query,{status:{$nin:['Completed','Closed','Rejected']}}]},rows=>rows.forEach(r=>add('/assigned-maintenance',`Maintenance:${r.id}`,r.updated_date||r.created_date)),b.asServiceRole)]:[]),
      ...(feedback.can_manage ? [scan('Feedback',{$and:[feedback.query,{status:{$in:['Open','Under Review']}}]},rows=>rows.forEach(r=>add(path('feedback'),`Feedback:${r.id}`,r.updated_date||r.created_date)),b.asServiceRole)] : []),
      scan('ChatMessage', { ...owned, read: { $ne: true }, sender_user_id: { $ne: user.id } }, rows => rows.forEach(r => add(path('chat'), `ChatMessage:${r.id}`,r.updated_date||r.created_date))),
      ...(admin ? [task('ReportRequest', { status: { $in: ['Requested', 'In Progress'] } }, '/reports'), scan('User', { approval_status: 'pending', account_type: 'landowner' }, rows => rows.forEach(r => add('/admin/users', `User:${r.id}`,r.updated_date||r.created_date)))] : []),
    ]);
    if (!tenant) {
      const access = await documentAccess(b.asServiceRole, user);
      await scan('Document', { $and: [access.query, { status: 'pending' }] }, rows => rows.filter(access.canRead).forEach(r => add('/documents', `Document:${r.id}`,r.updated_date||r.created_date)), b.asServiceRole, ['id','updated_date','created_date', 'owner_user_id', 'tenant_id', 'tenancy_id', 'application_id', 'property_id', 'unit_id', 'uploaded_by_role']);
    }
    if(allowed.has(visited_path))tracker.visit(visited_path);
    await tracker.save(b);
    const counts = Object.fromEntries([...buckets].map(([route, set]) => [route, set.size]));
    counts['/notifications'] = unread;
    return Response.json({ counts, unread });
  } catch(error) { return Response.json({ error: error.message }, { status: 500 }); }
}