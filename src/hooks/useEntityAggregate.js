import {useEffect} from 'react';
import {useQuery,useQueryClient} from '@tanstack/react-query';
import {base44} from '@/api/base44Client';
import {useAuth} from '@/lib/AuthContext';
import portfolioRequest from '@/lib/portfolioRequest';
export default function useEntityAggregate(entity,options,enabled=true) {
  const {user}=useAuth(),client=useQueryClient(),serialized=JSON.stringify(options);
  const key=['record-aggregate',user?.id,entity,serialized];
  const result=useQuery({queryKey:key,enabled:!!user&&enabled,staleTime:60000,retry:false,queryFn:()=>portfolioRequest(()=>base44.entities[entity].aggregate(options))});
  useEffect(()=>{
    if(!enabled||!user)return;
    let timer;
    const unsubscribe=base44.entities[entity].subscribe(()=>{clearTimeout(timer);timer=setTimeout(()=>{const state=client.getQueryState(key);if(Date.now()-(state?.dataUpdatedAt||0)>3000)client.invalidateQueries({queryKey:key,exact:true});},1500);});
    return()=>{clearTimeout(timer);unsubscribe();};
  },[entity,serialized,user?.id,enabled,client]);
  return {...result,rows:result.data?.rows||[]};
}