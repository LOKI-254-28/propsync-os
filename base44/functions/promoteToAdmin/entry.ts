import { createClientFromRequest } from 'npm:@base44/sdk@0.8.49';
import { secrets } from 'base44:runtime';

// Promotes a user to admin. Two paths:
// 1. Existing admin calls with { email } — promotes any registered user.
// 2. Bootstrap path: { email, bootstrapSecret } — only works if NO admin exists
//    and the secret matches BOOTSTRAP_ADMIN_SECRET and email matches BOOTSTRAP_ADMIN_EMAIL.
// Public registration never sets account_type=admin; this is the only way to become admin.
export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { email, bootstrapSecret } = body;

    if (!email) return Response.json({ error: 'Email is required' }, { status: 400 });

    // Path 1: existing admin
    const caller = await base44.auth.me();
    const callerIsAdmin = caller?.role === 'admin';

    if (callerIsAdmin) {
      return await doPromote(base44, caller, email);
    }

    // Path 2: bootstrap (first admin only)
    const envSecret = secrets.get("BOOTSTRAP_ADMIN_SECRET");
    const envEmail = secrets.get("BOOTSTRAP_ADMIN_EMAIL");

    if (!bootstrapSecret || !envSecret || bootstrapSecret !== envSecret) {
      return Response.json({ error: 'Unauthorized — admin access required.' }, { status: 403 });
    }

    // Verify no admin exists yet
    const admins = await base44.asServiceRole.entities.User.filter({role:'admin'},'-created_date',1);
    const hasAdmin = admins.length > 0;
    if (hasAdmin) {
      return Response.json({ error: 'An admin already exists. Bootstrap is closed — ask an existing admin to promote you.' }, { status: 403 });
    }

    // Verify email matches the configured bootstrap email
    if (envEmail && email.toLowerCase() !== envEmail.toLowerCase()) {
      return Response.json({ error: 'Email does not match the configured bootstrap email.' }, { status: 403 });
    }

    return await doPromote(base44, { id: 'bootstrap', email: 'system', role: 'admin' }, email);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

async function doPromote(base44, caller, email) {
  const users = await base44.asServiceRole.entities.User.list('-created_date', 500);
  const user = users.find((u) => u.email && u.email.toLowerCase() === email.toLowerCase());
  if (!user) return Response.json({ error: 'User not found. They must register first.' }, { status: 404 });

  await base44.asServiceRole.entities.User.update(user.id, {
    role: 'admin',
    account_type: 'admin',
    approval_status: 'approved',
  });

  try {
    await base44.asServiceRole.entities.AuditLog.create({
      user_id: caller.id,
      user_email: caller.email,
      user_role: 'admin',
      action: 'User Promoted to Admin',
      entity: 'User',
      entity_id: user.id,
      entity_name: user.email,
      timestamp: new Date().toISOString(),
    });
  } catch (e) {}

  return Response.json({ ok: true, message: `${email} promoted to admin` });
}