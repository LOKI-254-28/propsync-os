export const receiptMoney=value=>new Intl.NumberFormat('en-KE',{style:'currency',currency:'KES',minimumFractionDigits:2,maximumFractionDigits:2}).format(Number(value||0));
export function approvedReceipts(payments,applications=[]) {
  const ledger=payments.filter(p=>p.status==='Successful');
  const bookings=applications.filter(a=>a.payment_status==='Verified'&&Number(a.payment_approved_amount??a.payment_amount)>0).map(a=>({id:`application-${a.id}`,receipt_number:a.payment_receipt_number||`RCP-APP-${a.id.toUpperCase()}`,payment_reference:a.payment_reference||a.application_reference,tenant_name:a.applicant_name,property_name:a.property_name,unit_number:a.unit_number,amount:Number(a.payment_approved_amount??a.payment_amount),payment_date:a.payment_approved_at?new Intl.DateTimeFormat('en-CA',{timeZone:'Africa/Nairobi',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(a.payment_approved_at)):'',method:a.payment_method||'Other',status:'Successful',description:'Application payment',allocations:[]}));
  return [...ledger,...bookings].sort((a,b)=>(b.payment_date||'').localeCompare(a.payment_date||''));
}
export function receiptLines(payment,charges=[]) {
  if(payment.description) return [{label:payment.description,amount:payment.amount}];
  const lines=(payment.allocations||[]).map(a=>{const c=charges.find(c=>c.id===a.charge_id);return {label:`${c?.bill_name||c?.charge_type||'Rent & Service Charge'} (${a.billing_period||c?.billing_period||''})`,amount:Number(a.amount)};});
  const allocated=lines.reduce((sum,line)=>sum+line.amount,0),unallocated=Math.max(0,Number(payment.amount)-allocated);
  if(unallocated>0) lines.push({label:lines.length?'Unallocated payment credit':'Payment received',amount:unallocated});
  return lines;
}