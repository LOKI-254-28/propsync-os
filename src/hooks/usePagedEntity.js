import {useEffect} from 'react';
import {useInfiniteQuery,useQueryClient} from '@tanstack/react-query';
import {base44} from '@/api/base44Client';
export default function usePagedEntity(entity,query,sort,enabled=true){
  const client=useQueryClient(),serialized=JSON.stringify(query),key=[`${entity}-pages`,serialized,sort];
  const result=useInfiniteQuery({queryKey:key,enabled,staleTime:30000,initialPageParam:null,queryFn:({pageParam})=>base44.entities[entity].filter(query,{sort,limit:50,cursor:pageParam||undefined}),getNextPageParam:page=>page.has_more?page.next_cursor:undefined});
  useEffect(()=>{
    if(!enabled)return;
    let timer;
    const unsubscribe=base44.entities[entity].subscribe(()=>{clearTimeout(timer);timer=setTimeout(()=>client.invalidateQueries({queryKey:[`${entity}-pages`,serialized,sort]}),250);});
    return()=>{clearTimeout(timer);unsubscribe();};
  },[entity,serialized,sort,enabled,client]);
  return {...result,items:result.data?.pages.flatMap(page=>page.items)||[]};
}