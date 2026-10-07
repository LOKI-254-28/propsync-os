import React from 'react';
import {Link} from 'react-router-dom';
import {Image} from '@/components/ui/image';
import {Tag, MapPin, Bed, Bath, Maximize} from 'lucide-react';
import {KES} from '@/lib/finance';
export default function HomeRentalCard({listing,property,unit}) {
  return <Link to={`/listings/${listing.id}`} className="card">
    {listing.images?.[0] ? <Image className="listing-img" src={listing.images[0]} alt={listing.property_name} /> : <div className="listing-placeholder"><Tag size={40}/></div>}
    <div className="cardbody"><div><h3>{listing.property_name}</h3>
      {listing.unit_number && <p className="rental-detail">Unit {listing.unit_number}</p>}
      {property?.address && <p className="rental-detail"><MapPin size={12}/>{property.address}</p>}
      {unit && <div className="rental-facts">
        {unit.bedrooms>0 && <span><Bed size={14}/>{unit.bedrooms}</span>}
        {unit.bathrooms>0 && <span><Bath size={14}/>{unit.bathrooms}</span>}
        {unit.size_sqm>0 && <span><Maximize size={14}/>{unit.size_sqm}m²</span>}
      </div>}
    </div><div className="cardbottom"><span className="price">{KES(listing.price)}<small>/mo</small></span><span className="view">View →</span></div></div>
  </Link>;
}