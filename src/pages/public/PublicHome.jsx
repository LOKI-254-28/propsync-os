import React, { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { usePublicListings } from "@/lib/usePublicListings";
import PublicLayout from "@/components/public/PublicLayout";
import { KES } from "@/lib/finance";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, MapPin, Bed, Bath, Maximize, ArrowRight, Tag, Building2, Home, ShieldCheck } from "lucide-react";

const UNIT_TYPES = ["Studio", "1 Bedroom", "2 Bedroom", "3 Bedroom", "Penthouse", "Commercial"];

export default function PublicHome() {
  const { isAuthenticated, user, isLoadingAuth } = useAuth();
  const { listings, properties, units, loading } = usePublicListings();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [type, setType] = useState("");
  const [maxPrice, setMaxPrice] = useState("");

  if (isLoadingAuth) {
    return <div className="flex h-screen items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-700" /></div>;
  }
  if (isAuthenticated && user) {
    const isAdmin = user.role === "admin";
    const home = isAdmin ? "/admin"
      : user.account_type === "landowner" ? "/dashboard"
      : "/portal";
    return <Navigate to={home} replace />;
  }

  const featured = (listings || []).filter((l) => l.status === "Published").slice(0, 6);

  const submitSearch = (e) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (type) params.set("type", type);
    if (maxPrice) params.set("max", maxPrice);
    navigate(`/listings?${params.toString()}`);
  };

  return (
    <PublicLayout>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-emerald-700 via-emerald-600 to-emerald-800 text-white">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:py-24">
          <h1 className="font-heading text-3xl font-bold tracking-tight sm:text-5xl">
            Find your next rental, made simple.
          </h1>
          <p className="mt-4 max-w-xl text-emerald-50">
            Browse verified rental listings, apply online, and manage your tenancy — all in one place.
          </p>
          <form onSubmit={submitSearch} className="mt-8 flex flex-col gap-3 rounded-xl bg-white/95 p-3 shadow-lg sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Location, property, or keyword" className="pl-9 border-0 bg-slate-50" />
            </div>
            <select value={type} onChange={(e) => setType(e.target.value)} className="rounded-md border-0 bg-slate-50 px-3 py-2 text-sm text-slate-700 sm:w-44">
              <option value="">All types</option>
              {UNIT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <Input type="number" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} placeholder="Max price" className="border-0 bg-slate-50 sm:w-32" />
            <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700">Search</Button>
          </form>
        </div>
      </section>

      {/* Featured */}
      <section className="mx-auto max-w-6xl px-4 py-12">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="font-heading text-2xl font-semibold text-slate-900">Featured rentals</h2>
          <Link to="/listings" className="flex items-center gap-1 text-sm font-medium text-emerald-700 hover:underline">
            Browse all <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        {loading ? (
          <div className="flex h-40 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-700" /></div>
        ) : featured.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center text-slate-500">
            No listings published yet. Check back soon.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {featured.map((l) => {
              const prop = properties.find((p) => p.id === l.property_id);
              const unit = units.find((u) => u.id === l.unit_id);
              return <ListingCard key={l.id} listing={l} property={prop} unit={unit} />;
            })}
          </div>
        )}
      </section>

      {/* The PropWiz Experience */}
      <section className="bg-slate-50">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <h2 className="font-heading text-2xl font-semibold text-slate-900"><Link to="/the-propwiz-experience" className="hover:underline">The PropWiz Experience</Link></h2>
          <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
            <Step icon={Search} title="See more of the picture" desc="Explore available homes with property photos, location details and reviews." />
            <Step icon={Home} title="Keep your rental life connected" desc="Bring agreements, rent records and repair conversations together in your portal." />
            <Step icon={ShieldCheck} title="Make clearer decisions" desc="Review documented inspections and tenancy records before the next chapter begins." />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-4 py-14">
        <div className="rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 p-8 text-white sm:p-12">
          <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
            <div>
              <h2 className="font-heading text-2xl font-semibold">Own rental property?</h2>
              <p className="mt-2 max-w-md text-amber-50">List your units, manage tenants, track rent, and handle maintenance — all in one platform.</p>
            </div>
            <Link to="/register" className="rounded-md bg-white px-6 py-3 font-medium text-amber-700 hover:bg-amber-50">
              List your property
            </Link>
          </div>
        </div>
      </section>
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
        <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
          <span className="text-lg font-bold text-emerald-700">{KES(listing.price)}<span className="text-xs font-normal text-slate-500">/mo</span></span>
          <span className="text-sm font-medium text-emerald-600 group-hover:underline">View →</span>
        </div>
      </div>
    </Link>
  );
}

function Step({ icon: Icon, title, desc }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="mt-4 font-medium text-slate-900">{title}</h3>
      <p className="mt-1 text-sm text-slate-500">{desc}</p>
    </div>
  );
}