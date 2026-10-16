import {useState,useEffect} from 'react';
import {useInfiniteQuery,useQueryClient} from '@tanstack/react-query';
import {base44} from '@/api/base44Client';
import useTenantIdentity from '@/hooks/useTenantIdentity';
import useDebouncedValue from '@/hooks/useDebouncedValue';
import entitySearch from '@/lib/entitySearch';
import reconcileInitialRent from '@/lib/reconcileInitialRent';
import portfolioRequest from '@/lib/portfolioRequest';
export default function useTenantTenancyPage() {
  const identity=useTenantIdentity(),[search,setSearch]=useState(''),text=useDebouncedValue(search),client=useQueryClient();
  const key=['tenant-tenancy-pages',identity.user?.id,text],ready=!!identity.user&&!identity.loading;
  const page=useInfiniteQuery({queryKey:key,enabled:ready,staleTime:60000,initialPageParam:null,queryFn:async({pageParam})=>{
    const result=await base44.entities.Tenancy.filter({tenant_user_id:identity.user.id,...entitySearch(text,['tenancy_reference','unit_number','property_name'])},{sort:'-start_date',limit:50,cursor:pageParam||undefined});
    await reconcileInitialRent(result.items,portfolioRequest);
    const {data}=await portfolioRequest(()=>base44.functions.invoke('dashboardSummary',{action:'tenancy_totals',tenancy_ids:result.items.map(row=>row.id)}));
    return {...result,totals:data};
  },getNextPageParam:result=>result.has_more?result.next_cursor:undefined});
  useEffect(()=>{if(!ready)return;let timer;const unsubscribe=['Tenancy','RentCharge','Maintenance'].map(entity=>base44.entities[entity].subscribe(()=>{clearTimeout(timer);timer=setTimeout(()=>client.invalidateQueries({queryKey:['tenant-tenancy-pages',identity.user.id]}),1500);}));return()=>{clearTimeout(timer);unsubscribe.forEach(fn=>fn());};},[ready,identity.user?.id,client]);
  return {...identity,...page,search,setSearch,loading:identity.loading,items:page.data?.pages.flatMap(p=>p.items)||[],chargeTotals:page.data?.pages.flatMap(p=>p.totals.charges)||[],maintenanceTotals:page.data?.pages.flatMap(p=>p.totals.maintenance)||[],error:identity.error||page.error,refetch:identity.error?identity.refetch:page.refetch,reload:identity.error?identity.refetch:page.refetch};
}