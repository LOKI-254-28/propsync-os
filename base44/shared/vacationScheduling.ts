import {registryError} from './documentRegistry.ts';
import {nairobiToday} from './nairobiDates.ts';
import {liveTenancy} from './vacationAccess.ts';
export function validateReleaseAt(value){
  const at=typeof value==='string'&&value.length<=40?new Date(value):new Date(NaN),now=Date.now();
  if(!Number.isFinite(at.getTime())||!/(Z|[+-]\d{2}:\d{2})$/.test(value)||at.getTime()<now-60000||at.getTime()>now+730*86400000)throw registryError('Choose a date and time from now up to two years ahead, including a timezone.');
  return at;
}
export async function scheduleVacation(sr,user,body,notice,access){
  if(!access.manager)throw registryError('Only the property landlord or an admin can schedule disconnection.',403);
  if(!liveTenancy.includes(access.tenancy.status)||['Completed','Rejected'].includes(notice.status))throw registryError('Choose an open notice for an active tenancy.',409);
  if(body.action==='cancel_schedule')return {scheduled_release_status:'Cancelled',scheduled_release_token:crypto.randomUUID()};
  if(body.action==='confirm_handover'){
    if(!['Scheduled','Awaiting Handover'].includes(notice.scheduled_release_status)||body.handover_confirmed!==true)throw registryError('Confirm an actual handover for the scheduled tenancy.');
    return {handover_confirmed_at:new Date().toISOString(),handover_confirmed_by:user.id,scheduled_release_status:'Scheduled',scheduled_release_token:crypto.randomUUID()};
  }
  const at=validateReleaseAt(body.release_at);
  const date=nairobiToday(at);
  if(date<notice.date_submitted||access.tenancy.start_date&&date<access.tenancy.start_date)throw registryError('The release cannot precede the tenancy or notice.');
  if((date<notice.calculated_notice_expiry||date<notice.proposed_vacation_date)&&body.early_exit_agreed!==true)throw registryError('Confirm the agreed early release if the date precedes the notice expiry or proposed exit.');
  return {status:'Approved',scheduled_release_at:at.toISOString(),scheduled_release_status:'Scheduled',scheduled_release_token:crypto.randomUUID(),scheduled_by_user_id:user.id,early_exit_agreed:body.early_exit_agreed===true,...(body.handover_confirmed===true?{handover_confirmed_at:new Date().toISOString(),handover_confirmed_by:user.id}:{})};
}
export function scheduledReleaseBody(notice,body){
  if(body.schedule_token!==notice.scheduled_release_token||notice.scheduled_release_status!=='Scheduled'||!['Approved','Final Inspection Scheduled'].includes(notice.status))return null;
  if(!Number.isFinite(Date.parse(notice.scheduled_release_at))||(notice.handover_confirmed_at&&!Number.isFinite(Date.parse(notice.handover_confirmed_at))))throw registryError('The scheduled disconnection or handover time is invalid.',409);
  if(Date.parse(notice.scheduled_release_at)>Date.now())throw registryError('The scheduled disconnection time has not arrived.',409);
  if(!notice.handover_confirmed_at||!notice.handover_confirmed_by)return {scheduled_release_status:'Awaiting Handover'};
  return {actual_exit_date:nairobiToday(new Date(Math.max(Date.parse(notice.scheduled_release_at),Date.parse(notice.handover_confirmed_at)))),handover_confirmed:true,early_exit_agreed:notice.early_exit_agreed===true};
}