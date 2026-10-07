import {registryError,upsertDocument} from './documentRegistry.ts';
import {allRelated} from './documentAccess.ts';
export async function accountProfile(b,user,body) {
  const sr=b.asServiceRole;
  const tenants=await sr.entities.Tenant.filter({user_id:user.id},'-created_date',100);
  if(body.action==='save_account_profile') {
    const name=body.display_name,uri=body.profile_image;
    if(typeof name!=='string'||!name.trim()||name.length>254)throw registryError('Enter a profile name up to 254 characters.');
    if(typeof uri!=='string'||uri.length>2048)throw registryError('Choose a valid profile photograph.');
    if(uri) {
      const doc=(await sr.entities.Document.filter({file_uri:uri},'-created_date',1))[0];
      const current=user.profile_image||user.data?.profile_image||'';
      if(uri!==current&&(!doc||doc.category!=='Applicant Photo'||!doc.mime_type?.startsWith('image/')||(doc.uploaded_by_user_id!==user.id&&doc.tenant_user_id!==user.id)))throw registryError('Choose a photograph uploaded to your own account.',403);
      if(doc)await upsertDocument(sr,user,{file_uri:uri},{links:tenants[0]?{tenant_id:tenants[0].id,tenant_user_id:user.id}:{},source:`User:${user.id}`});
    }
    await b.auth.updateMe({display_name:name.trim(),profile_image:uri});
    if(tenants.length)await sr.entities.Tenant.updateMany({user_id:user.id},{$set:{full_name:name.trim(),profile_image:uri}});
    return {profile:{display_name:name.trim(),profile_image:uri,email:user.email}};
  }
  const photo=(await sr.entities.Document.filter({category:'Applicant Photo',$or:[{uploaded_by_user_id:user.id},{tenant_user_id:user.id}]},'-created_date',1))[0];
  return {profile:{display_name:user.display_name||user.data?.display_name||tenants[0]?.full_name||user.full_name||user.email,profile_image:user.profile_image||user.data?.profile_image||tenants[0]?.profile_image||photo?.file_uri||'',email:user.email}};
}
export async function decorateTenantProfiles(sr,tenants) {
  const ids=[...new Set(tenants.map(t=>t.user_id).filter(Boolean))];
  if(!ids.length)return tenants;
  const [users,photos]=await Promise.all([
    sr.entities.User.filter({id:{$in:ids}},'-created_date',100,0,['id','display_name','profile_image']),
    allRelated(sr.entities.Document,{category:'Applicant Photo',$or:[{uploaded_by_user_id:{$in:ids}},{tenant_user_id:{$in:ids}}]})
  ]);
  photos.sort((a,b)=>b.created_date.localeCompare(a.created_date));
  return tenants.map(t=>{const u=users.find(u=>u.id===t.user_id),p=photos.find(p=>p.uploaded_by_user_id===t.user_id||p.tenant_user_id===t.user_id);return {...t,full_name:u?.display_name||t.full_name,profile_image:u?.profile_image||t.profile_image||p?.file_uri||''};});
}