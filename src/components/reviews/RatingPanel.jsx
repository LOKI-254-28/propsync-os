import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import RatingForm from '@/components/reviews/RatingForm';
import ReviewList from '@/components/reviews/ReviewList';
export default function RatingPanel({ entity, filter, targetId, canRate = false, title = 'Ratings', hint }) {
  const { user } = useAuth();
  const { data: reviews = [], isLoading, error, refetch } = useQuery({ queryKey: ['ratings', entity, filter], queryFn: () => base44.entities[entity].filter(filter, '-created_date', 100), enabled: !!user });
  const own = reviews.some(r => entity === 'TenancyReview' ? r.tenant_user_id === user?.id : r.owner_user_id === user?.id);
  return <section className="mt-4 space-y-3 border-t border-border pt-4"><h3 className="text-sm font-medium">{title}</h3>{isLoading ? <p className="text-sm text-muted-foreground">Loading ratings…</p> : error ? <p role="alert" className="text-sm text-destructive">Could not load ratings.</p> : <><ReviewList reviews={reviews} entity={entity} user={user} onChanged={refetch} />{!reviews.length && <p className="text-sm text-muted-foreground">No ratings yet.</p>}{canRate && !own && (entity === 'TenancyReview' || (user?.account_type || user?.data?.account_type) === 'landowner') && <RatingForm entity={entity} targetId={targetId} onSaved={refetch} />}{hint && !own && <p className="text-xs text-muted-foreground">{hint}</p>}</>}</section>;
}