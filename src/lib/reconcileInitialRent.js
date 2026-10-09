import {base44} from '@/api/base44Client';
export default async function reconcileInitialRent(tenancies,request=read=>read()) {
  const ids=tenancies.filter(t=>t.application_id&&t.start_date).map(t=>t.id);
  for(let i=0;i<ids.length;i+=100) {
    await request(()=>base44.functions.invoke('generateRentCharges',{action:'reconcile_rent',tenancyIds:ids.slice(i,i+100)}));
  }
  return ids.length>0;
}