import {createClientFromRequest} from 'npm:@base44/sdk@0.8.52';
import {waitUntil} from 'base44:runtime';
import {allRelated} from '../../shared/documentAccess.ts';
import {feedbackScope,feedbackAccess,feedbackCursor} from '../../shared/feedbackAccess.ts';
import {createFeedback,updateFeedback} from './actions.ts';
export default async function(req:Request):Promise<Response> {
  try {
    const b=createClientFromRequest(req),user=await b.auth.me();
    if(!user)return Response.json({error:'Please sign in.'},{status:401});
    const body=await req.json(),sr=b.asServiceRole;
    if(!['list','history','create','reply','manage'].includes(body.action))return Response.json({error:'Choose a valid feedback action.'},{status:400});
    for(const field of ['description','message','resolution','category'])if(body[field]!==undefined&&(typeof body[field]!=='string'||body[field].length>(field==='category'?100:3000)))return Response.json({error:'Use text up to 3,000 characters, or 100 characters for category.'},{status:400});
    const scope=await feedbackScope(sr,user);
    if(body.action==='list') {
      if(body.view!==undefined&&!['mine','manage','auto'].includes(body.view))return Response.json({error:'Choose a valid feedback view.'},{status:400});
      const manager=body.view==='manage'||body.view!=='mine'&&scope.can_manage;
      if(manager&&!scope.can_manage)return Response.json({error:'Feedback management access has not been granted.'},{status:403});
      const page=await sr.entities.Feedback.filter(manager?scope.query:{tenant_user_id:user.id},{sort:'-created_date',limit:50,cursor:feedbackCursor(body.cursor)});
      const tenancies=body.cursor?[]:await allRelated(sr.entities.Tenancy,{tenant_user_id:user.id,status:{$in:['Active','Expiring Soon','Notice Given','Terminated','Vacated','Archived']}});
      return Response.json({...page,can_manage:manager,tenancies:tenancies.map(t=>({id:t.id,property_name:t.property_name,unit_number:t.unit_number,tenancy_reference:t.tenancy_reference,status:t.status}))});
    }
    let record,access;
    if(body.action!=='create') {
      if(typeof body.feedback_id!=='string'||!body.feedback_id||body.feedback_id.length>100)return Response.json({error:'Choose feedback.'},{status:400});
      record=await sr.entities.Feedback.get(body.feedback_id);access=await feedbackAccess(sr,user,record,scope);
    }
    if(body.action==='history')return Response.json({...await sr.entities.FeedbackEvent.filter({feedback_id:record.id},{sort:'-created_date',limit:50,cursor:feedbackCursor(body.cursor)}),feedback:record,can_manage:access.manager});
    if(typeof body.operation_id!=='string'||!/^[a-f0-9-]{36}$/i.test(body.operation_id))return Response.json({error:'A valid submission reference is required.'},{status:400});
    const result=body.action==='create'?await createFeedback(sr,user,body):await updateFeedback(sr,user,body,record,access);
    if(result.changed) {
      const manager=body.action!=='create'&&access.manager;
      const [property,grants]=await Promise.all([result.feedback.property_id?sr.entities.Property.get(result.feedback.property_id):Promise.resolve(null),result.feedback.property_id?allRelated(sr.entities.StaffPermission,{active:true,permissions:'Feedback',feedback_property_ids:result.feedback.property_id}):Promise.resolve([])]);
      const recipients=[...(manager?[result.feedback.tenant_user_id]:[]),property?.owner_user_id,...grants.map(g=>g.user_id)];
      const notifications=[...new Set(recipients.filter(id=>id&&id!==user.id))].map(recipient_user_id=>({recipient_user_id,type:'Feedback',title:`Feedback ${result.feedback.status}`,message:'A private feedback conversation has been updated.',related_entity:'Feedback',related_id:result.feedback.id,action_link:recipient_user_id===property?.owner_user_id?'/feedback':'/portal/feedback',date:new Date().toISOString(),read:false}));
      waitUntil((async()=>{await sr.entities.AuditLog.create({user_id:user.id,user_email:user.email,user_role:user.role,action:`Feedback ${body.action}`,entity:'Feedback',entity_id:result.feedback.id,timestamp:new Date().toISOString()});for(let i=0;i<notifications.length;i+=100)await sr.entities.Notification.bulkCreate(notifications.slice(i,i+100));})());
    }
    return Response.json(result);
  }catch(error){return Response.json({error:error.message},{status:error.status || 500});}
}