import React, { useState, useMemo } from "react";
import { useTenantData } from "@/lib/useTenantData";
import { base44 } from "@/api/base44Client";
import { genRef, logAudit, notify, todayISO } from "@/lib/finance";
import { PageHeader, SectionCard, StatusBadge, EmptyState, Field } from "@/components/ui-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Wrench, Plus, Eye } from "lucide-react";
import MaintenanceStatusTracker from "@/components/MaintenanceStatusTracker";
import { toast } from "@/components/ui/use-toast";

const CATEGORIES = ["Plumbing", "Electrical", "Structural", "Appliance", "Security", "Cleaning", "Other"];
const PRIORITIES = ["Low", "Medium", "High", "Urgent"];

export default function MyMaintenance() {
  const t = useTenantData();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState(null);
  const [form, setForm] = useState({ title: "", description: "", category: "Plumbing", priority: "Medium" });
  const [busy, setBusy] = useState(false);

  const activeTenancy = t.tenancies.find((x) => ["Active", "Expiring Soon", "Notice Given"].includes(x.status));
  const list = useMemo(() => [...t.maintenance].sort((a, b) => new Date(b.date_reported || b.created_date) - new Date(a.date_reported || a.created_date)), [t.maintenance]);

  const create = async () => {
    if (!form.title) { toast({ title: "Validation error", description: "Title is required.", variant: "destructive" }); return; }
    if (!activeTenancy) { toast({ title: "Error", description: "You need an active tenancy to report maintenance.", variant: "destructive" }); return; }
    setBusy(true);
    try {
      const me = t.user;
      const ref = genRef("MNT");
      const rec = await base44.entities.Maintenance.create({
        ticket_number: ref, title: form.title, description: form.description, category: form.category, priority: form.priority, date_reported: todayISO(),
        property_id: activeTenancy.property_id, property_name: activeTenancy.property_name, unit_id: activeTenancy.unit_id, unit_number: activeTenancy.unit_number,
        tenant_id: t.tenant?.id, tenant_user_id: me.id, tenant_name: t.tenant?.full_name, tenancy_id: activeTenancy.id, status: "Submitted", public_updates: [],
        owner_user_id: activeTenancy.owner_user_id || "",
      });
      await logAudit({ user: me, action: "Maintenance Submitted", entity: "Maintenance", entity_id: rec.id, entity_name: ref });
      if (activeTenancy.owner_user_id) await notify({ recipient_user_id: activeTenancy.owner_user_id, type: "Maintenance", title: "New Maintenance Request", message: `${form.title} — ${activeTenancy.unit_number}`, related_entity: "Maintenance", related_id: rec.id, action_link: "/maintenance" });
      toast({ title: "Success", description: "Maintenance request submitted." });
      setOpen(false);
      setForm({ title: "", description: "", category: "Plumbing", priority: "Medium" });
      t.reload();
    } catch (err) {
      console.error("[Maintenance create error]", err);
      toast({ title: "Error", description: "Could not submit maintenance request. Please try again.", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  if (t.loading) return <div className="flex h-96 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-700" /></div>;

  return (
    <div>
      <PageHeader title="Maintenance" description="Report and track repair requests." actions={activeTenancy && <Button onClick={() => setOpen(true)} className="bg-emerald-600 hover:bg-emerald-700"><Plus className="mr-1.5 h-4 w-4" />Report Issue</Button>} />
      {!activeTenancy ? <EmptyState icon={Wrench} title="No active tenancy" description="You need an active tenancy to report maintenance." /> : list.length === 0 ? <EmptyState icon={Wrench} title="No maintenance requests" /> : (
        <div className="space-y-3">
          {list.map((m) => (
            <div key={m.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div><div className="flex items-center gap-2"><span className="font-mono text-xs text-slate-500">{m.ticket_number}</span><StatusBadge status={m.priority} /><MaintenanceStatusTracker status={m.status} updates={m.public_updates} /></div><p className="mt-1 font-medium text-slate-900">{m.title}</p><p className="text-xs text-slate-500">{m.category} · Reported {m.date_reported}</p></div>
                <Button size="sm" variant="outline" onClick={() => setView(m)}><Eye className="mr-1.5 h-3.5 w-3.5" />Track</Button>
              </div>
              <p className="mt-2 text-sm text-slate-700">{m.description}</p>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Report Maintenance Issue</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <Field label="Title"><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Leaking kitchen tap" /></Field>
            <Field label="Description"><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={4} /></Field>
            <Field label="Category"><select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></Field>
            <Field label="Priority"><select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">{PRIORITIES.map((p) => <option key={p}>{p}</option>)}</select></Field>
          </div>
          <DialogFooter><Button onClick={create} disabled={busy} className="bg-emerald-600 hover:bg-emerald-700">{busy ? "Submitting..." : "Submit Request"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!view} onOpenChange={() => setView(null)}>
        <DialogContent className="max-w-md">
          {view && (
            <>
              <DialogHeader><DialogTitle>{view.title}</DialogTitle></DialogHeader>
              <div className="grid grid-cols-2 gap-3 py-2 text-sm">
                <Info label="Ticket" value={view.ticket_number} /><Info label="Category" value={view.category} /><Info label="Priority" value={view.priority} /><Info label="Status" value={<StatusBadge status={view.status} />} /><Info label="Reported" value={view.date_reported} />{view.contractor_name && <Info label="Contractor" value={view.contractor_name} />}
              </div>
              <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-700">{view.description}</div>
              <div className="mt-3">
                <p className="mb-1.5 text-xs font-medium uppercase text-slate-500">Progress Updates</p>
                {(view.public_updates || []).length === 0 ? <p className="text-sm text-slate-400">No updates yet.</p> : (
                  <div className="space-y-2">{view.public_updates.map((u, i) => <div key={i} className="rounded-lg border border-slate-100 px-3 py-2"><p className="text-xs text-slate-500">{u.date} · {u.status}</p><p className="text-sm text-slate-700">{u.message}</p></div>)}</div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Info({ label, value }) { return <div><p className="text-xs text-slate-500">{label}</p><p className="font-medium text-slate-800">{value}</p></div>; }