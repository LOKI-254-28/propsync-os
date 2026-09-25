import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { KES } from "@/lib/finance";
import { PageHeader, StatusBadge, EmptyState } from "@/components/ui-bits";
import { Input } from "@/components/ui/input";
import { Search, Tag, MapPin, Bed, Bath } from "lucide-react";

export default function GuestExplore() {
  const [listings, setListings] = useState([]);
  const [properties, setProperties] = useState([]);
  const [units, setUnits] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [l, p, u] = await Promise.all([
          base44.entities.Listing.filter({ status: "Published" }).catch(() => []),
          base44.entities.Property.list("-created_date", 200).catch(() => []),
          base44.entities.Unit.list("-created_date", 200).catch(() => []),
        ]);
        setListings(l);
        setProperties(p);
        setUnits(u);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = useMemo(() => listings.filter((l) => {
    if (!search) return true;
    const prop = properties.find((p) => p.id === l.property_id);
    const unit = units.find((u) => u.id === l.unit_id);
    const q = search.toLowerCase();
    return (l.property_name || prop?.name || "").toLowerCase().includes(q) ||
           (l.unit_number || "").toLowerCase().includes(q) ||
           (prop?.address || "").toLowerCase().includes(q);
  }), [listings, properties, units, search]);

  if (loading) return <div className="flex h-96 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-700" /></div>;

  return (
    <div>
      <PageHeader title="Explore Properties" description="Browse available properties on PropWiz." />
      <div className="mb-4 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search by property, unit, or location..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 h-11" />
      </div>
      {filtered.length === 0 ? (
        <EmptyState icon={Tag} title="No properties found" description="Check back later for new listings." />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((l) => {
            const prop = properties.find((p) => p.id === l.property_id);
            const unit = units.find((u) => u.id === l.unit_id);
            return (
              <div key={l.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="h-40 bg-gradient-to-br from-emerald-100 to-emerald-50 flex items-center justify-center">
                  {l.images?.[0] ? <img src={l.images[0]} alt="" className="h-full w-full object-cover" /> : <Tag className="h-10 w-10 text-emerald-300" />}
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-slate-900">{l.property_name || prop?.name}</p>
                      <p className="text-xs text-slate-500">{l.unit_number} · {unit?.unit_type}</p>
                    </div>
                    <StatusBadge status={l.listing_type} />
                  </div>
                  {prop?.address && <p className="mt-1.5 flex items-center gap-1 text-xs text-slate-500"><MapPin className="h-3 w-3" /> {prop.address}</p>}
                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex gap-3 text-xs text-slate-500">
                      {unit?.bedrooms > 0 && <span className="flex items-center gap-1"><Bed className="h-3 w-3" /> {unit.bedrooms}</span>}
                      {unit?.bathrooms > 0 && <span className="flex items-center gap-1"><Bath className="h-3 w-3" /> {unit.bathrooms}</span>}
                    </div>
                    <p className="font-semibold text-emerald-700">{KES(l.price)}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}