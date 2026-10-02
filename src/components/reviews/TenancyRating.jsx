import React from 'react';
import RatingPanel from '@/components/reviews/RatingPanel';
export default function TenancyRating({ tenancy }) {
  const today = new Date(new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Nairobi', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()) + 'T00:00:00Z');
  const cutoff = new Date(today); cutoff.setUTCMonth(cutoff.getUTCMonth() - 6);
  const current = ['Active', 'Expiring Soon', 'Notice Given'].includes(tenancy.status);
  const start = new Date(tenancy.start_date + 'T00:00:00Z');
  const end = new Date((tenancy.actual_end_date || tenancy.expected_end_date) + 'T00:00:00Z');
  const eligible = current ? start <= cutoff : ['Terminated', 'Vacated', 'Archived'].includes(tenancy.status) && end >= cutoff && end <= today;
  return <RatingPanel entity="TenancyReview" filter={{ tenancy_id: tenancy.id }} targetId={tenancy.id} canRate={eligible} title="Your tenancy rating" hint={!eligible ? 'Eligible after six months of occupancy, or within six months after the tenancy ends.' : undefined} />;
}