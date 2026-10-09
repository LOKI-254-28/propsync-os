import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { waitUntil } from 'base44:runtime';
import { documentAccess } from '../../shared/documentAccess.ts';
import { nairobiToday } from '../../shared/nairobiDates.ts';
import { documentAction } from '../../shared/documentActions.ts';
import { receiptDetails } from '../../shared/receiptDetails.ts';
import { emailReceipt } from '../../shared/emailReceipt.ts';


export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { action } = body;
    if(action==='receipt_details')return Response.json(await receiptDetails(base44,user,body));
    if(action==='email_receipt')return Response.json(await emailReceipt(base44,user,body));

    const sr = base44.asServiceRole;
    if (['register_upload', 'sync_record', 'backfill'].includes(action)) return Response.json(await documentAction(base44,user,body));
    if (['list', 'get', 'review', 'staff_delete'].includes(action)) {
      const access = await documentAccess(sr, user);
      if (action === 'list') {
        if (body.cursor && (typeof body.cursor !== 'string' || body.cursor.length > 4096)) return Response.json({ error: 'Invalid page.' }, { status: 400 });
        const page = await sr.entities.Document.filter(access.query, { sort: '-created_date', limit: 100, cursor: body.cursor });
        const documents = page.items.filter(access.canRead).map(doc => {
          if (access.staff) return doc;
          const { notes, ...visible } = doc;
          return visible;
        });
        return Response.json({ documents, next_cursor: page.next_cursor, has_more: page.has_more });
      }
      if (!body.document_id || typeof body.document_id !== 'string') return Response.json({ error: 'Choose a document.' }, { status: 400 });
      const doc = await sr.entities.Document.get(body.document_id);
      if (!access.canRead(doc)) return Response.json({ error: 'You cannot access this document.' }, { status: 403 });
      if (action === 'get') return Response.json({ file_uri: doc.file_uri });
      if (!access.staff) return Response.json({ error: 'Only the property owner or admin can manage this document.' }, { status: 403 });
      if (action === 'review') {
        if (!['verified', 'rejected'].includes(body.status) || typeof (body.review_note || '') !== 'string' || (body.review_note || '').length > 2000) return Response.json({ error: 'Choose a valid review status.' }, { status: 400 });
        await sr.entities.Document.update(doc.id, { status: body.status, review_note: body.review_note || '' });
        if (doc.tenant_user_id) waitUntil(sr.entities.Notification.create({ recipient_user_id: doc.tenant_user_id, type: 'document_review', title: 'Document reviewed', message: `Your document "${doc.title}" was ${body.status}.`, related_entity: 'Document', related_id: doc.id, action_link: '/portal/documents', date: new Date().toISOString(), read: false }));
      } else {
        if (doc.linked || doc.source_entities?.length) return Response.json({ error: 'This document is used by a workflow and cannot be deleted here.' }, { status: 409 });
        await sr.entities.Document.delete(doc.id);
      }
      return Response.json({ ok: true });
    }

    // --- Tenant upload (service role forces tenant_id, visibility, status) ---
    if (action === 'tenant_upload') {
      if (user.role === 'admin' || ['admin', 'landowner'].includes(user.account_type || user.data?.account_type)) return Response.json({ error: 'Use the landlord document upload.' }, { status: 403 });
      const { file_uri, file_name, mime_type, size, title, category, tenancy_id } = body;
      if (typeof file_uri !== 'string' || !file_uri || file_uri.length > 2048 || /^https?:/i.test(file_uri) || typeof title !== 'string' || !title.trim() || title.length > 200 || !['ID/Passport', 'KRA PIN', 'Proof of Income', 'Employer Letter', 'Other'].includes(category) || !['application/pdf', 'image/jpeg', 'image/png'].includes(mime_type) || !Number.isFinite(Number(size)) || Number(size) <= 0 || Number(size) > 10 * 1024 * 1024) return Response.json({ error: 'Choose a title, valid category and a PDF, JPG or PNG file up to 10 MB.' }, { status: 400 });
      const tenancy = tenancy_id ? await base44.entities.Tenancy.get(tenancy_id) : null;
      if (tenancy && tenancy.tenant_user_id !== user.id) return Response.json({ error: 'This tenancy is not yours.' }, { status: 403 });
      let tenant = (await base44.entities.Tenant.filter({ user_id: user.id }, '-created_date', 1))[0];
      if (!tenant) tenant = await sr.entities.Tenant.create({ user_id: user.id, full_name: user.full_name || user.email, email: user.email, status: 'Active', profile_type: 'tenant' });
      const property = tenancy ? await sr.entities.Property.get(tenancy.property_id) : null;
      const existing = (await sr.entities.Document.filter({ file_uri }, '-created_date', 1))[0];
      if (!existing || (existing.uploaded_by_user_id !== user.id && existing.uploaded_by !== user.email)) return Response.json({ error: 'Upload the file using the document picker first.' }, { status: 403 });
      const doc = await sr.entities.Document.update(existing.id, {
        title, category, tenant_id:tenant.id, tenant_user_id:user.id,
        tenancy_id:tenancy?.id || '', property_id:tenancy?.property_id || '', unit_id:tenancy?.unit_id || '',
        owner_user_id:property?.owner_user_id || '', linked:!!tenancy, visibility:'tenant_visible',
      });
      if (doc.owner_user_id) waitUntil(sr.entities.Notification.create({ recipient_user_id: doc.owner_user_id, type: 'document_upload', title: 'New tenant document uploaded', message: `${tenant.full_name} uploaded "${title}". Review pending.`, related_entity: 'Document', related_id: doc.id, action_link: '/documents', date: new Date().toISOString(), read: false }));
      return Response.json({ document: doc });
    }

    // --- Tenant delete (own pending uploads only) ---
    if (action === 'tenant_delete') {
      const { document_id } = body;
      if (!document_id) return Response.json({ error: 'document_id required' }, { status: 400 });
      const doc = await base44.asServiceRole.entities.Document.get(document_id);
      if (!doc) return Response.json({ error: 'Not found' }, { status: 404 });
      if (user.role !== 'admin') {
        if (doc.tenant_user_id !== user.id || doc.uploaded_by_role !== 'tenant' || doc.status !== 'pending') {
          return Response.json({ error: 'You can only delete your own pending uploads.' }, { status: 403 });
        }
      }
      if (doc.linked || doc.source_entities?.length) return Response.json({ error: 'This file is linked to a workflow and cannot be deleted here.' }, { status: 409 });
      await base44.asServiceRole.entities.Document.delete(document_id);
      try {
        await base44.asServiceRole.entities.AuditLog.create({
          user_id: user.id,
          user_email: user.email,
          user_role: user.role,
          action: 'Document Deleted',
          entity: 'Document',
          entity_id: document_id,
          entity_name: doc.title,
          timestamp: new Date().toISOString(),
        });
      } catch (e) {}
      return Response.json({ ok: true });
    }

    return Response.json({ error: 'Unknown action: ' + action }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: error.status || 500 });
  }
}