import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star, Loader2 } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

// Shown only to eligible tenants (current, or terminated tenancy at this property).
export default function ReviewForm({ propertyId, onSaved }) {
  const [eligible, setEligible] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [locked,setLocked]=useState(false);

  useEffect(() => {
    base44.functions.invoke("postPropertyReview", { property_id: propertyId, check: true })
      .then(({ data }) => {
        setEligible(data.eligible);
        if (data.existing) { setLocked(true); setRating(data.existing.rating); setComment(data.existing.comment || ""); }
      }).catch(() => {});
  }, [propertyId]);

  if (!eligible) return null;
  if (locked) return <p className="mt-4 text-sm text-muted-foreground">Your property review has been submitted and is preserved with this tenancy.</p>;
  const save = async () => {
    setBusy(true);
    try {
      await base44.functions.invoke("postPropertyReview", { property_id: propertyId, rating, comment });
      setLocked(true);
      toast({ title: "Review saved" });
      onSaved();
    } catch (e) {
      toast({ title: "Error", description: e.response?.data?.error || "Could not save review.", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
      <p className="mb-2 text-sm font-medium text-slate-800">Rate this property</p>
      <div className="mb-2 flex">{[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" onClick={() => setRating(n)} aria-label={`${n} stars`}><Star className={`h-6 w-6 ${n <= rating ? "fill-amber-400 text-amber-400" : "text-slate-300"}`} /></button>
      ))}</div>
      <Textarea rows={2} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Share your experience (optional)" />
      <Button size="sm" disabled={busy || !rating} onClick={save} className="mt-2 bg-emerald-600 hover:bg-emerald-700">{busy && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}Save review</Button>
    </div>
  );
}