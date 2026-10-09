import {registryError} from './documentRegistry.ts';
import {paymentContext,validatePaymentLinks} from './paymentContext.ts';
export async function receiptContext(b,user,body) {
  if(typeof body.payment_id!=='string'||!/^(application-)?[a-zA-Z0-9_-]{1,100}$/.test(body.payment_id))throw registryError('Choose a payment receipt.');
  const sr=b.asServiceRole,booking=body.payment_id.startsWith('application-');
  const record=await sr.entities[booking?'Application':'Payment'].get(booking?body.payment_id.slice(12):body.payment_id);
  if(user.role!=='admin'&&record.tenant_user_id!==user.id&&record.owner_user_id!==user.id)throw registryError('You cannot access this receipt.',403);
  if(booking?record.payment_status!=='Verified':record.status!=='Successful')throw registryError('Receipts are available only for verified payments.',409);
  let context;
  if(booking){
    const unit=await sr.entities.Unit.get(record.unit_id),property=await sr.entities.Property.get(unit.property_id);
    const tenant=record.tenant_id?await sr.entities.Tenant.get(record.tenant_id):null;
    if(record.property_id!==property.id||record.owner_user_id!==property.owner_user_id||(tenant?.user_id&&tenant.user_id!==record.tenant_user_id))throw registryError('The application account links are inconsistent.',409);
    context={unit,property,tenant,ownerUserId:property.owner_user_id,tenantUserId:record.tenant_user_id};
  }else{context=await paymentContext(sr,record.tenancy_id);validatePaymentLinks(record,context);}
  if(user.role!=='admin'&&user.id!==context.tenantUserId&&user.id!==context.ownerUserId)throw registryError('You cannot access this receipt.',403);
  const payment=booking?{id:body.payment_id,amount:Number(record.payment_approved_amount??record.payment_amount),payment_date:record.payment_approved_at?new Intl.DateTimeFormat('en-CA',{timeZone:'Africa/Nairobi',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(record.payment_approved_at)):'',method:record.payment_method||'Other',payment_reference:record.payment_reference||record.application_reference,receipt_number:record.payment_receipt_number||`RCP-APP-${record.id.toUpperCase()}`,description:'Application payment',allocations:[],status:'Successful'}:Object.fromEntries(['id','amount','payment_date','method','payment_reference','receipt_number','allocations','status','recorded_by'].map(key=>[key,record[key]]));
  payment.tenant_name=context.tenant?.full_name||record.applicant_name||record.tenant_name;payment.property_name=context.property.name||record.property_name;payment.unit_number=context.unit.unit_number;
  if(!Number.isFinite(payment.amount)||payment.amount<=0||(payment.allocations||[]).length>100)throw registryError('This receipt needs a payment review.',409);
  return {record,payment,booking,...context};
}