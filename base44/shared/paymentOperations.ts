import {registryError} from './documentRegistry.ts';
import {paymentContext,paymentManager,validatePaymentLinks} from './paymentContext.ts';
import {allocateRecordedPayment} from './paymentAllocation.ts';
export async function paymentOperation(sr,user,body) {
  const approving=body.action==='approve_payment';
  const allowed=approving?['action','payment_id']:['action','tenancy_id','amount','method','payment_date'];
  if(Object.keys(body).some(key=>!allowed.includes(key)))throw registryError('Payment accounts and verification are assigned by the server.');
  if(approving&&(typeof body.payment_id!=='string'||!/^[a-zA-Z0-9_-]{1,100}$/.test(body.payment_id)))throw registryError('Choose a payment.');
  const existing=approving?await sr.entities.Payment.get(body.payment_id):null;
  const context=await paymentContext(sr,existing?.tenancy_id||body.tenancy_id),manager=paymentManager(user,context);
  if(!manager&&(approving||context.tenantUserId!==user.id))throw registryError('Only the property owner or admin can verify this payment.',403);
  if(existing){
    validatePaymentLinks(existing,context);
    if(existing.status==='Successful')return {payment:existing,already_approved:true};
    if(existing.status!=='Pending')throw registryError('Only pending payments can be verified.',409);
  }
  const amount=Number(existing?.amount??body.amount),method=existing?.method??body.method,date=existing?.payment_date??body.payment_date;
  if(!Number.isFinite(amount)||amount<=0||amount>1e9||Math.abs(Math.round(amount*100)-amount*100)>1e-6||!['M-Pesa','Bank Transfer','Card','Cash','Manual Adjustment','Other'].includes(method)||typeof date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(date)||Number.isNaN(Date.parse(date)))throw registryError('Enter a valid amount, payment date and method.');
  const {tenant,tenancy,unit,property,tenantUserId,ownerUserId}=context;
  const payment=existing||await sr.entities.Payment.create({payment_reference:`PAY-${crypto.randomUUID()}`,tenant_id:tenant.id,tenant_user_id:tenantUserId,tenant_name:tenant.full_name,tenancy_id:tenancy.id,property_id:property.id,property_name:property.name||tenancy.property_name,unit_id:unit.id,unit_number:unit.unit_number,amount,payment_date:date,method,status:'Pending',allocations:[],recorded_by:user.email,owner_user_id:ownerUserId});
  const result=manager?await allocateRecordedPayment(sr,payment):{payment,allocations:[],unallocated:amount};
  if(!manager&&ownerUserId)await sr.entities.Notification.create({recipient_user_id:ownerUserId,type:'Payment',title:'Payment awaiting verification',message:'A tenant has submitted a payment for your review.',related_entity:'Payment',related_id:payment.id,action_link:'/rent',date:new Date().toISOString(),read:false});
  return result;
}