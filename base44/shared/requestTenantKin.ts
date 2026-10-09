import {tenantKinAccess} from './tenantKinAccess.ts';
export async function requestTenantKin(b,user,body) {
  const {sr,tenant,admin}=await tenantKinAccess(b,user,body);
  if(!tenant.user_id)throw Object.assign(new Error('Link this tenant to an account first.'),{status:400});
  const owner=admin?tenant.owner_user_id:user.id;
  if(!owner)throw Object.assign(new Error('A landlord must be linked to this tenant.'),{status:400});
  const key=`${owner}:${tenant.user_id}`;
  const existing=(await sr.entities.NextOfKinRequest.filter({request_key:key,status:'Pending'},'-created_date',1))[0];
  if(existing)return {ok:true,request_id:existing.id};
  const landlord=admin?(await sr.entities.User.filter({id:owner},'-created_date',1))[0]:user;
  const result=await sr.entities.NextOfKinRequest.upsert([{request_key:key,tenant_id:tenant.id,tenant_user_id:tenant.user_id,owner_user_id:owner,landlord_name:landlord?.display_name||landlord?.full_name||'Your landlord',status:'Pending',requested_at:new Date().toISOString(),completed_at:''}],{key:'request_key'});
  const request=result.records[0];
  await sr.entities.Notification.create({recipient_user_id:tenant.user_id,type:'next_of_kin_request',title:'Next-of-kin details requested',message:'Your landlord has requested your next-of-kin details. Please complete the form in your portal.',related_entity:'NextOfKinRequest',related_id:request.id,action_link:'/portal/profile',date:new Date().toISOString(),read:false});
  return {ok:true,request_id:request.id};
}