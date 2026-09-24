import React, { useState, useMemo } from "react";
import { usePortfolioData } from "@/lib/useAppData";
import { base44 } from "@/api/base44Client";
import { KES, genRef, logAudit, todayISO } from "@/lib/finance";
import { PageHeader, SectionCard, StatusBadge, EmptyState, Field } from "@/components/ui-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { FileSignature, Plus, Search, Loader2, Edit, Eye } from "lucide-react";
import { useCrud } from "@/lib/useCrud";
import { toast } from "@/components/ui/use-toast";

const empty = { property_id: "", unit_id: "", lessee_name: "", start_date: todayISO(), end_date: "", monthly_fee: 0, security_deposit: 0 };

export default function Leases() {
  const data = usePortfolioData();
  const { submitting, run } = useCrud();
  const [open, setOpen] = useState(false);
  const [editRec, setEditRec] = useState(null);
  const [viewRec, setViewRec] = useState(null);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState(empty);

  const list = useMemo(() => (data.leases || [])
    .filter((l) => !search || l.lessee_name?.toLowerCase().includes(search.toLowerCase()) || l.property_name?.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => new Date(b.created_date) - new Date(a.created_date)), [data.leases, search]);

  const openCreate = () => { setForm(empty); setEditRec(null); setOpen(true); };
  const openEdit = (rec) => { setForm({ property_id: rec.property_id, unit_id: rec.unit_id, lessee_name: rec.lessee_name, start_date: rec.start_date, end_date: rec.end_date || "", monthly_fee: rec.monthly_fee, security_deposit: rec.security_deposit }); setEditRec(rec); setOpen(true); };

  const save = async () => {
    if (!form.property_id) { toast({ title: "Validation error", description: "Please select a property.", variant: "destructive" }); return; }
    if (!form.lessee_name) { toast({ title: "Validation error", description: "Lessee name is required.", variant: "destructive" }); return; }
    if (!form.start_date) { toast({ title: "Validation error", description: "Start date is required.", variant: "destructive" }); return; }
    await run(async () => {
      const me = await base44.auth.me();
      const prop = data.properties.find((p) => p.id === form.property_id);
      const unit = data.units.find((u) => u.id === form.unit_id);
      if (editRec) {
        await base44.entities.Lease.update(editRec.id, {
          property_id: form.property_id, property_name: prop?.name || "",
          unit_id: form.unit_id, unit_number: unit?.unit_number || "",
          lessee_name: form.lessee_name, start_date: form.start_date, end_date: form.end_date,
          monthly_fee: Number(form.monthly_fee), security_deposit: Number(form.security_deposit),
        });
        await logAudit({ user: me, action: "Lease Updated", entity: "Lease", entity_id: editRec.id, entity_name: editRec.lease_reference });
      } else {
        const rec = await base44.entities.Lease.create({
          lease_reference: genRef("LSR"), property_id: form.property_id, property_name: prop?.name || "",
          unit_id: form.unit_id, unit_number: unit?.unit_number || "", lessee_name: form.lessee_name,
          start_date: form.start_date, end_date: form.end_date, monthly_fee: Number(form.monthly_fee),
          security_deposit: Number(form.security_deposit), status: "Active", owner_user_id: me?.id || "",
        });
        await logAudit({ user: me, action: "Lease Created", entity: "Lease", entity_id: rec.id, entity_name: rec.lease_reference });
      }
      setOpen(false); setForm(empty); setEditRec(null); data.reload();
    }, { success: editRec ? "Lease updated successfully." : "Lease created successfully.", error: "Could not save lease. Please try again." });
  };

  const changeStatus = async (rec, status) => {
    await run(async () => {
      const me = await base44.auth.me();
      await base44.entities.Lease.update(rec.id, { status });
      await logAudit({ user: me, action: `Lease ${status}`, entity: "Lease", entity_id: rec.id, entity_name: rec.lease_reference });
      data.reload();
    }, { success: `Lease marked ${status}.`, error: `Could not update lease status.` });
  };

  if (data.loading) return <div className="flex h-96 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-700" /></div>;

  return (
    <div>
      <PageHeader title="Leases" description="Manage lease agreements for commercial and long-term property leasing."
        actions={<Button onClick={openCreate} className="bg-emerald-600 hover:bg-emerald-700"><Plus className="mr-1.5 h-4 w-4" />Add Lease</Button>} />
      <div className="mb-4 relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search leases..." className="pl-9" />
      </div>
      {list.length === 0 ? <EmptyState icon={FileSignature} title="No leases yet" /> : (
        <SectionCard>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-slate-100 text-left text-xs uppercase text-slate-500">
                <th className="pb-2 font-medium">Reference</th><th className="pb-2 font-medium">Property</th><th className="pb-2 font-medium">Unit</th><th className="pb-2 font-medium">Lessee</th><th className="pb-2 font-medium">Start</th><th className="pb-2 font-medium">End</th><th className="pb-2 text-right font-medium">Monthly Fee</th><th className="pb-2 text-right font-medium">Status</th><th className="pb-2 text-right font-medium">Actions</th>
              </tr></thead>
              <tbody>
                {list.map((l) => (
                  <tr key={l.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                    <td className="py-2.5 font-mono text-xs text-slate-600">{l.lease_reference}</td>
                    <td className="py-2.5 text-slate-800">{l.property_name}</td>
                    <td className="py-2.5 text-slate-600">{l.unit_number || "—"}</td>
                    <td className="py-2.5 text-slate-800">{l.lessee_name}</td>
                    <td className="py-2.5 text-slate-600">{l.start_date}</td>
                    <td className="py-2.5 text-slate-600">{l.end_date || "—"}</td>
                    <td className="py-2.5 text-right font-medium text-slate-900">{KES(l.monthly_fee)}</td>
                    <td className="py-2.5 text-right"><StatusBadge status={l.status} /></td>
                    <td className="py-2.5 text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setViewRec(l)} title="View"><Eye className="h-3.5 w-3.5" /></Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(l)} title="Edit"><Edit className="h-3.5 w-3.5" /></Button>
                        {l.status === "Active" && <Button size="sm" variant="outline" className="h-7 text-xs border-rose-200 text-rose-700 hover:bg-rose-50" disabled={submitting} onClick={() => changeStatus(l, "Terminated")}>Terminate</Button>}
                        {l.status === "Pending" && <Button size="sm" variant="outline" className="h-7 text-xs border-emerald-200 text-emerald-700 hover:bg-emerald-50" disabled={submitting} onClick={() => changeStatus(l, "Active")}>Activate</Button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editRec ? "Edit Lease" : "Add Lease"}</DialogTitle></DialogHeader>
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
            <Field label="Lessee name"><Input value={form.lessee_name} onChange={(e) => setForm({ ...form, lessee_name: e.target.value })} placeholder="Lessee full name" /></Field>
            <Field label="Monthly fee (KES)"><Input type="number" value={form.monthly_fee} onChange={(e) => setForm({ ...form, monthly_fee: Number(e.target.value) })} /></Field>
            <Field label="Start date"><Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} /></Field>
            <Field label="End date"><Input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} /></Field>
            <Field label="Security deposit (KES)"><Input type="number" value={form.security_deposit} onChange={(e) => setForm({ ...form, security_deposit: Number(e.target.value) })} /></Field>
          </div>
          <DialogFooter><Button onClick={save} disabled={submitting} className="bg-emerald-600 hover:bg-emerald-700">{submitting ? <><Loader2 className="mr-1.5 h-4 w-4 animate-spin" />Saving...</> : editRec ? "Save Changes" : "Create Lease"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewRec} onOpenChange={() => setViewRec(null)}>
        <DialogContent className="max-w-lg">
          {viewRec && (
            <>
              <DialogHeader><DialogTitle>Lease — {viewRec.lease_reference}</DialogTitle></DialogHeader>
              <div className="grid grid-cols-2 gap-3 py-2 text-sm">
                <Info label="Property" value={viewRec.property_name} />
                <Info label="Unit" value={viewRec.unit_number || "—"} />
                <Info label="Lessee" value={viewRec.lessee_name} />
                <Info label="Monthly fee" value={KES(viewRec.monthly_fee)} />
                <Info label="Start date" value={viewRec.start_date} />
                <Info label="End date" value={viewRec.end_date || "—"} />
                <Info label="Security deposit" value={KES(viewRec.security_deposit)} />
                <Info label="Status" value={<StatusBadge status={viewRec.status} />} />
              </div>
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