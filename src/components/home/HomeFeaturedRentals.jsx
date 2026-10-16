import React from 'react';
import {Link} from 'react-router-dom';
import {LoaderCircle} from 'lucide-react';
import HomeRentalCard from '@/components/home/HomeRentalCard';
export default function HomeFeaturedRentals({catalog}) {
  return <section className="band"><div className="sectionhead"><h2>Featured rentals</h2><Link className="browse" to="/listings">Browse all　→</Link></div>
    {catalog.loading?<div className="listing-loading"><LoaderCircle className="h-8 w-8 animate-spin" aria-label="Loading rentals"/></div>:catalog.error?<p role="alert">Could not load rentals. <button className="underline" onClick={()=>catalog.refetch()}>Try again</button></p>:catalog.samples.length===0?<div className="listing-empty">No rentals available yet. Check back soon.</div>:<div className="listing">{catalog.samples.slice(0,6).map(s=>{const p=catalog.properties.find(p=>p.id===s.property_id);return <HomeRentalCard key={`${s.property_id}:${s.unit_type}`} listing={{property_id:s.property_id,property_name:p?.name,unit_type:s.unit_type,price:s.sample.monthly_rent,images:s.sample.images}} property={p} unit={s.sample}/>;})}</div>}
  </section>;
}