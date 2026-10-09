export async function tenantKinAccess(b,user,body) {
  const fail=(message,status=400)=>{throw Object.assign(new Error(message),{status});};
  if(typeof body.tenant_id!=='string'||!body.tenant_id.trim()||body.tenant_id.length>100)fail('Choose an individual tenant profile.');
  const admin=user.role==='admin';
  if(!admin&&(user.account_type||user.data?.account_type)!=='landowner')fail('Landlord access required.',403);
  const sr=b.asServiceRole,tenant=await sr.entities.Tenant.get(body.tenant_id);
  const identity=tenant.user_id?{tenant_user_id:tenant.user_id}:{tenant_id:tenant.id};
  const scope={...identity,...(admin?{}:{owner_user_id:user.id})};
  if(!admin&&tenant.owner_user_id!==user.id) {
    const [applications,tenancies]=await Promise.all([sr.entities.Application.count(scope),sr.entities.Tenancy.count(scope)]);
    if(!applications&&!tenancies)fail('You cannot view this tenant profile.',403);
  }
  return {sr,tenant,scope,admin};
}