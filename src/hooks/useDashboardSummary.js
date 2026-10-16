import {useEffect} from 'react';
import {useQuery,useQueryClient} from '@tanstack/react-query';
import {base44} from '@/api/base44Client';
import {useAuth} from '@/lib/AuthContext';
import portfolioRequest from '@/lib/portfolioRequest';
export default function useDashboardSummary(enabled=true) {
  const {user}=useAuth(),client=useQueryClient(),key=['dashboard-summary',user?.id];
  const result=useQuery({queryKey:key,enabled:!!user&&enabled,staleTime:60000,queryFn:()=>portfolioRequest(async()=>(await base44.functions.invoke('dashboardSummary',{})).data)});
  useEffect(()=>{
    if(!user)return;
    let timer;
    const refresh=()=>{clearTimeout(timer);timer=setTimeout(()=>client.invalidateQueries({queryKey:['dashboard-summary',user.id]}),1000);};
    const stops=['Property','Unit','Tenancy','RentCharge','Payment','Maintenance','Notice','Application'].map(name=>base44.entities[name].subscribe(refresh));
    return()=>{clearTimeout(timer);stops.forEach(stop=>stop());};
  },[user?.id,client]);
  return {...result,user,loading:result.isPending};
}