import {receiptDetails} from './receiptDetails.ts';
import {receiptEmailPdf,receiptMoney} from './receiptEmailPdf.ts';
import {registryError} from './documentRegistry.ts';
const escape=value=>String(value||'Not recorded').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
export async function emailReceipt(b,user,body) {
  if(Object.keys(body).some(key=>!['action','payment_id'].includes(key)))throw registryError('Receipt recipients and attachments are chosen by the server.');
  const details=await receiptDetails(b,user,body),sr=b.asServiceRole,{payment}=details;
  if(!details.recipient_email)throw registryError('Link this tenant to a registered account before emailing their receipt.',409);
  const query={action:'Receipt emailed',entity:'Payment',entity_id:payment.id,timestamp:{$gte:new Date(Date.now()-60000).toISOString()}};
  const [recent,daily]=await Promise.all([sr.entities.AuditLog.count(query),sr.entities.AuditLog.count({action:'Receipt emailed',user_id:user.id,timestamp:{$gte:new Date(Date.now()-86400000).toISOString()}})]);
  if(recent||daily>=30)throw registryError(recent?'This receipt was emailed recently. Wait a minute before resending.':'Your daily receipt email limit has been reached.',429);
  const attachment=receiptEmailPdf(details);
  await sr.integrations.Core.SendEmail({to:details.recipient_email,template_name:'PaymentReceipt',variables:{payer_name:escape(details.payer.name),receipt_number:escape(payment.receipt_number||`RCP-${payment.id.toUpperCase()}`),amount:escape(receiptMoney(payment.amount)),property_name:escape(payment.property_name),unit_number:escape(payment.unit_number),payment_date:escape(payment.payment_date),method:escape(payment.method),issuer_name:escape(details.issuer.name),receipt_url:`https://propwiz.co.ke/receipt/${encodeURIComponent(payment.id)}`},attachments:[attachment]});
  await sr.entities.AuditLog.create({user_id:user.id,user_email:user.email,user_role:user.role,action:'Receipt emailed',entity:'Payment',entity_id:payment.id,entity_name:payment.receipt_number||payment.id,timestamp:new Date().toISOString()});
  return {ok:true,message:'Receipt emailed to the tenant’s registered address.'};
}