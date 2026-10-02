import React, { useState, useMemo, useEffect } from "react";
import { Link } from "react-router-dom";
import { useTenantData } from "@/lib/useTenantData";
import { base44 } from "@/api/base44Client";
import { KES } from "@/lib/finance";
import { PageHeader, StatusBadge, EmptyState } from "@/components/ui-bits";
import { Input } from "@/components/ui/input";
import { Tag, Search, Bed, Bath, Maximize, MapPin } from "lucide-react";

export default function BrowseListings() {
  const t = useTenantData();
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("");
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [properties, setProperties] = useState([]);

  useEffect(() => {
    base44.entities.Property.list("-created_date", 200).then(setProperties).catch(() => {});
  }, []);

  const published = useMemo(() => (t.listings || [])
    .filter((l) => l.status === "Published" || l.status === "Active")
    .filter((l) => !filterType || l.listing_type === filterType)
    .filter((l) => !priceMin || Number(l.price) >= Number(priceMin))
    .filter((l) => !priceMax || Number(l.price) <= Number(priceMax))
    .filter((l) => {
      if (!search) return true;
      const prop = properties.find((p) => p.id === l.property_id);
      const unit = t.units.find((u) => u.id === l.unit_id);
      return l.property_name?.toLowerCase().includes(search.toLowerCase()) ||
             l.unit_number?.toLowerCase().includes(search.toLowerCase()) ||
             prop?.address?.toLowerCase().includes(search.toLowerCase()) ||
             l.description?.toLowerCase().includes(search.toLowerCase());
    })
    .sort((a, b) => new Date(b.date_listed || b.created_date) - new Date(a.date_listed || a.created_date)), [t.listings, t.units, properties, search, filterType, priceMin, priceMax]);

  if (t.loading) return <div className="flex h-96 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-700" /></div>;

  return (
    <div>
      <PageHeader title="Browse Listings" description="Find your next rental home." />

      <div className="mb-4 flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by property, location, description..." className="pl-9" />
        </div>
        <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="rounded-md border border-input bg-background px-3 py-2 text-sm">
          <option value="">All types</option>
          <option value="Rent">For Rent</option>
        </select>
        <Input type="number" value={priceMin} onChange={(e) => setPriceMin(e.target.value)} placeholder="Min price" className="w-28" />
        <Input type="number" value={priceMax} onChange={(e) => setPriceMax(e.target.value)} placeholder="Max price" className="w-28" />
      </div>

      {published.length === 0 ? (
        <EmptyState icon={Tag} title="No listings available" description="Check back later for new properties." />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {published.map((l) => {
            const prop = properties.find((p) => p.id === l.property_id);
            const unit = t.units.find((u) => u.id === l.unit_id);
            return (
              <Link key={l.id} to={`/portal/property/${l.property_id}${l.unit_id ? `?unit=${encodeURIComponent(l.unit_id)}` : ''}`} className="group overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:border-emerald-300 hover:shadow-md">
                <div className="flex h-40 items-center justify-center bg-gradient-to-br from-emerald-100 to-emerald-50">
                  {l.images?.[0] ? <img src={l.images[0]} alt={l.property_name} className="h-full w-full object-cover" /> : <Tag className="h-10 w-10 text-emerald-400" />}
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-slate-900 group-hover:text-emerald-700">{l.property_name}</p>
                      {l.unit_number && <p className="text-xs text-slate-500">Unit {l.unit_number}</p>}
                    </div>
                    <StatusBadge status={l.listing_type} />
                  </div>
                  {prop?.address && <p className="mt-1.5 flex items-center gap-1 text-xs text-slate-500"><MapPin className="h-3 w-3" />{prop.address}</p>}
                  {unit && (
                    <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-600">
                      {unit.bedrooms > 0 && <span className="flex items-center gap-1"><Bed className="h-3.5 w-3.5" />{unit.bedrooms} bed</span>}
                      {unit.bathrooms > 0 && <span className="flex items-center gap-1"><Bath className="h-3.5 w-3.5" />{unit.bathrooms} bath</span>}
                      {unit.size_sqm > 0 && <span className="flex items-center gap-1"><Maximize className="h-3.5 w-3.5" />{unit.size_sqm}m²</span>}
                    </div>
                  )}
                  {l.description && <p className="mt-2 text-sm text-slate-600 line-clamp-2">{l.description}</p>}
                  <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
                    <span className="text-lg font-bold text-emerald-700">{KES(l.price)}{l.listing_type === "Rent" && <span className="text-xs font-normal text-slate-500">/mo</span>}</span>
                    <span className="text-sm font-medium text-emerald-600 group-hover:underline">View →</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}