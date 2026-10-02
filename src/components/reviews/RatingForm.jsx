import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import StarRating from '@/components/reviews/StarRating';
export default function RatingForm({ entity, targetId, onSaved }) {
  const [open, setOpen] = useState(false), [rating, setRating] = useState(0), [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const title = entity === 'TenancyReview' ? 'Rate Tenancy' : 'Rate Tenant';
  const submit = async e => {
    e.preventDefault(); setBusy(true); setError('');
    try { await base44.functions.invoke('reviewOps', { action: 'submit', entity, target_id: targetId, rating, comment }); await onSaved(); setOpen(false); }
    catch(e) { setError(e.response?.data?.error || e.message); }
    finally { setBusy(false); }
  };
  return <><Button variant="outline" onClick={() => setOpen(true)}>{title}</Button><Dialog open={open} onOpenChange={v => !busy && setOpen(v)}><DialogContent className="max-h-[90dvh] overflow-y-auto"><DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader><form onSubmit={submit} className="space-y-4"><StarRating value={rating} onChange={setRating} /><label className="block text-sm">{entity === 'TenancyReview' ? 'Comment' : 'Note'}<Textarea className="mt-2" value={comment} maxLength={2000} onChange={e => setComment(e.target.value)} rows={4} /></label><p className="text-sm text-muted-foreground">{entity === 'TenancyReview' ? 'Published publicly immediately. The property owner or an admin can remove it.' : 'Visible to you, the tenant and admins.'} Ratings cannot be edited or submitted again.</p>{error && <p role="alert" className="text-sm text-destructive">{error}</p>}<Button type="submit" disabled={busy || !rating}>{busy ? 'Publishing…' : 'Publish rating'}</Button></form></DialogContent></Dialog></>;
}