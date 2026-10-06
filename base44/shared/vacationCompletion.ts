import { nairobiToday } from './nairobiDates.ts';
import { registryError } from './documentRegistry.ts';
import { allRelated } from './documentAccess.ts';
import { liveTenancy,validDate } from './vacationAccess.ts';
export async function completeVacation(sr,user,notice,tenancy,body) {
  if(notice.completion_state!=='In Progress') {
    if(!['Approved','Final Inspection Scheduled'].includes(notice.status)||!liveTenancy.includes(tenancy.status))throw registryError('Approve this notice before confirming the final handover.',409);
    const date=body.actual_exit_date;
    if(!validDate(date)||date>nairobiToday()||date<notice.date_submitted||(tenancy.start_date&&date<tenancy.start_date)||body.handover_confirmed!==true)throw registryError('Confirm a completed handover and a valid actual exit date, not a future date.');
    if((date<notice.calculated_notice_expiry||date<notice.proposed_vacation_date)&&body.early_exit_agreed!==true)throw registryError('An earlier exit requires an explicitly agreed early release.');
    const inspection=body.final_inspection_id?await sr.entities.Inspection.get(body.final_inspection_id):null;
    if(!inspection||inspection.tenancy_id!==tenancy.id||inspection.unit_id!==tenancy.unit_id||inspection.property_id!==tenancy.property_id||!['Final','Move-out'].includes(inspection.type)||inspection.status!=='Completed'||!validDate(inspection.completed_date)||inspection.completed_date>date||inspection.completed_date<notice.date_submitted)throw registryError('Select a completed final or move-out inspection for this tenancy before handover.');
    notice=await sr.entities.VacationRequest.update(notice.id,{completion_state:'In Progress',actual_exit_date:date,final_inspection_id:inspection.id,early_exit_agreed:body.early_exit_agreed===true,completed_by:user.id});
  }
  const desired=notice.type==='Termination Notice'?'Terminated':'Vacated';
  if(liveTenancy.includes(tenancy.status))await sr.entities.Tenancy.update(tenancy.id,{status:desired,actual_end_date:notice.actual_exit_date});
  else if(tenancy.status!==desired||tenancy.actual_end_date!==notice.actual_exit_date)throw registryError('This tenancy ended through a different operation; its history will not be overwritten.',409);
  const unit=await sr.entities.Unit.get(tenancy.unit_id);
  const other=await sr.entities.Tenancy.filter({unit_id:unit.id,id:{$ne:tenancy.id},status:{$in:[...liveTenancy,'Pending']}},'-created_date',1);
  if(!other.length&&(unit.current_tenancy_id===tenancy.id||!unit.current_tenancy_id))await sr.entities.Unit.updateMany({id:unit.id,current_tenancy_id:unit.current_tenancy_id || {$in:['',null]}},{$set:{status:['Reserved','Application Pending','Under Maintenance'].includes(unit.status)?unit.status:'Vacant',current_tenancy_id:'',current_tenant_name:''}});
  const charges=await allRelated(sr.entities.RentCharge,{tenancy_id:tenancy.id,status:{$ne:'Void'}});
  return {status:'Completed',completion_state:'Done',outstanding_rent:charges.reduce((s,c)=>s+Math.max(0,Number(c.outstanding||0)),0),actual_exit_date:notice.actual_exit_date,final_inspection_id:notice.final_inspection_id};
}