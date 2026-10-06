import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import StarRating from '@/components/reviews/StarRating';
export default function ReviewList({ reviews, entity, user, onChanged }) {
  const [busy, setBusy] = useState(''), [error, setError] = useState('');
  const remove = async id => {
    if (!window.confirm('Remove this rating? It will be hidden, but retained for audit.')) return;
    setBusy(id); setError('');
    try { await base44.functions.invoke('reviewOps', { action: 'remove', entity, review_id: id }); await onChanged(); }
    catch(e) { setError(e.response?.data?.error || e.message); }
    finally { setBusy(''); }
  };
  const visibility = async review => {
    setBusy(review.id);setError('');
    try {await base44.functions.invoke('reviewOps',{action:'visibility',entity,review_id:review.id,visibility:review.visibility === 'Hidden'?'Public':'Hidden'});await onChanged();}
    catch(e){setError(e.response?.data?.error || e.message);}finally{setBusy('');}
  };
  return <div className="space-y-3">{error && <p role="alert" className="text-sm text-destructive">{error}</p>}{reviews.map(r => <div key={r.id} className="rounded-lg border border-border bg-card p-3 text-sm"><div className="flex flex-wrap items-center justify-between gap-2"><span className="font-medium">{entity==='TenantReview' ? r.landlord_name || 'Landlord' : r.tenant_name || 'Tenant'}</span><StarRating value={r.rating} /></div>{r.comment && <p className="mt-2 whitespace-pre-wrap break-words text-muted-foreground">{r.comment}</p>}<p className="mt-2 text-xs text-muted-foreground">{r.removed ? 'Removed · history retained' : r.visibility === 'Hidden' ? 'Hidden · landlord and admins only' : 'Public · locked after submission'}{r.property_name && ` · ${r.property_name}`}{r.tenancy_id && ` · Tenancy ${r.tenancy_id}`}</p>{!r.removed && entity === 'TenantReview' && (user?.role === 'admin' || r.owner_user_id === user?.id) && <Button className="mt-2" variant="ghost" size="sm" disabled={!!busy} onClick={()=>visibility(r)}>{r.visibility==='Hidden'?'Make public':'Hide rating'}</Button>}{!r.removed && (user?.role === 'admin' || r.owner_user_id === user?.id) && <Button className="mt-2" variant="ghost" size="sm" disabled={!!busy} onClick={() => remove(r.id)}>{busy === r.id ? 'Removing…' : 'Remove rating'}</Button>}</div>)}</div>;
}