import React, { useState } from "react";
import { Link } from "react-router-dom";
import { usePortfolioData } from "@/lib/useAppData";
import { propertyStats, KES, genRef, logAudit } from "@/lib/finance";
import { base44 } from "@/api/base44Client";
import { PageHeader, SectionCard, StatusBadge, EmptyState, Field } from "@/components/ui-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Building2, Plus, Search, MapPin, Loader2 } from "lucide-react";
import { useCrud } from "@/lib/useCrud";
import { toast } from "@/components/ui/use-toast";

export default function Properties() {
  const data = usePortfolioData();
  const { submitting, run } = useCrud();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({ name: "", code: "", address: "", property_type: "Apartment Complex", contact_phone: "", contact_email: "", monthly_operating_expenses: 0, description: "" });

  const filtered = data.properties.filter((p) => p.name?.toLowerCase().includes(search.toLowerCase()) || p.code?.toLowerCase().includes(search.toLowerCase()));

  const create = async () => {
    if (!form.name) { toast({ title: "Validation error", description: "Property name is required.", variant: "destructive" }); return; }
    await run(async () => {
      const me = await base44.auth.me();
      const rec = await base44.entities.Property.create({ ...form, code: form.code || genRef("PRP"), status: "Active", currency: "KES", owner_user_id: me?.id || "" });
      await logAudit({ user: me, action: "Property Created", entity: "Property", entity_id: rec.id, entity_name: rec.name });
      setOpen(false);
      setForm({ name: "", code: "", address: "", property_type: "Apartment Complex", contact_phone: "", contact_email: "", monthly_operating_expenses: 0, description: "" });
      data.reload();
    }, { success: "Property created successfully.", error: "Could not create property. Please try again." });
  };

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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Add Property</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <Field label="Property name"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Garden Heights" /></Field>
            <Field label="Code / reference"><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="Auto-generated" /></Field>
            <div className="col-span-2"><Field label="Address"><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></Field></div>
            <Field label="Property type">
              <select value={form.property_type} onChange={(e) => setForm({ ...form, property_type: e.target.value })} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                {["Apartment Complex", "Building", "Mixed Use", "Commercial", "Townhouse", "Villa"].map((t) => <option key={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="Monthly operating expenses"><Input type="number" value={form.monthly_operating_expenses} onChange={(e) => setForm({ ...form, monthly_operating_expenses: Number(e.target.value) })} /></Field>
            <Field label="Contact phone"><Input value={form.contact_phone} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} /></Field>
            <Field label="Contact email"><Input value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} /></Field>
            <div className="col-span-2"><Field label="Description"><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} /></Field></div>
          </div>
          <DialogFooter><Button onClick={create} disabled={submitting} className="bg-emerald-600 hover:bg-emerald-700">{submitting ? <><Loader2 className="mr-1.5 h-4 w-4 animate-spin" />Creating...</> : "Create Property"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}