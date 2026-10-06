import {maintenanceAccess,maintenanceTransitions} from '../../shared/maintenanceAccess.ts';
import {registryError} from '../../shared/documentRegistry.ts';
import {nairobiToday} from '../../shared/nairobiDates.ts';
import {maintenanceLock,flushMaintenanceEvent,maintenanceEvent} from './state.ts';
export async function maintainTicket(sr,user,body,ticket) {
  const lock=await maintenanceLock(sr,ticket.id);ticket=lock.record;
  try {
    const access=await maintenanceAccess(sr,user,ticket);
    const pending=ticket.pending_event?.operation_id;await flushMaintenanceEvent(sr,ticket);
    if(pending===body.operation_id||(await sr.entities.MaintenanceEvent.filter({maintenance_id:ticket.id,operation_id:body.operation_id},'-created_date',1)).length)return {ticket,access,changed:false};
    let patch={},contractor=access.contractor;
    if(body.action==='message') {
      if(!access.can_message)throw registryError(['Closed','Rejected'].includes(ticket.status)?'This conversation is closed.':'The conversation opens after a contractor is assigned.',409);
      if(!body.message?.trim())throw registryError('Write a message before sending.');
    } else {
      if(!access.manager)throw registryError('Only the property landlord or an admin can assign contractors or change maintenance status and costs.',403);
      if(typeof body.contractor_id!=='string'||body.contractor_id.length>100)throw registryError('Choose a contractor.');
      if(body.contractor_id) {
        contractor=await sr.entities.Contractor.get(body.contractor_id);
        if(contractor.status!=='Active'||!access.property||contractor.owner_user_id!==access.property.owner_user_id)throw registryError('Choose an active contractor belonging to this property landlord.',403);
      }else contractor=null;
      let status=body.status;
      if(contractor&&contractor.id!==ticket.contractor_id&&['Submitted','Acknowledged'].includes(status))status='Assigned';
      if(status!==ticket.status&&!maintenanceTransitions[ticket.status]?.includes(status))throw registryError('Advance the ticket through contractor assignment, work in progress, completion and closure.',409);
      if(['Assigned','Scheduled','In Progress','Awaiting Parts','Completed'].includes(status)&&!contractor)throw registryError('Assign a contractor before advancing this request.');
      if(['Completed','Closed'].includes(status)&&!body.resolution_notes?.trim()&&!ticket.resolution_notes)throw registryError('Record resolution notes before completing or closing the job.');
      for(const key of ['estimated_cost','approved_cost','actual_cost'])if(typeof body[key]!=='number'||!Number.isFinite(body[key])||body[key]<0||body[key]>1e9)throw registryError('Maintenance costs must be valid non-negative amounts.');
      patch={status,contractor_id:contractor?.id || '',contractor_name:contractor?.name || '',estimated_cost:body.estimated_cost,approved_cost:body.approved_cost,actual_cost:body.actual_cost,internal_notes:body.internal_notes || '',resolution_notes:body.resolution_notes ?? ticket.resolution_notes ?? ''};
      if(['Completed','Closed'].includes(status))patch.completion_date=ticket.completion_date || nairobiToday();
      if(body.public_message?.trim())patch.public_updates=[...(ticket.public_updates || []),{date:nairobiToday(),status,message:body.public_message.trim()}];
    }
    const event=maintenanceEvent(user,access,body,ticket,patch);
    ticket=await sr.entities.Maintenance.update(ticket.id,{...patch,pending_event:event});await flushMaintenanceEvent(sr,ticket);
    return {ticket,access:{...access,contractor},changed:true};
  } finally {await lock.release();}
}