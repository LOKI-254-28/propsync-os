import {allRelated} from './documentAccess.ts';
import {registryError} from './documentRegistry.ts';
export async function feedbackScope(sr,user) {
  if(user.role==='admin')return {admin:true,can_manage:true,property_ids:[],query:{}};
  const [properties,grants]=await Promise.all([allRelated(sr.entities.Property,{owner_user_id:user.id}),allRelated(sr.entities.StaffPermission,{user_id:user.id,active:true})]);
  const property_ids=[...new Set([...properties.map(p=>p.id),...grants.filter(g=>g.permissions?.includes('Feedback')).flatMap(g=>g.feedback_property_ids || [])])];
  return {admin:false,can_manage:property_ids.length>0||(user.account_type || user.data?.account_type)==='landowner',property_ids,query:{property_id:{$in:property_ids}}};
}
export async function feedbackAccess(sr,user,record,scope) {
  let manager=scope.admin;
  if(record.property_id)manager=manager || scope.property_ids.includes(record.property_id);
  const tenant=record.tenant_user_id===user.id;
  if(!manager&&!tenant)throw registryError('This feedback is private to its tenant, property landlord and explicitly authorized staff.',403);
  if(record.tenancy_id) {
    const ten=await sr.entities.Tenancy.get(record.tenancy_id);
    if(ten.property_id!==record.property_id||ten.unit_id!==record.unit_id||ten.tenant_user_id!==record.tenant_user_id)throw registryError('The feedback has inconsistent tenancy links.',409);
  }
  return {manager,tenant};
}
export function feedbackCursor(cursor) {if(cursor!=null&&(typeof cursor!=='string'||cursor.length>2000))throw registryError('Invalid page cursor.');return cursor || undefined;}