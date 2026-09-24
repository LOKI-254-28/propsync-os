import React, { useState, useMemo } from "react";
import { usePortfolioData } from "@/lib/useAppData";
import { base44 } from "@/api/base44Client";
import { KES, genRef, logAudit, todayISO } from "@/lib/finance";
import { PageHeader, SectionCard, StatusBadge, EmptyState, Field } from "@/components/ui-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tag, Plus, Search } from "lucide-react";

export default function Listings() {
  const data = usePortfolioData();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("");
  const [form, setForm] = useState({ property_id: "", unit_id: "", listing_type: "Rent", price: 0, description: "" });

  const list = useMemo(() => (data.listings || [])
    .filter((l) => !filter || l.listing_type === filter)
    .filter((l) => !search || l.property_name?.toLowerCase().includes(search.toLowerCase()) || l.unit_number?.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => new Date(b.created_date) - new Date(a.created_date)), [data.listings, search, filter]);

  const create = async () => {
    if (!form.property_id) return;
    const me = await base44.auth.me();
    const prop = data.properties.find((p) => p.id === form.property_id);
    const unit = data.units.find((u) => u.id === form.unit_id);
    const rec = await base44.entities.Listing.create({
      listing_reference: genRef("LST"), property_id: form.property_id, property_name: prop?.name || "",
      unit_id: form.unit_id, unit_number: unit?.unit_number || "",
      listing_type: form.listing_type, price: Number(form.price), description: form.description,
      status: "Active", date_listed: todayISO(), owner_user_id: me?.id || "",
    });
    await logAudit({ user: me, action: "Listing Created", entity: "Listing", entity_id: rec.id, entity_name: rec.listing_reference });
    setOpen(false); setForm({ property_id: "", unit_id: "", listing_type: "Rent", price: 0, description: "" }); data.reload();
  };

  if (data.loading) return <div className="flex h-96 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-700" /></div>;

  return (
    <div>
      <PageHeader title="Listings" description="Manage property listings for rent, sale, or lease."
        actions={<Button onClick={() => setOpen(true)} className="bg-emerald-600 hover:bg-emerald-700"><Plus className="mr-1.5 h-4 w-4" />Add Listing</Button>} />
      <div className="mb-4 flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search listings..." className="pl-9" />
        </div>
        <select value={filter} onChange={(e) => setFilter(e.target.value)} className="rounded-md border border-input bg-background px-3 py-2 text-sm">
          <option value="">All types</option>
          {["Rent", "Sale", "Lease"].map((t) => <option key={t}>{t}</option>)}
        </select>
      </div>
      {list.length === 0 ? <EmptyState icon={Tag} title="No listings yet" description="Create a listing to offer a property for rent, sale, or lease." /> : (
        <SectionCard>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-slate-100 text-left text-xs uppercase text-slate-500">
                <th className="pb-2 font-medium">Reference</th><th className="pb-2 font-medium">Property</th><th className="pb-2 font-medium">Unit</th><th className="pb-2 font-medium">Type</th><th className="pb-2 text-right font-medium">Price</th><th className="pb-2 text-right font-medium">Status</th>
              </tr></thead>
              <tbody>
                {list.map((l) => (
                  <tr key={l.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                    <td className="py-2.5 font-mono text-xs text-slate-600">{l.listing_reference}</td>
                    <td className="py-2.5 text-slate-800">{l.property_name}</td>
                    <td className="py-2.5 text-slate-600">{l.unit_number || "—"}</td>
                    <td className="py-2.5"><StatusBadge status={l.listing_type} /></td>
                    <td className="py-2.5 text-right font-medium text-slate-900">{KES(l.price)}</td>
                    <td className="py-2.5 text-right"><StatusBadge status={l.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Add Listing</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <Field label="Property">
              <select value={form.property_id} onChange={(e) => setForm({ ...form, property_id: e.target.value, unit_id: "" })} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="">Select property...</option>
                {data.properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </Field>
            <Field label="Unit (optional)">
              <select value={form.unit_id} onChange={(e) => setForm({ ...form, unit_id: e.target.value })} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="">No specific unit</option>
                {data.units.filter((u) => u.property_id === form.property_id).map((u) => <option key={u.id} value={u.id}>{u.unit_number}</option>)}
              </select>
            </Field>
            <Field label="Listing type">
              <select value={form.listing_type} onChange={(e) => setForm({ ...form, listing_type: e.target.value })} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                {["Rent", "Sale", "Lease"].map((t) => <option key={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="Price (KES)"><Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} /></Field>
            <div className="col-span-2"><Field label="Description"><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} /></Field></div>
          </div>
          <DialogFooter><Button onClick={create} className="bg-emerald-600 hover:bg-emerald-700">Create Listing</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}