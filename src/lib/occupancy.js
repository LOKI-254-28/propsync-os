import {nairobiToday} from '@/lib/nairobiDates';
const ACTIVE=['Active','Expiring Soon','Notice Given'];
export function isCurrentTenancy(t,date=nairobiToday()) {
  return ACTIVE.includes(t.status)&&(!t.start_date||t.start_date<=date)&&(!t.actual_end_date||t.actual_end_date>date);
}
export function occupancySummary(units,tenancies,date=nairobiToday()) {
  const byUnit=new Map(),unitById=new Map(units.map(u=>[u.id,u]));
  for(const t of tenancies) {
    const unit=unitById.get(t.unit_id),previous=byUnit.get(t.unit_id);
    if(unit&&(!t.property_id||t.property_id===unit.property_id)&&isCurrentTenancy(t,date)&&(!previous||String(t.start_date||'')>String(previous.start_date||'')))byUnit.set(t.unit_id,t);
  }
  const reconciled=units.map(u=>{
    const tenancy=byUnit.get(u.id);
    const status=tenancy?(tenancy.status==='Notice Given'?'Notice Given':'Occupied'):['Occupied','Notice Given'].includes(u.status)?'Available':u.status;
    return {...u,status,current_tenant_name:tenancy?.tenant_name||'',current_tenancy_id:tenancy?.id||''};
  });
  const live=reconciled.filter(u=>u.status!=='Inactive'),occupied=live.filter(u=>byUnit.has(u.id));
  const held=live.filter(u=>!byUnit.has(u.id)&&['Reserved','Application Pending'].includes(u.status));
  const maintenance=live.filter(u=>!byUnit.has(u.id)&&u.status==='Under Maintenance');
  const vacant=live.filter(u=>!byUnit.has(u.id)&&!['Reserved','Application Pending','Under Maintenance'].includes(u.status));
  return {units:reconciled,live,occupied,held,maintenance,vacant,available:vacant.filter(u=>['Available','Vacant'].includes(u.status)),tenancies:[...byUnit.values()],rate:live.length?Math.round(occupied.length/live.length*1000)/10:0};
}