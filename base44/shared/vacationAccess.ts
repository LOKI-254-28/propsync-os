import { registryError } from './documentRegistry.ts';
export const liveTenancy=['Active','Expiring Soon','Notice Given'];
export const transitions={Submitted:['Acknowledged','Clarification Requested','Approved','Rejected'],Acknowledged:['Clarification Requested','Approved','Rejected'],'Clarification Requested':['Acknowledged','Approved','Rejected'],Approved:['Final Inspection Scheduled'],'Final Inspection Scheduled':['Approved'],Completed:[],Rejected:[]};
export function validDate(value) {const date=new Date(`${value}T00:00:00Z`);return typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(date.getTime())&&date.toISOString().slice(0,10)===value;}
export async function vacationAccess(b,user,tenancyId) {
  if(typeof tenancyId!=='string'||!tenancyId||tenancyId.length>100)throw registryError('Choose a tenancy.');
  const tenancy=await b.asServiceRole.entities.Tenancy.get(tenancyId);
  const property=await b.asServiceRole.entities.Property.get(tenancy.property_id);
  const manager=user.role==='admin'||property.owner_user_id===user.id;
  if(!manager&&tenancy.tenant_user_id!==user.id)throw registryError('This notice is not associated with your tenancy or property.',403);
  return {tenancy,property,manager};
}
export async function validateAttachments(sr,user,files,tenancy,existing=[]) {
  if(files===undefined)return [];
  if(!Array.isArray(files)||files.length>5||files.some(f=>typeof f!=='string'||!f.startsWith('mp/private/')||f.length>1000))throw registryError('Attach up to five privately uploaded PDF, JPG or PNG files.');
  const fresh=[...new Set(files.filter(f=>!existing.includes(f)))];
  const docs=fresh.length?await sr.entities.Document.filter({file_uri:{$in:fresh}},'-created_date',10):[];
  for(const uri of fresh){const doc=docs.find(d=>d.file_uri===uri);if(!doc||doc.uploaded_by_user_id!==user.id||(doc.tenancy_id&&doc.tenancy_id!==tenancy.id)||!['application/pdf','image/jpeg','image/png'].includes(doc.mime_type)||Number(doc.size)>10*1024*1024)throw registryError('Upload your own attachment for this tenancy using the file picker.',403);}
  return [...new Set(files)];
}
export async function lockNotice(sr,notice) {
  const token=crypto.randomUUID(),stale=new Date(Date.now()-6*60000).toISOString();
  await sr.entities.VacationRequest.updateMany({id:notice.id,$or:[{operation_token:{$exists:false}},{operation_token:{$in:['',null]}},{operation_started_at:{$lt:stale}}]},{$set:{operation_token:token,operation_started_at:new Date().toISOString()}});
  const latest=await sr.entities.VacationRequest.get(notice.id);
  if(latest.operation_token!==token)throw registryError('Another update is in progress. Please retry shortly.',409);
  return {notice:latest,token};
}