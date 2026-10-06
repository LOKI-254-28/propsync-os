import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { syncUploadedDocuments } from '@/lib/registerUpload';
import { patchApplication } from '@/lib/applicationActions';
import { notify } from "@/lib/finance";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import FileUploadButton from "@/components/FileUploadButton";
import { toast } from "@/components/ui/use-toast";
import { Loader2 } from "lucide-react";

// Upload a payment receipt (manual paybill or bank) for the landlord to verify.
export default function ReceiptSubmit({ app, method, onDone, onBusyChange, disabled = false }) {
  const [uploading, setUploading] = useState(false);
  const [proof, setProof] = useState("");
  const [ref, setRef] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    try {
      await patchApplication(app.id, { payment_method: method, payment_proof_url: proof, payment_reference: ref, payment_status: "Proof Submitted", status: "Payment Proof Submitted" });
      await syncUploadedDocuments('Application',app.id);
      if (app.owner_user_id) await notify({ recipient_user_id: app.owner_user_id, type: "Payment", title: "Payment receipt submitted", message: `${app.applicant_name} submitted a ${method} receipt for ${app.unit_number}.`, related_entity: "Application", related_id: app.id, action_link: "/applications" });
      toast({ title: "Receipt submitted", description: "The landlord will verify your payment." });
      onDone();
    } catch (e) {
      toast({ title: "Error", description: "Could not submit the receipt. Please try again.", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2">
      <Input value={ref} onChange={(e) => setRef(e.target.value)} placeholder="Transaction code / reference" />
      <FileUploadButton documentContext={{entity:'Application',record_id:app.id,category:'Receipt'}} disabled={busy || disabled} onBusyChange={value => { setUploading(value); onBusyChange?.(value); }} onUploaded={(f) => setProof(f.file_uri)} label="Upload receipt photo" />
      <Button size="sm" disabled={busy || uploading || disabled || !proof} onClick={submit} className="bg-emerald-600 hover:bg-emerald-700">{busy && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}Submit receipt</Button>
    </div>
  );
}