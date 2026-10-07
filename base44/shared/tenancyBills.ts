import {reconcileInitialRent} from './initialRent.ts';
export async function addTenancyBill(sr,user,body) {
  const {tenancyId,billingPeriod,dueDate,chargeType,billName,amount}=body;
  const types=['Garbage Collection','Water','Electricity','Internet','Parking','Security','Other'];
  if(typeof tenancyId!=='string'||tenancyId.length>100||!/^\d{4}-(0[1-9]|1[0-2])$/.test(billingPeriod||'')||!types.includes(chargeType)||!Number.isFinite(amount)||amount<=0||amount>100000000) return Response.json({error:'Choose a tenancy, billing month, bill type and positive amount.'},{status:400});
  if(typeof dueDate!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(dueDate)||!Number.isFinite(Date.parse(dueDate))||new Date(dueDate).toISOString().slice(0,10)!==dueDate) return Response.json({error:'Choose a valid due date.'},{status:400});
  if(typeof billName!=='string'||!billName.trim()||billName.length>120) return Response.json({error:'Enter a bill name of up to 120 characters.'},{status:400});
  const tenancy=await sr.entities.Tenancy.get(tenancyId);
  if(!tenancy||(user.role!=='admin'&&tenancy.owner_user_id!==user.id)) return Response.json({error:'You can only add bills to your own tenancies.'},{status:403});
  if(!['Active','Expiring Soon','Notice Given'].includes(tenancy.status)) return Response.json({error:'Choose an active tenancy.'},{status:400});
  const rounded=Math.round(amount*100)/100;
  if(rounded<=0) return Response.json({error:'The amount must be at least KES 0.01.'},{status:400});
  await reconcileInitialRent(sr,tenancy);
  const charge=await sr.entities.RentCharge.create({tenancy_id:tenancy.id,tenant_id:tenancy.tenant_id,tenant_user_id:tenancy.tenant_user_id,tenant_name:tenancy.tenant_name,property_id:tenancy.property_id,property_name:tenancy.property_name,unit_id:tenancy.unit_id,unit_number:tenancy.unit_number,billing_period:billingPeriod,due_date:dueDate,charge_type:chargeType,bill_name:billName.trim(),amount:rounded,amount_paid:0,outstanding:rounded,status:'Unpaid',owner_user_id:tenancy.owner_user_id||user.id});
  return Response.json({charge});
}