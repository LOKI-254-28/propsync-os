import { closedApplications, ownedUploads } from './applicationAccess.ts';
import { registryError, syncRecordFiles } from './documentRegistry.ts';
import {validateApplicationVisit} from './applicationVisit.ts';
import {nairobiToday,addDays} from './nairobiDates.ts';
export async function patchApplication(sr,user,context,updates) {
  const {app,staff} = context;
  if (!updates || typeof updates !== 'object' || Array.isArray(updates) || Object.keys(updates).length > 16) throw registryError('Invalid application update.');
  if (closedApplications.includes(app.status) || app.completion_token) throw registryError('This application is closed or being completed.',409);
  const common = ['status','site_visit_date','site_visit_time','site_visit_status','site_visit_proposed_by','site_visit_notes'];
  const allowed = staff ? [...common,'landlord_response','agreement_url','agreement_status','payment_amount','payment_due_date','payment_method','payment_instructions','payment_status'] : [...common,'applicant_response','documents','agreement_executed_url','agreement_status','payment_proof_url','payment_reference','payment_method','payment_status','next_of_kin_id'];
  if (Object.keys(updates).some(k=>!allowed.includes(k)) || Object.values(updates).some(v=> typeof v === 'string' && v.length > 5000)) throw registryError('That field cannot be changed here.');
  const target = updates.status;
  validateApplicationVisit(app,updates,staff);
  if('applicant_response' in updates&&(typeof updates.applicant_response!=='string'||target!=='Information Provided'))throw registryError('Submit your response with the requested information.');
  if (staff) {
    const transitions = {
      'Under Review':['Submitted','Pending','Information Provided'], 'More Information Required':['Under Review','Information Provided'],
      'Site Visit Requested':['Under Review','Information Provided','Site Visit Requested','Site Visit Scheduled'],
      'Site Visit Scheduled':['Site Visit Requested','Site Visit Scheduled'], 'Site Visit Completed':['Site Visit Scheduled'],
      'Agreement Issued':['Site Visit Scheduled','Site Visit Completed',...(app.visit_skipped ? ['Submitted','Pending','Under Review','Information Provided'] : [])],
      'Payment Requested':['Agreement Executed','Payment Proof Submitted'], 'Payment Verified':['Payment Proof Submitted'],
      'Rejected':['Submitted','Pending','Under Review','Information Provided','More Information Required','Site Visit Requested','Site Visit Scheduled','Site Visit Completed','Agreement Issued','Agreement Executed','Payment Requested','Payment Proof Submitted','Payment Verified','Approved'],
    };
    if (target && !(transitions[target] || []).includes(app.status)) throw registryError('This application is not ready for that step.',409);
    if ('payment_status' in updates && !((target === 'Payment Verified' && updates.payment_status === 'Verified') || (target === 'Payment Requested' && ['Requested','Rejected'].includes(updates.payment_status)))) throw registryError('Payment verification needs a submitted proof.',409);
    if (target === 'Payment Verified' && (!app.payment_proof_url || app.payment_status !== 'Proof Submitted')) throw registryError('A submitted payment proof is required.',409);
    if ('payment_amount' in updates && (!Number.isFinite(updates.payment_amount) || updates.payment_amount <= 0)) throw registryError('Enter a positive payment amount.');
    if (target === 'Payment Requested' && app.status === 'Agreement Executed' && !app.agreement_executed_url) throw registryError('The signed agreement is missing.',409);
    if ('agreement_status' in updates && !(target === 'Agreement Issued' && updates.agreement_status === 'Issued')) throw registryError('The signed agreement must be submitted by the tenant.',403);
    if ('agreement_url' in updates) {
      if (target !== 'Agreement Issued' || !updates.agreement_url) throw registryError('Issue the agreement using the agreement action.');
      await ownedUploads(sr,user,[updates.agreement_url],{appId:app.id});
    }
  } else {
    const transitions = {'Information Provided':['More Information Required'],'Site Visit Requested':['Site Visit Requested','Site Visit Scheduled'],'Site Visit Scheduled':['Site Visit Requested','Site Visit Scheduled'],'Payment Requested':['Agreement Issued'],'Agreement Executed':['Agreement Issued'],'Payment Proof Submitted':['Payment Requested','Payment Proof Submitted']};
    if (target && !(transitions[target] || []).includes(app.status)) throw registryError('This application is not ready for your response.',409);
    if ('payment_status' in updates && !((['Payment Requested','Agreement Executed'].includes(target) && updates.payment_status === 'Requested') || (target === 'Payment Proof Submitted' && updates.payment_status === 'Proof Submitted'))) throw registryError('Only the landlord can verify payment.',403);
    if ('agreement_status' in updates && !(updates.agreement_status === 'Executed' && ['Payment Requested','Agreement Executed'].includes(target))) throw registryError('Only a signed agreement can be submitted.',403);
    if (['Payment Requested','Agreement Executed'].includes(target) && (!updates.agreement_executed_url || updates.agreement_status !== 'Executed')) throw registryError('Upload the signed agreement.');
    if (target === 'Payment Proof Submitted' && (!updates.payment_proof_url || updates.payment_status !== 'Proof Submitted')) throw registryError('Upload payment proof.');
    const refs = ['agreement_executed_url','payment_proof_url'].filter(k=>updates[k]).map(k=>updates[k]);
    if (updates.documents) {
      if (!Array.isArray(updates.documents) || updates.documents.length > 40) throw registryError('Too many supporting documents.');
      refs.push(...updates.documents.filter(uri=>!(app.documents || []).includes(uri)));
    }
    await ownedUploads(sr,user,refs,{appId:app.id});
    if (updates.next_of_kin_id) {
      const kin = await sr.entities.NextOfKin.get(updates.next_of_kin_id);
      if (kin.application_id !== app.id || kin.tenant_user_id !== user.id || kin.owner_user_id !== app.owner_user_id) throw registryError('Choose your own next-of-kin record for this landlord.',403);
    }
  }
  if ('site_visit_proposed_by' in updates && updates.site_visit_proposed_by !== (staff ? 'landlord' : 'tenant')) throw registryError('The visit proposer is invalid.');
  if (updates.site_visit_status === 'Confirmed' && (!app.site_visit_date || app.site_visit_proposed_by === (staff ? 'landlord' : 'tenant'))) throw registryError('Only the other party can confirm the proposed visit.',409);
  if (updates.site_visit_date && !/^\d{4}-\d{2}-\d{2}$/.test(updates.site_visit_date)) throw registryError('Choose a valid visit date.');
  if (updates.site_visit_time && !/^([01]\d|2[0-3]):[0-5]\d$/.test(updates.site_visit_time)) throw registryError('Choose a valid visit time.');
  const receiptFields = target === 'Payment Verified' ? {payment_approved_amount:Number(app.payment_received_amount || updates.payment_amount || app.payment_amount),payment_approved_at:new Date().toISOString(),payment_receipt_number:app.payment_receipt_number||`RCP-APP-${app.id.toUpperCase()}`} : {};
  const deadline=!staff&&['Payment Requested','Agreement Executed'].includes(target)&&!app.payment_due_date?{payment_due_date:addDays(nairobiToday(),7)}:{};
  const updated = await sr.entities.Application.update(app.id,{...updates,...receiptFields,...deadline});
  await syncRecordFiles(sr,user,'Application',updated);
  return {application:updated};
}