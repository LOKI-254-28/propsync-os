import { registryError, isStaff } from './documentRegistry.ts';
export const closedApplications = ['Completed','Rejected','Withdrawn','Cancelled','Expired'];
export async function applicationContext(sr,user,id) {
  if (typeof id !== 'string' || !/^[a-zA-Z0-9_-]{1,100}$/.test(id)) throw registryError('Choose an application.');
  const app = await sr.entities.Application.get(id);
  const unit = await sr.entities.Unit.get(app.unit_id);
  const property = await sr.entities.Property.get(unit.property_id);
  if (app.property_id !== property.id) throw registryError('The application links are inconsistent.',409);
  const staff = isStaff(user);
  if (user.role !== 'admin' && (staff ? property.owner_user_id !== user.id : app.tenant_user_id !== user.id)) throw registryError('You cannot access this application.',403);
  if (staff && user.role !== 'admin' && (user.approval_status || user.data?.approval_status) !== 'approved') throw registryError('Your landlord account needs approval.',403);
  return {app,unit,property,staff};
}
export function requirePayment(app) {
  if (app.payment_status !== 'Verified' || !['Payment Verified','Approved','Completed'].includes(app.status)) throw registryError('Payment must be verified before inspection or tenancy approval.',409);
}
export async function ownedUploads(sr,user,uris,{imageOnly=false,appId}={}) {
  if (!Array.isArray(uris) || uris.length > 40 || uris.some(uri => typeof uri !== 'string' || !uri.startsWith('mp/private/') || uri.length > 2048)) throw registryError('Choose valid private uploads.');
  if (!uris.length) return;
  const docs = await sr.entities.Document.filter({file_uri:{$in:uris}});
  for (const uri of uris) {
    const doc = docs.find(d=>d.file_uri === uri);
    if (!doc || doc.uploaded_by_user_id !== user.id || doc.storage_type !== 'private' || (appId && doc.application_id && doc.application_id !== appId) || (imageOnly && !['image/png','image/jpeg','image/webp'].includes(doc.mime_type))) throw registryError('Use your own uploaded files for this application.',403);
  }
}