import React, { useState, useMemo } from "react";
import { usePortfolioData } from "@/lib/useAppData";
import { base44 } from "@/api/base44Client";
import { KES, genRef, logAudit, todayISO } from "@/lib/finance";
import { secureCreate } from "@/lib/secureCreate";
import { PageHeader, SectionCard, StatusBadge, EmptyState, Field } from "@/components/ui-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tag, Plus, Search, Loader2, Edit, Eye, Upload } from "lucide-react";
import { useCrud } from "@/lib/useCrud";
import { toast } from "@/components/ui/use-toast";
import PropertyPhotos from '@/components/PropertyPhotos';

const empty = { property_id: "", unit_id: "", listing_type: "Rent", price: 0, description: "", images: [] };

export default function Listings() {
  const data = usePortfolioData();
  const { submitting, run } = useCrud();
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editRec, setEditRec] = useState(null);
  const [viewRec, setViewRec] = useState(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("");
  const [form, setForm] = useState(empty);

  const list = useMemo(() => (data.listings || [])
    .filter((l) => !filter || l.listing_type === filter)
    .filter((l) => !search || l.property_name?.toLowerCase().includes(search.toLowerCase()) || l.unit_number?.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => new Date(b.created_date) - new Date(a.created_date)), [data.listings, search, filter]);

  const openCreate = () => { setForm(empty); setEditRec(null); setOpen(true); };
  const openEdit = (rec) => { setForm({ property_id: rec.property_id, unit_id: rec.unit_id, listing_type: rec.listing_type, price: rec.price, description: rec.description || "", images: rec.images || [] }); setEditRec(rec); setOpen(true); };

  const save = async () => {
    if (!form.property_id) { toast({ title: "Validation error", description: "Please select a property.", variant: "destructive" }); return; }
    if (!form.price || Number(form.price) <= 0) { toast({ title: "Validation error", description: "Price must be greater than zero.", variant: "destructive" }); return; }
    await run(async () => {
      const me = await base44.auth.me();
      const prop = data.properties.find((p) => p.id === form.property_id);
      const unit = data.units.find((u) => u.id === form.unit_id);
      if (editRec) {
        await base44.entities.Listing.update(editRec.id, {
          property_id: form.property_id, property_name: prop?.name || "",
          unit_id: form.unit_id, unit_number: unit?.unit_number || "",
          listing_type: form.listing_type, price: Number(form.price), description: form.description, images: form.images,
        });
        await logAudit({ user: me, action: "Listing Updated", entity: "Listing", entity_id: editRec.id, entity_name: editRec.listing_reference });
      } else {
        await secureCreate("Listing", {
          listing_reference: genRef("LST"), property_id: form.property_id, property_name: prop?.name || "",
          unit_id: form.unit_id, unit_number: unit?.unit_number || "",
          listing_type: form.listing_type, price: Number(form.price), description: form.description, images: form.images,
          status: "Draft", date_listed: todayISO(),
        });
      }
      setOpen(false); setForm(empty); setEditRec(null); data.reload();
    }, { success: editRec ? "Listing updated successfully." : "Listing created successfully.", error: "Could not save listing. Please try again." });
  };

  const changeStatus = async (rec, status, label) => {
    await run(async () => {
      const me = await base44.auth.me();
      await base44.entities.Listing.update(rec.id, { status });
      await logAudit({ user: me, action: `Listing ${label}`, entity: "Listing", entity_id: rec.id, entity_name: rec.listing_reference });
      data.reload();
    }, { success: `Listing ${label.toLowerCase()}.`, error: `Could not ${label.toLowerCase()} listing.` });
  };

  if (data.loading) return <div className="flex h-96 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-700" /></div>;

  return (
    <div>
      <PageHeader title="Listings" description="Manage property listings for rent."
        actions={<Button onClick={openCreate} className="bg-emerald-600 hover:bg-emerald-700"><Plus className="mr-1.5 h-4 w-4" />Add Listing</Button>} />
      <div className="mb-4 flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search listings..." className="pl-9" />
        </div>
        <select value={filter} onChange={(e) => setFilter(e.target.value)} className="rounded-md border border-input bg-background px-3 py-2 text-sm">
          <option value="">All types</option>
          <option key="Rent">Rent</option>
        </select>
      </div>
      {list.length === 0 ?         <EmptyState icon={Tag} title="No listings yet" description="Create a listing to offer a property for rent." /> : (
        <SectionCard>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-slate-100 text-left text-xs uppercase text-slate-500">
                <th className="pb-2 font-medium">Reference</th><th className="pb-2 font-medium">Property</th><th className="pb-2 font-medium">Unit</th><th className="pb-2 font-medium">Type</th><th className="pb-2 text-right font-medium">Price</th><th className="pb-2 text-right font-medium">Status</th><th className="pb-2 text-right font-medium">Actions</th>
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
                    <td className="py-2.5 text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setViewRec(l)} title="View"><Eye className="h-3.5 w-3.5" /></Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(l)} title="Edit"><Edit className="h-3.5 w-3.5" /></Button>
                        {l.status === "Draft" && <Button size="sm" variant="outline" className="h-7 text-xs border-emerald-200 text-emerald-700 hover:bg-emerald-50" disabled={submitting} onClick={() => changeStatus(l, "Published", "Published")}>Publish</Button>}
                        {l.status === "Published" && <Button size="sm" variant="outline" className="h-7 text-xs" disabled={submitting} onClick={() => changeStatus(l, "Draft", "Unpublished")}>Unpublish</Button>}
                        {!["Withdrawn", "Rented", "Archived"].includes(l.status) && <Button size="sm" variant="outline" className="h-7 text-xs border-rose-200 text-rose-700 hover:bg-rose-50" disabled={submitting} onClick={() => changeStatus(l, "Withdrawn", "Withdrawn")}>Withdraw</Button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}

      {/* Create / Edit dialog */}
      <Dialog open={open} onOpenChange={value => !uploading && !submitting && setOpen(value)}>
        <DialogContent className="max-w-lg max-h-[90dvh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editRec ? "Edit Listing" : "Add Listing"}</DialogTitle></DialogHeader>
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
                <option key="Rent">Rent</option>
              </select>
            </Field>
            <Field label="Price (KES)"><Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} /></Field>
            <div className="col-span-2"><Field label="Description"><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} /></Field></div>
          </div>
          <PropertyPhotos label="Listing photos" images={form.images} onBusyChange={setUploading} onChange={images => setForm(current => ({ ...current, images }))} />
          <DialogFooter><Button onClick={save} disabled={submitting || uploading} className="bg-emerald-600 hover:bg-emerald-700">{submitting ? <><Loader2 className="mr-1.5 h-4 w-4 animate-spin" />Saving...</> : editRec ? "Save Changes" : "Create Listing"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View dialog */}
      <Dialog open={!!viewRec} onOpenChange={() => setViewRec(null)}>
        <DialogContent className="max-w-lg">
          {viewRec && (
            <>
              <DialogHeader><DialogTitle>Listing — {viewRec.listing_reference}</DialogTitle></DialogHeader>
              <div className="grid grid-cols-2 gap-3 py-2 text-sm">
                <Info label="Property" value={viewRec.property_name} />
                <Info label="Unit" value={viewRec.unit_number || "—"} />
                <Info label="Type" value={viewRec.listing_type} />
                <Info label="Price" value={KES(viewRec.price)} />
                <Info label="Status" value={<StatusBadge status={viewRec.status} />} />
                <Info label="Date listed" value={viewRec.date_listed || "—"} />
              </div>
              {viewRec.description && <div className="mt-2 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">{viewRec.description}</div>}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Info({ label, value }) {
  return <div><p className="text-xs text-slate-500">{label}</p><p className="font-medium text-slate-800">{value}</p></div>;
}