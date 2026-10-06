import { requirePayment, ownedUploads } from './applicationAccess.ts';
import { registryError, syncRecordFiles } from './documentRegistry.ts';
import { nairobiToday } from './nairobiDates.ts';
export async function inspectionAction(sr,user,context,body) {
  const {app,unit,property,staff} = context;
  requirePayment(app);
  const current = app.inspection_id ? await sr.entities.Inspection.get(app.inspection_id) : null;
  if (body.action === 'inspection_get') return {inspection:current};
  if (app.status === 'Completed' || app.completion_token) throw registryError('This application has already completed or is being completed.',409);
  if (body.action === 'inspection_submit') {
    if (!staff) throw registryError('Only the landlord can issue an inspection.',403);
    if (current?.tenant_approval_status === 'Approved') throw registryError('The tenant has approved this record.',409);
    if (typeof body.request_id !== 'string' || body.request_id.length > 100 || !body.request_id) throw registryError('A submission reference is required.');
    const previous = (await sr.entities.Inspection.filter({application_id:app.id,submission_token:body.request_id},'-created_date',1))[0];
    if (previous) {
      if (app.inspection_id && app.inspection_id !== previous.id && current && current.created_date > previous.created_date) throw registryError('A newer inspection has already been issued.',409);
      await syncRecordFiles(sr,user,'Inspection',previous);
      await sr.entities.Application.update(app.id,{inspection_id:previous.id,inspection_approval_status:previous.tenant_approval_status});
      return {inspection:previous};
    }
    if (!Array.isArray(body.checklist) || !body.checklist.length || body.checklist.length > 16 || body.checklist.some(row=> typeof row.area !== 'string' || !row.area.trim() || row.area.length > 100 || !['Excellent','Good','Fair','Poor'].includes(row.condition) || typeof (row.notes || '') !== 'string' || (row.notes || '').length > 1000)) throw registryError('Complete the unit condition checklist.');
    if (!body.report_uri || !Array.isArray(body.images) || !body.images.length || body.images.length > 6) throw registryError('Upload an inspection report and one to six condition photographs.');
    await ownedUploads(sr,user,[body.report_uri],{appId:app.id});
    await ownedUploads(sr,user,body.images,{imageOnly:true,appId:app.id});
    const inspection = await sr.entities.Inspection.create({
      inspection_reference:`INS-${crypto.randomUUID().slice(0,8).toUpperCase()}`,type:'Move-in',application_id:app.id,
      property_id:property.id,property_name:property.name,unit_id:unit.id,unit_number:unit.unit_number,
      tenant_id:app.tenant_id || '',tenant_user_id:app.tenant_user_id,tenant_name:app.applicant_name,owner_user_id:property.owner_user_id,
      status:'Completed',scheduled_date:nairobiToday(),completed_date:nairobiToday(),conducted_by:user.full_name || user.email,
      report_uri:body.report_uri,images:body.images,checklist:body.checklist,revision:(current?.revision || 0)+1,
      tenant_approval_status:'Pending',tenant_comment:'',supporting_documents:[],submission_token:body.request_id,
    });
    await syncRecordFiles(sr,user,'Inspection',inspection);
    await sr.entities.Application.update(app.id,{inspection_id:inspection.id,inspection_approval_status:'Pending',landlord_approved:false});
    await sr.entities.Notification.create({recipient_user_id:app.tenant_user_id,type:'Inspection',title:'Review your move-in inspection',message:`The inspection for ${unit.unit_number} is ready for your approval.`,related_entity:'Application',related_id:app.id,action_link:'/portal/applications',date:new Date().toISOString(),read:false});
    return {inspection};
  }
  if (body.action !== 'inspection_respond') throw registryError('Unknown inspection action.');
  if (staff || app.tenant_user_id !== user.id) throw registryError('Only the associated tenant can approve or reject this record.',403);
  if (!current || current.id !== body.inspection_id || current.tenant_approval_status !== 'Pending') throw registryError('Reload the current pending inspection before responding.',409);
  if (!['Approved','Rejected'].includes(body.decision) || typeof (body.comment || '') !== 'string' || (body.comment || '').length > 2000 || (body.decision === 'Rejected' && !body.comment?.trim())) throw registryError('Choose a decision and add a comment when rejecting.');
  const supporting = body.supporting_documents || [];
  if (supporting.length > 6) throw registryError('Attach up to six supporting files.');
  await ownedUploads(sr,user,supporting,{appId:app.id});
  const token = crypto.randomUUID();
  await sr.entities.Inspection.updateMany({id:current.id,tenant_approval_status:'Pending'},{$set:{tenant_approval_status:body.decision,tenant_comment:body.comment || '',supporting_documents:supporting,responded_by:user.id,responded_at:new Date().toISOString(),response_token:token}});
  const inspection = await sr.entities.Inspection.get(current.id);
  if (inspection.response_token !== token) throw registryError('This inspection has already received a response.',409);
  await syncRecordFiles(sr,user,'Inspection',inspection);
  await sr.entities.Application.update(app.id,{inspection_approval_status:body.decision});
  if (property.owner_user_id) await sr.entities.Notification.create({recipient_user_id:property.owner_user_id,type:'Inspection',title:`Move-in inspection ${body.decision.toLowerCase()}`,message:body.comment || `${app.applicant_name} approved the inspection.`,related_entity:'Application',related_id:app.id,action_link:'/applications',date:new Date().toISOString(),read:false});
  return {inspection};
}