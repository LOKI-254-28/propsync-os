import {useState} from 'react';
import {useAuth} from '@/lib/AuthContext';
import usePagedEntity from '@/hooks/usePagedEntity';
import useDebouncedValue from '@/hooks/useDebouncedValue';
import entitySearch from '@/lib/entitySearch';
export default function useLandlordRecordPage(entity,fields,sort='-created_date',filters={}) {
  const {user}=useAuth(),[search,setSearch]=useState('');
  const scope=user?.role==='admin'?{}:{owner_user_id:user?.id};
  const query={...scope,...filters,...entitySearch(useDebouncedValue(search),fields)};
  const page=usePagedEntity(entity,query,sort,!!user);
  return {...page,user,scope,query,search,setSearch,loading:!user,reload:page.refetch};
}