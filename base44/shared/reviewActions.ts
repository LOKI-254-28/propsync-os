import { reviewError,tenancyEligibility } from './reviewEligibility.ts';
import { nairobiToday } from './nairobiDates.ts';
export const reviewTypes=['TenantReview','TenancyReview','PropertyReview'];
export async function submitReview(b,user,body) {
  const {entity,target_id,rating,comment='',visibility='Public'}=body;
  if (!reviewTypes.includes(entity) || typeof target_id!=='string' || target_id.length>100 || !Number.isInteger(rating) || rating<1 || rating>5 || typeof comment!=='string' || comment.length>2000 || !['Public','Hidden'].includes(visibility)) throw reviewError('Choose 1–5 stars and a comment of up to 2,000 characters.');
  const sr=b.asServiceRole,ten=await b.entities.Tenancy.get(target_id),property=await sr.entities.Property.get(ten.property_id);
  let data,unique;
  if (entity==='TenantReview') {
    if (property.owner_user_id!==user.id || (user.role!=='admin' && ((user.account_type || user.data?.account_type)!=='landowner' || (user.approval_status || user.data?.approval_status)!=='approved'))) throw reviewError('Only the landlord who owns this tenancy can rate its tenant.',403);
    if (!['Active','Expiring Soon','Notice Given','Terminated','Vacated','Archived'].includes(ten.status) || !ten.start_date || ten.start_date>nairobiToday()) throw reviewError('A current or former tenancy that has already started is required.',403);
    unique={tenancy_id:ten.id,owner_user_id:user.id};
    data={...unique,tenant_id:ten.tenant_id,tenant_user_id:ten.tenant_user_id || '',tenant_name:ten.tenant_name,property_id:property.id,property_name:property.name,landlord_name:user.full_name || 'Landlord',visibility};
  } else {
    const eligibility=await tenancyEligibility(sr,user,ten);
    if (!eligibility.eligible) throw reviewError(eligibility.reason,403);
    unique={tenancy_id:ten.id,tenant_user_id:user.id};
    data={...unique,tenant_name:ten.tenant_name || user.full_name || 'Tenant',property_id:property.id,property_name:property.name,owner_user_id:property.owner_user_id};
  }
  if ((await sr.entities[entity].filter(unique,'-created_date',1)).length) throw reviewError('This rating has already been submitted. Its history is preserved and it cannot be overwritten.',409);
  const field={TenantReview:'tenant_rating_token',TenancyReview:'tenancy_review_token',PropertyReview:'property_review_token'}[entity];
  const token=crypto.randomUUID(),stale=new Date(Date.now()-6*60000).toISOString();
  await sr.entities.Tenancy.updateMany({id:ten.id,$or:[{[field]:{$exists:false}},{[field]:{$in:['',null]}},{review_lock_started_at:{$lt:stale}}]},{$set:{[field]:token,review_lock_started_at:new Date().toISOString()}});
  if ((await sr.entities.Tenancy.get(ten.id))[field]!==token) throw reviewError('A review submission is already in progress. Please retry shortly.',409);
  try {
    if ((await sr.entities[entity].filter(unique,'-created_date',1)).length) throw reviewError('This rating has already been submitted.',409);
    const review=await sr.entities[entity].create({...data,rating,comment:comment.trim(),removed:false});
    return {ok:true,id:review.id,review};
  } catch(error) {
    await sr.entities.Tenancy.updateMany({id:ten.id,[field]:token},{$set:{[field]:''}});
    throw error;
  }
}
export async function manageReview(b,user,body) {
  const {entity,review_id,action,visibility}=body;
  if (!reviewTypes.includes(entity) || typeof review_id!=='string' || review_id.length>100) throw reviewError('Choose a valid rating.');
  const sr=b.asServiceRole,review=await sr.entities[entity].get(review_id);
  const owner=entity==='TenantReview'?review.owner_user_id:(await sr.entities.Property.get(review.property_id)).owner_user_id;
  if (user.role!=='admin' && owner!==user.id) throw reviewError('Only the landlord owner or an admin can manage this rating.',403);
  if (action==='visibility') {
    if (entity!=='TenantReview' || !['Public','Hidden'].includes(visibility) || review.removed) throw reviewError('Choose visibility for an active tenant rating.');
    await sr.entities.TenantReview.update(review.id,{visibility});
  } else if (action==='remove') {
    if (!review.removed) await sr.entities[entity].update(review.id,{removed:true,removed_by:user.id,removed_date:new Date().toISOString()});
  } else throw reviewError('Choose a valid review action.');
  return {ok:true};
}