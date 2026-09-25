import { createClientFromRequest } from 'npm:@base44/sdk@0.8.49';

// Admin-only: approve, reject, or reset a user's approval_status.
// Notifies the affected user and logs an audit entry.
export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const caller = await base44.auth.me();
    if (!caller) return Response.json({ error: 'Authentication required' }, { status: 401 });

    const isAdmin = caller.role === 'admin' || caller.account_type === 'admin';
    if (!isAdmin) return Response.json({ error: 'Admin access required' }, { status: 403 });

    const body = await req.json();
    const { userId, status, reason } = body;

    if (!userId || !status) return Response.json({ error: 'userId and status are required' }, { status: 400 });
    if (!['approved', 'rejected', 'pending'].includes(status)) {
      return Response.json({ error: 'Invalid status. Use approved, rejected, or pending.' }, { status: 400 });
    }

    const users = await base44.asServiceRole.entities.User.list('-created_date', 500);
    const user = users.find((u) => u.id === userId);
    if (!user) return Response.json({ error: 'User not found' }, { status: 404 });

    await base44.asServiceRole.entities.User.update(user.id, { approval_status: status });

    // Notify the user
    try {
      const title = status === 'approved' ? 'Account Approved' : status === 'rejected' ? 'Application Rejected' : 'Status Updated';
      let message = 'Your account status has been updated.';
      if (status === 'approved') message = 'Your account has been approved. You can now access the platform.';
      if (status === 'rejected') message = `Your application has been rejected.${reason ? ' Reason: ' + reason : ''}`;
      await base44.asServiceRole.entities.Notification.create({
        recipient_user_id: user.id,
        type: 'Approval',
        title,
        message,
        date: new Date().toISOString(),
        read: false,
      });
    } catch (e) {}

    // Audit log
    try {
      await base44.asServiceRole.entities.AuditLog.create({
        user_id: caller.id,
        user_email: caller.email,
        user_role: caller.role,
        action: `User ${status}`,
        entity: 'User',
        entity_id: user.id,
        entity_name: user.email,
        new_value: status,
        timestamp: new Date().toISOString(),
      });
    } catch (e) {}

    return Response.json({ ok: true, user: { id: user.id, email: user.email, approval_status: status } });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}