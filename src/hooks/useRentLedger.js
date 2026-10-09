import {useEffect} from 'react';
import {useQuery,useQueryClient} from '@tanstack/react-query';
import {useAuth} from '@/lib/AuthContext';
import {base44} from '@/api/base44Client';
import usePagedEntity from '@/hooks/usePagedEntity';
import entitySearch from '@/lib/entitySearch';
export default function useRentLedger(period,search,enabled){
  const {user}=useAuth(),client=useQueryClient(),ready=enabled&&!!user;
  const query={...(user?.role==='admin'?{}:{owner_user_id:user?.id}),billing_period:period,status:{$ne:'Void'},...entitySearch(search,['tenant_name','unit_number','property_name'])};
  const serialized=JSON.stringify(query),rows=usePagedEntity('RentCharge',query,'due_date',ready);
  const summary=useQuery({queryKey:['rent-ledger-totals',serialized],enabled:ready,staleTime:30000,queryFn:()=>base44.entities.RentCharge.aggregate({query,sum:['amount','amount_paid','outstanding']})});
  useEffect(()=>{
    if(!ready)return;let timer;
    const unsubscribe=base44.entities.RentCharge.subscribe(()=>{clearTimeout(timer);timer=setTimeout(()=>client.invalidateQueries({queryKey:['rent-ledger-totals',serialized]}),250);});
    return()=>{clearTimeout(timer);unsubscribe();};
  },[ready,serialized,client]);
  const totals=summary.data?.rows[0];
  return {charges:rows.items,loading:ready&&(rows.isLoading||summary.isLoading),error:rows.error||summary.error,totals:{expected:totals?.sum_amount||0,collected:totals?.sum_amount_paid||0,outstanding:totals?.sum_outstanding||0},hasMore:rows.hasNextPage,loadingMore:rows.isFetchingNextPage,loadMore:rows.fetchNextPage,refresh:()=>Promise.all([rows.refetch(),summary.refetch()])};
}