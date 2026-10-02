import React, { useState, useMemo } from "react";
import { useTenantData } from "@/lib/useTenantData";
import { base44 } from "@/api/base44Client";
import { genRef, logAudit, todayISO, daysBetween, KES } from "@/lib/finance";
import { PageHeader, SectionCard, StatusBadge, EmptyState, Field } from "@/components/ui-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { LogOut, Plus, Eye } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { notify } from "@/lib/finance";
import { nairobiToday, noticeExpiry } from '@/lib/nairobiDates';

export default function MyVacation() {
  const t = useTenantData();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState(null);
  const [form, setForm] = useState({ type: "Vacation Notice", proposed_vacation_date: "", reason: "" });
  const [busy, setBusy] = useState(false);
  const activeTenancy = t.tenancies.find((x) => ["Active", "Expiring Soon", "Notice Given"].includes(x.status));
  const list = useMemo(() => [...t.vacationRequests].sort((a, b) => new Date(b.date_submitted || b.created_date) - new Date(a.date_submitted || a.created_date)), [t.vacationRequests]);

  const create = async () => {
    if (!form.proposed_vacation_date) { toast({ title: "Validation error", description: "Proposed vacation date is required.", variant: "destructive" }); return; }
    if (!activeTenancy) { toast({ title: "Error", description: "You need an active tenancy to submit a notice.", variant: "destructive" }); return; }
    setBusy(true);
    try {
      await base44.functions.invoke('submitVacationNotice', { tenancy_id: activeTenancy.id, type: form.type, proposed_vacation_date: form.proposed_vacation_date, reason: form.reason });
      toast({ title: "Success", description: "Vacation notice submitted." });
      setOpen(false);
      setForm({ type: "Vacation Notice", proposed_vacation_date: "", reason: "" });
      t.reload();
    } catch (err) {
      console.error("[Vacation create error]", err);
      toast({ title: "Error", description: err.response?.data?.error || err.message || "Could not submit vacation notice. Please try again.", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  if (t.loading) return <div className="flex h-96 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-700" /></div>;
  return (
    <div>
      <PageHeader title="Vacation / Termination" description="Submit notice to vacate or terminate your tenancy." actions={activeTenancy && <Button onClick={() => setOpen(true)} className="bg-emerald-600 hover:bg-emerald-700"><Plus className="mr-1.5 h-4 w-4" />Submit Notice</Button>} />
      {list.length === 0 ? <EmptyState icon={LogOut} title="No vacation requests" description={activeTenancy ? "Submit a vacation or termination notice to begin the move-out process." : "No active tenancy."} /> : (
        <div className="space-y-3">
          {list.map((v) => (
            <div key={v.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div><p className="font-mono text-xs text-slate-500">{v.request_reference}</p><p className="font-medium text-slate-900">{v.type}</p><p className="text-xs text-slate-500">Submitted {v.date_submitted} · Proposed exit {v.proposed_vacation_date}</p><p className="text-xs text-slate-600">Notice expiry: {v.calculated_notice_expiry} ({Math.max(0, daysBetween(todayISO(), v.calculated_notice_expiry))} days)</p></div>
                <div className="flex items-center gap-2"><StatusBadge status={v.status} /><button onClick={() => setView(v)} className="text-emerald-700 hover:text-emerald-800"><Eye className="h-4 w-4" /></button></div>
              </div>
            </div>
          ))}
        </div>
      )}
      <Dialog open={open} onOpenChange={value => !busy && setOpen(value)}>
        <DialogContent className="max-w-md max-h-[90dvh] overflow-y-auto">
          <DialogHeader><DialogTitle>Submit Vacation Notice</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800">Your tenancy notice period is {activeTenancy?.notice_period_days || 30} days. The calculated notice expiry will be {noticeExpiry(activeTenancy?.notice_period_days ?? 30)}.</div>
            <Field label="Type"><select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">{["Vacation Notice", "Termination Notice", "Early Termination Request"].map((x) => <option key={x}>{x}</option>)}</select></Field>
            <Field label="Proposed vacation date"><Input type="date" min={nairobiToday()} value={form.proposed_vacation_date} onChange={(e) => setForm({ ...form, proposed_vacation_date: e.target.value })} /></Field>
            <Field label="Reason"><Textarea value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} rows={3} /></Field>
          </div>
          <DialogFooter><Button onClick={create} disabled={busy} className="bg-emerald-600 hover:bg-emerald-700">{busy ? "Submitting..." : "Submit Notice"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={!!view} onOpenChange={() => setView(null)}>
        <DialogContent className="max-w-md max-h-[90dvh] overflow-y-auto">
          {view && (
            <>
              <DialogHeader><DialogTitle>{view.type}</DialogTitle></DialogHeader>
              <div className="grid grid-cols-2 gap-3 py-2 text-sm">
                <Info label="Reference" value={view.request_reference} /><Info label="Status" value={<StatusBadge status={view.status} />} /><Info label="Submitted" value={view.date_submitted} /><Info label="Proposed exit" value={view.proposed_vacation_date} /><Info label="Notice expiry" value={view.calculated_notice_expiry} /><Info label="Outstanding rent" value={KES(view.outstanding_rent)} />
              </div>
              <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-700"><span className="text-xs font-medium text-slate-500">Reason</span><p className="mt-1">{view.reason}</p></div>
              {view.landlord_response && <div className="mt-2 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800"><span className="text-xs font-medium">Landlord response: </span>{view.landlord_response}</div>}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
function Info({ label, value }) { return <div><p className="text-xs text-slate-500">{label}</p><p className="font-medium text-slate-800">{value}</p></div>; }