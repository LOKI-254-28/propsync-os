import {nairobiToday} from './nairobiDates.ts';
import scan from './loadAllRecords.ts';
// A verified application covers the deposit first; only its rent portion settles the first rent bill.
export async function reconcileInitialRent(sr,tenancy,create=false) {
  if(!tenancy.application_id||!tenancy.start_date)return null;
  const app=await sr.entities.Application.get(tenancy.application_id);
  if(!app||app.payment_status!=='Verified'||app.tenant_user_id!==tenancy.tenant_user_id||app.unit_id!==tenancy.unit_id)return null;
  const period=tenancy.start_date.slice(0,7);
  const charges=await scan(sr,'RentCharge',{tenancy_id:tenancy.id,billing_period:period});
  let rent=charges.find(c=>c.status!=='Void'&&(!c.charge_type||c.charge_type==='Rent'));
  const amount=Number(rent?.amount??(Number(tenancy.monthly_rent||0)+Number(tenancy.service_charge||0)));
  const approved=Number(app.payment_approved_amount??app.payment_received_amount??app.payment_amount??0);
  const credit=app.booked_occupied?0:Math.max(0,Math.min(amount,approved-Number(tenancy.security_deposit||0)));
  if(!Number.isFinite(amount)||amount<=0||!Number.isFinite(credit))return null;
  if(!rent&&!create)return null;
  const payments=rent?await scan(sr,'Payment',{tenancy_id:tenancy.id,status:'Successful'}):[];
  const allocated=payments.reduce((sum,p)=>sum+(p.allocations||[]).filter(a=>a.charge_id===rent.id).reduce((total,a)=>total+Number(a.amount||0),0),0);
  const paid=Math.min(amount,Math.max(Number(rent?.amount_paid||0),credit+allocated));
  const outstanding=Math.round((amount-paid)*100)/100;
  const dueDate=rent?.due_date||tenancy.start_date;
  const status=outstanding===0?'Paid':paid>0?'Partial':dueDate<nairobiToday()?'Overdue':'Unpaid';
  if(rent) {
    if(paid!==Number(rent.amount_paid||0)||outstanding!==Number(rent.outstanding||0)||status!==rent.status)rent=await sr.entities.RentCharge.update(rent.id,{amount_paid:paid,outstanding,status});
    return rent;
  }
  return await sr.entities.RentCharge.create({tenancy_id:tenancy.id,tenant_id:tenancy.tenant_id,tenant_user_id:tenancy.tenant_user_id,tenant_name:tenancy.tenant_name,property_id:tenancy.property_id,property_name:tenancy.property_name,unit_id:tenancy.unit_id,unit_number:tenancy.unit_number,billing_period:period,due_date:dueDate,charge_type:'Rent',bill_name:'Rent & Service Charge',amount,amount_paid:paid,outstanding,status,owner_user_id:tenancy.owner_user_id,notes:'Initial rent credited from verified application payment; security deposit excluded.'});
}