import React, { useState, useMemo } from "react";
import useLandlordRecordPage from '@/hooks/useLandlordRecordPage';
import EntityPicker from '@/components/account/EntityPicker';
import RecordPageControls from '@/components/account/RecordPageControls';
import { base44 } from "@/api/base44Client";
import { genRef, logAudit, notify, todayISO } from "@/lib/finance";
import { secureCreate } from "@/lib/secureCreate";
import { PageHeader, SectionCard, StatusBadge, EmptyState, Field } from "@/components/ui-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ClipboardCheck, Plus, Calendar } from "lucide-react";
import InspectionDetails from '@/components/inspections/InspectionDetails';

export default function Inspections() {
  const data=useLandlordRecordPage('Inspection',['inspection_reference','unit_number','type'],'-scheduled_date');
  const [open, setOpen] = useState(false);
  const [view, setView] = useState(null);
  const [form, setForm] = useState({ type: "Routine", unit_id: "", scheduled_date: todayISO(), notes: "" });
  const [result, setResult] = useState({ condition_rating: "Good", defects: "", notes: "" });
  const [busy, setBusy] = useState(false),[error,setError]=useState('');
  const list=data.items;

  const create = async () => {
    if (busy || !form.unit_id) return;
    setBusy(true);setError('');
    try {
    const unit=await base44.entities.Unit.get(form.unit_id);
    const {items}=await base44.entities.Tenancy.filter({...data.scope,unit_id:unit.id,status:{$in:['Active','Expiring Soon','Notice Given']}},{sort:'-created_date',limit:1});
    const tenancy=items[0];
    const ref = genRef("INS");
    const rec = await secureCreate("Inspection", {
      inspection_reference: ref, type: form.type,
      property_id: unit.property_id, property_name: unit.property_name, unit_id: unit.id, unit_number: unit.unit_number,
      tenancy_id: tenancy?.id, tenant_id: tenancy?.tenant_id, tenant_user_id: tenancy?.tenant_user_id, tenant_name: tenancy?.tenant_name,
      scheduled_date: form.scheduled_date, status: "Scheduled", notes: form.notes,
    });
    if (tenancy?.tenant_user_id) await notify({ recipient_user_id: tenancy.tenant_user_id, type: "Inspection", title: "Inspection Scheduled", message: `A ${form.type} inspection is scheduled for ${form.scheduled_date}.`, related_entity: "Inspection", related_id: rec.id, action_link: "/portal/inspections" });
    setBusy(false);
    setOpen(false);
    setForm({ type: "Routine", unit_id: "", scheduled_date: todayISO(), notes: "" });
    await data.reload();
    }catch(e){setError(e.response?.data?.error||e.message);}finally{setBusy(false);}
  };

  const complete = async () => {
    if (busy || !view) return;
    setBusy(true);setError('');
    try {
    const me = await base44.auth.me();
    await base44.entities.Inspection.update(view.id, { status: "Completed", completed_date: todayISO(), condition_rating: result.condition_rating, defects: result.defects, notes: result.notes });
    await logAudit({ user: me, action: "Inspection Completed", entity: "Inspection", entity_id: view.id, entity_name: view.inspection_reference });
    setBusy(false);
    setView(null);
    await data.reload();
    }catch(e){setError(e.response?.data?.error||e.message);}finally{setBusy(false);}
  };

  if (data.loading) return <div className="flex h-96 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-700" /></div>;

  return (
    <div>
      <PageHeader title="Inspections" description="Schedule and record property inspections." actions={<Button onClick={() => setOpen(true)} className="bg-emerald-600 hover:bg-emerald-700"><Plus className="mr-1.5 h-4 w-4" />Schedule Inspection</Button>} />

      <RecordPageControls page={data} search placeholder="Search inspections…"/>
      {data.isPending?<p className="py-6 text-sm text-muted-foreground">Loading inspections…</p>:list.length === 0 ? <EmptyState icon={ClipboardCheck} title="No inspections scheduled" /> : (
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

      <RecordPageControls page={data}/>
      {error&&<p role="alert" className="text-sm text-destructive">{error}</p>}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Schedule Inspection</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <Field label="Type"><select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">{["Pre-tenancy", "Move-in", "Routine", "Maintenance", "Move-out", "Final"].map((t) => <option key={t}>{t}</option>)}</select></Field>
            <Field label="Unit"><EntityPicker entity="Unit" query={data.scope} fields={['unit_number','property_name']} value={form.unit_id} onChange={unit_id=>setForm({...form,unit_id})} placeholder="Select unit…"/></Field>
            <Field label="Scheduled date"><Input type="date" value={form.scheduled_date} onChange={(e) => setForm({ ...form, scheduled_date: e.target.value })} /></Field>
            <Field label="Notes"><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} /></Field>
          </div>
          {error&&<p role="alert" className="text-sm text-destructive">{error}</p>}
          <DialogFooter><Button onClick={create} disabled={busy} className="bg-emerald-600 hover:bg-emerald-700">{busy ? "Scheduling..." : "Schedule"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!view} onOpenChange={() => setView(null)}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          {view && (
            <>
              <DialogHeader><DialogTitle>Inspection — {view.inspection_reference}</DialogTitle></DialogHeader>
              <div className="grid grid-cols-2 gap-3 py-2 text-sm">
                <Info label="Type" value={view.type} /><Info label="Unit" value={view.unit_number} /><Info label="Date" value={view.scheduled_date} /><Info label="Status" value={<StatusBadge status={view.status} />} />
              </div>
              {view.application_id && <InspectionDetails inspection={view}/>}
              {view.status !== "Completed" ? (
                <div className="space-y-3">
                  <Field label="Condition rating"><select value={result.condition_rating} onChange={(e) => setResult({ ...result, condition_rating: e.target.value })} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">{["Excellent", "Good", "Fair", "Poor"].map((c) => <option key={c}>{c}</option>)}</select></Field>
                  <Field label="Defects"><Textarea value={result.defects} onChange={(e) => setResult({ ...result, defects: e.target.value })} rows={3} /></Field>
                  <Field label="Notes"><Textarea value={result.notes} onChange={(e) => setResult({ ...result, notes: e.target.value })} rows={2} /></Field>
                </div>
              ) : (
                <div className="space-y-2 text-sm"><Info label="Condition" value={view.condition_rating} /><Info label="Defects" value={view.defects || "—"} /><Info label="Notes" value={view.notes || "—"} /></div>
              )}
              {error&&<p role="alert" className="text-sm text-destructive">{error}</p>}
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