import { createClientFromRequest } from 'npm:@base44/sdk@0.8.49';

// One-time admin-only purge: deletes ALL non-admin users and every record they own
// across every entity, leaving only the admin account and platform-level records
// (Contractor, Settings, AuditLog for admins).

// Entities with owner_user_id (landowner-owned records)
const OWNER_ENTITIES = [
  'Property', 'Unit', 'Listing', 'Tenancy',
  'Expense', 'Notice', 'RentCharge', 'Document', 'Inspection',
];

// Entities with tenant_user_id (tenant-owned records)
const TENANT_ENTITIES = [
  'Application', 'Payment', 'RentCharge', 'Maintenance',
  'Inspection', 'Notice', 'Document', 'Feedback', 'VacationRequest', 'Tenancy',
];

// Entities keyed by user_id directly
const USER_ID_ENTITIES = ['Tenant', 'StaffPermission', 'AuditLog'];

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Authentication required' }, { status: 401 });

    const isAdmin = user.role === 'admin' || user.account_type === 'admin' || user.data?.account_type === 'admin';
    if (!isAdmin) return Response.json({ error: 'Admin access required' }, { status: 403 });

    const users = await base44.asServiceRole.entities.User.list('-created_date', 500);
    const nonAdmins = users.filter((u) => !(u.role === 'admin' || u.account_type === 'admin' || u.data?.account_type === 'admin'));

    const report = { totalUsers: users.length, nonAdminCount: nonAdmins.length, deletedRecords: {}, userDeletions: [], userDeleteErrors: [] };

    for (const target of nonAdmins) {
      const uid = target.id;

      // Delete owner-owned records
      for (const entity of OWNER_ENTITIES) {
        try {
          const res = await base44.asServiceRole.entities[entity].deleteMany({ owner_user_id: uid });
          report.deletedRecords[entity] = (report.deletedRecords[entity] || 0) + (res?.deleted_count || 0);
        } catch (e) {}
      }

      // Delete tenant-owned records
      for (const entity of TENANT_ENTITIES) {
        if (OWNER_ENTITIES.includes(entity)) continue; // already handled above
        try {
          const res = await base44.asServiceRole.entities[entity].deleteMany({ tenant_user_id: uid });
          report.deletedRecords[entity] = (report.deletedRecords[entity] || 0) + (res?.deleted_count || 0);
        } catch (e) {}
      }

      // Delete user_id-keyed records
      for (const entity of USER_ID_ENTITIES) {
        try {
          const field = entity === 'Tenant' ? 'user_id' : entity === 'AuditLog' ? 'user_id' : 'user_id';
          const res = await base44.asServiceRole.entities[entity].deleteMany({ [field]: uid });
          report.deletedRecords[entity] = (report.deletedRecords[entity] || 0) + (res?.deleted_count || 0);
        } catch (e) {}
      }

      // Delete notifications for this user
      try {
        const res = await base44.asServiceRole.entities.Notification.deleteMany({ recipient_user_id: uid });
        report.deletedRecords.Notification = (report.deletedRecords.Notification || 0) + (res?.deleted_count || 0);
      } catch (e) {}

      // Attempt user account deletion (may be platform-restricted)
      try {
        await base44.asServiceRole.entities.User.delete(uid);
        report.userDeletions.push(target.email || uid);
      } catch (e) {
        report.userDeleteErrors.push({ email: target.email || uid, error: e.message });
      }
    }

    return Response.json({ ok: true, report });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}