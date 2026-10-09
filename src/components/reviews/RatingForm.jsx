import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import StarRating from '@/components/reviews/StarRating';
export default function RatingForm({ entity, targetId, onSaved, review }) {
  const [open, setOpen] = useState(false), [rating, setRating] = useState(0), [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const [visibility,setVisibility]=useState('Public');
  const title = review ? 'Edit Tenant Rating' : entity === 'PropertyReview' ? 'Rate Property' : entity === 'TenancyReview' ? 'Rate Tenancy Experience' : 'Rate Tenant';
  const submit = async e => {
    e.preventDefault(); setBusy(true); setError('');
    try { await base44.functions.invoke('reviewOps', { action: review ? 'update' : 'submit', entity, target_id: targetId, review_id: review?.id, rating, comment, visibility }); await onSaved(); setOpen(false); }
    catch(e) { setError(e.response?.data?.error || e.message); }
    finally { setBusy(false); }
  };
  return <><Button variant="outline" onClick={() => { setRating(review?.rating || 0); setComment(review?.comment || ''); setVisibility(review?.visibility || 'Public'); setError(''); setOpen(true); }}>{title}</Button><Dialog open={open} onOpenChange={v => !busy && setOpen(v)}><DialogContent className="max-h-[90dvh] overflow-y-auto"><DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader><form onSubmit={submit} className="space-y-4"><StarRating value={rating} onChange={setRating} /><label className="block text-sm">{entity === 'TenantReview' || entity === 'TenancyReview' ? 'Comment' : 'Note'}<Textarea className="mt-2" value={comment} maxLength={2000} onChange={e => setComment(e.target.value)} rows={4} /></label>{entity === 'TenantReview' && <label className="block text-sm">Rating visibility<select aria-label="Rating visibility" disabled={busy} value={visibility} onChange={e=>setVisibility(e.target.value)} className="mt-2 w-full rounded-md border border-input bg-background p-2"><option value="Public">Public, visible immediately</option><option value="Hidden">Hidden, only you and admins</option></select></label>}<p className="text-sm text-muted-foreground">{entity === 'TenantReview' ? 'You can update your rating, comment and visibility at any time. Removing a rating hides it without deleting the record.' : 'Published publicly immediately. Only the property owner or an admin can remove it. Submitted ratings are locked to this tenancy and cannot be overwritten.'}</p>{error && <p role="alert" className="text-sm text-destructive">{error}</p>}<Button type="submit" disabled={busy || !rating}>{busy ? 'Saving…' : review ? 'Save changes' : 'Publish rating'}</Button></form></DialogContent></Dialog></>;
}