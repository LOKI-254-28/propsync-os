import { syncRecordFiles } from './documentRegistry.ts';
export async function flushVacationEvent(sr,user,notice) {
  const event=notice.pending_event;
  if(!event?.operation_id)return;
  await syncRecordFiles(sr,user,'VacationRequest',notice);
  if(!(await sr.entities.VacationNoticeEvent.filter({vacation_request_id:notice.id,operation_id:event.operation_id},'-created_date',1)).length)await sr.entities.VacationNoticeEvent.create({...event,vacation_request_id:notice.id,tenancy_id:notice.tenancy_id,tenant_user_id:notice.tenant_user_id || '',owner_user_id:notice.owner_user_id || ''});
  await sr.entities.VacationRequest.update(notice.id,{pending_event:{}});
}
export function vacationEvent(user,body,status,previous) {
  return {operation_id:body.operation_id,action:body.action || 'submit',status,previous_status:previous?.status || '',previous_response:previous?.landlord_response || '',actor_user_id:user.id,actor_name:user.full_name || (user.role==='admin'?'Admin':'Tenancy participant'),actor_role:user.role==='admin'?'admin':previous?.tenant_user_id===user.id?'tenant':'landlord',message:(body.message || body.landlord_response || body.reason || '').trim(),attachments:body.attachments || [],occurred_at:new Date().toISOString()};
}