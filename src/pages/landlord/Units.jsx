import React, { useState, useMemo } from "react";
import { usePortfolioData } from "@/lib/useAppData";
import { KES, genRef, logAudit } from "@/lib/finance";
import { base44 } from "@/api/base44Client";
import { PageHeader, SectionCard, StatusBadge, EmptyState, Field } from "@/components/ui-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { DoorOpen, Plus, Search, Loader2 } from "lucide-react";
import { useCrud } from "@/lib/useCrud";
import { toast } from "@/components/ui/use-toast";

const AMENITIES = ["Parking", "Balcony", "Lift", "Gym", "Pool", "Security", "Borehole", "Backup Generator", "Internet", "Garden"];

export default function Units() {
  const data = usePortfolioData();
  const { submitting, run } = useCrud();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [filterProp, setFilterProp] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [form, setForm] = useState({ unit_number: "", property_id: "", building: "", floor: "", unit_type: "1 Bedroom", bedrooms: 1, bathrooms: 1, size_sqm: 0, monthly_rent: 0, security_deposit: 0, service_charge: 0, furnished: false, amenities: [], description: "" });

  const filtered = useMemo(() => data.units.filter((u) =>
    (!filterProp || u.property_id === filterProp) &&
    (!filterStatus || u.status === filterStatus) &&
    (u.unit_number?.toLowerCase().includes(search.toLowerCase()) || u.current_tenant_name?.toLowerCase().includes(search.toLowerCase()))
  ), [data.units, search, filterProp, filterStatus]);

  const create = async () => {
    if (!form.unit_number) { toast({ title: "Validation error", description: "Unit number is required.", variant: "destructive" }); return; }
    if (!form.property_id) { toast({ title: "Validation error", description: "Please select a property for this unit.", variant: "destructive" }); return; }
    await run(async () => {
      const me = await base44.auth.me();
      const prop = data.properties.find((p) => p.id === form.property_id);
      if (!prop) throw new Error("Selected property not found.");
      const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      const rec = await base44.entities.Unit.create({ ...form, property_name: prop?.name, invite_code: `VE-${inviteCode}`, owner_user_id: prop?.owner_user_id || me?.id || "", status: "Available" });
      await logAudit({ user: me, action: "Unit Created", entity: "Unit", entity_id: rec.id, entity_name: rec.unit_number });
      setOpen(false);
      setForm({ unit_number: "", property_id: "", building: "", floor: "", unit_type: "1 Bedroom", bedrooms: 1, bathrooms: 1, size_sqm: 0, monthly_rent: 0, security_deposit: 0, service_charge: 0, furnished: false, amenities: [], description: "" });
      data.reload();
    }, { success: "Unit created successfully.", error: "Could not create unit. Please try again." });
  };

  if (data.loading) return <div className="flex h-96 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-700" /></div>;

  return (
    <div>
      <PageHeader title="Units" description="All units across your portfolio." actions={<Button onClick={() => setOpen(true)} className="bg-emerald-600 hover:bg-emerald-700"><Plus className="mr-1.5 h-4 w-4" />Add Unit</Button>} />

      <div className="mb-4 flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search units..." className="pl-9" />
        </div>
        <select value={filterProp} onChange={(e) => setFilterProp(e.target.value)} className="rounded-md border border-input bg-background px-3 py-2 text-sm">
          <option value="">All properties</option>
          {data.properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="rounded-md border border-input bg-background px-3 py-2 text-sm">
          <option value="">All statuses</option>
          {["Available", "Reserved", "Application Pending", "Occupied", "Under Maintenance", "Notice Given", "Vacant", "Inactive"].map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={DoorOpen} title="No units found" description="Add units to your properties to start managing tenancies." />
      ) : (
        <SectionCard>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-slate-100 text-left text-xs uppercase text-slate-500">
                <th className="pb-2 font-medium">Unit</th><th className="pb-2 font-medium">Property</th><th className="pb-2 font-medium">Invite Code</th><th className="pb-2 font-medium">Type</th><th className="pb-2 font-medium">Tenant</th><th className="pb-2 text-right font-medium">Rent</th><th className="pb-2 text-right font-medium">Status</th>
              </tr></thead>
              <tbody>
                {filtered.map((u) => (
                  <tr key={u.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                    <td className="py-2.5 font-medium text-slate-800">{u.unit_number}</td>
                    <td className="py-2.5 text-slate-600">{u.property_name}</td>
                    <td className="py-2.5">
                      {u.invite_code ? (
                        <button onClick={() => { navigator.clipboard?.writeText(u.invite_code); }} title="Click to copy" className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 font-mono text-xs text-slate-600 hover:bg-slate-100">{u.invite_code}</button>
                      ) : <span className="text-xs text-slate-400">—</span>}
                    </td>
                    <td className="py-2.5 text-slate-600">{u.unit_type} · {u.bedrooms}BR</td>
                    <td className="py-2.5 text-slate-600">{u.current_tenant_name || "—"}</td>
                    <td className="py-2.5 text-right font-medium text-slate-900">{KES(u.monthly_rent)}</td>
                    <td className="py-2.5 text-right"><StatusBadge status={u.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Add Unit</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2 max-h-[60vh] overflow-y-auto">
            <Field label="Unit number"><Input value={form.unit_number} onChange={(e) => setForm({ ...form, unit_number: e.target.value })} placeholder="e.g. A-101" /></Field>
            <Field label="Property">
              <select value={form.property_id} onChange={(e) => setForm({ ...form, property_id: e.target.value })} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="">Select property...</option>
                {data.properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </Field>
            <Field label="Building"><Input value={form.building} onChange={(e) => setForm({ ...form, building: e.target.value })} /></Field>
            <Field label="Floor"><Input value={form.floor} onChange={(e) => setForm({ ...form, floor: e.target.value })} /></Field>
            <Field label="Unit type">
              <select value={form.unit_type} onChange={(e) => setForm({ ...form, unit_type: e.target.value })} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                {["Studio", "1 Bedroom", "2 Bedroom", "3 Bedroom", "Penthouse", "Commercial", "Other"].map((t) => <option key={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="Bedrooms"><Input type="number" value={form.bedrooms} onChange={(e) => setForm({ ...form, bedrooms: Number(e.target.value) })} /></Field>
            <Field label="Bathrooms"><Input type="number" value={form.bathrooms} onChange={(e) => setForm({ ...form, bathrooms: Number(e.target.value) })} /></Field>
            <Field label="Size (sqm)"><Input type="number" value={form.size_sqm} onChange={(e) => setForm({ ...form, size_sqm: Number(e.target.value) })} /></Field>
            <Field label="Monthly rent"><Input type="number" value={form.monthly_rent} onChange={(e) => setForm({ ...form, monthly_rent: Number(e.target.value) })} /></Field>
            <Field label="Security deposit"><Input type="number" value={form.security_deposit} onChange={(e) => setForm({ ...form, security_deposit: Number(e.target.value) })} /></Field>
            <Field label="Service charge"><Input type="number" value={form.service_charge} onChange={(e) => setForm({ ...form, service_charge: Number(e.target.value) })} /></Field>
            <div className="col-span-2"><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.furnished} onChange={(e) => setForm({ ...form, furnished: e.target.checked })} className="rounded" /> Furnished</label></div>
            <div className="col-span-2">
              <p className="mb-1.5 text-sm font-medium text-slate-700">Amenities</p>
              <div className="flex flex-wrap gap-1.5">
                {AMENITIES.map((a) => {
                  const sel = form.amenities.includes(a);
                  return <button key={a} type="button" onClick={() => setForm({ ...form, amenities: sel ? form.amenities.filter((x) => x !== a) : [...form.amenities, a] })} className={`rounded-full border px-2.5 py-1 text-xs ${sel ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-slate-200 text-slate-600"}`}>{a}</button>;
                })}
              </div>
            </div>
            <div className="col-span-2"><Field label="Description"><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} /></Field></div>
          </div>
          <DialogFooter><Button onClick={create} disabled={submitting} className="bg-emerald-600 hover:bg-emerald-700">{submitting ? <><Loader2 className="mr-1.5 h-4 w-4 animate-spin" />Creating...</> : "Create Unit"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}