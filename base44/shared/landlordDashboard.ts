import {nairobiToday,addDays} from './nairobiDates.ts';
import {dashboardQueries,total,openMaintenance,unpaid} from './dashboardQueries.ts';
import {dashboardOccupancy} from './dashboardOccupancy.ts';
export async function landlordDashboard(sr,scope) {
  const today=nairobiToday(),month=today.slice(0,7),next=new Date(`${month}-01T00:00:00Z`);next.setUTCMonth(next.getUTCMonth()+1);
  const pending={...scope,status:{$in:['Pending','Under Review']}},expiring={...scope,$or:[{status:'Expiring Soon'},{status:'Active',expected_end_date:{$lt:addDays(today,30),$ne:''}}]},maint={...scope,...openMaintenance};
  const [propertiesCount,occupancy,expectedThisMonth,collectedThisMonth,outstanding,arrearsTotal,arrearsCount,openCount,appsCount,expiryCount,payments,maintenance,applications]=await dashboardQueries([
    ()=>sr.entities.Property.count(scope),()=>dashboardOccupancy(sr,scope,today),
    ()=>total(sr.entities.RentCharge,{...scope,billing_period:month},'amount'),
    ()=>total(sr.entities.Payment,{...scope,status:'Successful',payment_date:{$gte:`${month}-01`,$lt:next.toISOString().slice(0,10)}},'amount'),
    ()=>total(sr.entities.RentCharge,{...scope,...unpaid},'outstanding'),
    ()=>total(sr.entities.RentCharge,{...scope,...unpaid,outstanding:{$gt:0},due_date:{$lt:today,$ne:''}},'outstanding'),
    ()=>sr.entities.RentCharge.count({...scope,...unpaid,outstanding:{$gt:0},due_date:{$lt:today,$ne:''}}),
    ()=>sr.entities.Maintenance.count(maint),()=>sr.entities.Application.count(pending),()=>sr.entities.Tenancy.count(expiring),
    ()=>sr.entities.Payment.filter(scope,{sort:'-payment_date',limit:6}),()=>sr.entities.Maintenance.filter(maint,{sort:'-created_date',limit:5}),()=>sr.entities.Application.filter(pending,{sort:'-created_date',limit:5})
  ]);
  return {stats:{propertiesCount,...occupancy,expectedThisMonth,collectedThisMonth,outstanding,arrearsTotal,arrearsCount,openMaintenance:openCount,pendingApplications:appsCount,expiringTenancies:expiryCount,collectionRate:expectedThisMonth?Math.round(collectedThisMonth/expectedThisMonth*100):0},recentPayments:payments.items,openMaint:maintenance.items,openApps:applications.items};
}