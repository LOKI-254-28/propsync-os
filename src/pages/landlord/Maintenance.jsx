import React, { useState, useMemo } from "react";
import { usePortfolioData } from "@/lib/useAppData";
import { base44 } from "@/api/base44Client";
import { KES, genRef, logAudit, notify, todayISO } from "@/lib/finance";
import { PageHeader, SectionCard, StatusBadge, EmptyState, Field } from "@/components/ui-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Wrench, Search, Eye } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

const STATUSES = ["Submitted", "Acknowledged", "Assigned", "Scheduled", "In Progress", "Awaiting Parts", "Completed", "Closed", "Rejected"];

export default function Maintenance() {
  const data = usePortfolioData();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("");
  const [view, setView] = useState(null);
  const [update, setUpdate] = useState({ status: "", contractor_id: "", estimated_cost: 0, approved_cost: 0, actual_cost: 0, public_message: "", internal_notes: "", resolution_notes: "" });
  const [busy, setBusy] = useState(false);

  const list = useMemo(() => data.maintenance
    .filter((m) => !filter || m.status === filter)
    .filter((m) => !search || m.title?.toLowerCase().includes(search.toLowerCase()) || m.ticket_number?.toLowerCase().includes(search.toLowerCase()) || m.unit_number?.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => new Date(b.date_reported || b.created_date) - new Date(a.date_reported || a.created_date)), [data.maintenance, search, filter]);

  const openView = (m) => { setView(m); setUpdate({ status: m.status, contractor_id: m.contractor_id || "", estimated_cost: m.estimated_cost || 0, approved_cost: m.approved_cost || 0, actual_cost: m.actual_cost || 0, public_message: "", internal_notes: m.internal_notes || "", resolution_notes: m.resolution_notes || "" }); };

  const save = async () => {
    if (!view) return;
    setBusy(true);
    try {
      const me = await base44.auth.me();
      const contractor = data.contractors.find((c) => c.id === update.contractor_id);
      const public_updates = view.public_updates || [];
      if (update.public_message) public_updates.push({ date: todayISO(), status: update.status, message: update.public_message });
      const patch = {
        status: update.status,
        contractor_id: update.contractor_id,
        contractor_name: contractor?.name || "",
        estimated_cost: Number(update.estimated_cost),
        approved_cost: Number(update.approved_cost),
        actual_cost: Number(update.actual_cost),
        internal_notes: update.internal_notes,
        resolution_notes: update.resolution_notes,
        public_updates,
        completion_date: ["Completed", "Closed"].includes(update.status) ? todayISO() : view.completion_date,
      };
      await base44.entities.Maintenance.update(view.id, patch);
      await logAudit({ user: me, action: "Maintenance Updated", entity: "Maintenance", entity_id: view.id, entity_name: view.ticket_number, new_value: patch });
      if (view.tenant_user_id && update.public_message) await notify({ recipient_user_id: view.tenant_user_id, type: "Maintenance", title: "Maintenance Update", message: update.public_message, related_entity: "Maintenance", related_id: view.id, action_link: "/portal/maintenance" });
      toast({ title: "Success", description: "Maintenance ticket updated." });
      setView(null);
      data.reload();
    } catch (err) {
      console.error("[Maintenance update error]", err);
      toast({ title: "Error", description: "Could not update maintenance ticket. Please try again.", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  if (data.loading) return <div className="flex h-96 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-700" /></div>;

  return (
    <div>
      <PageHeader title="Maintenance" description="Ticketing system for repairs and maintenance across all units." />

      <div className="mb-4 flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search tickets..." className="pl-9" />
        </div>
        <select value={filter} onChange={(e) => setFilter(e.target.value)} className="rounded-md border border-input bg-background px-3 py-2 text-sm">
          <option value="">All statuses</option>
          {STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>

      {list.length === 0 ? <EmptyState icon={Wrench} title="No maintenance tickets" /> : (
        <SectionCard>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-slate-100 text-left text-xs uppercase text-slate-500">
                <th className="pb-2 font-medium">Ticket</th><th className="pb-2 font-medium">Title</th><th className="pb-2 font-medium">Unit</th><th className="pb-2 font-medium">Category</th><th className="pb-2 font-medium">Priority</th><th className="pb-2 text-right font-medium">Cost</th><th className="pb-2 text-right font-medium">Status</th><th className="pb-2"></th>
              </tr></thead>
              <tbody>
                {list.map((m) => (
                  <tr key={m.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                    <td className="py-2.5 font-mono text-xs text-slate-600">{m.ticket_number}</td>
                    <td className="py-2.5 font-medium text-slate-800">{m.title}</td>
                    <td className="py-2.5 text-slate-600">{m.unit_number}</td>
                    <td className="py-2.5 text-slate-600">{m.category}</td>
                    <td className="py-2.5"><StatusBadge status={m.priority} /></td>
                    <td className="py-2.5 text-right text-slate-900">{m.actual_cost ? KES(m.actual_cost) : "—"}</td>
                    <td className="py-2.5 text-right"><StatusBadge status={m.status} /></td>
                    <td className="py-2.5 text-right"><button onClick={() => openView(m)} className="text-emerald-700 hover:text-emerald-800"><Eye className="h-4 w-4" /></button></td>
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
              <DialogHeader><DialogTitle>{view.title}</DialogTitle></DialogHeader>
              <div className="grid grid-cols-2 gap-3 py-2 text-sm">
                <Info label="Ticket" value={view.ticket_number} />
                <Info label="Unit" value={`${view.unit_number} · ${view.property_name}`} />
                <Info label="Tenant" value={view.tenant_name || "—"} />
                <Info label="Reported" value={view.date_reported} />
                <Info label="Category" value={view.category} />
                <Info label="Priority" value={<StatusBadge status={view.priority} />} />
              </div>
              <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-700">{view.description}</div>
              <div className="mt-3 space-y-3">
                <Field label="Status">
                  <select value={update.status} onChange={(e) => setUpdate({ ...update, status: e.target.value })} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                    {STATUSES.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </Field>
                <Field label="Assign contractor">
                  <select value={update.contractor_id} onChange={(e) => setUpdate({ ...update, contractor_id: e.target.value })} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                    <option value="">Unassigned</option>
                    {data.contractors.map((c) => <option key={c.id} value={c.id}>{c.name} — {c.company}</option>)}
                  </select>
                </Field>
                <div className="grid grid-cols-3 gap-2">
                  <Field label="Estimated"><Input type="number" value={update.estimated_cost} onChange={(e) => setUpdate({ ...update, estimated_cost: Number(e.target.value) })} /></Field>
                  <Field label="Approved"><Input type="number" value={update.approved_cost} onChange={(e) => setUpdate({ ...update, approved_cost: Number(e.target.value) })} /></Field>
                  <Field label="Actual"><Input type="number" value={update.actual_cost} onChange={(e) => setUpdate({ ...update, actual_cost: Number(e.target.value) })} /></Field>
                </div>
                <Field label="Public update (visible to tenant)"><Input value={update.public_message} onChange={(e) => setUpdate({ ...update, public_message: e.target.value })} placeholder="e.g. Contractor scheduled for tomorrow" /></Field>
                <Field label="Resolution notes"><Textarea value={update.resolution_notes} onChange={(e) => setUpdate({ ...update, resolution_notes: e.target.value })} rows={2} /></Field>
                <Field label="Internal notes (hidden from tenant)"><Textarea value={update.internal_notes} onChange={(e) => setUpdate({ ...update, internal_notes: e.target.value })} rows={2} /></Field>
              </div>
              {view.public_updates?.length > 0 && (
                <div className="mt-2 rounded-lg bg-blue-50 p-3"><p className="mb-1 text-xs font-medium text-blue-800">Public updates</p>{view.public_updates.map((u, i) => <p key={i} className="text-xs text-blue-700">{u.date} · {u.message}</p>)}</div>
              )}
              <DialogFooter><Button onClick={save} disabled={busy} className="bg-emerald-600 hover:bg-emerald-700">{busy ? "Saving..." : "Save Update"}</Button></DialogFooter>
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