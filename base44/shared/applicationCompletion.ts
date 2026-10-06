import { requirePayment } from './applicationAccess.ts';
import { registryError, syncRecordFiles } from './documentRegistry.ts';
import { nairobiToday } from './nairobiDates.ts';
export async function completeApplication(sr,user,context,body) {
  const {app,unit,property,staff} = context;
  if (!staff) throw registryError('Only the landlord can start a tenancy.',403);
  const existing = (await sr.entities.Tenancy.filter({application_id:app.id},'-created_date',2))[0];
  if (app.status === 'Completed') return {tenancy:existing || (app.tenancy_id ? await sr.entities.Tenancy.get(app.tenancy_id) : null),already_completed:true};
  requirePayment(app);
  const inspection = app.inspection_id ? await sr.entities.Inspection.get(app.inspection_id) : null;
  if (!inspection || inspection.application_id !== app.id || inspection.tenant_approval_status !== 'Approved' || inspection.responded_by !== app.tenant_user_id) throw registryError('The tenant must approve the move-in inspection first.',409);
  if (app.agreement_status !== 'Executed' || !app.agreement_executed_url) throw registryError('A signed agreement is required.',409);
  if (typeof body.request_id !== 'string' || !/^[a-zA-Z0-9_-]{1,100}$/.test(body.request_id)) throw registryError('A completion reference is required.');
  const token = crypto.randomUUID(), now = new Date().toISOString(), stale = new Date(Date.now()-6*60000).toISOString();
  await sr.entities.Application.updateMany({id:app.id,status:{$in:['Payment Verified','Approved']},$or:[{completion_token:{$in:['',null]}},{completion_token:{$exists:false}},{completion_started_at:{$lt:stale}}]},{$set:{completion_token:token,completion_started_at:now}});
  if ((await sr.entities.Application.get(app.id)).completion_token !== token) throw registryError('Completion is already in progress. Please retry shortly.',409);
  let tenancy = existing;
  try {
    await sr.entities.Unit.updateMany({id:unit.id,$or:[{activation_token:{$in:['',null]}},{activation_token:{$exists:false}},{activation_started_at:{$lt:stale}}]},{$set:{activation_token:token,activation_started_at:now}});
    const locked = await sr.entities.Unit.get(unit.id);
    if (locked.activation_token !== token) throw registryError('Another tenancy is being created for this unit.',409);
    const active = await sr.entities.Tenancy.filter({unit_id:unit.id,status:{$in:['Active','Expiring Soon','Notice Given']}});
    if (active.some(t=>t.application_id !== app.id)) throw registryError('This unit still has an active tenancy. Complete its handover first.',409);
    tenancy = tenancy || active.find(t=>t.application_id === app.id) || (await sr.entities.Tenancy.filter({application_id:app.id},'-created_date',1))[0];
    let tenant = app.tenant_id ? await sr.entities.Tenant.get(app.tenant_id) : (await sr.entities.Tenant.filter({user_id:app.tenant_user_id},'-created_date',1))[0];
    if (tenant && tenant.user_id && tenant.user_id !== app.tenant_user_id) throw registryError('The applicant and tenant do not match.',409);
    if (!tenant) tenant = await sr.entities.Tenant.create({user_id:app.tenant_user_id,full_name:app.applicant_name,email:app.applicant_email,phone:app.applicant_phone,id_number:app.id_number,occupation:app.occupation,monthly_income:app.monthly_income,status:'Active',profile_type:'tenant'});
    if (!tenancy) tenancy = await sr.entities.Tenancy.create({
      tenancy_reference:`TEN-${crypto.randomUUID().slice(0,8).toUpperCase()}`,application_id:app.id,inspection_id:inspection.id,
      tenant_id:tenant.id,tenant_name:tenant.full_name,tenant_user_id:app.tenant_user_id,property_id:property.id,property_name:property.name,unit_id:unit.id,unit_number:unit.unit_number,
      start_date:app.proposed_start_date || nairobiToday(),expected_end_date:'',monthly_rent:app.monthly_rent || unit.monthly_rent,security_deposit:unit.security_deposit,service_charge:unit.service_charge,
      payment_due_day:1,grace_period_days:7,notice_period_days:30,status:'Active',owner_user_id:property.owner_user_id,agreement_document_url:app.agreement_executed_url,
    });
    const linkedApp = await sr.entities.Application.update(app.id,{tenancy_id:tenancy.id,tenant_id:tenant.id});
    await sr.entities.Inspection.update(inspection.id,{tenancy_id:tenancy.id,tenant_id:tenant.id});
    await syncRecordFiles(sr,user,'Inspection',{...inspection,tenancy_id:tenancy.id,tenant_id:tenant.id});
    await syncRecordFiles(sr,user,'Tenancy',tenancy);
    await syncRecordFiles(sr,user,'Application',linkedApp);
    await sr.entities.Unit.update(unit.id,{status:'Occupied',current_tenancy_id:tenancy.id,current_tenant_name:tenant.full_name});
    if (app.listing_id) {
      const listing = await sr.entities.Listing.get(app.listing_id);
      if (listing.property_id === property.id && (!listing.unit_id || listing.unit_id === unit.id)) await sr.entities.Listing.update(listing.id,{status:'Rented',date_closed:nairobiToday()});
    }
    await sr.entities.Application.update(app.id,{status:'Completed',tenancy_id:tenancy.id,tenant_id:tenant.id,landlord_approved:true,landlord_response:typeof body.response === 'string' ? body.response.slice(0,2000) : 'Application approved and completed.'});
    await sr.entities.Unit.updateMany({id:unit.id,activation_token:token},{$set:{activation_token:''}});
    return {tenancy};
  } catch(error) {
    await sr.entities.Application.updateMany({id:app.id,completion_token:token,status:{$ne:'Completed'}},{$set:{completion_token:''}});
    await sr.entities.Unit.updateMany({id:unit.id,activation_token:token},{$set:{activation_token:''}});
    throw error;
  }
}