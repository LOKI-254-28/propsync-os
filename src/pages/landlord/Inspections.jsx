import React, { useState, useMemo } from "react";
import { usePortfolioData } from "@/lib/useAppData";
import { base44 } from "@/api/base44Client";
import { genRef, logAudit, notify, todayISO } from "@/lib/finance";
import { PageHeader, SectionCard, StatusBadge, EmptyState, Field } from "@/components/ui-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ClipboardCheck, Plus, Calendar } from "lucide-react";

export default function Inspections() {
  const data = usePortfolioData();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState(null);
  const [form, setForm] = useState({ type: "Routine", unit_id: "", scheduled_date: todayISO(), notes: "" });
  const [result, setResult] = useState({ condition_rating: "Good", defects: "", notes: "" });
  const [busy, setBusy] = useState(false);

  const list = useMemo(() => [...data.inspections].sort((a, b) => new Date(b.scheduled_date || b.created_date) - new Date(a.scheduled_date || a.created_date)), [data.inspections]);

  const create = async () => {
    if (!form.unit_id) return;
    setBusy(true);
    const me = await base44.auth.me();
    const unit = data.units.find((u) => u.id === form.unit_id);
    const tenancy = data.tenancies.find((t) => t.unit_id === unit.id && ["Active", "Expiring Soon", "Notice Given"].includes(t.status));
    const ref = genRef("INS");
    const rec = await base44.entities.Inspection.create({
      inspection_reference: ref, type: form.type,
      property_id: unit.property_id, property_name: unit.property_name, unit_id: unit.id, unit_number: unit.unit_number,
      tenancy_id: tenancy?.id, tenant_id: tenancy?.tenant_id, tenant_user_id: tenancy?.tenant_user_id, tenant_name: tenancy?.tenant_name,
      scheduled_date: form.scheduled_date, status: "Scheduled", notes: form.notes,
    });
    await logAudit({ user: me, action: "Inspection Scheduled", entity: "Inspection", entity_id: rec.id, entity_name: ref });
    if (tenancy?.tenant_user_id) await notify({ recipient_user_id: tenancy.tenant_user_id, type: "Inspection", title: "Inspection Scheduled", message: `A ${form.type} inspection is scheduled for ${form.scheduled_date}.`, related_entity: "Inspection", related_id: rec.id, action_link: "/portal/inspections" });
    setBusy(false);
    setOpen(false);
    setForm({ type: "Routine", unit_id: "", scheduled_date: todayISO(), notes: "" });
    data.reload();
  };

  const complete = async () => {
    if (!view) return;
    setBusy(true);
    const me = await base44.auth.me();
    await base44.entities.Inspection.update(view.id, { status: "Completed", completed_date: todayISO(), condition_rating: result.condition_rating, defects: result.defects, notes: result.notes });
    await logAudit({ user: me, action: "Inspection Completed", entity: "Inspection", entity_id: view.id, entity_name: view.inspection_reference });
    setBusy(false);
    setView(null);
    data.reload();
  };

  if (data.loading) return <div className="flex h-96 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-700" /></div>;

  return (
    <div>
      <PageHeader title="Inspections" description="Schedule and record property inspections." actions={<Button onClick={() => setOpen(true)} className="bg-emerald-600 hover:bg-emerald-700"><Plus className="mr-1.5 h-4 w-4" />Schedule Inspection</Button>} />

      {list.length === 0 ? <EmptyState icon={ClipboardCheck} title="No inspections scheduled" /> : (
        <SectionCard>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-slate-100 text-left text-xs uppercase text-slate-500">
                <th className="pb-2 font-medium">Reference</th><th className="pb-2 font-medium">Type</th><th className="pb-2 font-medium">Unit</th><th className="pb-2 font-medium">Date</th><th className="pb-2 font-medium">Condition</th><th className="pb-2 text-right font-medium">Status</th><th className="pb-2"></th>
              </tr></thead>
              <tbody>
                {list.map((i) => (
                  <tr key={i.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                    <td className="py-2.5 font-mono text-xs text-slate-600">{i.inspection_reference}</td>
                    <td className="py-2.5 text-slate-700">{i.type}</td>
                    <td className="py-2.5 text-slate-600">{i.unit_number}</td>
                    <td className="py-2.5 text-slate-600">{i.scheduled_date}</td>
                    <td className="py-2.5 text-slate-600">{i.condition_rating || "—"}</td>
                    <td className="py-2.5 text-right"><StatusBadge status={i.status} /></td>
                    <td className="py-2.5 text-right"><Button size="sm" variant="outline" onClick={() => { setView(i); setResult({ condition_rating: i.condition_rating || "Good", defects: i.defects || "", notes: i.notes || "" }); }} className="h-7 text-xs">{i.status === "Completed" ? "View" : "Record"}</Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Schedule Inspection</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <Field label="Type"><select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">{["Pre-tenancy", "Move-in", "Routine", "Maintenance", "Move-out", "Final"].map((t) => <option key={t}>{t}</option>)}</select></Field>
            <Field label="Unit"><select value={form.unit_id} onChange={(e) => setForm({ ...form, unit_id: e.target.value })} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"><option value="">Select unit...</option>{data.units.map((u) => <option key={u.id} value={u.id}>{u.unit_number} — {u.property_name}</option>)}</select></Field>
            <Field label="Scheduled date"><Input type="date" value={form.scheduled_date} onChange={(e) => setForm({ ...form, scheduled_date: e.target.value })} /></Field>
            <Field label="Notes"><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} /></Field>
          </div>
          <DialogFooter><Button onClick={create} disabled={busy} className="bg-emerald-600 hover:bg-emerald-700">{busy ? "Scheduling..." : "Schedule"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!view} onOpenChange={() => setView(null)}>
        <DialogContent className="max-w-md">
          {view && (
            <>
              <DialogHeader><DialogTitle>Inspection — {view.inspection_reference}</DialogTitle></DialogHeader>
              <div className="grid grid-cols-2 gap-3 py-2 text-sm">
                <Info label="Type" value={view.type} /><Info label="Unit" value={view.unit_number} /><Info label="Date" value={view.scheduled_date} /><Info label="Status" value={<StatusBadge status={view.status} />} />
              </div>
              {view.status !== "Completed" ? (
                <div className="space-y-3">
                  <Field label="Condition rating"><select value={result.condition_rating} onChange={(e) => setResult({ ...result, condition_rating: e.target.value })} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">{["Excellent", "Good", "Fair", "Poor"].map((c) => <option key={c}>{c}</option>)}</select></Field>
                  <Field label="Defects"><Textarea value={result.defects} onChange={(e) => setResult({ ...result, defects: e.target.value })} rows={3} /></Field>
                  <Field label="Notes"><Textarea value={result.notes} onChange={(e) => setResult({ ...result, notes: e.target.value })} rows={2} /></Field>
                </div>
              ) : (
                <div className="space-y-2 text-sm"><Info label="Condition" value={view.condition_rating} /><Info label="Defects" value={view.defects || "—"} /><Info label="Notes" value={view.notes || "—"} /></div>
              )}
              {view.status !== "Completed" && <DialogFooter><Button onClick={complete} disabled={busy} className="bg-emerald-600 hover:bg-emerald-700">{busy ? "Saving..." : "Mark Completed"}</Button></DialogFooter>}
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