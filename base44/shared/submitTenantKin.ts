export async function submitTenantKin(b,user,body) {
  const fail=(message,status=400)=>{throw Object.assign(new Error(message),{status});};
  if(typeof body.request_id!=='string'||!body.request_id.trim()||body.request_id.length>100)fail('Choose a next-of-kin request.');
  const sr=b.asServiceRole,request=await sr.entities.NextOfKinRequest.get(body.request_id);
  if(request.tenant_user_id!==user.id)fail('Only the requested tenant can submit these details.',403);
  if(request.status==='Completed')return {ok:true,id:request.next_of_kin_id};
  const details=body.details;
  if(!details||typeof details!=='object'||Array.isArray(details))fail('Enter next-of-kin details.');
  const data={};
  for(const key of ['full_name','id_number','phone','email']){
    if(typeof details[key]!=='string'||details[key].length>(key==='full_name'?254:100))fail('Enter valid next-of-kin contact details.');
    data[key]=details[key].trim();
  }
  if(!data.full_name||!data.id_number||(!data.phone&&!data.email))fail('Enter a name, ID number and phone or email.');
  if(data.email&&!/^\S+@\S+\.\S+$/.test(data.email))fail('Enter a valid email address.');
  const result=await sr.entities.NextOfKin.upsert([{...data,request_id:request.id,tenant_id:request.tenant_id,tenant_user_id:user.id,owner_user_id:request.owner_user_id}],{key:'request_id'});
  const kin=result.records[0];
  await sr.entities.NextOfKinRequest.update(request.id,{status:'Completed',next_of_kin_id:kin.id,completed_at:new Date().toISOString()});
  await sr.entities.Notification.updateMany({recipient_user_id:user.id,type:'next_of_kin_request',related_id:request.id,read:false},{$set:{read:true}});
  await sr.entities.Notification.create({recipient_user_id:request.owner_user_id,type:'next_of_kin_submitted',title:'Next-of-kin details submitted',message:'Your tenant has supplied next-of-kin details. Open their tenant profile to view them.',related_entity:'Tenant',related_id:request.tenant_id,action_link:'/tenants',date:new Date().toISOString(),read:false});
  return {ok:true,id:kin.id};
}