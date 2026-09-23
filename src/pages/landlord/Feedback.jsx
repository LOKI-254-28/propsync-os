import React, { useState, useMemo } from "react";
import { usePortfolioData } from "@/lib/useAppData";
import { base44 } from "@/api/base44Client";
import { logAudit, notify, todayISO } from "@/lib/finance";
import { PageHeader, SectionCard, StatusBadge, EmptyState, Field } from "@/components/ui-bits";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { MessageSquare, Search } from "lucide-react";

export default function Feedback() {
  const data = usePortfolioData();
  const [search, setSearch] = useState("");
  const [view, setView] = useState(null);
  const [response, setResponse] = useState("");
  const [resolution, setResolution] = useState("");

  const list = useMemo(() => data.feedback
    .filter((f) => !search || f.description?.toLowerCase().includes(search.toLowerCase()) || f.tenant_name?.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => new Date(b.date_submitted || b.created_date) - new Date(a.date_submitted || a.created_date)), [data.feedback, search]);

  const respond = async (status) => {
    if (!view) return;
    const me = await base44.auth.me();
    const patch = { status, staff_response: response, resolution };
    if (["Resolved", "Closed"].includes(status)) patch.closed_date = todayISO();
    await base44.entities.Feedback.update(view.id, patch);
    await logAudit({ user: me, action: "Feedback Responded", entity: "Feedback", entity_id: view.id, new_value: patch });
    if (view.tenant_user_id) await notify({ recipient_user_id: view.tenant_user_id, type: "Feedback", title: `Feedback ${status}`, message: response || `Your feedback has been ${status.toLowerCase()}.`, related_entity: "Feedback", related_id: view.id, action_link: "/portal/feedback" });
    setView(null);
    setResponse("");
    setResolution("");
    data.reload();
  };

  if (data.loading) return <div className="flex h-96 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-700" /></div>;

  return (
    <div>
      <PageHeader title="Suggestions & Complaints" description="Tenant feedback across the portfolio." />
      <div className="mb-4 relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search feedback..." className="w-full rounded-md border border-input bg-background py-2 pl-9 pr-3 text-sm" />
      </div>
      {list.length === 0 ? <EmptyState icon={MessageSquare} title="No feedback submitted" /> : (
        <div className="space-y-3">
          {list.map((f) => (
            <div key={f.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div><div className="flex items-center gap-2"><StatusBadge status={f.type} /><StatusBadge status={f.status} /></div><p className="mt-1 font-medium text-slate-900">{f.tenant_name} · {f.unit_number}</p><p className="text-xs text-slate-500">{f.date_submitted} · {f.category || "General"}</p></div>
                <Button size="sm" variant="outline" onClick={() => { setView(f); setResponse(f.staff_response || ""); setResolution(f.resolution || ""); }}>Respond</Button>
              </div>
              <p className="mt-2 text-sm text-slate-700">{f.description}</p>
              {f.staff_response && <div className="mt-2 rounded-lg bg-emerald-50 p-2 text-sm text-emerald-800"><span className="text-xs font-medium">Response: </span>{f.staff_response}</div>}
            </div>
          ))}
        </div>
      )}
      <Dialog open={!!view} onOpenChange={() => setView(null)}>
        <DialogContent className="max-w-md">
          {view && (
            <>
              <DialogHeader><DialogTitle>{view.type} — {view.tenant_name}</DialogTitle></DialogHeader>
              <div className="py-2 space-y-3">
                <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-700">{view.description}</div>
                <Field label="Staff response"><Textarea value={response} onChange={(e) => setResponse(e.target.value)} rows={3} /></Field>
                <Field label="Resolution"><Textarea value={resolution} onChange={(e) => setResolution(e.target.value)} rows={2} /></Field>
              </div>
              <DialogFooter className="flex gap-2">
                <Button variant="outline" onClick={() => respond("Responded")}>Mark Responded</Button>
                <Button onClick={() => respond("Resolved")} className="bg-emerald-600 hover:bg-emerald-700">Mark Resolved</Button>
                <Button variant="outline" onClick={() => respond("Closed")}>Close</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}