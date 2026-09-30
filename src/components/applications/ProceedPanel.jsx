import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { notify } from "@/lib/finance";
import { Button } from "@/components/ui/button";
import { Check, X, FileSignature, Loader2 } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import FileUploadButton from "@/components/FileUploadButton";

// Landlord decision after the site visit is accepted (or skipped): Proceed (send agreement) or Terminate.
export default function ProceedPanel({ app, onUpdated }) {
  const [open, setOpen] = useState(false);
  const [agreement, setAgreement] = useState("");
  const [busy, setBusy] = useState(false);
  const show = ["Site Visit Scheduled", "Site Visit Completed"].includes(app.status) || (app.status === "Submitted" && app.visit_skipped);
  if (!show) return null;

  const run = async (updates, title) => {
    setBusy(true);
    try {
      await base44.entities.Application.update(app.id, updates);
      if (app.tenant_user_id) await notify({ recipient_user_id: app.tenant_user_id, type: "Application", title, message: `${title} — ${app.unit_number} · ${app.property_name}.`, related_entity: "Application", related_id: app.id, action_link: "/portal/applications" });
      toast({ title });
      onUpdated?.();
    } catch (e) {
      toast({ title: "Error", description: "Could not complete this action. Please try again.", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="w-full rounded-lg border border-slate-200 p-3">
      <div className="flex flex-wrap gap-2">
        <Button size="sm" disabled={busy} onClick={() => setOpen(true)} className="bg-emerald-600 hover:bg-emerald-700"><Check className="mr-1 h-4 w-4" />Proceed</Button>
        <Button size="sm" variant="outline" disabled={busy} onClick={() => run({ status: "Rejected", landlord_response: "The landlord has terminated this application." }, "Application terminated")} className="border-rose-200 text-rose-700 hover:bg-rose-50"><X className="mr-1 h-4 w-4" />Terminate application</Button>
      </div>
      {open && (
        <div className="mt-3 space-y-2 border-t border-slate-100 pt-3">
          <p className="text-xs font-medium uppercase text-slate-500">Tenancy agreement</p>
          <FileUploadButton onUploaded={(f) => setAgreement(f.file_uri)} label="Upload agreement" />
          {agreement && <p className="text-xs text-emerald-600">Agreement attached.</p>}
          <Button size="sm" disabled={busy || !agreement} onClick={() => run({ status: "Agreement Issued", agreement_url: agreement, agreement_status: "Issued" }, "Agreement sent to tenant")} className="bg-emerald-600 hover:bg-emerald-700">
            {busy ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <FileSignature className="mr-1 h-4 w-4" />}Send to tenant
          </Button>
        </div>
      )}
    </div>
  );
}