import {registryError} from './documentRegistry.ts';
import {nairobiToday} from './nairobiDates.ts';
import {safeEmailText,reminderMoney,reminderView} from './rentReminderContext.ts';
export async function queueRentReminder(sr,user,context,{email=false,scheduledPeriod=''}={}){
  if(!(context.amount>0))throw registryError('There is no outstanding balance to remind this tenant about.',409);
  if(!context.tenantUserId)throw registryError('Link this tenant to an app account before issuing a reminder.',409);
  if(email&&!context.email)throw registryError('Email requires the tenant’s linked account address.',409);
  const key=`${context.tenancy.id}:${scheduledPeriod||nairobiToday()}:${email?'email':'in-app'}`;
  const existing=await sr.entities.Notice.filter({reminder_key:key},{limit:1,fields:['id']});
  if(existing.items.length)return {ok:true,duplicate:true,message:'This reminder has already been issued.',notice_id:existing.items[0].id};
  const view=reminderView(context),subject=scheduledPeriod?'Upcoming rent payment reminder':'Outstanding rent payment reminder';
  const content=`Hello ${view.tenant_name}, ${reminderMoney(view.amount)} is outstanding for ${view.property_name}, unit ${view.unit_number}${view.due_date?`, due ${view.due_date}`:''}. Please arrange payment and submit your payment details through your tenant portal. If you have already paid, please contact your landlord.`;
  const variables={tenant_name:safeEmailText(view.tenant_name),property_name:safeEmailText(view.property_name),unit_number:safeEmailText(view.unit_number),amount:safeEmailText(reminderMoney(view.amount)),due_date:safeEmailText(view.due_date),message:safeEmailText(content)};
  const notice=await sr.entities.Notice.create({notice_reference:`NOT-${crypto.randomUUID().slice(0,8).toUpperCase()}`,type:'Rent Reminder',subject,content,date_issued:nairobiToday(),sender:user.email||'PropSync OS',tenancy_id:context.tenancy.id,tenant_id:context.tenant.id,tenant_user_id:context.tenantUserId,tenant_name:view.tenant_name,property_id:context.property.id,property_name:view.property_name,unit_id:context.unit.id,unit_number:view.unit_number,owner_user_id:context.ownerUserId,status:'Issued',channel:email?'Email':'In-app',acknowledged:false,reminder_key:key,email_requested:email,email_status:email?'Queued':'Not requested',recipient_email:email?context.email:'',email_variables:variables});
  await sr.entities.Notification.create({recipient_user_id:context.tenantUserId,type:'Rent Reminder',title:subject,message:content,related_entity:'Notice',related_id:notice.id,action_link:'/portal/notices',date:new Date().toISOString(),read:false});
  await sr.entities.AuditLog.create({user_id:user.id,user_role:user.role,action:'Rent reminder issued',entity:'Notice',entity_id:notice.id,timestamp:new Date().toISOString()});
  return {ok:true,notice_id:notice.id,message:email?'In-app reminder issued; email queued.':'In-app reminder issued.'};
}