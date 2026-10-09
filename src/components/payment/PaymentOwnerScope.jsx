import React from 'react';
import {useInfiniteQuery} from '@tanstack/react-query';
import {base44} from '@/api/base44Client';
import {Field} from '@/components/ui-bits';
import {Button} from '@/components/ui/button';
export default function PaymentOwnerScope({value,onChange}){
  const query=useInfiniteQuery({queryKey:['payment-owner-properties'],initialPageParam:undefined,queryFn:({pageParam})=>base44.entities.Property.filter({},{sort:'name',limit:50,fields:['name','owner_user_id'],cursor:pageParam}),getNextPageParam:page=>page.has_more?page.next_cursor:undefined});
  return <div className="mb-5 space-y-2"><Field label="Owner to manage"><select disabled={query.isLoading} value={value} onChange={e=>onChange(e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"><option value="">My payment details</option>{query.data?.pages.flatMap(page=>page.items).map(property=><option key={property.id} value={property.id}>{property.name} — property owner's details</option>)}</select></Field>{query.isLoading&&<p className="text-sm text-muted-foreground">Loading properties…</p>}{query.isError&&<div className="text-sm text-destructive">Could not load properties. <Button variant="link" onClick={()=>query.refetch()}>Retry</Button></div>}{query.hasNextPage&&<Button variant="outline" disabled={query.isFetchingNextPage} onClick={()=>query.fetchNextPage()}>{query.isFetchingNextPage?'Loading…':'Load more properties'}</Button>}</div>;
}