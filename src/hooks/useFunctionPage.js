import {useEffect} from 'react';
import {useInfiniteQuery,useQueryClient} from '@tanstack/react-query';
import {base44} from '@/api/base44Client';
import {useAuth} from '@/lib/AuthContext';
import portfolioRequest from '@/lib/portfolioRequest';
export default function useFunctionPage(functionName,args,entity,itemsField='items',enabled=true) {
  const {user}=useAuth(),client=useQueryClient(),serialized=JSON.stringify(args),key=['function-pages',user?.id,functionName,serialized];
  const page=useInfiniteQuery({queryKey:key,enabled:!!user&&enabled,staleTime:30000,initialPageParam:null,queryFn:async({pageParam})=>{
    const {data}=await portfolioRequest(()=>base44.functions.invoke(functionName,{...args,cursor:pageParam||undefined}));
    return {...data,items:data[itemsField]||[]};
  },getNextPageParam:result=>result.has_more?result.next_cursor:undefined});
  useEffect(()=>{if(!user||!enabled)return;let timer;const unsubscribe=base44.entities[entity].subscribe(()=>{clearTimeout(timer);timer=setTimeout(()=>client.invalidateQueries({queryKey:key,exact:true},{cancelRefetch:false}),1500);});return()=>{clearTimeout(timer);unsubscribe();};},[user?.id,functionName,serialized,entity,enabled,client]);
  return {...page,items:page.data?.pages.flatMap(p=>p.items)||[],reload:page.refetch};
}