import {createClientFromRequest} from 'npm:@base44/sdk@0.8.52';
import {waitUntil} from 'base44:runtime';
import {allRelated} from '../../shared/documentAccess.ts';
import {maintenanceAccess,maintenanceView,maintenanceTransitions,assignedMaintenanceScope} from '../../shared/maintenanceAccess.ts';
import {maintainTicket} from './update.ts';
export default async function(req:Request):Promise<Response> {
  try {
    const b=createClientFromRequest(req),user=await b.auth.me();if(!user)return Response.json({error:'Please sign in.'},{status:401});
    const sr=b.asServiceRole,body=await req.json();
    if(body.cursor!=null&&(typeof body.cursor!=='string'||body.cursor.length>2000))return Response.json({error:'Invalid page cursor.'},{status:400});
    for(const key of ['message','public_message','internal_notes','resolution_notes'])if(body[key]!=null&&(typeof body[key]!=='string'||body[key].length>3000))return Response.json({error:'Use text up to 3,000 characters.'},{status:400});
    if(body.action==='mine'||body.action==='assigned') {
      const scope=body.action==='assigned'?await assignedMaintenanceScope(sr,user):null;
      if(body.search!=null&&(typeof body.search!=='string'||body.search.length>100))return Response.json({error:'Search text must be up to 100 characters.'},{status:400});
      const text=(body.search||'').trim().replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
      const search=text?{$or:['ticket_number','title','description'].map(field=>({[field]:{$regex:text,$options:'i'}}))}:{};
      const page=await sr.entities.Maintenance.filter({$and:[scope?scope.query:{tenant_user_id:user.id},search]},{sort:body.action==='mine'?'-date_reported':'-created_date',limit:50,cursor:body.cursor || undefined});
      let items=page.items;
      if(scope&&items.length) {
        const properties=await sr.entities.Property.filter({id:{$in:[...new Set(items.map(t=>t.property_id))]}},'-created_date',50);
        items=items.filter(t=>scope.contractors.some(c=>c.id===t.contractor_id&&properties.some(p=>p.id===t.property_id&&p.owner_user_id===c.owner_user_id)));
      }
      return Response.json({...page,items:items.map(t=>maintenanceView(t,{manager:false,tenant:!scope})),is_contractor:scope?.is_contractor || false});
    }
    if(body.action==='linkContractor') {
      if(typeof body.contractor_id!=='string'||body.contractor_id.length>100||typeof body.enabled!=='boolean')return Response.json({error:'Choose a contractor and access setting.'},{status:400});
      const contractor=await sr.entities.Contractor.get(body.contractor_id);
      if(user.role!=='admin'&&contractor.owner_user_id!==user.id)return Response.json({error:'Only this contractor’s landlord or an admin can grant access.'},{status:403});
      let user_id='',email=contractor.email || '';
      if(body.enabled) {
        email=typeof body.email==='string'?body.email.trim().toLowerCase():email.trim().toLowerCase();
        if(email.length>254||!/^\S+@\S+\.\S+$/.test(email))return Response.json({error:'Enter the contractor’s registered email.'},{status:400});
        const accounts=await sr.entities.User.filter({email},'-created_date',2);
        if(accounts.length!==1)return Response.json({error:'The contractor must first register using the email shown on their contractor record.'},{status:409});
        user_id=accounts[0].id;
      }
      await sr.entities.Contractor.update(contractor.id,{user_id,...(body.enabled?{email}:{})});
      waitUntil(sr.entities.AuditLog.create({user_id:user.id,user_role:user.role,action:body.enabled?'Contractor Access Granted':'Contractor Access Revoked',entity:'Contractor',entity_id:contractor.id,timestamp:new Date().toISOString()}));
      return Response.json({user_id});
    }
    if(!['details','history','message','update'].includes(body.action)||typeof body.maintenance_id!=='string'||!body.maintenance_id||body.maintenance_id.length>100)return Response.json({error:'Choose a maintenance request and valid action.'},{status:400});
    const ticket=await sr.entities.Maintenance.get(body.maintenance_id),access=await maintenanceAccess(sr,user,ticket);
    if(body.action==='history')return Response.json(await sr.entities.MaintenanceEvent.filter({maintenance_id:ticket.id},{sort:'-created_date',limit:50,cursor:body.cursor || undefined}));
    if(body.action==='details') {
      const contractors=access.manager&&access.property?await allRelated(sr.entities.Contractor,{owner_user_id:access.property.owner_user_id,status:'Active'}):[];
      return Response.json({ticket:maintenanceView(ticket,access),can_manage:access.manager,can_message:access.can_message,contractors:contractors.map(c=>({id:c.id,name:c.name,company:c.company})),allowed_statuses:[ticket.status,...(maintenanceTransitions[ticket.status] || [])]});
    }
    if(typeof body.operation_id!=='string'||!/^[a-f0-9-]{36}$/i.test(body.operation_id))return Response.json({error:'A valid submission reference is required.'},{status:400});
    const result=await maintainTicket(sr,user,body,ticket);
    if(result.changed) {
      const recipients=[ticket.tenant_user_id,result.access.property?.owner_user_id,result.access.contractor?.user_id];
      const notifications=[...new Set(recipients.filter(id=>id&&id!==user.id))].map(recipient_user_id=>({recipient_user_id,type:'Maintenance',title:body.action==='message'?'Maintenance Message':'Maintenance Update',message:'Your maintenance request has a new update.',related_entity:'Maintenance',related_id:ticket.id,action_link:recipient_user_id===result.access.property?.owner_user_id?'/maintenance':recipient_user_id===ticket.tenant_user_id?'/portal/maintenance':'/assigned-maintenance',date:new Date().toISOString(),read:false}));
      waitUntil(Promise.all([sr.entities.AuditLog.create({user_id:user.id,user_role:user.role,action:`Maintenance ${body.action}`,entity:'Maintenance',entity_id:ticket.id,timestamp:new Date().toISOString()}),notifications.length?sr.entities.Notification.bulkCreate(notifications):Promise.resolve()]));
    }
    return Response.json({ticket:maintenanceView(result.ticket,result.access)});
  }catch(error){return Response.json({error:error.message},{status:error.status || 500});}
}