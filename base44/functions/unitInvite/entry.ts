import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

// Unit rental invitations: send invite email, or accept an invite and create a tenancy.

function addMonths(dateStr, n) {
  const d = new Date(dateStr);
  d.setMonth(d.getMonth() + n);
  return d.toISOString().slice(0, 10);
}

function genRef(prefix) {
  return `${prefix}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
}

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Authentication required' }, { status: 401 });

    const body = await req.json();
    const { action } = body;

    // ---- Send an invite email to a prospective tenant ----
    if (action === 'send') {
      const { unit_id, email } = body;
      if (!unit_id || !email) return Response.json({ error: 'Unit and email are required' }, { status: 400 });

      const unit = await base44.asServiceRole.entities.Unit.get(unit_id).catch(() => null);
      if (!unit) return Response.json({ error: 'Unit not found' }, { status: 404 });

      const isAdmin = user.role === 'admin' || user.account_type === 'admin';
      if (!isAdmin && unit.owner_user_id !== user.id) {
        return Response.json({ error: 'You do not own this unit' }, { status: 403 });
      }

      const origin = new URL(req.url).origin;
      const link = `${origin}/accept-invite?code=${unit.invite_code}`;
      const subject = `You're invited to rent ${unit.property_name} — ${unit.unit_number}`;
      const text = `You've been invited to rent ${unit.property_name}, unit ${unit.unit_number}.\n\nAccept your invitation and create your account here:\n${link}`;
      const html = `
        <div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#0f172a;">
          <div style="background:#065f46;padding:20px 24px;border-radius:10px 10px 0 0;">
            <span style="font-size:20px;font-weight:700;color:#fff;">PropWiz</span>
          </div>
          <div style="border:1px solid #e2e8f0;border-top:none;border-radius:0 0 10px 10px;padding:24px;">
            <h1 style="font-size:18px;margin:0 0 8px;">You're invited to rent</h1>
            <p style="font-size:15px;margin:0 0 4px;"><strong>${unit.property_name}</strong> — Unit ${unit.unit_number}</p>
            <p style="font-size:14px;color:#475569;margin:8px 0 16px;">Your landlord has invited you to tenancy on PropWiz. Accept the invitation to create your account and move in.</p>
            <a href="${link}" style="display:inline-block;background:#059669;color:#fff;text-decoration:none;font-weight:600;padding:12px 22px;border-radius:8px;font-size:14px;">Accept invitation</a>
            <p style="font-size:12px;color:#94a3b8;margin:16px 0 0;">If the button doesn't work, copy this link: ${link}</p>
          </div>
          <p style="font-size:11px;color:#94a3b8;text-align:center;margin-top:12px;">© ${new Date().getFullYear()} PropWiz. Rentals made simple.</p>
        </div>`;
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: email,
        from_name: 'PropWiz',
        subject,
        text,
        html,
      });

      return Response.json({ ok: true });
    }

    // ---- Accept an invite: auto-create tenancy, bypass admin approval ----
    if (action === 'accept') {
      const { invite_code } = body;
      if (!invite_code) return Response.json({ error: 'Invite code is required' }, { status: 400 });

      const units = await base44.asServiceRole.entities.Unit.filter({ invite_code: String(invite_code).toUpperCase() });
      const unit = units[0];
      if (!unit) return Response.json({ error: 'Invalid invite code' }, { status: 404 });

      // If the unit is already occupied, allow only the same user to re-enter (idempotent)
      if (unit.status === 'Occupied' && unit.current_tenancy_id) {
        const existing = await base44.asServiceRole.entities.Tenancy.get(unit.current_tenancy_id).catch(() => null);
        if (existing && existing.tenant_user_id === user.id) {
          return Response.json({ ok: true, tenancy: existing, unit });
        }
        return Response.json({ error: 'This unit has already been taken' }, { status: 409 });
      }

      // Create or reuse the Tenant record for this user
      let tenant = (await base44.asServiceRole.entities.Tenant.filter({ user_id: user.id }))[0];
      if (!tenant) {
        tenant = await base44.asServiceRole.entities.Tenant.create({
          user_id: user.id,
          full_name: user.full_name || user.email,
          email: user.email,
          status: 'Active',
          profile_type: 'tenant',
        });
      }

      const startDate = body.start_date || new Date().toISOString().slice(0, 10);
      const termMonths = Number(body.term_months) || 12;
      const tenancy = await base44.asServiceRole.entities.Tenancy.create({
        tenancy_reference: genRef('TEN'),
        tenant_id: tenant.id,
        tenant_name: tenant.full_name,
        tenant_user_id: user.id,
        property_id: unit.property_id,
        property_name: unit.property_name,
        unit_id: unit.id,
        unit_number: unit.unit_number,
        start_date: startDate,
        expected_end_date: addMonths(startDate, termMonths),
        monthly_rent: unit.monthly_rent || 0,
        security_deposit: unit.security_deposit || 0,
        service_charge: unit.service_charge || 0,
        status: 'Active',
        owner_user_id: unit.owner_user_id,
      });

      await base44.asServiceRole.entities.Unit.update(unit.id, {
        status: 'Occupied',
        current_tenancy_id: tenancy.id,
        current_tenant_name: tenant.full_name,
      });

      try {
        await base44.asServiceRole.entities.AuditLog.create({
          user_id: user.id,
          user_email: user.email,
          user_role: user.role,
          action: 'Tenancy Auto-Created (invite)',
          entity: 'Tenancy',
          entity_id: tenancy.id,
          entity_name: tenancy.tenancy_reference,
          timestamp: new Date().toISOString(),
        });
      } catch (e) {}

      return Response.json({ ok: true, tenancy, unit });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}