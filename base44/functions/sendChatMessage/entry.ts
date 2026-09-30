import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

// Only the tenant of a tenancy and that tenancy's landlord can post in its thread.
export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const { tenancy_id, text } = await req.json();
    const body = String(text || '').trim().slice(0, 2000);
    if (!body) return Response.json({ error: 'Message is empty.' }, { status: 400 });

    const sr = base44.asServiceRole;
    const t = await sr.entities.Tenancy.get(tenancy_id).catch(() => null);
    if (!t) return Response.json({ error: 'Tenancy not found' }, { status: 404 });
    const isTenant = t.tenant_user_id === user.id;
    const isOwner = t.owner_user_id === user.id;
    if (!isTenant && !isOwner) return Response.json({ error: 'Not allowed' }, { status: 403 });

    const msg = await sr.entities.ChatMessage.create({
      tenancy_id, tenant_user_id: t.tenant_user_id, owner_user_id: t.owner_user_id,
      sender_user_id: user.id, sender_role: isTenant ? 'tenant' : 'landlord', text: body, read: false,
    });
    const to = isTenant ? t.owner_user_id : t.tenant_user_id;
    if (to) {
      await sr.entities.Notification.create({
        recipient_user_id: to, type: 'Chat', title: `New message from ${user.full_name || 'your ' + (isTenant ? 'tenant' : 'landlord')}`,
        message: body.slice(0, 120), related_entity: 'Tenancy', related_id: t.id,
        action_link: isTenant ? '/chat' : '/portal/chat', date: new Date().toISOString(), read: false,
      });
    }
    return Response.json({ ok: true, message: msg });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}