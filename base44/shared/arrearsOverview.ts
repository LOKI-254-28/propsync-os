import {nairobiToday,addDays} from './nairobiDates.ts';
import {registryError} from './documentRegistry.ts';
export function arrearsQuery(user){
  if(user.role!=='admin'&&((user.account_type||user.data?.account_type)!=='landowner'||(user.approval_status||user.data?.approval_status)!=='approved'))throw registryError('Approved landlord access required.',403);
  return {...(user.role==='admin'?{}:{owner_user_id:user.id}),status:{$nin:['Void','Paid']},outstanding:{$gt:0},due_date:{$lt:nairobiToday()}};
}
export async function arrearsOverview(sr,user,body){
  const query=arrearsQuery(user);
  if(body.cursor!=null&&(typeof body.cursor!=='string'||body.cursor.length>2000))throw registryError('Invalid page cursor.');
  if(body.action==='arrears_tenancies'){
    if(typeof body.tenant_id!=='string'||!/^[a-zA-Z0-9_-]{1,100}$/.test(body.tenant_id))throw registryError('Choose a tenant.');
    const page=await sr.entities.RentCharge.filter({...query,tenant_id:body.tenant_id},{distinct:'tenancy_id',limit:50,cursor:body.cursor||undefined});
    const tenancies=page.items.length?await sr.entities.Tenancy.filter({id:{$in:page.items},...(user.role==='admin'?{}:{owner_user_id:user.id})},{limit:50,fields:['unit_number','property_name']}):{items:[]};
    return {...page,items:tenancies.items};
  }
  if(body.action==='arrears_charges'){
    if(typeof body.tenant_id!=='string'||!/^[a-zA-Z0-9_-]{1,100}$/.test(body.tenant_id))throw registryError('Choose a tenant.');
    return await sr.entities.RentCharge.filter({...query,tenant_id:body.tenant_id},{sort:'due_date',limit:50,cursor:body.cursor||undefined});
  }
  const [total,serious,page]=await Promise.all([sr.entities.RentCharge.aggregate({query,sum:'outstanding',countDistinct:'tenant_id'}),sr.entities.RentCharge.aggregate({query:{...query,due_date:{$lt:addDays(nairobiToday(),-30)}},countDistinct:'tenant_id'}),sr.entities.RentCharge.filter(query,{distinct:'tenant_id',limit:10,cursor:body.cursor||undefined})]);
  const ids=page.items,groups=ids.length?await sr.entities.RentCharge.aggregate({query:{...query,tenant_id:{$in:ids}},groupBy:'tenant_id',sum:'outstanding',min:'due_date',limit:10}):{rows:[]};
  const items=[];
  for(let index=0;index<groups.rows.length;index+=2)items.push(...await Promise.all(groups.rows.slice(index,index+2).map(async group=>{
    const scope=user.role==='admin'?{}:{owner_user_id:user.id};
    const [charges,payment,noticeCount]=await Promise.all([sr.entities.RentCharge.filter({...query,tenant_id:group.tenant_id},{sort:'due_date',limit:50}),sr.entities.Payment.filter({...scope,tenant_id:group.tenant_id,status:'Successful'},{sort:'-payment_date',limit:1}),sr.entities.Notice.count({...scope,tenant_id:group.tenant_id})]);
    const first=charges.items[0]||{},days=Math.round((new Date(nairobiToday())-new Date(group.min_due_date))/86400000);
    return {tenant_id:group.tenant_id,tenant_name:first.tenant_name,total:group.sum_outstanding,charge_count:group.count,worstClass:days>30?'Serious Arrears':days>7?'Arrears':'Overdue',lastPayment:payment.items[0]||null,notice_count:noticeCount,charges:charges.items,charge_cursor:charges.next_cursor,has_more_charges:charges.has_more};
  })));
  const totals=total.rows[0]||{},severe=serious.rows[0]||{};
  return {items:items.sort((a,b)=>b.total-a.total),next_cursor:page.next_cursor,has_more:page.has_more,totals:{totalArrears:totals.sum_outstanding||0,accounts:totals.count_distinct_tenant_id||0,serious:severe.count_distinct_tenant_id||0,overdueCharges:totals.count||0}};
}