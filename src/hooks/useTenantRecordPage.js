import {useState} from 'react';
import useTenantIdentity from '@/hooks/useTenantIdentity';
import usePagedEntity from '@/hooks/usePagedEntity';
import useDebouncedValue from '@/hooks/useDebouncedValue';
import entitySearch from '@/lib/entitySearch';
export default function useTenantRecordPage(entity,fields,sort) {
  const identity=useTenantIdentity(),[search,setSearch]=useState('');
  const text=useDebouncedValue(search);
  const query={tenant_user_id:identity.user?.id,...entitySearch(text,fields)};
  const page=usePagedEntity(entity,query,sort,!!identity.user&&!identity.loading);
  return {...identity,...page,user:identity.user,loading:identity.loading||page.isPending,search,setSearch,reload:page.refetch};
}