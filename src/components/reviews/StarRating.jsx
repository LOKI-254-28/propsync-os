import React from 'react';
import { Star } from 'lucide-react';
export default function StarRating({ value, onChange }) {
  return <span className="inline-flex gap-1" aria-label={`${value} out of 5 stars`}>{[1,2,3,4,5].map(n => onChange ? <button type="button" key={n} aria-label={`Rate ${n} star${n > 1 ? 's' : ''}`} aria-pressed={value === n} onClick={() => onChange(n)} className="rounded p-1 focus-visible:outline focus-visible:outline-ring"><Star className={`h-6 w-6 ${n <= value ? 'fill-chart-4 text-chart-4' : 'text-muted-foreground'}`} /></button> : <Star key={n} className={`h-4 w-4 ${n <= value ? 'fill-chart-4 text-chart-4' : 'text-muted-foreground'}`} />)}</span>;
}