import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { waitUntil } from 'base44:runtime';
import { applicationContext } from '../../shared/applicationAccess.ts';
import { patchApplication } from '../../shared/applicationPatch.ts';
import { inspectionAction } from '../../shared/applicationInspections.ts';
import { completeApplication } from '../../shared/applicationCompletion.ts';
import { submitApplicationKin } from '../../shared/submitApplicationKin.ts';
import {applicationNotification} from '../../shared/applicationNotification.ts';
export default async function(req:Request):Promise<Response> {
  try {
    const b = createClientFromRequest(req), user = await b.auth.me();
    if (!user) return Response.json({error:'Please sign in.'},{status:401});
    const body = await req.json();
    if (!['patch','inspection_get','inspection_submit','inspection_respond','complete','submit_next_of_kin'].includes(body.action)) return Response.json({error:'Choose a valid application action.'},{status:400});
    const context = await applicationContext(b.asServiceRole,user,body.application_id);
    const result = body.action === 'submit_next_of_kin' ? await submitApplicationKin(b.asServiceRole,user,context,body) : body.action === 'patch' ? await patchApplication(b.asServiceRole,user,context,body.updates) : body.action === 'complete' ? await completeApplication(b.asServiceRole,user,context,body) : await inspectionAction(b.asServiceRole,user,context,body);
    if(body.action==='patch')waitUntil(applicationNotification(b.asServiceRole,user,context,result.application));
    if (body.action !== 'inspection_get') waitUntil(b.asServiceRole.entities.AuditLog.create({user_id:user.id,user_email:user.email,user_role:user.role,action:`Application ${body.action}`,entity:'Application',entity_id:context.app.id,entity_name:context.app.application_reference,timestamp:new Date().toISOString()}));
    if (body.action === 'complete' && !result.already_completed) waitUntil(b.asServiceRole.entities.Notification.create({recipient_user_id:context.app.tenant_user_id,type:'Tenancy',title:'Tenancy approved',message:`Your tenancy for ${context.unit.unit_number} is ready.`,related_entity:'Tenancy',related_id:result.tenancy.id,action_link:'/portal/my-tenancies',date:new Date().toISOString(),read:false}));
    return Response.json(result);
  } catch(error) { return Response.json({error:error.message},{status:error.status || 500}); }
}