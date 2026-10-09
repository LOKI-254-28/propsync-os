import {paymentContext,paymentManager} from './paymentContext.ts';
import {registryError} from './documentRegistry.ts';
import {nairobiToday} from './nairobiDates.ts';
export const reminderMoney=value=>new Intl.NumberFormat('en-KE',{style:'currency',currency:'KES',maximumFractionDigits:2}).format(Number(value||0));
export const safeEmailText=value=>String(value||'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
export async function rentReminderContext(sr,user,body){
  const context=await paymentContext(sr,body.tenancy_id);
  if(!paymentManager(user,context))throw registryError('This tenancy is not yours.',403);
  const query={tenancy_id:context.tenancy.id,owner_user_id:context.ownerUserId,status:{$nin:['Paid','Void']},outstanding:{$gt:0},...(body.upcoming?{billing_period:body.upcoming}:{due_date:{$lt:nairobiToday()}})};
  const aggregate=await sr.entities.RentCharge.aggregate({query,sum:'outstanding',min:'due_date'}),row=aggregate.rows[0]||{};
  const account=context.tenantUserId?await sr.entities.User.get(context.tenantUserId):null;
  return {...context,amount:Number(row.sum_outstanding||0),dueDate:row.min_due_date||'',chargeCount:row.count||0,email:account?.email||'',phone:account?.phone||context.tenant.phone||''};
}
export function reminderView(context){
  let phone=String(context.phone||'').replace(/\D/g,'');if(/^0[17]\d{8}$/.test(phone))phone=`254${phone.slice(1)}`;if(!/^[1-9]\d{7,14}$/.test(phone))phone='';
  return {tenancy_id:context.tenancy.id,tenant_name:context.tenancy.tenant_name||context.tenant.full_name,property_name:context.property.name||context.tenancy.property_name,unit_number:context.unit.unit_number,amount:context.amount,due_date:context.dueDate,charge_count:context.chargeCount,email_available:!!context.email,in_app_available:!!context.tenantUserId,phone};
}