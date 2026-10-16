import {nairobiToday} from './nairobiDates.ts';
import {activeStatuses,blank,notBlank,checkedRows} from './tenantManagementScope.ts';
export async function tenantManagementStats(sr,context){
  const {scope,users,unlinked,linkedHistory,unlinkedHistory}=context,today=nairobiToday();
  const active={...scope,status:{$in:activeStatuses},start_date:{$lte:today,$nin:['',null]}};
  const overdue={...scope,status:{$nin:['Void','Paid']},due_date:{$lt:today,$nin:['',null]},outstanding:{$gt:0}};
  // Keep independent requests within the worker's connection budget.
  const first=await Promise.all([
    sr.entities.Tenancy.aggregate({query:linkedHistory,countDistinct:'tenant_user_id'}),
    sr.entities.Tenancy.aggregate({query:unlinkedHistory,countDistinct:'tenant_id'}),
    sr.entities.Tenancy.aggregate({query:{...active,tenant_user_id:notBlank},countDistinct:'tenant_user_id',sum:'monthly_rent'}),
    sr.entities.Tenancy.aggregate({query:{...active,tenant_user_id:blank},countDistinct:'tenant_id',sum:'monthly_rent'})
  ]);
  const second=await Promise.all([
    sr.entities.RentCharge.aggregate({query:{...scope,status:{$ne:'Void'},due_date:{$lte:today,$nin:['',null]}},groupBy:'status'}),
    sr.entities.RentCharge.aggregate({query:{...overdue,tenant_user_id:notBlank},countDistinct:'tenant_user_id',sum:'outstanding'}),
    sr.entities.RentCharge.aggregate({query:{...overdue,tenant_user_id:blank},countDistinct:'tenant_id',sum:'outstanding'})
  ]);
  const [missingLinked,missingUnlinked,linkedActive,unlinkedActive]=first.map(result=>checkedRows(result)[0]||{});
  const [due,linkedOverdue,unlinkedOverdue]=[checkedRows(second[0]),checkedRows(second[1])[0]||{},checkedRows(second[2])[0]||{}];
  const total=users.length+unlinked.length+(missingLinked.count_distinct_tenant_user_id||0)+(missingUnlinked.count_distinct_tenant_id||0);
  const housed=(linkedActive.count_distinct_tenant_user_id||0)+(unlinkedActive.count_distinct_tenant_id||0);
  const dueCount=due.reduce((sum,row)=>sum+row.count,0),activeCount=(linkedActive.count||0)+(unlinkedActive.count||0);
  return {total,housed,unhoused:Math.max(0,total-housed),outstanding:(linkedOverdue.sum_outstanding||0)+(unlinkedOverdue.sum_outstanding||0),inArrears:(linkedOverdue.count_distinct_tenant_user_id||0)+(unlinkedOverdue.count_distinct_tenant_id||0),dueCount,paidRate:dueCount?Math.round((due.find(row=>row.status==='Paid')?.count||0)/dueCount*100):0,avgRent:activeCount?((linkedActive.sum_monthly_rent||0)+(unlinkedActive.sum_monthly_rent||0))/activeCount:0};
}