import React from 'react';
import RatingPanel from '@/components/reviews/RatingPanel';
import {useQuery} from '@tanstack/react-query';
import {base44} from '@/api/base44Client';
export default function TenancyRating({ tenancy }) {
  const {data,isLoading,error}=useQuery({queryKey:['tenancy-review-eligibility',tenancy.id],queryFn:async()=>(await base44.functions.invoke('reviewOps',{action:'eligibility',entity:'TenancyReview',target_id:tenancy.id})).data});
  return <section className="mt-4 space-y-3">{isLoading?<p className="text-sm text-muted-foreground">Checking review eligibility…</p>:error?<p role="alert" className="text-sm text-destructive">{error.response?.data?.error || 'Could not check review eligibility.'}</p>:<p className="text-sm text-muted-foreground">{data.reason}</p>}<RatingPanel entity="PropertyReview" filter={{tenancy_id:tenancy.id}} targetId={tenancy.id} canRate={!!data?.eligible} title="Property review"/><RatingPanel entity="TenancyReview" filter={{tenancy_id:tenancy.id}} targetId={tenancy.id} canRate={!!data?.eligible} title="Tenancy-experience review"/></section>;
}