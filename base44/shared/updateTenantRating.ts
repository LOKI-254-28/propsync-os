import {reviewError} from './reviewEligibility.ts';
export async function updateTenantRating(b,user,body) {
  if(body.entity!=='TenantReview'||typeof body.review_id!=='string'||!body.review_id.trim()||body.review_id.length>100)throw reviewError('Choose a valid tenant rating.');
  const sr=b.asServiceRole,review=await sr.entities.TenantReview.get(body.review_id);
  if(user.role!=='admin'&&review.owner_user_id!==user.id)throw reviewError('Only the landlord owner or an admin can manage this rating.',403);
  if(review.removed)throw reviewError('Only an active tenant rating can be edited.');
  if(!Number.isInteger(body.rating)||body.rating<1||body.rating>5||typeof body.comment!=='string'||body.comment.length>2000||!['Public','Hidden'].includes(body.visibility))throw reviewError('Choose 1–5 stars and a comment of up to 2,000 characters.');
  const updated=await sr.entities.TenantReview.update(review.id,{rating:body.rating,comment:body.comment.trim(),visibility:body.visibility});
  return {ok:true,id:updated.id,review:updated};
}