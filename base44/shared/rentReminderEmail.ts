import {registryError} from './documentRegistry.ts';
import {paymentContext} from './paymentContext.ts';
export async function rentReminderEmail(sr,user,body){
  if(user.role!=='admin')throw registryError('Admin only.',403);
  if(typeof body.notice_id!=='string'||!/^[a-zA-Z0-9_-]{1,100}$/.test(body.notice_id))throw registryError('Choose a reminder notice.');
  const notice=await sr.entities.Notice.get(body.notice_id);
  if(notice.type!=='Rent Reminder'||!notice.email_requested||!notice.recipient_email||notice.email_status==='Sent')return {should_send:false};
  const context=await paymentContext(sr,notice.tenancy_id);
  if(context.ownerUserId!==notice.owner_user_id||context.tenantUserId!==notice.tenant_user_id)throw registryError('The reminder account links are inconsistent.',409);
  const account=await sr.entities.User.get(context.tenantUserId);
  if(account.email!==notice.recipient_email)throw registryError('The tenant’s registered address has changed. Issue a new reminder.',409);
  if(body.action==='email_delivered'){await sr.entities.Notice.update(notice.id,{email_status:'Sent'});return {ok:true};}
  return {should_send:true,to:account.email,variables:notice.email_variables};
}