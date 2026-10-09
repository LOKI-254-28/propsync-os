export async function tenantNextOfKin(b,user,body) {
  const fail=(message,status=400)=>{throw Object.assign(new Error(message),{status});};
  if(typeof body.tenant_id!=='string'||!body.tenant_id.trim()||body.tenant_id.length>100)fail('Choose an individual tenant profile.');
  if(body.cursor!=null&&(typeof body.cursor!=='string'||body.cursor.length>2000))fail('Invalid page cursor.');
  const admin=user.role==='admin';
  if(!admin&&(user.account_type||user.data?.account_type)!=='landowner')fail('Landlord access required.',403);
  const sr=b.asServiceRole,tenant=await sr.entities.Tenant.get(body.tenant_id);
  const identity=tenant.user_id?{tenant_user_id:tenant.user_id}:{tenant_id:tenant.id};
  const scope={...identity,...(admin?{}:{owner_user_id:user.id})};
  if(!admin&&tenant.owner_user_id!==user.id) {
    const [applications,tenancies]=await Promise.all([sr.entities.Application.count(scope),sr.entities.Tenancy.count(scope)]);
    if(!applications&&!tenancies)fail('You cannot view this tenant profile.',403);
  }
  const applications=await sr.entities.Application.filter(scope,{sort:'-created_date',limit:50,cursor:body.cursor||undefined,fields:['next_of_kin_id']});
  const pairs=applications.items.filter(app=>app.next_of_kin_id).map(app=>({id:app.next_of_kin_id,application_id:app.id}));
  let items=[];
  if(pairs.length) {
    const conditions=[{$or:pairs}];
    if(tenant.user_id)conditions.push({tenant_user_id:tenant.user_id});
    if(!admin)conditions.push({owner_user_id:user.id});
    const page=await sr.entities.NextOfKin.filter({$and:conditions},{sort:'-created_date',limit:50,fields:['full_name','id_number','phone','email','id_document_uri']});
    items=page.items;
  }
  return {items,next_cursor:applications.next_cursor,has_more:applications.has_more};
}