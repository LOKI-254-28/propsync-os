import {nairobiToday} from './nairobiDates.ts';
import {dashboardQueries,total,openMaintenance,unpaid} from './dashboardQueries.ts';
export async function tenantDashboard(sr,user,body) {
  const scope={tenant_user_id:user.id},month=nairobiToday().slice(0,7);
  const [tenancy,balance,maintenanceCount,unreadNotices,maintenance,notices]=await dashboardQueries([
    ()=>sr.entities.Tenancy.filter({...scope,status:{$in:['Active','Expiring Soon','Notice Given']}},{limit:1,sort:'-start_date'}),
    ()=>total(sr.entities.RentCharge,{...scope,...unpaid},'outstanding'),
    ()=>sr.entities.Maintenance.count({...scope,...openMaintenance}),()=>sr.entities.Notice.count({...scope,acknowledged:{$ne:true}}),
    ()=>sr.entities.Maintenance.filter({...scope,...openMaintenance},{sort:'-created_date',limit:4}),()=>sr.entities.Notice.filter(scope,{sort:'-date_issued',limit:4})
  ]);
  return {activeTenancy:tenancy.items[0]||null,outstanding:balance,maintenanceCount,unreadNotices,openMaint:maintenance.items,notices:notices.items};
}