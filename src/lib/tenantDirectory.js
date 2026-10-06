import { nairobiToday } from '@/lib/nairobiDates';
export function buildTenantDirectory(tenants,tenancies,charges) {
  const groups=new Map();
  for(const tenant of tenants) {
    const key=tenant.user_id?`user:${tenant.user_id}`:`tenant:${tenant.id}`;
    if(!groups.has(key))groups.set(key,{...tenant,directory_id:key,tenant_ids:[],tenancies:[]});
    groups.get(key).tenant_ids.push(tenant.id);
  }
  for(const tenancy of tenancies) {
    const key=tenancy.tenant_user_id?`user:${tenancy.tenant_user_id}`:`tenant:${tenancy.tenant_id}`;
    let group=groups.get(key)||[...groups.values()].find(t=>t.tenant_ids.includes(tenancy.tenant_id));
    if(!group){group={id:tenancy.tenant_id,directory_id:key,full_name:tenancy.tenant_name || 'Former tenant',user_id:tenancy.tenant_user_id,tenant_ids:[tenancy.tenant_id],tenancies:[],historical_only:true};groups.set(key,group);}
    if(!group.tenant_ids.includes(tenancy.tenant_id))group.tenant_ids.push(tenancy.tenant_id);
    group.tenancies.push(tenancy);
  }
  return [...groups.values()].map(tenant=>{
    const history=[...tenant.tenancies].sort((a,b)=>(b.start_date || '').localeCompare(a.start_date || ''));
    const approved=history.filter(t=>['Active','Expiring Soon','Notice Given'].includes(t.status));
    const activeTenancies=approved.filter(t=>t.start_date && t.start_date<=nairobiToday());
    const ids=new Set(history.map(t=>t.id));
    const outstanding=charges.filter(c=>ids.has(c.tenancy_id)&&!['Void','Paid'].includes(c.status)).reduce((sum,c)=>sum+Number(c.outstanding||0),0);
    return {...tenant,tenancies:history,activeTenancies,activeTenancy:activeTenancies[0],tenancyCount:history.length,outstanding,occupancy:activeTenancies.length?'Current':approved.length?'Upcoming':history.length?'Former':'Unassigned'};
  });
}