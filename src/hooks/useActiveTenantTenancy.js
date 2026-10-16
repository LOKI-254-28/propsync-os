import {useQuery} from '@tanstack/react-query';
import {base44} from '@/api/base44Client';
import {useAuth} from '@/lib/AuthContext';
import reconcileInitialRent from '@/lib/reconcileInitialRent';
import portfolioRequest from '@/lib/portfolioRequest';
export default function useActiveTenantTenancy(enabled=true,reconcile=false) {
  const {user}=useAuth();
  return useQuery({queryKey:['tenant-current-tenancy',user?.id,reconcile],enabled:!!user&&enabled,staleTime:60000,queryFn:async()=>{
    const page=await base44.entities.Tenancy.filter({tenant_user_id:user.id,status:{$in:['Active','Expiring Soon','Notice Given']}},{sort:'-created_date',limit:1});
    if(reconcile)await reconcileInitialRent(page.items,portfolioRequest);
    return page.items[0]||null;
  }});
}