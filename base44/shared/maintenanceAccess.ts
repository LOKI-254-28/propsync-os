import {allRelated} from './documentAccess.ts';
import {registryError} from './documentRegistry.ts';
export const maintenanceTransitions={Submitted:['Acknowledged','Assigned','Rejected'],Acknowledged:['Assigned','Rejected'],Assigned:['Scheduled','In Progress','Rejected'],Scheduled:['In Progress','Assigned','Rejected'],'In Progress':['Awaiting Parts','Completed','Assigned'],'Awaiting Parts':['In Progress','Assigned'],Completed:['Closed','In Progress'],Closed:['In Progress'],Rejected:['Submitted']};
export async function assignedMaintenanceScope(sr,user) {
  const contractors=await allRelated(sr.entities.Contractor,{user_id:user.id,status:'Active'});
  return {contractors,is_contractor:contractors.length>0,query:contractors.length?{$or:contractors.map(c=>({contractor_id:c.id,owner_user_id:c.owner_user_id}))}:{id:{$in:[]}}};
}
export async function maintenanceAccess(sr,user,ticket) {
  const [properties,contractors]=await Promise.all([sr.entities.Property.filter({id:ticket.property_id},'-created_date',1),ticket.contractor_id?sr.entities.Contractor.filter({id:ticket.contractor_id},'-created_date',1):Promise.resolve([])]);
  const property=properties[0],contractor=contractors[0];
  if(ticket.tenancy_id){const tenancy=await sr.entities.Tenancy.get(ticket.tenancy_id);if(tenancy.property_id!==ticket.property_id||tenancy.unit_id!==ticket.unit_id||tenancy.tenant_user_id!==ticket.tenant_user_id)throw registryError('This maintenance request has inconsistent tenancy links.',409);}
  const manager=user.role==='admin'||!!property&&property.owner_user_id===user.id,tenant=ticket.tenant_user_id===user.id;
  const assigned=!!contractor&&contractor.status==='Active'&&!!property&&contractor.owner_user_id===property.owner_user_id;
  const worker=assigned&&contractor.user_id===user.id;
  if(!manager&&!tenant&&!worker)throw registryError('This maintenance request is private to its tenant, landlord and currently authorized assigned contractor.',403);
  return {manager,tenant,worker,contractor:assigned?contractor:null,property,can_message:!['Closed','Rejected'].includes(ticket.status)&&(manager||assigned)};
}
export function maintenanceView(ticket,access) {
  const fields=['id','ticket_number','title','description','category','priority','date_reported','property_name','unit_number','contractor_name','status','completion_date','resolution_notes','public_updates','created_date','updated_date'];
  if(access.tenant)fields.push('tenant_name','images','property_id','unit_id','tenancy_id','tenant_id');
  if(access.manager)fields.push('tenant_name','images','contractor_id','estimated_cost','approved_cost','actual_cost','internal_notes','property_id');
  return Object.fromEntries(fields.filter(key=>ticket[key]!==undefined).map(key=>[key,ticket[key]]));
}