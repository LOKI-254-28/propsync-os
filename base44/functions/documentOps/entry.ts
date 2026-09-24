import { createClientFromRequest } from 'npm:@base44/sdk@0.8.49';

const todayISO = () => new Date().toISOString().slice(0, 10);

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { action } = body;

    // --- Signed URL with access check ---
    if (action === 'signed_url') {
      const { document_id } = body;
      if (!document_id) return Response.json({ error: 'document_id required' }, { status: 400 });
      const doc = await base44.asServiceRole.entities.Document.get(document_id);
      if (!doc) return Response.json({ error: 'Not found' }, { status: 404 });
      if (user.role !== 'admin') {
        if (doc.tenant_user_id !== user.id || doc.visibility !== 'tenant_visible') {
          return Response.json({ error: 'Forbidden' }, { status: 403 });
        }
      }
      const { signed_url } = await base44.asServiceRole.integrations.Core.CreateFileSignedUrl({
        file_uri: doc.file_uri,
        expires_in: 300,
      });
      return Response.json({ signed_url });
    }

    // --- Tenant upload (service role forces tenant_id, visibility, status) ---
    if (action === 'tenant_upload') {
      if (user.role === 'admin') return Response.json({ error: 'Admins upload directly' }, { status: 400 });
      const { file_uri, file_name, mime_type, size, title, category, tenancy_id } = body;
      if (!file_uri || !title || !category) return Response.json({ error: 'Missing required fields' }, { status: 400 });
      const tenant = await base44.asServiceRole.entities.Tenant.filter({ user_id: user.id }).then((r) => r[0]);
      if (!tenant) return Response.json({ error: 'No tenant profile is linked to your account yet.' }, { status: 400 });
      const doc = await base44.asServiceRole.entities.Document.create({
        title,
        category,
        file_uri,
        file_name: file_name || '',
        mime_type: mime_type || '',
        size: Number(size) || 0,
        tenant_id: tenant.id,
        tenant_user_id: user.id,
        tenancy_id: tenancy_id || '',
        uploaded_by: user.email || user.id,
        uploaded_by_role: 'tenant',
        visibility: 'tenant_visible',
        status: 'pending',
        date_uploaded: todayISO(),
      });
      // Notify all admin/staff users
      try {
        const users = await base44.asServiceRole.entities.User.list('-created_date', 50);
        for (const u of users) {
          if (u.role === 'admin') {
            await base44.asServiceRole.entities.Notification.create({
              recipient_user_id: u.id,
              type: 'document_upload',
              title: 'New tenant document uploaded',
              message: `${tenant.full_name} uploaded "${title}" (${category}). Review pending.`,
              related_entity: 'Document',
              related_id: doc.id,
              date: new Date().toISOString(),
              read: false,
            });
          }
        }
      } catch (e) {}
      return Response.json({ document: doc });
    }

    // --- Tenant delete (own pending uploads only) ---
    if (action === 'tenant_delete') {
      const { document_id } = body;
      if (!document_id) return Response.json({ error: 'document_id required' }, { status: 400 });
      const doc = await base44.asServiceRole.entities.Document.get(document_id);
      if (!doc) return Response.json({ error: 'Not found' }, { status: 404 });
      if (user.role !== 'admin') {
        if (doc.tenant_user_id !== user.id || doc.status !== 'pending') {
          return Response.json({ error: 'You can only delete your own pending uploads.' }, { status: 403 });
        }
      }
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
    return Response.json({ error: error.message }, { status: 500 });
  }
}