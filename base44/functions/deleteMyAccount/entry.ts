import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

// Self-service account deletion for tenants/clients only.
// Guards (in order):
//   1. Caller must be authenticated.
//   2. Caller must NOT be an admin or landowner (only tenants/clients).
//   3. Caller must not own any Property (owner_user_id).
//   4. Caller must not hold an active Tenancy
//      (status in Pending | Active | Expiring Soon | Notice Given).
// On success the caller's User record is permanently deleted. Historical
// records (applications, tenancies, payments) are left as-is (dangling
// tenant_user_id) per the preserve-history decision.
export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const caller = await base44.auth.me();
    if (!caller) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const accountType = caller.account_type || caller.data?.account_type;
    const role = caller.role;

    // Guard 2: only tenants/clients
    if (accountType === 'admin' || accountType === 'landowner' || role === 'admin') {
      return Response.json(
        { error: 'Only tenant/client accounts can self-delete. Contact an admin.' },
        { status: 403 }
      );
    }

    // Guard 3: must not own property
    const ownedProperties = await base44.asServiceRole.entities.Property.filter({ owner_user_id: caller.id });
    if (ownedProperties && ownedProperties.length > 0) {
      return Response.json(
        { error: 'You own property and cannot delete your account. Please reassign or contact an admin.' },
        { status: 400 }
      );
    }

    // Guard 4: must not have an active tenancy
    const activeTenancies = await base44.asServiceRole.entities.Tenancy.filter({
      tenant_user_id: caller.id,
      status: { $in: ['Pending', 'Active', 'Expiring Soon', 'Notice Given'] },
    });
    if (activeTenancies && activeTenancies.length > 0) {
      return Response.json(
        { error: 'You have an active tenancy and cannot delete your account.' },
        { status: 400 }
      );
    }

    // Delete the caller's user record
    await base44.asServiceRole.entities.User.delete(caller.id);

    try {
      await base44.asServiceRole.entities.AuditLog.create({
        user_id: caller.id,
        user_email: caller.email,
        user_role: role || accountType || 'client',
        action: 'User Self-Deleted Account',
        entity: 'User',
        entity_id: caller.id,
        entity_name: caller.email,
        timestamp: new Date().toISOString(),
      });
    } catch (e) {}

    return Response.json({ deleted: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}