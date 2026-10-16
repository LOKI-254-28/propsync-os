import {useEffect} from 'react';
import {useInfiniteQuery,useQuery,useQueryClient} from '@tanstack/react-query';
import {base44} from '@/api/base44Client';
import {useAuth} from '@/lib/AuthContext';
import portfolioRequest from '@/lib/portfolioRequest';
const prefix='tenant-management';
const request=async args=>(await portfolioRequest(()=>base44.functions.invoke('tenantOps',args))).data;
export default function useTenantManagement(action,args={},enabled=true){
  const {user}=useAuth(),client=useQueryClient();
  const result=useInfiniteQuery({queryKey:[prefix,user?.id,user?.role,action,JSON.stringify(args)],enabled:!!user&&enabled,staleTime:60000,retry:false,initialPageParam:null,queryFn:({pageParam})=>request({action,...args,cursor:pageParam||undefined}),getNextPageParam:page=>page.has_more?page.next_cursor:undefined});
  return {...result,items:result.data?.pages.flatMap(page=>page.items)||[],reload:()=>client.invalidateQueries({queryKey:[prefix,user?.id]}, {cancelRefetch:false})};
}
export function useTenantManagementStats(){
  const {user}=useAuth();
  return useQuery({queryKey:[prefix,user?.id,user?.role,'stats'],enabled:!!user,staleTime:60000,retry:false,queryFn:()=>request({action:'management_stats'})});
}
export function useTenancyManagementDetail(id){
  const {user}=useAuth();
  return useQuery({queryKey:[prefix,user?.id,user?.role,'detail',id],enabled:!!user&&!!id,staleTime:60000,retry:false,queryFn:()=>request({action:'management_tenancy_detail',tenancy_id:id})});
}
export function useTenantManagementUpdates(){
  const {user}=useAuth(),client=useQueryClient();
  useEffect(()=>{
    if(!user)return;let timer;
    const refresh=event=>{
      if(user.role!=='admin'&&event.data?.owner_user_id&&event.data.owner_user_id!==user.id)return;
      clearTimeout(timer);timer=setTimeout(()=>client.invalidateQueries({queryKey:[prefix,user.id]},{cancelRefetch:false}),1500);
    };
    const subscriptions=['Tenant','Tenancy','RentCharge','Payment','VacationRequest'].map(entity=>base44.entities[entity].subscribe(refresh));
    return()=>{clearTimeout(timer);subscriptions.forEach(stop=>stop());};
  },[user?.id,user?.role,client]);
}