import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { waitUntil } from 'base44:runtime';
import { submitReview,manageReview,reviewTypes } from '../../shared/reviewActions.ts';
import { tenancyEligibility } from '../../shared/reviewEligibility.ts';
import { updateTenantRating } from '../../shared/updateTenantRating.ts';

export default async function(req: Request): Promise<Response> {
  try {
    const b = createClientFromRequest(req);
    const user = await b.auth.me();
    if (!user) return Response.json({ error: 'Please sign in.' }, { status: 401 });
    const body=await req.json();
    if (!reviewTypes.includes(body.entity)) return Response.json({error:'Choose a valid review type.'},{status:400});
    if (body.action==='eligibility') {
      if (!['PropertyReview','TenancyReview'].includes(body.entity) || typeof body.target_id!=='string' || body.target_id.length>100) return Response.json({error:'Choose a tenancy for eligibility.'},{status:400});
      const tenancy=await b.entities.Tenancy.get(body.target_id);
      return Response.json(await tenancyEligibility(b.asServiceRole,user,tenancy));
    }
    if(!['submit','update','visibility','remove'].includes(body.action))return Response.json({error:'Choose submit, update, visibility or remove for this rating.'},{status:400});
    const result=body.action==='submit'?await submitReview(b,user,body):body.action==='update'?await updateTenantRating(b,user,body):await manageReview(b,user,body);
    waitUntil(b.asServiceRole.entities.AuditLog.create({user_id:user.id,user_email:user.email,user_role:user.role,action:`Review ${body.action}`,entity:body.entity,entity_id:result.id || body.review_id,timestamp:new Date().toISOString()}));
    return Response.json(result);
  } catch (error) {
    return Response.json({ error: error.message }, { status: error.status || 500 });
  }
}