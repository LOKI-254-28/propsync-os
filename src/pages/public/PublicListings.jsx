import React, { useState, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import usePublicCatalog from '@/hooks/usePublicCatalog';
import PublicRentalCatalog from '@/components/booking/PublicRentalCatalog';
import PublicLayout from "@/components/public/PublicLayout";
import { KES } from "@/lib/finance";
import { Input } from "@/components/ui/input";
import { Search, Tag, Bed, Bath, Maximize, MapPin, DoorOpen } from "lucide-react";

const UNIT_TYPES = ["Studio", "1 Bedroom", "2 Bedroom", "3 Bedroom", "Penthouse", "Commercial"];

export default function PublicListings() {

  const [params] = useSearchParams();
  const [search, setSearch] = useState(params.get("search") || "");
  const [type, setType] = useState(params.get("type") || "");
  const [maxPrice, setMaxPrice] = useState(params.get("max") || "");

  const catalog = usePublicCatalog({search,type,maxPrice});

  return (
    <PublicLayout>
      <section className="border-b border-slate-200 bg-slate-50">
        <div className="page-container py-8">
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

      <section className="page-container py-10"><PublicRentalCatalog catalog={catalog}/></section>
    </PublicLayout>
  );
}