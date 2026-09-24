import React, { useState, useMemo } from "react";
import { useTenantData } from "@/lib/useTenantData";
import { base44 } from "@/api/base44Client";
import { logAudit, todayISO } from "@/lib/finance";
import { PageHeader, SectionCard, StatusBadge, EmptyState, Field } from "@/components/ui-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { MessageSquare, Plus } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { notify } from "@/lib/finance";

const TYPES = ["Suggestion", "Complaint", "General Feedback", "Improvement Idea"];

export default function MyFeedback() {
  const t = useTenantData();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ type: "Suggestion", category: "", description: "" });
  const [busy, setBusy] = useState(false);
  const activeTenancy = t.tenancies.find((x) => ["Active", "Expiring Soon", "Notice Given"].includes(x.status));
  const list = useMemo(() => [...t.feedback].sort((a, b) => new Date(b.date_submitted || b.created_date) - new Date(a.date_submitted || a.created_date)), [t.feedback]);

  const create = async () => {
    if (!form.description) { toast({ title: "Validation error", description: "Description is required.", variant: "destructive" }); return; }
    setBusy(true);
    try {
      const me = t.user;
      const rec = await base44.entities.Feedback.create({
        type: form.type, tenant_id: t.tenant?.id, tenant_user_id: me.id, tenant_name: t.tenant?.full_name,
        property_id: activeTenancy?.property_id, property_name: activeTenancy?.property_name, unit_id: activeTenancy?.unit_id, unit_number: activeTenancy?.unit_number,
        category: form.category, description: form.description, status: "Open", date_submitted: todayISO(),
        owner_user_id: activeTenancy?.owner_user_id || "",
      });
      await logAudit({ user: me, action: "Feedback Submitted", entity: "Feedback", entity_id: rec.id });
      if (activeTenancy?.owner_user_id) await notify({ recipient_user_id: activeTenancy.owner_user_id, type: "Feedback", title: "New Feedback", message: `${form.type}: ${form.description.slice(0, 80)}`, related_entity: "Feedback", related_id: rec.id, action_link: "/feedback" });
      toast({ title: "Success", description: "Feedback submitted." });
      setOpen(false);
      setForm({ type: "Suggestion", category: "", description: "" });
      t.reload();
    } catch (err) {
      console.error("[Feedback create error]", err);
      toast({ title: "Error", description: "Could not submit feedback. Please try again.", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  if (t.loading) return <div className="flex h-96 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-700" /></div>;
  return (
    <div>
      <PageHeader title="Suggestions & Complaints" description="Share feedback with your landlord." actions={<Button onClick={() => setOpen(true)} className="bg-emerald-600 hover:bg-emerald-700"><Plus className="mr-1.5 h-4 w-4" />New Feedback</Button>} />
      {list.length === 0 ? <EmptyState icon={MessageSquare} title="No feedback submitted" /> : (
        <div className="space-y-3">
          {list.map((f) => (
            <div key={f.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between"><StatusBadge status={f.type} /><StatusBadge status={f.status} /></div>
              <p className="mt-2 text-sm text-slate-700">{f.description}</p>
              {f.staff_response && <div className="mt-2 rounded-lg bg-emerald-50 p-2 text-sm text-emerald-800"><span className="text-xs font-medium">Response: </span>{f.staff_response}</div>}
              <p className="mt-1 text-xs text-slate-400">{f.date_submitted}</p>
            </div>
          ))}
        </div>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Submit Feedback</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <Field label="Type"><select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">{TYPES.map((x) => <option key={x}>{x}</option>)}</select></Field>
            <Field label="Category (optional)"><Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></Field>
            <Field label="Description"><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={4} /></Field>
          </div>
          <DialogFooter><Button onClick={create} disabled={busy} className="bg-emerald-600 hover:bg-emerald-700">{busy ? "Submitting..." : "Submit"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}