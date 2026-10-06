import {nairobiToday} from '../../shared/nairobiDates.ts';
import {registryError} from '../../shared/documentRegistry.ts';
import {feedbackLock,feedbackEvent,flushFeedbackEvent} from './state.ts';
const transitions={Open:['Under Review','Responded','Resolved','Closed'],'Under Review':['Responded','Resolved','Closed'],Responded:['Under Review','Resolved','Closed'],Resolved:['Under Review','Closed'],Closed:['Under Review']};
export async function createFeedback(sr,user,body) {
  if(typeof body.tenancy_id!=='string'||body.tenancy_id.length>100||!['Suggestion','Complaint','General Feedback','Improvement Idea'].includes(body.type)||!body.description?.trim())throw registryError('Select a tenancy, feedback type and a description.');
  const tenancy=await sr.entities.Tenancy.get(body.tenancy_id);
  if(tenancy.tenant_user_id!==user.id||!['Active','Expiring Soon','Notice Given','Terminated','Vacated','Archived'].includes(tenancy.status))throw registryError('Feedback must be linked to your own current or previous established tenancy.',403);
  const [property,unit]=await Promise.all([sr.entities.Property.get(tenancy.property_id),sr.entities.Unit.get(tenancy.unit_id)]);
  if(unit.property_id!==property.id)throw registryError('The tenancy property and unit do not match.',409);
  const lock=await feedbackLock(sr,'Tenancy',tenancy.id,'feedback_creation_token','feedback_creation_started_at');
  try {
    const existing=(await sr.entities.Feedback.filter({tenant_user_id:user.id,creation_key:body.operation_id},'-created_date',1))[0];
    if(existing){await flushFeedbackEvent(sr,existing);return {feedback:await sr.entities.Feedback.get(existing.id),changed:false};}
    const record=await sr.entities.Feedback.create({type:body.type,category:(body.category || '').trim(),description:body.description.trim(),tenant_id:tenancy.tenant_id,tenant_user_id:user.id,tenant_name:tenancy.tenant_name || user.full_name || 'Tenant',tenancy_id:tenancy.id,tenancy_reference:tenancy.tenancy_reference || '',property_id:property.id,property_name:property.name,unit_id:unit.id,unit_number:unit.unit_number,owner_user_id:property.owner_user_id || '',status:'Open',date_submitted:nairobiToday(),creation_key:body.operation_id,pending_event:feedbackEvent(user,body,'Open','tenant')});
    await flushFeedbackEvent(sr,record);return {feedback:await sr.entities.Feedback.get(record.id),changed:true};
  } finally {await lock.release();}
}
export async function updateFeedback(sr,user,body,record,access) {
  const lock=await feedbackLock(sr,'Feedback',record.id,'operation_token','operation_started_at');record=lock.record;
  try {
    const pendingId=record.pending_event?.operation_id;
    await flushFeedbackEvent(sr,record);
    if(pendingId===body.operation_id||(await sr.entities.FeedbackEvent.filter({feedback_id:record.id,operation_id:body.operation_id},'-created_date',1)).length)return {feedback:await sr.entities.Feedback.get(record.id),changed:false};
    let status=record.status,patch={};
    if(body.action==='reply') {
      if(!body.message?.trim())throw registryError('Write a response before sending.');
      if(access.manager){status=['Resolved','Closed'].includes(status)?status:'Responded';patch.staff_response=body.message.trim();}
      else {status='Open';}
    } else if(body.action==='manage') {
      if(!access.manager)throw registryError('Only the relevant landlord or explicitly authorized staff can change feedback status or resolution.',403);
      if(!transitions[record.status]||body.status!==record.status&&!transitions[record.status].includes(body.status))throw registryError('This feedback status transition is not allowed.',409);
      status=body.status;
      if(status==='Responded'&&!body.message?.trim()&&!record.staff_response)throw registryError('A response is required before marking feedback responded.');
      if(status==='Resolved'&&!body.resolution?.trim()&&!record.resolution)throw registryError('Record a resolution before marking feedback resolved.');
      if(body.message?.trim())patch.staff_response=body.message.trim();
      patch.resolution=body.resolution ?? record.resolution ?? '';
      if(['Resolved','Closed'].includes(status))patch.closed_date=nairobiToday();
    } else throw registryError('Choose a valid feedback action.');
    const role=user.role==='admin'?'admin':access.manager?'landlord / authorized staff':'tenant';
    record=await sr.entities.Feedback.update(record.id,{...patch,status,pending_event:feedbackEvent(user,body,status,role,record)});
    await flushFeedbackEvent(sr,record);return {feedback:await sr.entities.Feedback.get(record.id),changed:true};
  } finally {await lock.release();}
}