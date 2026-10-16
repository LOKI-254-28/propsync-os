import {createClientFromRequest} from 'npm:@base44/sdk@0.8.52';
import {landlordDashboard} from '../../shared/landlordDashboard.ts';
import {tenantDashboard} from '../../shared/tenantDashboard.ts';
import {tenantTenancyTotals} from '../../shared/tenantTenancyTotals.ts';
export default async function(req: Request): Promise<Response> {
  try {
    const b=createClientFromRequest(req),user=await b.auth.me();
    if(!user)return Response.json({error:'Please sign in.'},{status:401});
    const body=await req.json();
    if(body.action==='tenancy_totals')return Response.json(await tenantTenancyTotals(b.asServiceRole,user,body));
    if(body.cursor!=null&&(typeof body.cursor!=='string'||body.cursor.length>4000))return Response.json({error:'Invalid page.'},{status:400});
    const landlord=user.role==='admin'||(user.account_type||user.data?.account_type)==='landowner';
    return Response.json(landlord?await landlordDashboard(b.asServiceRole,user.role==='admin'?{}:{owner_user_id:user.id}):await tenantDashboard(b.asServiceRole,user,body));
  }catch(error){return Response.json({error:error.message},{status:error.status||500});}
}