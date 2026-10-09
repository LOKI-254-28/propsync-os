import React from 'react';
import {Link} from 'react-router-dom';
import {Bed,Bath,Maximize} from 'lucide-react';
import {Image} from '@/components/ui/image';
import {KES} from '@/lib/finance';
export default function RentalTypeSamples({samples,propertyId}) {
  return <section><h2 className="mb-3 font-heading font-semibold text-foreground">Available unit types</h2>
    {!samples.length?<p className="text-sm text-muted-foreground">No units currently available.</p>:<>
      <div className="mb-4 flex flex-wrap gap-2">{samples.map(s=><span key={s.unit_type} className="rounded-full bg-accent px-3 py-1 text-sm text-accent-foreground">{s.unit_type} available</span>)}</div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">{samples.map(({unit_type,sample:u})=><article key={unit_type} className="overflow-hidden rounded-xl border border-border bg-card text-card-foreground">
        {u.images?.[0]&&<Image src={u.images[0]} alt={`${unit_type} representative sample`} className="h-40 w-full"/>}
        <div className="space-y-3 p-4"><h3 className="font-semibold">{unit_type}</h3><p className="text-xs text-muted-foreground">Representative sample · Available</p>
          <div className="flex flex-wrap gap-3 text-sm"><span className="flex items-center gap-1"><Bed size={14}/>{u.bedrooms} bed</span><span className="flex items-center gap-1"><Bath size={14}/>{u.bathrooms} bath</span>{u.size_sqm>0&&<span className="flex items-center gap-1"><Maximize size={14}/>{u.size_sqm} m²</span>}</div>
          {u.amenities?.length>0&&<p className="text-xs text-muted-foreground">{u.amenities.join(' · ')}</p>}
          <p className="font-semibold text-primary">{KES(u.monthly_rent)}<span className="text-xs font-normal text-muted-foreground"> /month</span></p>
          <Link className="inline-block text-sm text-primary underline" to={`/login?returnTo=${encodeURIComponent(`/portal/property/${propertyId}`)}`}>Log in to view and select units</Link>
        </div>
      </article>)}</div>
    </>}
  </section>;
}