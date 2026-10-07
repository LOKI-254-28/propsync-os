import { fileFields, registryError, isStaff, recordLinks, upsertDocument, syncRecordFiles } from './documentRegistry.ts';
export async function documentAction(base44, user, body) {
  const sr = base44.asServiceRole;
  if (body.action === 'sync_record') {
    if (!fileFields[body.entity] || typeof body.record_id !== 'string' || body.record_id.length > 100) throw registryError('Choose a supported record.');
    const record = await sr.entities[body.entity].get(body.record_id);
    await recordLinks(sr,user,body.entity,record);
    return await syncRecordFiles(sr,user,body.entity,record);
  }
  if (body.action === 'backfill') {
    if (user.role !== 'admin') throw registryError('Only admins can link historical uploads.',403);
    if (!fileFields[body.entity] || (body.cursor && (typeof body.cursor !== 'string' || body.cursor.length > 4096))) throw registryError('Choose a supported source.');
    const page = await sr.entities[body.entity].filter({}, { sort:'created_date',limit:20,cursor:body.cursor });
    const result = { scanned:page.items.length, linked:0, skipped:[], has_more:page.has_more, next_cursor:page.next_cursor };
    for (const record of page.items) {
      try {
        const outcome = await syncRecordFiles(sr,user,body.entity,record,true);
        result.linked += outcome.linked; result.skipped.push(...outcome.skipped);
      } catch(error) { result.skipped.push({entity:body.entity,id:record.id,reason:error.message}); }
    }
    return result;
  }
  if (body.action !== 'register_upload') return null;
  const file = body.file || {}, context = body.context || {};
  const uri = file.file_uri || file.file_url;
  const appId = base44.getConfig().appId;
  const privateFile = typeof uri === 'string' && uri.startsWith(`mp/private/${appId}/`);
  const publicFile = typeof uri === 'string' && uri.startsWith('https://') && uri.includes(`/${appId}/`) && ['media.base44.com','base44.app','static.wixstatic.com'].some(host => new URL(uri).hostname === host);
  if ((!privateFile && !publicFile) || uri.length > 2048) throw registryError('Use a file uploaded by this app.');
  if (publicFile && !isStaff(user)) throw registryError('Tenant documents must be private.',403);
  const types = ['application/pdf','image/jpeg','image/png','image/webp'];
  const extensions = {'application/pdf':['pdf'],'image/jpeg':['jpg','jpeg'],'image/png':['png'],'image/webp':['webp']};
  const extension = typeof file.file_name === 'string' ? file.file_name.split('.').pop().toLowerCase() : '';
  if (!types.includes(file.mime_type) || !extensions[file.mime_type]?.includes(extension) || !Number.isFinite(file.size) || file.size <= 0 || file.size > 10*1024*1024 || typeof file.file_name !== 'string' || file.file_name.length > 255) throw registryError('Choose PDF, JPG, PNG or WebP files up to 10 MB.');
  let category = publicFile ? 'Property Photo' : 'Other', title, links;
  if (context.purpose === 'application_id') { category = 'ID/Passport'; title = `Copy of ID – ${user.full_name || user.email}`; }
  if (['application_photo','profile_photo'].includes(context.purpose)) {
    if (!file.mime_type.startsWith('image/')) throw registryError('Your recent photograph must be an image.');
    category = 'Applicant Photo'; title = `Recent photograph – ${user.full_name || user.email}`;
  }
  if (context.entity && context.record_id) {
    if (!fileFields[context.entity] || typeof context.record_id !== 'string') throw registryError('Unsupported upload context.');
    const record = await sr.entities[context.entity].get(context.record_id);
    links = await recordLinks(sr,user,context.entity,record);
  }
  const allowed = ['Other','ID/Passport','Receipt','Lease Agreement','Maintenance Photo','Unit Photo','Property Photo','Inspection Photo','Inspection Report','Notice Attachment'];
  if (context.category && allowed.includes(context.category) && !context.purpose) category = context.category;
  const document = await upsertDocument(sr,user,{file_uri:uri,file_name:file.file_name,mime_type:file.mime_type,size:file.size}, {
    registration:true, category, title, links, source:links ? `${context.entity}:${context.record_id}` : undefined,
    visibility:isStaff(user) ? (context.visibility === 'tenant_visible' && links ? 'tenant_visible' : 'staff_only') : 'tenant_visible',
  });
  return { document };
}