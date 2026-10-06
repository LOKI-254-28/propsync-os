import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { notify } from "@/lib/finance";
import { Button } from "@/components/ui/button";
import { Calendar, Check, Loader2 } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import VisitSlotPicker from "@/components/applications/VisitSlotPicker";
import { patchApplication } from '@/lib/applicationActions';

// Site-visit negotiation used by both the landlord and the tenant. role: "landlord" | "tenant".
export default function VisitPanel({ app, role, onUpdated }) {
  const [editing, setEditing] = useState(false);
  const [slot, setSlot] = useState({ date: "", time: "" });
  const [busy, setBusy] = useState(false);
  if (!["Site Visit Requested", "Site Visit Scheduled"].includes(app.status)) return null;

  const other = role === "landlord" ? "tenant" : "landlord";
  const hasSlot = !!app.site_visit_date;
  const scheduled = app.status === "Site Visit Scheduled";
  const upcoming = hasSlot && new Date(`${app.site_visit_date}T${app.site_visit_time || "23:59"}+03:00`) > new Date();
  const waiting = !scheduled && hasSlot && app.site_visit_proposed_by === role;
  const canAccept = !scheduled && hasSlot && !waiting;
  const canReschedule = !scheduled || upcoming;
  const showPicker = editing || (!hasSlot && role === "tenant");

  const run = async (updates, title) => {
    setBusy(true);
    try {
      await patchApplication(app.id, updates);
      const to = role === "landlord" ? app.tenant_user_id : app.owner_user_id;
      if (to) await notify({ recipient_user_id: to, type: "Application", title, message: `${title} for ${app.unit_number} · ${app.property_name}.`, related_entity: "Application", related_id: app.id, action_link: role === "landlord" ? "/portal/applications" : "/site-visits" });
      toast({ title });
      setEditing(false);
      onUpdated?.();
    } catch (e) {
      toast({ title: "Error", description: "Could not update the site visit. Please try again.", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const sendTime = () => run({ site_visit_date: slot.date, site_visit_time: slot.time, site_visit_status: hasSlot ? "Rescheduled" : "Proposed", site_visit_proposed_by: role, status: "Site Visit Requested" }, hasSlot ? "Site visit rescheduled" : "Site visit time proposed");

  return (
    <div className="w-full rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm">
      <p className="flex items-center gap-1.5 font-medium text-blue-800"><Calendar className="h-4 w-4" />Site visit — {scheduled ? "Confirmed" : "Awaiting confirmation"}</p>
      {hasSlot && <p className="mt-1 text-blue-700">{app.site_visit_date} at {app.site_visit_time}{!scheduled && ` · proposed by ${app.site_visit_proposed_by === role ? "you" : other}`}</p>}
      {!hasSlot && role === "landlord" && <p className="mt-1 text-blue-700">Waiting for the tenant to propose a date and time.</p>}
      {waiting && <p className="mt-1 text-xs text-blue-600">Waiting for the {other} to respond.</p>}
      {showPicker && <div className="mt-2"><VisitSlotPicker {...slot} onChange={setSlot} /></div>}
      <div className="mt-2 flex flex-wrap gap-2">
        {canAccept && <Button size="sm" disabled={busy} onClick={() => run({ site_visit_status: "Confirmed", status: "Site Visit Scheduled" }, "Site visit accepted")} className="bg-emerald-600 hover:bg-emerald-700"><Check className="mr-1 h-4 w-4" />Accept</Button>}
        {showPicker && <Button size="sm" disabled={busy || !slot.date || !slot.time} onClick={sendTime} className="bg-emerald-600 hover:bg-emerald-700">{busy && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}Send time</Button>}
        {!showPicker && hasSlot && canReschedule && <Button size="sm" variant="outline" disabled={busy} onClick={() => setEditing(true)}>Reschedule</Button>}
        {editing && <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>}
        {role === "landlord" && scheduled && <Button size="sm" variant="outline" disabled={busy} onClick={() => run({ status: "Site Visit Completed", site_visit_status: "Completed" }, "Site visit completed")}>Mark visit completed</Button>}
      </div>
    </div>
  );
}