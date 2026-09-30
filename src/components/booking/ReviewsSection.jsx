import React from "react";
import { Star } from "lucide-react";

function Stars({ value }) {
  return <span className="inline-flex">{[1, 2, 3, 4, 5].map((n) => <Star key={n} className={`h-4 w-4 ${n <= Math.round(value) ? "fill-amber-400 text-amber-400" : "text-slate-300"}`} />)}</span>;
}

export default function ReviewsSection({ rating, reviews }) {
  return (
    <div>
      <div className="flex items-center gap-2">
        <Stars value={rating.average} />
        <span className="text-sm text-slate-600">{rating.count ? `${rating.average} (${rating.count} review${rating.count > 1 ? "s" : ""})` : "No reviews yet"}</span>
      </div>
      {reviews.filter((r) => r.comment).length > 0 && (
        <div className="mt-3 space-y-2">
          {reviews.filter((r) => r.comment).map((r) => (
            <div key={r.id} className="rounded-lg border border-slate-200 bg-white p-3 text-sm">
              <div className="flex items-center justify-between"><span className="font-medium text-slate-800">{r.tenant_name || "Tenant"}</span><Stars value={r.rating} /></div>
              <p className="mt-1 text-slate-600">{r.comment}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}