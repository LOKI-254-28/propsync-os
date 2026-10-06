import { nairobiToday } from './nairobiDates.ts';
export function reviewError(message,status=400) { return Object.assign(new Error(message),{status}); }
export function threeMonthDate(start) {
  if (typeof start !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(start)) return null;
  const original=new Date(`${start}T00:00:00Z`);
  if (!Number.isFinite(original.getTime()) || original.toISOString().slice(0,10)!==start) return null;
  const next=new Date(Date.UTC(original.getUTCFullYear(),original.getUTCMonth()+3,1));
  const last=new Date(Date.UTC(next.getUTCFullYear(),next.getUTCMonth()+1,0)).getUTCDate();
  next.setUTCDate(Math.min(original.getUTCDate(),last));return next.toISOString().slice(0,10);
}
export async function tenancyEligibility(sr,user,tenancy) {
  if (tenancy.tenant_user_id !== user.id) throw reviewError('Only the tenant associated with this tenancy can review it.',403);
  const eligibleDate=threeMonthDate(tenancy.start_date);
  const result={eligible:false,eligible_date:eligibleDate};
  if (!['Active','Expiring Soon','Notice Given'].includes(tenancy.status)) return {...result,reason:'Reviews can be submitted from a current approved tenancy.'};
  if (!eligibleDate || nairobiToday()<eligibleDate) return {...result,reason:eligibleDate?`Eligible from ${eligibleDate}, after three calendar months of tenancy.`:'A valid tenancy start date is required.'};
  let application=tenancy.application_id ? await sr.entities.Application.get(tenancy.application_id) : (await sr.entities.Application.filter({tenancy_id:tenancy.id,status:'Completed'},'-created_date',1))[0];
  if (!application) application=(await sr.entities.Application.filter({tenant_user_id:user.id,unit_id:tenancy.unit_id,status:'Completed',proposed_start_date:tenancy.start_date},'-created_date',10)).find(a=>!a.tenancy_id || a.tenancy_id===tenancy.id);
  if (!application || application.status!=='Completed' || application.tenant_user_id!==user.id || application.unit_id!==tenancy.unit_id || application.property_id!==tenancy.property_id) return {...result,reason:'A completed application linked to this tenancy is required.'};
  const verifiedApplication=application.payment_status==='Verified' && Number(application.payment_amount)>0 && Number(application.payment_amount)>=Number(tenancy.monthly_rent);
  const rentCharges=verifiedApplication?[]:await sr.entities.RentCharge.filter({tenancy_id:tenancy.id,tenant_user_id:user.id,status:'Paid',owner_user_id:tenancy.owner_user_id},'-due_date',100);
  const verifiedRent=verifiedApplication || rentCharges.some(c=>Number(c.amount)>0 && Number(c.amount)>=Number(tenancy.monthly_rent) && Number(c.amount_paid)>=Number(c.amount));
  return verifiedRent ? {...result,eligible:true,reason:'Eligible to submit a property review and a separate tenancy-experience review.'} : {...result,reason:'Verified rent payment is required before submitting a review.'};
}