import { createClientFromRequest } from 'npm:@base44/sdk@0.8.49';
import { addTenancyBill } from '../../shared/tenancyBills.ts';

// Generates monthly rent charges for a landowner's tenancies.
// Runs as service role — validates the user is an approved landowner (or admin),
// loads the specified tenancies, skips duplicates, and bulk-creates via service role.
export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Authentication required' }, { status: 401 });

    const isAdmin = user.role === 'admin';
    const isApprovedLandowner = (user.account_type === 'landowner' || user.data?.account_type === 'landowner')
      && (user.approval_status === 'approved' || user.data?.approval_status === 'approved');
    if (!isAdmin && !isApprovedLandowner) {
      return Response.json({ error: 'Your account may still be awaiting approval.' }, { status: 403 });
    }

    const body = await req.json();
    if (body.action === 'add_bill') return await addTenancyBill(base44.asServiceRole,user,body);
    const { billingPeriod, dueDay = 1, tenancyIds } = body;
    if (typeof billingPeriod!=='string'||!/^\d{4}-(0[1-9]|1[0-2])$/.test(billingPeriod)||!Number.isInteger(dueDay)||dueDay<1||dueDay>28) return Response.json({error:'Choose a billing month and a due day from 1 to 28.'},{status:400});
    if (tenancyIds!=null&&(!Array.isArray(tenancyIds)||tenancyIds.length>500||tenancyIds.some(id=>typeof id!=='string'||id.length>100))) return Response.json({error:'Choose up to 500 valid tenancy references.'},{status:400});

    // Load tenancies — either the specified IDs or all for this owner
    let tenancies = [];
    if (tenancyIds && tenancyIds.length > 0) {
      for (const id of tenancyIds) {
        const t = await base44.asServiceRole.entities.Tenancy.get(id).catch(() => null);
        if (t) {
          // Validate ownership for non-admins
          if (!isAdmin && t.owner_user_id !== user.id) continue;
          tenancies.push(t);
        }
      }
    } else {
      tenancies = await base44.asServiceRole.entities.Tenancy.filter({ owner_user_id: user.id }, '-created_date', 500);
    }

    // Filter to active tenancies
    tenancies = tenancies.filter((t) => ['Active', 'Expiring Soon', 'Notice Given'].includes(t.status));

    // Load existing charges for this billing period to skip duplicates
    const existingCharges = await base44.asServiceRole.entities.RentCharge.filter({ billing_period: billingPeriod }, '-created_date', 1000);
    const existing = new Set(existingCharges.filter(c=>!c.charge_type||c.charge_type==='Rent').map((c) => c.tenancy_id));

    // Build charges
    const [y, m] = billingPeriod.split('-').map(Number);
    const dueDate = `${y}-${String(m).padStart(2, '0')}-${String(dueDay).padStart(2, '0')}`;
    const toCreate = [];
    for (const t of tenancies) {
      if (existing.has(t.id)) continue;
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
        charge_type: 'Rent',
        bill_name: 'Rent & Service Charge',
        due_date: dueDate,
        amount: amt,
        amount_paid: 0,
        outstanding: amt,
        status: 'Unpaid',
        owner_user_id: t.owner_user_id || user.id,
      });
    }

    if (toCreate.length) {
      await base44.asServiceRole.entities.RentCharge.bulkCreate(toCreate);
    }

    // Audit log
    try {
      await base44.asServiceRole.entities.AuditLog.create({
        user_id: user.id,
        user_email: user.email,
        user_role: user.role,
        action: 'Rent Charges Generated',
        entity: 'RentCharge',
        entity_name: billingPeriod,
        new_value: JSON.stringify({ created: toCreate.length, skipped: existing.size }),
        timestamp: new Date().toISOString(),
      });
    } catch (e) {}

    return Response.json({ ok: true, created: toCreate.length, skipped: existing.size });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}