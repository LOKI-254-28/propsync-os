import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui-bits";
import FileUploadButton from "@/components/FileUploadButton";
import { Loader2 } from "lucide-react";

// Collected just before payment: next of kin name, ID number, ID copy, phone and/or email.
export default function NextOfKinForm({ app, onSaved, onBusyChange }) {
  const [uploading, setUploading] = useState(false);
  const [f, setF] = useState({ full_name: "", id_number: "", phone: "", email: "", id_document_uri: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const save = async () => {
    if (!f.full_name.trim() || !f.id_number.trim()) return setErr("Enter your next of kin's name and ID number.");
    if (!f.id_document_uri) return setErr("Upload a copy of their ID.");
    if (!f.phone.trim() && !f.email.trim()) return setErr("Enter a phone number and/or an email.");
    setErr("");
    setBusy(true);
    try {
      const rec = await base44.entities.NextOfKin.create({ ...f, application_id: app.id, tenant_user_id: app.tenant_user_id, owner_user_id: app.owner_user_id });
      await base44.entities.Application.update(app.id, { next_of_kin_id: rec.id });
      onSaved(rec);
    } catch (e) {
      setErr("Could not save next of kin. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-600">Before paying, tell us who your next of kin is.</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Full name"><Input value={f.full_name} onChange={set("full_name")} /></Field>
        <Field label="ID number"><Input value={f.id_number} onChange={set("id_number")} /></Field>
        <Field label="Phone"><Input value={f.phone} onChange={set("phone")} placeholder="07XX XXX XXX" /></Field>
        <Field label="Email"><Input type="email" value={f.email} onChange={set("email")} /></Field>
      </div>
      <Field label="Copy of their ID">
        <FileUploadButton disabled={busy} onBusyChange={value => { setUploading(value); onBusyChange?.(value); }} onUploaded={(file) => setF(current => ({ ...current, id_document_uri: file.file_uri }))} label="Upload ID copy" />
      </Field>
      {err && <p className="text-sm text-red-600">{err}</p>}
      <Button onClick={save} disabled={busy || uploading} className="bg-emerald-600 hover:bg-emerald-700">{busy && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}Save and continue to payment</Button>
    </div>
  );
}