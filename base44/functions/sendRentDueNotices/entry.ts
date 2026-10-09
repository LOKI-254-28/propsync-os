import {createClientFromRequest} from 'npm:@base44/sdk@0.8.52';
import {arrearsOverview} from '../../shared/arrearsOverview.ts';
import {rentReminderContext,reminderView} from '../../shared/rentReminderContext.ts';
import {queueRentReminder} from '../../shared/queueRentReminder.ts';
import {scheduledRentReminders} from '../../shared/scheduledRentReminders.ts';
import {rentReminderEmail} from '../../shared/rentReminderEmail.ts';
export default async function(req:Request):Promise<Response>{
  try{
    const b=createClientFromRequest(req),user=await b.auth.me().catch(()=>null);
    if(!user)return Response.json({error:'Authentication required.'},{status:401});
    const body=await req.json().catch(()=>({})),sr=b.asServiceRole;
    if(['arrears_overview','arrears_charges','arrears_tenancies'].includes(body.action))return Response.json(await arrearsOverview(sr,user,body));
    if(['email_context','email_delivered'].includes(body.action))return Response.json(await rentReminderEmail(sr,user,body));
    if(['reminder_context','send_reminder'].includes(body.action)){
      if(Object.keys(body).some(key=>!['action','tenancy_id','email'].includes(key))||body.email!=null&&typeof body.email!=='boolean')return Response.json({error:'Reminder amounts and recipients are chosen by the server.'},{status:400});
      const context=await rentReminderContext(sr,user,body);
      if(body.action==='reminder_context')return Response.json(reminderView(context));
      return Response.json(await queueRentReminder(sr,user,context,{email:body.email===true}));
    }
    if(body.action&&body.action!=='scheduled')return Response.json({error:'Unknown reminder action.'},{status:400});
    return Response.json(await scheduledRentReminders(sr,user,body));
  }catch(error){return Response.json({error:error.message},{status:error.status||500});}
}