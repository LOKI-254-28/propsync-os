import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { todayISO } from "@/lib/finance";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Field } from "@/components/ui-bits";
import { CalendarClock, SkipForward, Loader2 } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import VisitSlotPicker from "@/components/applications/VisitSlotPicker";

// "Select Unit" menu: schedule a site visit or skip it, then create the application.
export default function SelectUnitFlow({ unit, onClose }) {
  const navigate = useNavigate();
  const [step, setStep] = useState("menu");
  const [slot, setSlot] = useState({ date: "", time: "" });
  const [form, setForm] = useState({ proposed_start_date: unit.available_from || todayISO(), message: "", occupation: "", id_number: "", monthly_income: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async () => {
    setErr("");
    setBusy(true);
    try {
      await base44.functions.invoke("bookUnit", {
        unit_id: unit.id, visit: step, visit_date: slot.date, visit_time: slot.time, ...form,
        monthly_income: Number(form.monthly_income) || 0,
      });
      toast({ title: step === "schedule" ? "Visit requested" : "Application submitted", description: "Track it under My Applications." });
      onClose();
      navigate("/portal/applications");
    } catch (e) {
      setErr(e.response?.data?.error || e.data?.error || e.message || "Could not submit. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const ready = step === "skip" || (slot.date && slot.time);
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] max-w-md overflow-y-auto">
        <DialogHeader><DialogTitle>Select unit {unit.unit_number}</DialogTitle></DialogHeader>
        {step === "menu" ? (
          <div className="grid gap-3 py-2">
            <button type="button" onClick={() => setStep("schedule")} className="flex items-center gap-3 rounded-xl border border-slate-200 p-4 text-left hover:border-emerald-500"><CalendarClock className="h-6 w-6 text-emerald-600" /><span><span className="block font-medium text-slate-900">Schedule a visit</span><span className="text-sm text-slate-500">Pick a date and time to see the unit first.</span></span></button>
            <button type="button" onClick={() => setStep("skip")} className="flex items-center gap-3 rounded-xl border border-slate-200 p-4 text-left hover:border-emerald-500"><SkipForward className="h-6 w-6 text-emerald-600" /><span><span className="block font-medium text-slate-900">Skip site visit</span><span className="text-sm text-slate-500">Go straight to landlord review.</span></span></button>
          </div>
        ) : (
          <div className="space-y-3 py-2">
            {step === "schedule" && <Field label="Proposed visit date & time"><VisitSlotPicker {...slot} onChange={setSlot} /></Field>}
            <Field label="ID number"><Input value={form.id_number} onChange={set("id_number")} /></Field>
            <Field label="Occupation"><Input value={form.occupation} onChange={set("occupation")} /></Field>
            <Field label="Monthly income (KES)"><Input type="number" value={form.monthly_income} onChange={set("monthly_income")} /></Field>
            <Field label="Preferred move-in date" hint={unit.occupied ? "Not earlier than the current tenant's exit date." : undefined}><Input type="date" min={unit.available_from || todayISO()} value={form.proposed_start_date} onChange={set("proposed_start_date")} /></Field>
            <Field label="Message to landlord"><Textarea rows={2} value={form.message} onChange={set("message")} /></Field>
            {err && <p className="text-sm text-red-600">{err}</p>}
          </div>
        )}
        {step !== "menu" && (
          <DialogFooter>
            <Button variant="ghost" onClick={() => setStep("menu")}>Back</Button>
            <Button onClick={submit} disabled={busy || !ready} className="bg-emerald-600 hover:bg-emerald-700">{busy && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}{step === "schedule" ? "Request visit" : "Submit application"}</Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}