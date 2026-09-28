import React, { useState, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { usePublicListings } from "@/lib/usePublicListings";
import PublicLayout from "@/components/public/PublicLayout";
import { KES } from "@/lib/finance";
import { Input } from "@/components/ui/input";
import { Search, Tag, Bed, Bath, Maximize, MapPin, DoorOpen } from "lucide-react";

const UNIT_TYPES = ["Studio", "1 Bedroom", "2 Bedroom", "3 Bedroom", "Penthouse", "Commercial"];

export default function PublicListings() {
  const { listings, properties, units, loading } = usePublicListings();
  const [params] = useSearchParams();
  const [search, setSearch] = useState(params.get("search") || "");
  const [type, setType] = useState(params.get("type") || "");
  const [maxPrice, setMaxPrice] = useState(params.get("max") || "");

  const published = useMemo(() => (listings || []).filter((l) => l.status === "Published"), [listings]);

  const filtered = useMemo(() => published
    .filter((l) => {
      if (!type) return true;
      const unit = units.find((u) => u.id === l.unit_id);
      return unit?.unit_type === type;
    })
    .filter((l) => !maxPrice || Number(l.price) <= Number(maxPrice))
    .filter((l) => {
      if (!search) return true;
      const prop = properties.find((p) => p.id === l.property_id);
      const unit = units.find((u) => u.id === l.unit_id);
      return l.property_name?.toLowerCase().includes(search.toLowerCase())
        || l.unit_number?.toLowerCase().includes(search.toLowerCase())
        || prop?.address?.toLowerCase().includes(search.toLowerCase())
        || l.description?.toLowerCase().includes(search.toLowerCase());
    })
    .sort((a, b) => new Date(b.date_listed || b.created_date) - new Date(a.date_listed || a.created_date)),
    [published, properties, units, search, type, maxPrice]);

  const listingUnitIds = useMemo(() => new Set(published.map((l) => l.unit_id).filter(Boolean)), [published]);
  const comingSoon = useMemo(() => (units || []).filter((u) => u.status === "Available" && !listingUnitIds.has(u.id)), [units, listingUnitIds]);

  return (
    <PublicLayout>
      <section className="border-b border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-6xl px-4 py-8">
          <h1 className="font-heading text-2xl font-semibold text-slate-900">Browse rentals</h1>
          <div className="mt-4 flex flex-wrap gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by location, property, or keyword" className="pl-9" />
            </div>
            <select value={type} onChange={(e) => setType(e.target.value)} className="rounded-md border border-input bg-background px-3 py-2 text-sm">
              <option value="">All types</option>
              {UNIT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <Input type="number" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} placeholder="Max price" className="w-32" />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-10">
        <h2 className="mb-4 font-medium text-slate-800">{filtered.length} listing{filtered.length !== 1 ? "s" : ""}</h2>
        {loading ? (
          <div className="flex h-40 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-700" /></div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center text-slate-500">
            No listings match your search. Try adjusting the filters.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((l) => {
              const prop = properties.find((p) => p.id === l.property_id);
              const unit = units.find((u) => u.id === l.unit_id);
              return <ListingCard key={l.id} listing={l} property={prop} unit={unit} />;
            })}
          </div>
        )}
      </section>

      {comingSoon.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 pb-14">
          <h2 className="mb-4 flex items-center gap-2 font-medium text-slate-800"><DoorOpen className="h-5 w-5 text-emerald-600" />Coming soon</h2>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {comingSoon.map((u) => {
              const prop = properties.find((p) => p.id === u.property_id);
              return (
                <div key={u.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex h-32 items-center justify-center rounded-lg bg-gradient-to-br from-slate-100 to-slate-50">
                    <DoorOpen className="h-10 w-10 text-slate-300" />
                  </div>
                  <p className="mt-3 font-semibold text-slate-900">{prop?.name || u.property_name}</p>
                  {u.unit_number && <p className="text-xs text-slate-500">Unit {u.unit_number}</p>}
                  {prop?.address && <p className="mt-1 flex items-center gap-1 text-xs text-slate-500"><MapPin className="h-3 w-3" />{prop.address}</p>}
                  <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-600">
                    {u.bedrooms > 0 && <span className="flex items-center gap-1"><Bed className="h-3.5 w-3.5" />{u.bedrooms}</span>}
                    {u.bathrooms > 0 && <span className="flex items-center gap-1"><Bath className="h-3.5 w-3.5" />{u.bathrooms}</span>}
                    {u.size_sqm > 0 && <span className="flex items-center gap-1"><Maximize className="h-3.5 w-3.5" />{u.size_sqm}m²</span>}
                  </div>
                  <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
                    <span className="text-lg font-bold text-slate-700">{KES(u.monthly_rent)}<span className="text-xs font-normal text-slate-500">/mo</span></span>
                    <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700 border border-amber-200">Coming soon</span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </PublicLayout>
  );
}

function ListingCard({ listing, property, unit }) {
  return (
    <Link to={`/listings/${listing.id}`} className="group overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:border-emerald-300 hover:shadow-md">
      <div className="flex h-40 items-center justify-center bg-gradient-to-br from-emerald-100 to-emerald-50">
        {listing.images?.[0] ? (
          <img src={listing.images[0]} alt={listing.property_name} className="h-full w-full object-cover" />
        ) : <Tag className="h-10 w-10 text-emerald-400" />}
      </div>
      <div className="p-4">
        <p className="font-semibold text-slate-900 group-hover:text-emerald-700">{listing.property_name}</p>
        {listing.unit_number && <p className="text-xs text-slate-500">Unit {listing.unit_number}</p>}
        {property?.address && <p className="mt-1 flex items-center gap-1 text-xs text-slate-500"><MapPin className="h-3 w-3" />{property.address}</p>}
        {unit && (
          <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-600">
            {unit.bedrooms > 0 && <span className="flex items-center gap-1"><Bed className="h-3.5 w-3.5" />{unit.bedrooms}</span>}
            {unit.bathrooms > 0 && <span className="flex items-center gap-1"><Bath className="h-3.5 w-3.5" />{unit.bathrooms}</span>}
            {unit.size_sqm > 0 && <span className="flex items-center gap-1"><Maximize className="h-3.5 w-3.5" />{unit.size_sqm}m²</span>}
          </div>
        )}
        {listing.description && <p className="mt-2 line-clamp-2 text-sm text-slate-600">{listing.description}</p>}
        <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
          {listing.unit_id ? (
            <span className="text-lg font-bold text-emerald-700">{KES(listing.price)}<span className="text-xs font-normal text-slate-500">/mo</span></span>
          ) : (
            <span className="text-sm font-semibold text-emerald-700">Units available</span>
          )}
          <span className="text-sm font-medium text-emerald-600 group-hover:underline">View →</span>
        </div>
      </div>
    </Link>
  );
}