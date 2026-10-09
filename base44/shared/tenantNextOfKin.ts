import {tenantKinAccess} from './tenantKinAccess.ts';
export async function tenantNextOfKin(b,user,body) {
  if(body.cursor!=null&&(typeof body.cursor!=='string'||body.cursor.length>2000))throw Object.assign(new Error('Invalid page cursor.'),{status:400});
  const {sr,tenant,scope,admin}=await tenantKinAccess(b,user,body);
  const options={sort:'-created_date',limit:50,cursor:body.cursor||undefined,fields:['full_name','id_number','phone','email','id_document_uri']};
  if(tenant.user_id)return sr.entities.NextOfKin.filter({tenant_user_id:tenant.user_id,...(admin?{}:{owner_user_id:user.id})},options);
  const applications=await sr.entities.Application.filter(scope,{sort:'-created_date',limit:50,cursor:body.cursor||undefined,fields:['id']});
  const page=applications.items.length?await sr.entities.NextOfKin.filter({application_id:{$in:applications.items.map(app=>app.id)},...(admin?{}:{owner_user_id:user.id})},{...options,cursor:undefined}):{items:[]};
  return {items:page.items,next_cursor:applications.next_cursor,has_more:applications.has_more};
}