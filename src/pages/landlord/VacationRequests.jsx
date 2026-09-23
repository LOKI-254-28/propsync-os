import React, { useMemo } from "react";
import { usePortfolioData } from "@/lib/useAppData";
import { base44 } from "@/api/base44Client";
import { KES, todayISO, daysBetween, logAudit, notify } from "@/lib/finance";
import { PageHeader, SectionCard, StatusBadge, EmptyState, Field } from "@/components/ui-bits";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { LogOut, Eye } from "lucide-react";
import { useState } from "react";

export default function VacationRequests() {
  const data = usePortfolioData();
  const [view, setView] = useState(null);
  const [resp, setResp] = useState({ status: "Acknowledged", landlord_response: "", outstanding_rent: 0, deposit_treatment: "", final_meter_reading: "", handover_notes: "" });
  const [busy, setBusy] = useState(false);

  const list = useMemo(() => [...data.vacationRequests].sort((a, b) => new Date(b.date_submitted || b.created_date) - new Date(a.date_submitted || a.created_date)), [data.vacationRequests]);

  const open = (v) => {
    setView(v);
    const tenancy = data.tenancies.find((t) => t.id === v.tenancy_id);
    const outstanding = data.charges.filter((c) => c.tenancy_id === v.tenancy_id && c.status !== "Void" && c.status !== "Paid").reduce((s, c) => s + Number(c.outstanding || 0), 0);
    setResp({ status: "Acknowledged", landlord_response: "", outstanding_rent: outstanding, deposit_treatment: tenancy ? `Deposit ${KES(tenancy.security_deposit)} — ` : "", final_meter_reading: "", handover_notes: "" });
  };

  const save = async (markVacated) => {
    if (!view) return;
    setBusy(true);
    const me = await base44.auth.me();
    const patch = { ...resp };
    await base44.entities.VacationRequest.update(view.id, patch);
    await logAudit({ user: me, action: "Vacation Request Updated", entity: "VacationRequest", entity_id: view.id, new_value: patch });
    if (markVacated) {
      const tenancy = data.tenancies.find((t) => t.id === view.tenancy_id);
      const unit = data.units.find((u) => u.id === view.unit_id);
      if (tenancy) await base44.entities.Tenancy.update(tenancy.id, { status: "Vacated", actual_end_date: todayISO() });
      if (unit) await base44.entities.Unit.update(unit.id, { status: "Vacant", current_tenancy_id: "", current_tenant_name: "" });
      await logAudit({ user: me, action: "Tenancy Vacated", entity: "Tenancy", entity_id: tenancy?.id, entity_name: tenancy?.tenancy_reference });
    }
    if (view.tenant_user_id) await notify({ recipient_user_id: view.tenant_user_id, type: "Vacation", title: `Vacation Request ${resp.status}`, message: resp.landlord_response || `Your vacation request has been ${resp.status.toLowerCase()}.`, related_entity: "VacationRequest", related_id: view.id, action_link: "/portal/vacation" });
    setBusy(false);
    setView(null);
    data.reload();
  };

  if (data.loading) return <div className="flex h-96 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-700" /></div>;

  return (
    <div>
      <PageHeader title="Vacation & Termination" description="Tenant vacation and termination requests with notice-period calculations." />
      {list.length === 0 ? <EmptyState icon={LogOut} title="No vacation requests" /> : (
        <SectionCard>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-slate-100 text-left text-xs uppercase text-slate-500"><th className="pb-2 font-medium">Reference</th><th className="pb-2 font-medium">Tenant</th><th className="pb-2 font-medium">Type</th><th className="pb-2 font-medium">Submitted</th><th className="pb-2 font-medium">Proposed Exit</th><th className="pb-2 font-medium">Notice Expiry</th><th className="pb-2 text-right font-medium">Status</th><th className="pb-2"></th></tr></thead>
              <tbody>
                {list.map((v) => (
                  <tr key={v.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                    <td className="py-2.5 font-mono text-xs text-slate-600">{v.request_reference}</td>
                    <td className="py-2.5 font-medium text-slate-800">{v.tenant_name}</td>
                    <td className="py-2.5 text-slate-600">{v.type}</td>
                    <td className="py-2.5 text-slate-600">{v.date_submitted}</td>
                    <td className="py-2.5 text-slate-600">{v.proposed_vacation_date}</td>
                    <td className="py-2.5 text-slate-600">{v.calculated_notice_expiry}</td>
                    <td className="py-2.5 text-right"><StatusBadge status={v.status} /></td>
                    <td className="py-2.5 text-right"><button onClick={() => open(v)} className="text-emerald-700 hover:text-emerald-800"><Eye className="h-4 w-4" /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}

      <Dialog open={!!view} onOpenChange={() => setView(null)}>
        <DialogContent className="max-w-lg">
          {view && (
            <>
              <DialogHeader><DialogTitle>{view.type} — {view.tenant_name}</DialogTitle></DialogHeader>
              <div className="grid grid-cols-2 gap-3 py-2 text-sm">
                <Info label="Reference" value={view.request_reference} />
                <Info label="Unit" value={`${view.unit_number} · ${view.property_name}`} />
                <Info label="Date submitted" value={view.date_submitted} />
                <Info label="Proposed exit" value={view.proposed_vacation_date} />
                <Info label="Notice period" value={`${view.notice_period_days} days`} />
                <Info label="Notice expiry" value={view.calculated_notice_expiry} />
                <Info label="Days to expiry" value={view.calculated_notice_expiry ? `${Math.max(0, daysBetween(todayISO(), view.calculated_notice_expiry))} days` : "—"} />
                <Info label="Status" value={<StatusBadge status={view.status} />} />
              </div>
              <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-700"><span className="text-xs font-medium text-slate-500">Reason</span><p className="mt-1">{view.reason}</p></div>
              <div className="mt-3 space-y-3">
                <Field label="Status">
                  <select value={resp.status} onChange={(e) => setResp({ ...resp, status: e.target.value })} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                    {["Submitted", "Acknowledged", "Clarification Requested", "Approved", "Final Inspection Scheduled", "Completed", "Rejected"].map((s) => <option key={s}>{s}</option>)}
                  </select>
                </Field>
                <Field label="Landlord response"><Textarea value={resp.landlord_response} onChange={(e) => setResp({ ...resp, landlord_response: e.target.value })} rows={2} /></Field>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Outstanding rent"><Input type="number" value={resp.outstanding_rent} onChange={(e) => setResp({ ...resp, outstanding_rent: Number(e.target.value) })} /></Field>
                  <Field label="Final meter reading"><Input value={resp.final_meter_reading} onChange={(e) => setResp({ ...resp, final_meter_reading: e.target.value })} /></Field>
                </div>
                <Field label="Deposit treatment"><Input value={resp.deposit_treatment} onChange={(e) => setResp({ ...resp, deposit_treatment: e.target.value })} /></Field>
                <Field label="Handover notes"><Textarea value={resp.handover_notes} onChange={(e) => setResp({ ...resp, handover_notes: e.target.value })} rows={2} /></Field>
              </div>
              <DialogFooter className="flex gap-2">
                <Button onClick={() => save(false)} disabled={busy} variant="outline">Save Response</Button>
                <Button onClick={() => save(true)} disabled={busy} className="bg-rose-600 hover:bg-rose-700">Mark Vacated & Release Unit</Button>
              </DialogFooter>
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