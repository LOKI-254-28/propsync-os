import { nairobiToday } from './nairobiDates.ts';
export const fileFields = {
  Property: [['images','Property Photo']], Unit: [['images','Unit Photo'],['room_photos','Unit Photo']],
  Listing: [['images','Property Photo']], Tenant: [['profile_image','Applicant Photo']],
  Application: [['documents','Other'],['agreement_url','Lease Agreement'],['agreement_executed_url','Lease Agreement'],['payment_proof_url','Receipt']],
  Tenancy: [['agreement_document_url','Lease Agreement']], NextOfKin: [['id_document_uri','ID/Passport']],
  Maintenance: [['images','Maintenance Photo']], Inspection: [['images','Inspection Photo'],['report_uri','Inspection Report'],['supporting_documents','Other']],
  Notice: [['attachment_url','Notice Attachment']], Expense: [['supporting_document_url','Receipt']],
  VacationRequest: [['attachments','Notice Attachment'],['attachment_url','Notice Attachment']], Payment: [['receipt_url','Receipt'],['proof_url','Receipt']],
};
const linkNames = { Property:'property_id', Unit:'unit_id', Listing:'listing_id', Tenant:'tenant_id', Application:'application_id', Tenancy:'tenancy_id', NextOfKin:'next_of_kin_id', Maintenance:'maintenance_id', Inspection:'inspection_id', Notice:'notice_id', Expense:'expense_id', VacationRequest:'vacation_request_id', Payment:'payment_id' };
export function registryError(message, status = 400) { const error = new Error(message); error.status = status; return error; }
export function isStaff(user) { return user.role === 'admin' || (user.account_type || user.data?.account_type) === 'landowner'; }
export function fileEntries(entity, record) {
  return (fileFields[entity] || []).flatMap(([field,category]) => (Array.isArray(record[field]) ? record[field] : [record[field]]).filter(Boolean).map(value => ({ uri: typeof value === 'string' ? value : value.url, category, field })).filter(item => typeof item.uri === 'string'));
}
export async function recordLinks(sr, user, entity, record) {
  if (!fileFields[entity]) throw registryError('Unsupported document source.');
  const links = { [linkNames[entity]]: record.id };
  let context = record;
  if (entity === 'NextOfKin' || (entity === 'Inspection' && record.application_id)) {
    if (!record.application_id) throw registryError('This record has no application.');
    context = await sr.entities.Application.get(record.application_id); links.application_id = context.id;
  }
  let tenancy = entity === 'Tenancy' ? record : context.tenancy_id ? await sr.entities.Tenancy.get(context.tenancy_id) : null;
  if (tenancy) { links.tenancy_id = tenancy.id; context = { ...context, property_id: tenancy.property_id, unit_id: tenancy.unit_id, tenant_id: tenancy.tenant_id, tenant_user_id: tenancy.tenant_user_id }; }
  const unit = entity === 'Unit' ? record : context.unit_id ? await sr.entities.Unit.get(context.unit_id) : null;
  const propertyId = entity === 'Property' ? record.id : unit?.property_id || context.property_id;
  if (unit && context.property_id && unit.property_id !== context.property_id) throw registryError('The unit and property do not match.');
  const property = propertyId ? await sr.entities.Property.get(propertyId) : null;
  const tenantId = entity === 'Tenant' ? record.id : context.tenant_id;
  const tenant = tenantId ? await sr.entities.Tenant.get(tenantId) : null;
  const tenantUserId = tenant?.user_id || context.tenant_user_id || '';
  if (tenant?.user_id && context.tenant_user_id && tenant.user_id !== context.tenant_user_id) throw registryError('The tenant links do not match.');
  if (user.role !== 'admin') {
    if (isStaff(user)) {
      if (!property || property.owner_user_id !== user.id) throw registryError('This record is not linked to your property.',403);
    } else if (tenantUserId !== user.id) throw registryError('This record does not belong to you.',403);
  }
  if (entity === 'Tenant' && user.role !== 'admin' && isStaff(user)) throw registryError('Link the upload to a tenancy instead.',403);
  if (property) { links.property_id = property.id; links.owner_user_id = property.owner_user_id || ''; }
  if (unit) links.unit_id = unit.id;
  if (tenantId) links.tenant_id = tenantId;
  if (tenantUserId) links.tenant_user_id = tenantUserId;
  return links;
}
export async function upsertDocument(sr, user, file, options = {}) {
  const existing = (await sr.entities.Document.filter({ file_uri: file.file_uri }, '-created_date', 20))[0];
  if (existing) {
    if (options.registration && existing.uploaded_by_user_id !== user.id && existing.uploaded_by !== user.email) throw registryError('This file is registered to another uploader.',403);
    if (options.links) {
      if (existing.owner_user_id && options.links.owner_user_id && existing.owner_user_id !== options.links.owner_user_id) throw registryError('This document belongs to a different landlord.',403);
      if (existing.application_id && options.links.application_id && existing.application_id !== options.links.application_id) throw registryError('This file is linked to another application.',403);
      if (existing.tenant_user_id && options.links.tenant_user_id && existing.tenant_user_id !== options.links.tenant_user_id) throw registryError('This document belongs to another tenant.',403);
      const changes = { ...options.links, linked: true, source_entities: [...new Set([...(existing.source_entities || []), options.source].filter(Boolean))] };
      if (options.visibility && !options.historical) changes.visibility = options.visibility;
      if (options.category && existing.category === 'Other') changes.category = options.category;
      if (options.title && !existing.linked && existing.category === 'Other') changes.title = options.title;
      return await sr.entities.Document.update(existing.id, changes);
    }
    return existing;
  }
  const staff = isStaff(user);
  return await sr.entities.Document.create({
    title: options.title || `${file.file_name || 'Uploaded file'} – ${user.full_name || user.email}`,
    category: options.category || 'Other', ...file, ...(options.links || {}),
    uploaded_by: options.historical ? '' : user.email || user.id,
    uploaded_by_user_id: options.historical ? '' : user.id,
    uploaded_by_role: options.historical ? (options.links?.tenant_user_id ? 'tenant' : 'staff') : staff ? 'staff' : 'tenant',
    ...(!options.links && !staff ? {tenant_user_id:user.id} : {}),
    ...(!options.links && staff ? {owner_user_id:user.id} : {}),
    visibility: options.visibility || (staff ? 'staff_only' : 'tenant_visible'), status: 'pending',
    storage_type: /^https:\/\//.test(file.file_uri) ? 'public' : 'private', linked: !!options.links,
    source_entities: options.source ? [options.source] : [], date_uploaded: options.date || nairobiToday(),
  });
}
export async function syncRecordFiles(sr, user, entity, record, historical = false) {
  const entries = fileEntries(entity,record);
  if (!entries.length) return { linked:0, skipped:[] };
  const links = await recordLinks(sr,user,entity,record);
  const result = { linked:0, skipped:[] };
  for (const entry of entries.slice(0,60)) {
    const privateFile = entry.uri.startsWith('mp/private/');
    const publicFile = entry.uri.startsWith('https://media.base44.com/') || entry.uri.startsWith('https://static.wixstatic.com/');
    if (!privateFile && !publicFile) { result.skipped.push({entity,id:record.id,reason:'Cannot verify this is an uploaded file'}); continue; }
    if (!historical) {
      const registered = (await sr.entities.Document.filter({file_uri:entry.uri},'-created_date',1))[0];
      if (registered?.uploaded_by_user_id && registered.uploaded_by_user_id !== user.id && !(links.tenant_user_id && registered.tenant_user_id === links.tenant_user_id) && !(links.owner_user_id && registered.owner_user_id === links.owner_user_id)) throw registryError('This file belongs to an unrelated uploader.',403);
    }
    await upsertDocument(sr,user,{file_uri:entry.uri}, {
      links, source:`${entity}:${record.id}`, category:entry.category,
      title:`${entry.category} – ${record.applicant_name || record.tenant_name || record.full_name || record.property_name || record.name || record.unit_number || entity}`,
      visibility: ['Property','Unit','Listing','Expense'].includes(entity) ? 'staff_only' : 'tenant_visible',
      date: historical ? (record.created_date || '').slice(0,10) || undefined : undefined, historical,
    });
    result.linked++;
  }
  return result;
}