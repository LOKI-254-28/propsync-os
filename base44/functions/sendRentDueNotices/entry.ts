import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

// Scheduled monthly rent-due notices.
// Fires on the 27th of each month (5 days before the 1st). For every active
// tenancy it idempotently creates that month's RentCharge, then sends a
// branded rent-due email and an in-app Notice to the tenant.
// Runs as the service role. A logged-in non-admin invoking it directly gets 403;
// a scheduled run (no user) is allowed through.
export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (user && user.role !== 'admin' && user.account_type !== 'admin') {
      return Response.json({ error: 'Admin only' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    // billingPeriod defaults to the upcoming month (the month whose 1st is the due date)
    let billingPeriod = body.billingPeriod;
    if (!billingPeriod) {
      const d = new Date();
      const y = d.getUTCFullYear();
      const m = d.getUTCMonth(); // 0-indexed
      const ny = m === 11 ? y + 1 : y;
      const nm = m === 11 ? 0 : m + 1;
      billingPeriod = `${ny}-${String(nm + 1).padStart(2, '0')}`;
    }
    const dueDate = `${billingPeriod}-01`;

    // Active tenancies across all owners
    const tenancies = await base44.asServiceRole.entities.Tenancy.filter({}, '-created_date', 1000);
    const active = tenancies.filter((t) => ['Active', 'Expiring Soon', 'Notice Given'].includes(t.status));

    // Skip charges that already exist for this billing period
    const existingCharges = await base44.asServiceRole.entities.RentCharge.filter({ billing_period: billingPeriod }, '-created_date', 1000);
    const existing = new Set(existingCharges.map((c) => c.tenancy_id));

    // Tenant emails (Tenant.email keyed by tenant id)
    const tenants = await base44.asServiceRole.entities.Tenant.list('-created_date', 1000);
    const emailByTenantId = new Map(tenants.map((t) => [t.id, t.email]));

    const toCreate = [];
    const reminders = []; // { tenancy, email }
    for (const t of active) {
      if (!existing.has(t.id)) {
        const amt = Number(t.monthly_rent || 0) + Number(t.service_charge || 0);
        toCreate.push({
          tenancy_id: t.id,
          tenant_id: t.tenant_id,
          tenant_user_id: t.tenant_user_id,
          tenant_name: t.tenant_name,
          property_id: t.property_id,
          property_name: t.property_name,
          unit_id: t.unit_id,
          unit_number: t.unit_number,
          billing_period: billingPeriod,
          due_date: dueDate,
          amount: amt,
          amount_paid: 0,
          outstanding: amt,
          status: 'Unpaid',
          owner_user_id: t.owner_user_id || '',
        });
      }
      if (t.tenant_user_id) {
        reminders.push({ tenancy: t, email: emailByTenantId.get(t.tenant_id) || '' });
      }
    }

    if (toCreate.length) {
      await base44.asServiceRole.entities.RentCharge.bulkCreate(toCreate);
    }

    const today = new Date().toISOString().slice(0, 10);
    let emailed = 0;
    let noticed = 0;
    for (const { tenancy, email } of reminders) {
      const subject = `Rent due ${dueDate} — ${tenancy.unit_number}`;
      const message = `Your rent of ${tenancy.property_name} — ${tenancy.unit_number} for ${billingPeriod} is due on ${dueDate}. Please pay on time to avoid arrears.`;

      // In-app Notice
      try {
        await base44.asServiceRole.entities.Notice.create({
          type: 'Rent Reminder',
          subject,
          content: message,
          date_issued: today,
          sender: 'PropWiz',
          property_id: tenancy.property_id,
          property_name: tenancy.property_name,
          unit_id: tenancy.unit_id,
          unit_number: tenancy.unit_number,
          tenant_id: tenancy.tenant_id,
          tenant_user_id: tenancy.tenant_user_id,
          tenant_name: tenancy.tenant_name,
          tenancy_id: tenancy.id,
          status: 'Issued',
          channel: 'In-app',
          acknowledged: false,
          owner_user_id: tenancy.owner_user_id || '',
        });
        noticed++;
      } catch (e) {}

      // Branded email
      if (email) {
        const origin = new URL(req.url).origin;
        const link = `${origin}/portal/rent`;
        const html = `
          <div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#0f172a;">
            <div style="background:#065f46;padding:20px 24px;border-radius:10px 10px 0 0;">
              <span style="font-size:20px;font-weight:700;color:#fff;">PropWiz</span>
            </div>
            <div style="border:1px solid #e2e8f0;border-top:none;border-radius:0 0 10px 10px;padding:24px;">
              <h1 style="font-size:18px;margin:0 0 8px;">Rent due reminder</h1>
              <p style="font-size:15px;margin:0 0 4px;"><strong>${tenancy.property_name}</strong> — Unit ${tenancy.unit_number}</p>
              <p style="font-size:14px;color:#475569;margin:8px 0 12px;">Your rent for <strong>${billingPeriod}</strong> is due on <strong>${dueDate}</strong>. Please make your payment on time to avoid arrears.</p>
              <a href="${link}" style="display:inline-block;background:#059669;color:#fff;text-decoration:none;font-weight:600;padding:12px 22px;border-radius:8px;font-size:14px;">View your rent</a>
            </div>
            <p style="font-size:11px;color:#94a3b8;text-align:center;margin-top:12px;">© ${new Date().getFullYear()} PropWiz. Rentals made simple.</p>
          </div>`;
        try {
          await base44.asServiceRole.integrations.Core.SendEmail({
            to: email,
            from_name: 'PropWiz',
            subject,
            text: `${message}\n\nView your rent: ${link}`,
            html,
          });
          emailed++;
        } catch (e) {}
      }
    }

    try {
      await base44.asServiceRole.entities.AuditLog.create({
        user_id: user?.id || '',
        user_email: user?.email || 'system',
        user_role: user?.role || 'system',
        action: 'Rent Due Notices Sent',
        entity: 'RentCharge',
        entity_name: billingPeriod,
        new_value: JSON.stringify({ charges_created: toCreate.length, notices: noticed, emailed }),
        timestamp: new Date().toISOString(),
      });
    } catch (e) {}

    return Response.json({ ok: true, billingPeriod, charges_created: toCreate.length, notices: noticed, emailed });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}