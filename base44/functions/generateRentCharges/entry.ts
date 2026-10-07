import { createClientFromRequest } from 'npm:@base44/sdk@0.8.49';
import { addTenancyBill } from '../../shared/tenancyBills.ts';
import {reconcileInitialRent} from '../../shared/initialRent.ts';
import loadAllRecords from '../../shared/loadAllRecords.ts';

// Generates monthly rent charges for a landowner's tenancies.
// Runs as service role — validates the user is an approved landowner (or admin),
// loads the specified tenancies, skips duplicates, and bulk-creates via service role.
export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Authentication required' }, { status: 401 });

    const body = await req.json();
    const isAdmin = user.role === 'admin';
    if(body.action==='reconcile_rent') {
      const ids=body.tenancyIds;
      if(!Array.isArray(ids)||ids.length>100||ids.some(id=>typeof id!=='string'||id.length>100))return Response.json({error:'Choose up to 100 valid tenancies.'},{status:400});
      if(!ids.length)return Response.json({reconciled:0});
      const query={id:{$in:ids},...(!isAdmin?{$or:[{owner_user_id:user.id},{tenant_user_id:user.id}]}:{})};
      const records=await loadAllRecords(base44.asServiceRole,'Tenancy',query);
      if(records.length!==new Set(ids).size)return Response.json({error:'You can only reconcile your own tenancies.'},{status:403});
      let reconciled=0;
      for(let i=0;i<records.length;i+=5) {
        const results=await Promise.all(records.slice(i,i+5).map(t=>reconcileInitialRent(base44.asServiceRole,t)));
        reconciled+=results.filter(Boolean).length;
      }
      return Response.json({reconciled});
    }
    const isApprovedLandowner = (user.account_type === 'landowner' || user.data?.account_type === 'landowner')
      && (user.approval_status === 'approved' || user.data?.approval_status === 'approved');
    if (!isAdmin && !isApprovedLandowner) {
      return Response.json({ error: 'Your account may still be awaiting approval.' }, { status: 403 });
    }

    if (body.action === 'add_bill') return await addTenancyBill(base44.asServiceRole,user,body);
    const { billingPeriod, dueDay = 1, tenancyIds } = body;
    if (typeof billingPeriod!=='string'||!/^\d{4}-(0[1-9]|1[0-2])$/.test(billingPeriod)||!Number.isInteger(dueDay)||dueDay<1||dueDay>28) return Response.json({error:'Choose a billing month and a due day from 1 to 28.'},{status:400});
    if (tenancyIds!=null&&(!Array.isArray(tenancyIds)||tenancyIds.length>500||tenancyIds.some(id=>typeof id!=='string'||id.length>100))) return Response.json({error:'Choose up to 500 valid tenancy references.'},{status:400});

    // Load tenancies — either the specified IDs or all for this owner
    if(Array.isArray(tenancyIds)&&!tenancyIds.length)return Response.json({ok:true,created:0,skipped:0});
    let tenancies = await loadAllRecords(base44.asServiceRole,'Tenancy',{
      ...(tenancyIds?{id:{$in:tenancyIds}}:{}),
      ...(!isAdmin?{owner_user_id:user.id}:{})
    });

    // Filter to active tenancies
    tenancies = tenancies.filter((t) => ['Active', 'Expiring Soon', 'Notice Given'].includes(t.status)&&(!t.start_date||t.start_date.slice(0,7)<=billingPeriod)&&(!t.actual_end_date||t.actual_end_date>`${billingPeriod}-01`));
    let initialCreated=0;
    for(let i=0;i<tenancies.length;i+=5) {
      await Promise.all(tenancies.slice(i,i+5).filter(t=>t.start_date?.slice(0,7)===billingPeriod).map(async t=>{
        const previous=await loadAllRecords(base44.asServiceRole,'RentCharge',{tenancy_id:t.id,billing_period:billingPeriod});
        const rent=await reconcileInitialRent(base44.asServiceRole,t,true);
        if(rent&&!previous.some(c=>c.status!=='Void'&&(!c.charge_type||c.charge_type==='Rent')))initialCreated++;
      }));
    }
    if(!tenancies.length)return Response.json({ok:true,created:0,skipped:0});

    // Load existing charges for this billing period to skip duplicates
    const existingCharges = await loadAllRecords(base44.asServiceRole,'RentCharge',{billing_period:billingPeriod,tenancy_id:{$in:tenancies.map(t=>t.id)}});
    const existing = new Set(existingCharges.filter(c=>c.status!=='Void'&&(!c.charge_type||c.charge_type==='Rent')).map((c) => c.tenancy_id));

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
        new_value: JSON.stringify({ created: toCreate.length+initialCreated, skipped: existing.size-initialCreated }),
        timestamp: new Date().toISOString(),
      });
    } catch (e) {}

    return Response.json({ ok: true, created: toCreate.length+initialCreated, skipped: existing.size-initialCreated });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}