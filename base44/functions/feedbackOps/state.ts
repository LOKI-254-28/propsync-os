import {registryError} from '../../shared/documentRegistry.ts';
export async function feedbackLock(sr,entity,id,field,timeField) {
  const token=crypto.randomUUID(),stale=new Date(Date.now()-6*60000).toISOString();
  await sr.entities[entity].updateMany({id,$or:[{[field]:{$exists:false}},{[field]:{$in:['',null]}},{[timeField]:{$lt:stale}}]},{$set:{[field]:token,[timeField]:new Date().toISOString()}});
  const record=await sr.entities[entity].get(id);
  if(record[field]!==token)throw registryError('Another update is in progress. Please retry shortly.',409);
  return {record,release:async()=>await sr.entities[entity].updateMany({id,[field]:token},{$set:{[field]:''}})};
}
export async function flushFeedbackEvent(sr,feedback) {
  const event=feedback.pending_event;
  if(!event?.operation_id)return false;
  const exists=(await sr.entities.FeedbackEvent.filter({feedback_id:feedback.id,operation_id:event.operation_id},'-created_date',1)).length;
  if(!exists)await sr.entities.FeedbackEvent.create({...event,feedback_id:feedback.id,tenant_user_id:feedback.tenant_user_id || '',owner_user_id:feedback.owner_user_id || ''});
  await sr.entities.Feedback.update(feedback.id,{pending_event:{}});
  return !exists;
}
export function feedbackEvent(user,body,status,role,previous) {
  return {operation_id:body.operation_id,actor_user_id:user.id,actor_name:user.full_name || (role==='tenant'?'Tenant':'Staff'),actor_role:role,action:body.action,message:(body.action==='create'?body.description || '':body.message || '').trim(),status,previous_status:previous?.status || '',resolution:body.action==='manage'?body.resolution ?? previous?.resolution ?? '':previous?.resolution || '',previous_response:previous?.staff_response || '',previous_resolution:previous?.resolution || '',occurred_at:new Date().toISOString()};
}