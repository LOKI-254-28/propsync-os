import React from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import TenantKinCard from '@/components/tenants/TenantKinCard';
export default function TenantNextOfKin({ tenant }) {
  const { user } = useAuth();
  const applications = (tenant.tenancies || []).map(t => t.application_id).filter(Boolean);
  const links = [...(tenant.user_id ? [{ tenant_user_id: tenant.user_id }] : []), ...(applications.length ? [{ application_id: { $in: applications } }] : [])];
  const query = { $or: links, ...(user?.role === 'admin' ? {} : { owner_user_id: user?.id }) };
  const result = useInfiniteQuery({
    queryKey: ['tenant-next-of-kin', user?.id, tenant.directory_id || tenant.id, applications],
    enabled: !!user,
    initialPageParam: null,
    queryFn: ({ pageParam }) => links.length ? base44.entities.NextOfKin.filter(query, { sort: '-created_date', limit: 20, cursor: pageParam || undefined, fields: ['full_name', 'id_number', 'phone', 'email', 'id_document_uri'] }) : Promise.resolve({ items: [], has_more: false }),
    getNextPageParam: page => page.has_more ? page.next_cursor : undefined,
  });
  const kin = result.data?.pages.flatMap(page => page.items) || [];
  return <section className="space-y-3 border-t border-border pt-4">
    <h3 className="font-heading font-semibold">Next of kin</h3>
    {result.isLoading ? <p className="text-sm text-muted-foreground">Loading next-of-kin details…</p> : result.error ? <p role="alert" className="text-sm text-destructive">Could not load next-of-kin details. <button className="underline" onClick={() => result.refetch()}>Try again</button></p> : !kin.length ? <p className="text-sm text-muted-foreground">No next-of-kin details have been submitted.</p> : kin.map(record => <TenantKinCard key={record.id} kin={record}/>)}
    {result.hasNextPage && <Button variant="outline" disabled={result.isFetchingNextPage} onClick={() => result.fetchNextPage()}>{result.isFetchingNextPage ? 'Loading…' : 'Load more next-of-kin records'}</Button>}
  </section>;
}