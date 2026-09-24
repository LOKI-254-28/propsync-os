import React, { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { usePortfolioData } from "@/lib/useAppData";
import { propertyStats, KES, logAudit } from "@/lib/finance";
import { base44 } from "@/api/base44Client";
import { PageHeader, StatCard, SectionCard, StatusBadge, EmptyState, Field } from "@/components/ui-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Building2, DoorOpen, Users, Wallet, AlertTriangle, Wrench, Receipt, ArrowLeft, Edit, Archive, Loader2 } from "lucide-react";
import { useCrud } from "@/lib/useCrud";
import { toast } from "@/components/ui/use-toast";

export default function PropertyDetail() {
  const { id } = useParams();
  const data = usePortfolioData();
  const { submitting, run } = useCrud();
  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState({});

  const property = data.properties.find((p) => p.id === id);

  if (data.loading) return <div className="flex h-96 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-700" /></div>;
  if (!property) return <EmptyState icon={Building2} title="Property not found" action={<Link to="/properties" className="text-emerald-700 hover:underline">Back to properties</Link>} />;

  const s = propertyStats(property, data);
  const units = data.units.filter((u) => u.property_id === property.id);
  const tenancies = data.tenancies.filter((t) => t.property_id === property.id);
  const expenses = data.expenses.filter((e) => e.property_id === property.id);
  const maint = data.maintenance.filter((m) => m.property_id === property.id);

  const openEdit = () => {
    setForm({ name: property.name, code: property.code, address: property.address, property_type: property.property_type, contact_phone: property.contact_phone, contact_email: property.contact_email, monthly_operating_expenses: property.monthly_operating_expenses, description: property.description, status: property.status });
    setEditOpen(true);
  };

  const save = async () => {
    if (!form.name) { toast({ title: "Validation error", description: "Property name is required.", variant: "destructive" }); return; }
    await run(async () => {
      const me = await base44.auth.me();
      await base44.entities.Property.update(property.id, { ...form, monthly_operating_expenses: Number(form.monthly_operating_expenses) });
      await logAudit({ user: me, action: "Property Updated", entity: "Property", entity_id: property.id, entity_name: property.name });
      setEditOpen(false); data.reload();
    }, { success: "Property updated successfully.", error: "Could not update property." });
  };

  const archive = async () => {
    await run(async () => {
      const me = await base44.auth.me();
      await base44.entities.Property.update(property.id, { status: "Archived" });
      await logAudit({ user: me, action: "Property Archived", entity: "Property", entity_id: property.id, entity_name: property.name });
      data.reload();
    }, { success: "Property archived.", error: "Could not archive property." });
  };

  return (
    <div>
      <Link to="/properties" className="mb-3 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-emerald-700"><ArrowLeft className="h-4 w-4" />All properties</Link>
      <PageHeader title={property.name} description={`${property.code} · ${property.address || "No address"}`}
        actions={<div className="flex gap-2">
          <Button variant="outline" onClick={openEdit}><Edit className="mr-1.5 h-4 w-4" />Edit</Button>
          {property.status !== "Archived" && <Button variant="outline" className="border-rose-200 text-rose-700 hover:bg-rose-50" disabled={submitting} onClick={archive}><Archive className="mr-1.5 h-4 w-4" />Archive</Button>}
        </div>} />

      <div className="mb-2"><StatusBadge status={property.status} /></div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Units" value={s.units} sub={`${s.occupied} occupied`} icon={DoorOpen} accent="blue" />
        <StatCard label="Occupancy" value={`${s.occupancyRate}%`} icon={Users} accent="emerald" />
        <StatCard label="Expected Rent" value={KES(s.expectedRent)} icon={Wallet} accent="emerald" />
        <StatCard label="Collected (mo)" value={KES(s.collected)} icon={Wallet} accent="emerald" />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Arrears" value={KES(s.arrears)} icon={AlertTriangle} accent="rose" />
        <StatCard label="Expenses" value={KES(s.expenses)} icon={Receipt} accent="gold" />
        <StatCard label="Net Income" value={KES(s.netIncome)} icon={Wallet} accent="emerald" />
        <StatCard label="Open Maintenance" value={s.maintenance} icon={Wrench} accent="gold" />
      </div>

      {property.description && <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">{property.description}</div>}

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <SectionCard title="Units" actions={<Link to="/units" className="text-sm text-emerald-700 hover:underline">Manage →</Link>}>
          {units.length === 0 ? <p className="text-sm text-slate-500">No units yet.</p> : (
            <div className="space-y-2">
              {units.map((u) => (
                <div key={u.id} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2">
                  <div><p className="font-medium text-slate-800">{u.unit_number} · {u.unit_type}</p><p className="text-xs text-slate-500">{u.current_tenant_name || "Vacant"}</p></div>
                  <div className="flex items-center gap-3"><span className="text-sm font-medium text-slate-900">{KES(u.monthly_rent)}</span><StatusBadge status={u.status} /></div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
        <SectionCard title="Recent Expenses">
          {expenses.length === 0 ? <p className="text-sm text-slate-500">No expenses recorded.</p> : (
            <div className="space-y-2">
              {expenses.slice(0, 6).map((e) => (
                <div key={e.id} className="flex items-center justify-between border-b border-slate-50 pb-2"><div><p className="text-sm font-medium text-slate-800">{e.category}</p><p className="text-xs text-slate-500">{e.date} · {e.vendor || "—"}</p></div><span className="text-sm font-medium text-slate-900">{KES(e.amount)}</span></div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Edit Property</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <Field label="Property name"><Input value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
            <Field label="Code / reference"><Input value={form.code || ""} onChange={(e) => setForm({ ...form, code: e.target.value })} /></Field>
            <div className="col-span-2"><Field label="Address"><Input value={form.address || ""} onChange={(e) => setForm({ ...form, address: e.target.value })} /></Field></div>
            <Field label="Property type">
              <select value={form.property_type || "Apartment Complex"} onChange={(e) => setForm({ ...form, property_type: e.target.value })} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                {["Apartment Complex", "Building", "Mixed Use", "Commercial", "Townhouse", "Villa"].map((t) => <option key={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="Monthly operating expenses"><Input type="number" value={form.monthly_operating_expenses || 0} onChange={(e) => setForm({ ...form, monthly_operating_expenses: Number(e.target.value) })} /></Field>
            <Field label="Contact phone"><Input value={form.contact_phone || ""} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} /></Field>
            <Field label="Contact email"><Input value={form.contact_email || ""} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} /></Field>
            <div className="col-span-2"><Field label="Description"><Textarea value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} /></Field></div>
          </div>
          <DialogFooter><Button onClick={save} disabled={submitting} className="bg-emerald-600 hover:bg-emerald-700">{submitting ? <><Loader2 className="mr-1.5 h-4 w-4 animate-spin" />Saving...</> : "Save Changes"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}