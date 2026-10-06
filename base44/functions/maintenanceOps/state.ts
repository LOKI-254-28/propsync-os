import {registryError} from '../../shared/documentRegistry.ts';
export async function maintenanceLock(sr,id) {
  const token=crypto.randomUUID(),stale=new Date(Date.now()-360000).toISOString();
  await sr.entities.Maintenance.updateMany({id,$or:[{operation_token:{$exists:false}},{operation_token:{$in:['',null]}},{operation_started_at:{$lt:stale}}]},{$set:{operation_token:token,operation_started_at:new Date().toISOString()}});
  const record=await sr.entities.Maintenance.get(id);
  if(record.operation_token!==token)throw registryError('Another maintenance update is in progress. Please retry shortly.',409);
  return {record,release:()=>sr.entities.Maintenance.updateMany({id,operation_token:token},{$set:{operation_token:''}})};
}
export async function flushMaintenanceEvent(sr,ticket) {
  const event=ticket.pending_event;if(!event?.operation_id)return;
  if(!(await sr.entities.MaintenanceEvent.filter({maintenance_id:ticket.id,operation_id:event.operation_id},'-created_date',1)).length)await sr.entities.MaintenanceEvent.create({...event,maintenance_id:ticket.id,tenant_user_id:ticket.tenant_user_id || '',owner_user_id:ticket.owner_user_id || ''});
  await sr.entities.Maintenance.update(ticket.id,{pending_event:{}});
}
export function maintenanceEvent(user,access,body,ticket,patch={}) {
  return {operation_id:body.operation_id,kind:body.action==='message'?'Message':'Update',actor_user_id:user.id,actor_name:user.full_name || (access.manager?'Landlord / staff':access.worker?'Contractor':'Tenant'),actor_role:user.role==='admin'?'admin':access.manager?'landlord':access.worker?'contractor':'tenant',message:body.action==='message'?body.message.trim():body.public_message?.trim() || (patch.contractor_id!==ticket.contractor_id?`Contractor assigned: ${patch.contractor_name}`:`Status updated: ${patch.status}`),status:patch.status || ticket.status,previous_status:ticket.status,contractor_name:patch.contractor_name ?? ticket.contractor_name ?? '',previous_contractor_name:ticket.contractor_name || '',resolution_notes:patch.resolution_notes ?? ticket.resolution_notes ?? '',previous_resolution:ticket.resolution_notes || '',occurred_at:new Date().toISOString()};
}