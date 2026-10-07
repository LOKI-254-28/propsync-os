import React from 'react';
import {Link} from 'react-router-dom';
import {LoaderCircle} from 'lucide-react';
import HomeRentalCard from '@/components/home/HomeRentalCard';
export default function HomeFeaturedRentals({featured,properties,units,loading}) {
  return <section className="band"><div className="sectionhead"><h2>Featured rentals</h2><Link className="browse" to="/listings">Browse all　→</Link></div>
    {loading ? <div className="listing-loading"><LoaderCircle className="h-8 w-8 animate-spin" aria-label="Loading rentals"/></div> : featured.length===0 ? <div className="listing-empty">No listings published yet. Check back soon.</div> : <div className="listing">{featured.map(l=><HomeRentalCard key={l.id} listing={l} property={properties.find(p=>p.id===l.property_id)} unit={units.find(u=>u.id===l.unit_id)}/>)}</div>}
  </section>;
}