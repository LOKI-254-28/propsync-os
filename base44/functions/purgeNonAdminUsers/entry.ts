import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

// Admin-only bulk purge. Permanently deletes every User account that is
// neither an admin nor a landowner. Keeps accounts where:
//   account_type === 'admin' || account_type === 'landowner' || role === 'admin'
// Historical records (applications, tenancies, etc.) owned by removed users
// are left untouched (dangling tenant_user_id) per the preserve-history decision.
export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const caller = await base44.auth.me();
    if (!caller) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const callerIsAdmin = caller.role === 'admin' || caller.account_type === 'admin' || caller.data?.account_type === 'admin';
    if (!callerIsAdmin) {
      return Response.json({ error: 'Forbidden — admin access required.' }, { status: 403 });
    }

    const users = await base44.asServiceRole.entities.User.list('-created_date', 500);

    const isProtected = (u: any) =>
      u.account_type === 'admin' ||
      u.account_type === 'landowner' ||
      u.role === 'admin' ||
      u.data?.account_type === 'admin' ||
      u.data?.account_type === 'landowner';

    const toRemove = users.filter((u: any) => !isProtected(u));
    const kept = users.length - toRemove.length;

    const removed: { id: string; email: string }[] = [];
    for (const u of toRemove) {
      try {
        await base44.asServiceRole.entities.User.delete(u.id);
        removed.push({ id: u.id, email: u.email || '' });
      } catch (e) {
        // continue purging the rest even if one fails
      }
    }

    try {
      await base44.asServiceRole.entities.AuditLog.create({
        user_id: caller.id,
        user_email: caller.email,
        user_role: 'admin',
        action: 'Purged Non-Admin Users',
        entity: 'User',
        entity_id: '',
        entity_name: `${removed.length} accounts removed`,
        timestamp: new Date().toISOString(),
      });
    } catch (e) {}

    return Response.json({ removed, kept, removedCount: removed.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}