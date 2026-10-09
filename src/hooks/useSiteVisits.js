import {useEffect} from 'react';
import {useQuery,useQueryClient} from '@tanstack/react-query';
import {base44} from '@/api/base44Client';
import {useAuth} from '@/lib/AuthContext';
import usePagedEntity from '@/hooks/usePagedEntity';
export default function useSiteVisits(){
  const {user}=useAuth(),client=useQueryClient(),owner=user?.role==='admin'?{}:{owner_user_id:user?.id};
  const rows=usePagedEntity('Application',{...owner,status:{$in:['Site Visit Requested','Site Visit Scheduled','Site Visit Completed']}},'site_visit_date',!!user);
  const waiting=useQuery({queryKey:['site-visits-waiting',user?.id],enabled:!!user,staleTime:30000,queryFn:()=>base44.entities.Application.count({...owner,status:'Site Visit Requested',site_visit_proposed_by:{$ne:'landlord'}})});
  useEffect(()=>{
    if(!user)return;let timer;
    const unsubscribe=base44.entities.Application.subscribe(()=>{clearTimeout(timer);timer=setTimeout(()=>client.invalidateQueries({queryKey:['site-visits-waiting',user.id]}),250);});
    return()=>{clearTimeout(timer);unsubscribe();};
  },[user?.id,client]);
  return {items:rows.items,pending:waiting.data||0,loading:rows.isLoading||waiting.isLoading,error:rows.error||waiting.error,hasMore:rows.hasNextPage,loadingMore:rows.isFetchingNextPage,loadMore:rows.fetchNextPage,refresh:()=>Promise.all([rows.refetch(),waiting.refetch()])};
}