import { nairobiToday,addDays } from './nairobiDates.ts';
import { registryError } from './documentRegistry.ts';
import { allRelated } from './documentAccess.ts';
import { liveTenancy,transitions,validDate,validateAttachments,lockNotice } from './vacationAccess.ts';
import { vacationEvent,flushVacationEvent } from './vacationEvents.ts';
import { completeVacation } from './vacationCompletion.ts';
async function createVacationRecord(sr,user,body,access) {
  const {tenancy,property,manager}=access,today=nairobiToday();
  if(!liveTenancy.includes(tenancy.status)||!['Vacation Notice','Termination Notice','Early Termination Request'].includes(body.type)||!validDate(body.proposed_vacation_date)||body.proposed_vacation_date<today)throw registryError('Choose an active tenancy, a valid notice type and an exit date that is today or later.');
  if(!manager&&tenancy.tenant_user_id!==user.id)throw registryError('Only the associated tenant can submit a notice.',403);
  const previous=(await sr.entities.VacationRequest.filter({tenancy_id:tenancy.id,status:{$nin:['Rejected','Completed']}},'-created_date',1))[0];
  if(previous){if(previous.type!==body.type||previous.proposed_vacation_date!==body.proposed_vacation_date||previous.issued_by_user_id&&previous.issued_by_user_id!==user.id)throw registryError('An open notice already exists for this tenancy. Respond to it rather than create another.',409);await flushVacationEvent(sr,user,previous);return {notice:await sr.entities.VacationRequest.get(previous.id),changed:false};}
  const attachments=await validateAttachments(sr,user,body.attachments,tenancy);
  const days=Number(tenancy.notice_period_days ?? 30);
  if(!Number.isInteger(days)||days<0||days>365)throw registryError('The tenancy notice period must be a valid number of days.');
  const charges=await allRelated(sr.entities.RentCharge,{tenancy_id:tenancy.id,status:{$ne:'Void'}});
  const notice=await sr.entities.VacationRequest.create({request_reference:`VAC-${crypto.randomUUID().slice(0,8).toUpperCase()}`,type:body.type,tenant_id:tenancy.tenant_id,tenant_user_id:tenancy.tenant_user_id || '',tenant_name:tenancy.tenant_name,tenancy_id:tenancy.id,tenancy_reference:tenancy.tenancy_reference,property_id:property.id,property_name:property.name,unit_id:tenancy.unit_id,unit_number:tenancy.unit_number,date_submitted:today,proposed_vacation_date:body.proposed_vacation_date,notice_period_days:days,calculated_notice_expiry:addDays(today,days),reason:(body.reason || '').trim(),attachments,status:'Submitted',owner_user_id:property.owner_user_id || tenancy.owner_user_id || '',initiated_by:manager?'landlord':'tenant',issued_by_user_id:user.id,creation_token:body.operation_id,outstanding_rent:charges.reduce((s,c)=>s+Math.max(0,Number(c.outstanding || 0)),0),pending_event:vacationEvent(user,body,'Submitted',{tenant_user_id:tenancy.tenant_user_id})});
  await flushVacationEvent(sr,user,notice);return {notice:await sr.entities.VacationRequest.get(notice.id),changed:true};
}
export async function createVacation(sr,user,body,access) {
  const token=crypto.randomUUID(),id=access.tenancy.id,stale=new Date(Date.now()-6*60000).toISOString();
  await sr.entities.Tenancy.updateMany({id,$or:[{notice_creation_token:{$exists:false}},{notice_creation_token:{$in:['',null]}},{notice_creation_started_at:{$lt:stale}}]},{$set:{notice_creation_token:token,notice_creation_started_at:new Date().toISOString()}});
  const tenancy=await sr.entities.Tenancy.get(id);
  if(tenancy.notice_creation_token!==token)throw registryError('Another notice is being submitted for this tenancy. Please retry shortly.',409);
  try {return await createVacationRecord(sr,user,body,{...access,tenancy});}
  finally {await sr.entities.Tenancy.updateMany({id,notice_creation_token:token},{$set:{notice_creation_token:''}});}
}
export async function updateVacation(sr,user,body,notice,access) {
  const lock=await lockNotice(sr,notice);notice=lock.notice;
  try {
    const pending=notice.pending_event?.operation_id;
    await flushVacationEvent(sr,user,notice);
    if(pending===body.operation_id||(await sr.entities.VacationNoticeEvent.filter({vacation_request_id:notice.id,operation_id:body.operation_id},'-created_date',1)).length)return {notice:await sr.entities.VacationRequest.get(notice.id),changed:false};
    if(notice.completion_state==='In Progress'&&body.action!=='complete')throw registryError('Finish the recorded handover before making another change.',409);
    const files=await validateAttachments(sr,user,body.attachments,access.tenancy,notice.attachments || []);
    const attachments=[...new Set([...(notice.attachments || []),...files])];if(attachments.length>60)throw registryError('This notice already contains the maximum of 60 attachments.');
    let patch={attachments};
    if(body.action==='reply'||body.action==='acknowledge') {
      if(body.action==='acknowledge'&&(access.manager||notice.initiated_by!=='landlord'))throw registryError('Only the associated tenant can acknowledge a landlord-issued notice.',403);
      if(body.action==='reply'&&!body.message?.trim()&&!files.length)throw registryError('Write a response or attach a file.');
      patch=access.manager?{...patch,landlord_response:(body.message || '').trim()}:{...patch,tenant_response:(body.message || '').trim(),...(body.action==='acknowledge'?{tenant_acknowledged:true}:{})};
    } else {
      if(!access.manager)throw registryError('Only the property landlord or an admin can manage the notice status or handover.',403);
      if(body.action==='complete')patch={...patch,deposit_treatment:body.deposit_treatment || notice.deposit_treatment || '',final_meter_reading:body.final_meter_reading || notice.final_meter_reading || '',handover_notes:body.handover_notes || notice.handover_notes || '',landlord_response:body.landlord_response || notice.landlord_response || '',...await completeVacation(sr,user,notice,access.tenancy,body)};
      else if(body.action==='status') {
        if(!transitions[notice.status]||body.status!==notice.status&&!transitions[notice.status].includes(body.status)||['Completed','Rejected'].includes(notice.status))throw registryError('That status transition is not allowed.',409);
        if(body.status==='Final Inspection Scheduled'){const i=body.final_inspection_id?await sr.entities.Inspection.get(body.final_inspection_id):null;if(!i||i.tenancy_id!==notice.tenancy_id||!['Final','Move-out'].includes(i.type)||!['Scheduled','Completed','Rescheduled'].includes(i.status))throw registryError('Choose a final or move-out inspection scheduled for this tenancy.');}
        const charges=await allRelated(sr.entities.RentCharge,{tenancy_id:notice.tenancy_id,status:{$ne:'Void'}});
        patch={...patch,status:body.status,landlord_response:(body.landlord_response || '').trim(),deposit_treatment:body.deposit_treatment || '',final_meter_reading:body.final_meter_reading || '',handover_notes:body.handover_notes || '',final_inspection_id:body.final_inspection_id || notice.final_inspection_id || '',outstanding_rent:charges.reduce((s,c)=>s+Math.max(0,Number(c.outstanding || 0)),0)};
      } else throw registryError('Choose a valid notice action.');
    }
    notice=await sr.entities.VacationRequest.update(notice.id,{...patch,pending_event:vacationEvent(user,body,patch.status || notice.status,notice)});
    await flushVacationEvent(sr,user,notice);return {notice:await sr.entities.VacationRequest.get(notice.id),changed:true};
  } finally {await sr.entities.VacationRequest.updateMany({id:notice.id,operation_token:lock.token},{$set:{operation_token:''}});}
}