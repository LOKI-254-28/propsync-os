import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { tenancyEligibility } from '../../shared/reviewEligibility.ts';
import { submitReview } from '../../shared/reviewActions.ts';

const ELIGIBLE = ['Active', 'Expiring Soon', 'Notice Given', 'Terminated'];

// Only current tenants (or tenants whose tenancy was Terminated) of a property may rate it. One review per tenant per property.
export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const {property_id,rating,comment,check}=await req.json();
    if (typeof property_id!=='string' || property_id.length>100) return Response.json({error:'Choose a property.'},{status:400});
    const sr=base44.asServiceRole;
    const tenancies=await base44.entities.Tenancy.filter({tenant_user_id:user.id,property_id,status:{$in:['Active','Expiring Soon','Notice Given']}},'-start_date',20);
    let tenancy=null,eligibility={eligible:false,reason:'A current approved tenancy is required.'};
    for (const candidate of tenancies) {
      const candidateEligibility=await tenancyEligibility(sr,user,candidate);
      eligibility=candidateEligibility;
      if(candidateEligibility.eligible){tenancy=candidate;break;}
    }
    const existing=tenancy?(await sr.entities.PropertyReview.filter({tenancy_id:tenancy.id,tenant_user_id:user.id},'-created_date',1))[0]||null:null;
    if (check) return Response.json({...eligibility,existing});
    if (!tenancy) return Response.json({error:eligibility.reason},{status:403});
    return Response.json(await submitReview(base44,user,{entity:'PropertyReview',target_id:tenancy.id,rating,comment}));
  } catch (error) {
    return Response.json({ error: error.message }, { status: error.status || 500 });
  }
}