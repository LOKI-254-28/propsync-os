import React from 'react';
import { useParams, Navigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
export default function ListingRedirect({ publicView = false }) {
  const { id } = useParams();
  const { data, isLoading, error } = useQuery({ queryKey: ['listing-redirect', id,publicView], queryFn: async () => publicView ? (await base44.functions.invoke('getPropertyBrowse',{action:'resolve_listing',listing_id:id})).data : base44.entities.Listing.get(id) });
  if (isLoading) return <p className="p-8 text-center text-muted-foreground">Opening property…</p>;
  if (error || !data?.property_id) return <div className="p-8 text-center"><p>Listing not found.</p><Link className="text-primary underline" to={publicView ? '/listings' : '/portal/listings'}>Back to listings</Link></div>;
  return <Navigate replace to={`${publicView ? '/browse' : '/portal/property'}/${data.property_id}${data.unit_id ? `?unit=${encodeURIComponent(data.unit_id)}` : ''}`} />;
}