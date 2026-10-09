import React from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import TenantKinCard from '@/components/tenants/TenantKinCard';
import RequestKinButton from '@/components/tenants/RequestKinButton';
export default function TenantNextOfKin({ tenant }) {
  const { user } = useAuth();

  const result = useInfiniteQuery({
    queryKey: ['individual-tenant-next-of-kin', user?.id, tenant.id],
    enabled: !!user && !!tenant.id,
    refetchInterval: 15000,
    initialPageParam: null,
    queryFn: async ({ pageParam }) => (await base44.functions.invoke('tenantOps', { action: 'next_of_kin', tenant_id: tenant.id, cursor: pageParam })).data,
    getNextPageParam: page => page.has_more ? page.next_cursor : undefined,
  });
  const kin = result.data?.pages.flatMap(page => page.items) || [];
  return <section className="space-y-3 border-t border-border pt-4">
    <h3 className="font-heading font-semibold">Next of kin</h3>
    <RequestKinButton key={tenant.id} tenant={tenant}/>
    {result.isLoading ? <p className="text-sm text-muted-foreground">Loading next-of-kin details…</p> : result.error ? <p role="alert" className="text-sm text-destructive">Could not load next-of-kin details. <button className="underline" onClick={() => result.refetch()}>Try again</button></p> : !kin.length ? <p className="text-sm text-muted-foreground">No next-of-kin details have been submitted.</p> : kin.map(record => <TenantKinCard key={record.id} kin={record}/>)}
    {result.hasNextPage && <Button variant="outline" disabled={result.isFetchingNextPage} onClick={() => result.fetchNextPage()}>{result.isFetchingNextPage ? 'Loading…' : 'Load more next-of-kin records'}</Button>}
  </section>;
}