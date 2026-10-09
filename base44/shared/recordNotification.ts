import {registryError} from './documentRegistry.ts';
const routes={Application:['/portal/applications','/applications'],Payment:['/portal/rent','/rent'],Inspection:['/portal/inspections','/inspections'],Notice:['/portal/notices','/notices'],Document:['/portal/documents','/documents']};
export async function recordNotification(sr,user,body){
  if(Object.keys(body).some(key=>!['action','related_entity','related_id'].includes(key))||!routes[body.related_entity]||typeof body.related_id!=='string'||!/^[a-zA-Z0-9_-]{1,100}$/.test(body.related_id))throw registryError('Choose a supported notification record.');
  const entity=body.related_entity,record=await sr.entities[entity].get(body.related_id);
  if(!record.owner_user_id)throw registryError('This record has no linked property owner.',409);
  if(record.property_id){const property=await sr.entities.Property.get(record.property_id);if(property.owner_user_id!==record.owner_user_id)throw registryError('The property account links are inconsistent.',409);}
  const manager=user.role==='admin'||(record.owner_user_id===user.id&&(user.account_type||user.data?.account_type)==='landowner'&&(user.approval_status||user.data?.approval_status)==='approved');
  if(!manager&&record.tenant_user_id!==user.id)throw registryError('This record does not belong to you.',403);
  const recipient=manager?record.tenant_user_id:record.owner_user_id;
  if(!recipient||recipient===user.id)return {ok:true,skipped:true};
  if(entity==='Document'&&manager&&(record.visibility!=='tenant_visible'||!record.linked))throw registryError('This document is not shared with the tenant.',403);
  if(entity==='Payment'&&manager&&record.status!=='Successful')throw registryError('Only verified payments can be announced as received.',409);
  const eventKey=`${entity}:${record.id}:${record.updated_date||record.created_date}:${recipient}`;
  if(await sr.entities.Notification.count({event_key:eventKey}))return {ok:true,duplicate:true};
  const status=record.site_visit_status||record.payment_status||record.status||'';
  const title=entity==='Notice'?record.subject:entity==='Document'?'Document shared':entity==='Payment'?'Payment received':`${entity} ${status}`.trim();
  const message=entity==='Notice'?record.content:entity==='Document'?`${record.title||'Document'} is available in your documents.`:`${record.property_name||'Property'} / ${record.unit_number||'Unit'}: ${status||'updated'}.`;
  await sr.entities.Notification.create({recipient_user_id:recipient,type:entity,title:String(title).slice(0,200),message:String(message||'').slice(0,3000),related_entity:entity,related_id:record.id,action_link:routes[entity][manager?0:1],date:new Date().toISOString(),read:false,event_key:eventKey});
  return {ok:true};
}