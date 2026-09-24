import { createClientFromRequest } from 'npm:@base44/sdk@0.8.49';

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Staff/admin users don't need tenant linking
    if (user.role === 'admin' || user.account_type === 'admin' || user.account_type === 'landowner') return Response.json({ linked: true, role: user.account_type || 'admin' });

    // Already linked?
    const existing = await base44.asServiceRole.entities.Tenant.filter({ user_id: user.id }).then((r) => r[0]);
    if (existing) return Response.json({ linked: true, tenant: existing });

    // Match by email (case-insensitive)
    const tenants = await base44.asServiceRole.entities.Tenant.list('-created_date', 500);
    const match = tenants.find(
      (t) => t.email && user.email && t.email.toLowerCase() === user.email.toLowerCase()
    );
    if (!match) return Response.json({ linked: false, notFound: true });

    // Link the tenant record
    await base44.asServiceRole.entities.Tenant.update(match.id, { user_id: user.id });

    // Link all related records that carry a tenant_id
    const rels = [
      'Tenancy', 'RentCharge', 'Payment', 'Maintenance',
      'Inspection', 'Notice', 'Document', 'Feedback', 'VacationRequest',
    ];
    for (const e of rels) {
      try {
        await base44.asServiceRole.entities[e].updateMany(
          { tenant_id: match.id },
          { $set: { tenant_user_id: user.id } }
        );
      } catch (err) {}
    }

    return Response.json({ linked: true, tenant: { ...match, user_id: user.id } });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}