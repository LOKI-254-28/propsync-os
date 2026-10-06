import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { waitUntil } from 'base44:runtime';
import { vacationAccess } from '../../shared/vacationAccess.ts';
import { createVacation,updateVacation } from '../../shared/vacationActions.ts';

export default async function(req: Request): Promise<Response> {
  try {
    const b = createClientFromRequest(req), user = await b.auth.me();
    if (!user) return Response.json({ error: 'Please sign in.' }, { status: 401 });
    const body=await req.json(),sr=b.asServiceRole;
    body.action=body.action || 'submit';
    if(!['submit','reply','acknowledge','status','complete','events'].includes(body.action))return Response.json({error:'Choose a valid notice action.'},{status:400});
    for(const key of ['reason','message','landlord_response','deposit_treatment','final_meter_reading','handover_notes'])if(body[key]!==undefined&&(typeof body[key]!=='string'||body[key].length>3000))return Response.json({error:'Notice text must be at most 3,000 characters.'},{status:400});
    let notice;
    if(body.action!=='submit') {
      if(typeof body.notice_id!=='string'||body.notice_id.length>100)return Response.json({error:'Choose a notice.'},{status:400});
      notice=await sr.entities.VacationRequest.get(body.notice_id);
    }
    const access=await vacationAccess(b,user,notice?.tenancy_id || body.tenancy_id);
    if(notice&&((notice.property_id&&notice.property_id!==access.property.id)||(notice.unit_id&&notice.unit_id!==access.tenancy.unit_id)))return Response.json({error:'This notice has inconsistent tenancy links.'},{status:409});
    if(body.action==='events') {
      if(body.cursor!==undefined&&body.cursor!==null&&(typeof body.cursor!=='string'||body.cursor.length>2000))return Response.json({error:'Invalid history cursor.'},{status:400});
      const page=await sr.entities.VacationNoticeEvent.filter({vacation_request_id:notice.id},{sort:'-created_date',limit:50,cursor:body.cursor || undefined});
      return Response.json(page);
    }
    body.operation_id=body.operation_id || crypto.randomUUID();
    if(typeof body.operation_id!=='string'||!/^[a-f0-9-]{36}$/i.test(body.operation_id))return Response.json({error:'Invalid operation reference.'},{status:400});
    const result=body.action==='submit'?await createVacation(sr,user,body,access):await updateVacation(sr,user,body,notice,access);
    if(result.changed) {
      const recipient=access.manager?result.notice.tenant_user_id:access.property.owner_user_id;
      waitUntil(Promise.all([sr.entities.AuditLog.create({user_id:user.id,user_email:user.email,user_role:user.role,action:`Vacation Notice ${body.action}`,entity:'VacationRequest',entity_id:result.notice.id,timestamp:new Date().toISOString()}),...(recipient&&recipient!==user.id?[sr.entities.Notification.create({recipient_user_id:recipient,type:'Vacation',title:`${result.notice.type}: ${result.notice.status}`,message:body.message || body.landlord_response || 'Your tenancy notice has been updated.',related_entity:'VacationRequest',related_id:result.notice.id,action_link:access.manager?'/portal/vacation':'/vacation-requests',date:new Date().toISOString(),read:false})]:[])]));
    }
    return Response.json(result);
  } catch(error) { return Response.json({ error: error.message }, { status: error.status || 500 }); }
}