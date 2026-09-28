import React, { useState } from "react";
import { Link } from "react-router-dom";
import { usePortfolioData } from "@/lib/useAppData";
import { propertyStats, KES } from "@/lib/finance";
import { PageHeader, StatusBadge, EmptyState } from "@/components/ui-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Building2, Plus, Search, MapPin } from "lucide-react";
import PropertyWizard from "@/components/PropertyWizard";

export default function Properties() {
  const data = usePortfolioData();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = data.properties.filter((p) => p.name?.toLowerCase().includes(search.toLowerCase()) || p.code?.toLowerCase().includes(search.toLowerCase()));

  if (data.loading) return <div className="flex h-96 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-700" /></div>;

  return (
    <div>
      <PageHeader title="Properties" description="Manage your portfolio of properties and developments."
        actions={<Button onClick={() => setOpen(true)} className="bg-emerald-600 hover:bg-emerald-700"><Plus className="mr-1.5 h-4 w-4" />Add Property</Button>} />

      <div className="mb-4 relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search properties..." className="pl-9" />
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Building2} title="No properties yet" description="Add your first property to begin managing units and tenancies." action={<Button onClick={() => setOpen(true)} className="bg-emerald-600 hover:bg-emerald-700"><Plus className="mr-1.5 h-4 w-4" />Add Property</Button>} />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => {
            const s = propertyStats(p, data);
            return (
              <Link key={p.id} to={`/properties/${p.id}`} className="group rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-emerald-300 hover:shadow-md">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700"><Building2 className="h-5 w-5" /></div>
                    <div><p className="font-semibold text-slate-900 group-hover:text-emerald-700">{p.name}</p><p className="text-xs text-slate-500">{p.code}</p></div>
                  </div>
                  <StatusBadge status={p.status} />
                </div>
                {p.address && <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-500"><MapPin className="h-3.5 w-3.5" />{p.address}</p>}
                <div className="mt-4 grid grid-cols-3 gap-2 border-t border-slate-100 pt-3 text-center">
                  <div><p className="text-lg font-semibold text-slate-900">{s.units}</p><p className="text-[10px] uppercase text-slate-500">Units</p></div>
                  <div><p className="text-lg font-semibold text-emerald-700">{s.occupancyRate}%</p><p className="text-[10px] uppercase text-slate-500">Occupied</p></div>
                  <div><p className="text-sm font-semibold text-slate-900">{KES(s.expectedRent)}</p><p className="text-[10px] uppercase text-slate-500">Rent/mo</p></div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      <PropertyWizard open={open} onClose={() => setOpen(false)} onCreated={() => data.reload()} />
    </div>
  );
}