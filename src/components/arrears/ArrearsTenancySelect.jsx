import React from 'react';
import {useInfiniteQuery} from '@tanstack/react-query';
import {base44} from '@/api/base44Client';
import {Field} from '@/components/ui-bits';
import {Button} from '@/components/ui/button';
export default function ArrearsTenancySelect({tenantId,value,onChange,disabled}){
  const result=useInfiniteQuery({queryKey:['arrears-tenancies',tenantId],initialPageParam:null,queryFn:async({pageParam})=>(await base44.functions.invoke('sendRentDueNotices',{action:'arrears_tenancies',tenant_id:tenantId,cursor:pageParam})).data,getNextPageParam:page=>page.has_more?page.next_cursor:undefined});
  const rows=result.data?.pages.flatMap(page=>page.items)||[];
  return <Field label="Tenancy / unit"><select required value={value} disabled={disabled||result.isLoading} onChange={e=>onChange(e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"><option value="">{result.isLoading?'Loading tenancies…':'Select tenancy…'}</option>{rows.map(row=><option key={row.id} value={row.id}>{row.property_name} / {row.unit_number}</option>)}</select>
    {result.hasNextPage&&<Button type="button" variant="link" disabled={result.isFetchingNextPage} onClick={()=>result.fetchNextPage()}>Load more tenancies</Button>}
    {result.error&&<p role="alert" className="text-sm text-destructive">Could not load tenancies. <button type="button" onClick={()=>result.refetch()} className="underline">Try again</button></p>}
  </Field>;
}