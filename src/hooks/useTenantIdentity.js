import {useQuery} from '@tanstack/react-query';
import {useAuth} from '@/lib/AuthContext';
import {base44} from '@/api/base44Client';
export default function useTenantIdentity() {
  const {user}=useAuth();
  const result=useQuery({queryKey:['tenant-identity',user?.id],enabled:!!user,staleTime:60000,queryFn:async()=>{
    const {data}=await base44.functions.invoke('linkTenant',{});
    const page=await base44.entities.Tenant.filter({user_id:user.id},{limit:1});
    return {tenant:page.items[0]||null,notLinked:!!data?.notFound};
  }});
  return {user,tenant:result.data?.tenant,notLinked:result.data?.notLinked,loading:result.isPending,error:result.error,refetch:result.refetch};
}