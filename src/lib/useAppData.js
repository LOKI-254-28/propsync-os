import {useEffect, useMemo} from 'react';
import {useQuery, useQueryClient} from '@tanstack/react-query';
import {base44} from '@/api/base44Client';
import {useAuth} from '@/lib/AuthContext';
import portfolioLoader, {emptyPortfolio} from '@/lib/portfolioLoader';

// Share scoped snapshots across pages; live events never cancel an in-flight load.
export function usePortfolioData({enabled=true, excludeFinancial=false}={}) {
  const {user}=useAuth(), client=useQueryClient();
  const key=useMemo(()=>['portfolio', user?.id, user?.role, user?.account_type, excludeFinancial], [user?.id,user?.role,user?.account_type,excludeFinancial]);
  const result=useQuery({queryKey:key, enabled:enabled&&!!user, staleTime:60000,
    retry:false, throwOnError:true,
    queryFn:()=>portfolioLoader(user,excludeFinancial)});
  useEffect(()=>{
    if(!enabled||!user)return;
    let timer;
    const refresh=event=>{
      if(user.role!=='admin'&&event.data?.owner_user_id&&event.data.owner_user_id!==user.id)return;
      clearTimeout(timer);
      timer=setTimeout(()=>client.invalidateQueries({queryKey:key,exact:true},{cancelRefetch:false}),1500);
    };
    const unsubscribers=['Property','Unit','Tenancy','VacationRequest'].map(entity=>base44.entities[entity].subscribe(refresh));
    return()=>{clearTimeout(timer);unsubscribers.forEach(unsubscribe=>unsubscribe());};
  },[enabled,user?.id,user?.role,key,client]);
  const reload=async()=>{
    // Keep the two portfolio variants consistent after writes, without duplicating reads.
    await client.invalidateQueries({queryKey:['portfolio',user?.id],refetchType:'none'});
    return result.refetch({cancelRefetch:false,throwOnError:true});
  };
  return {...emptyPortfolio,...result.data,loading:enabled&&(!user||result.isPending),reload};
}