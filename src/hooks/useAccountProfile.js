import {useQuery,useQueryClient} from '@tanstack/react-query';
import {useEffect} from 'react';
import {useAuth} from '@/lib/AuthContext';
import {base44} from '@/api/base44Client';
export default function useAccountProfile() {
  const {user}=useAuth(),client=useQueryClient();
  const key=['account-profile',user?.id];
  const query=useQuery({queryKey:key,enabled:!!user,staleTime:60000,queryFn:async()=> (await base44.functions.invoke('tenantOps',{action:'account_profile'})).data.profile});
  useEffect(()=>{
    if(!user)return;
    const refresh=()=>client.invalidateQueries({queryKey:['account-profile',user.id]});
    window.addEventListener('profile-changed',refresh);
    return ()=>window.removeEventListener('profile-changed',refresh);
  },[user?.id,client]);
  return {...query,profile:query.data,setProfile:profile=>{client.setQueryData(key,profile);window.dispatchEvent(new Event('profile-changed'));}};
}