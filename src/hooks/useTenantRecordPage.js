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
  const error=identity.error||page.error,refetch=identity.error?identity.refetch:page.refetch;
  return {...identity,...page,user:identity.user,error,loading:!error&&identity.loading,search,setSearch,refetch,reload:refetch};
}