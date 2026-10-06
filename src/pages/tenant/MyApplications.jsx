import React, { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useTenantData } from "@/lib/useTenantData";
import { base44 } from "@/api/base44Client";
import { KES, logAudit, todayISO } from "@/lib/finance";
import { PageHeader, StatusBadge, EmptyState, Field } from "@/components/ui-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { FileText, Calendar, FileSignature, Wallet, Loader2, ExternalLink } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import FileUploadButton from "@/components/FileUploadButton";
import { downloadFile } from "@/lib/files";
import VisitPanel from "@/components/applications/VisitPanel";
import ApplicationPayment from "@/components/payment/ApplicationPayment";
import { syncUploadedDocuments } from '@/lib/registerUpload';
import { patchApplication } from '@/lib/applicationActions';
import MoveInInspectionPanel from '@/components/inspections/MoveInInspectionPanel';
import {addDays,nairobiToday} from '@/lib/nairobiDates';

export default function MyApplications() {
  const t = useTenantData();
  const [actionApp, setActionApp] = useState(null);
  const [actionType, setActionType] = useState("");
  const [payApp, setPayApp] = useState(null);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({ info: "", site_visit_date: "", site_visit_time: "", agreement_executed_url: "", payment_proof_url: "", payment_reference: "", documents: [] });

  const list = useMemo(() => [...t.applications].sort((a, b) => new Date(b.submitted_date || b.created_date) - new Date(a.submitted_date || a.created_date)), [t.applications]);

  const openAction = (app, type) => {
    setActionApp(app);
    setActionType(type);
    setForm({ info: "", site_visit_date: app.site_visit_date || "", site_visit_time: app.site_visit_time || "", agreement_executed_url: "", payment_proof_url: "", payment_reference: "", documents: app.documents || [] });
  };

  const submitAction = async () => {
    if (!actionApp || !actionType || uploading) return;
    setBusy(true);
    try {
      const me = t.user;
      let updates = {};
      let label = "";
      if (actionType === "info") {
        updates = { status: "Information Provided", landlord_response: form.info, documents: form.documents };
        label = "Information Provided";
      } else if (actionType === "sitevisit") {
        updates = { site_visit_date: form.site_visit_date, site_visit_time: form.site_visit_time, site_visit_status: "Proposed", status: "Site Visit Scheduled" };
        label = "Site Visit Proposed";
      } else if (actionType === "reschedule") {
        updates = { site_visit_date: form.site_visit_date, site_visit_time: form.site_visit_time, site_visit_status: "Rescheduled", status: "Site Visit Scheduled" };
        label = "Site Visit Reschedule Requested";
      } else if (actionType === "agreement") {
        if (!form.agreement_executed_url) { toast({ title: "Validation error", description: "Please upload the executed agreement.", variant: "destructive" }); setBusy(false); return; }
        updates = { agreement_executed_url: form.agreement_executed_url, agreement_status: "Executed", status: "Payment Requested", payment_status: "Requested", payment_due_date: addDays(nairobiToday(),7) };
        label = "Agreement Executed";
      } else if (actionType === "payment") {
        if (!form.payment_proof_url) { toast({ title: "Validation error", description: "Please upload payment proof.", variant: "destructive" }); setBusy(false); return; }
        updates = { payment_proof_url: form.payment_proof_url, payment_reference: form.payment_reference, payment_status: "Proof Submitted", status: "Payment Proof Submitted" };
        label = "Payment Proof Submitted";
      }
      await patchApplication(actionApp.id, updates);
      await syncUploadedDocuments('Application',actionApp.id);
      await logAudit({ user: me, action: `Application ${label}`, entity: "Application", entity_id: actionApp.id, entity_name: actionApp.application_reference });
      if (actionApp.owner_user_id) {
        try {
          const { notify } = await import("@/lib/finance");
          await notify({ recipient_user_id: actionApp.owner_user_id, type: "Application", title: `Application ${label}`, message: `Client has ${label.toLowerCase()} for ${actionApp.property_name}.`, related_entity: "Application", related_id: actionApp.id, action_link: "/applications" });
        } catch (e) {}
      }
      toast({ title: "Success", description: `${label}.` });
      setActionApp(null); setActionType(""); t.reload();
    } catch (err) {
      console.error("[Application action error]", err);
      toast({ title: "Error", description: "Could not complete action. Please try again.", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  if (t.loading) return <div className="flex h-96 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-700" /></div>;

  return (
    <div>
      <PageHeader title="My Applications" description="Track your applications and respond to provider requests." />

      {list.length === 0 ? <EmptyState icon={FileText} title="No applications submitted" description="Browse listings to apply for a property." /> : (
        <div className="space-y-3">
          {list.map((a) => (
            <div key={a.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-mono text-xs text-slate-500">{a.application_reference}</p>
                  <p className="font-medium text-slate-900">{a.unit_number || "—"} · {a.property_name}</p>
                  <p className="text-xs text-slate-500">Submitted {a.submitted_date} · {KES(a.monthly_rent)}{a.application_type === "rental" ? "/mo" : ""}</p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={a.application_type} />
                  <StatusBadge status={a.status} />
                </div>
              </div>

              {/* Site visit info */}
              {a.site_visit_status && a.site_visit_status !== "" && (
                <div className="mt-2 rounded-lg border border-blue-200 bg-blue-50 p-2.5 text-sm">
                  <p className="flex items-center gap-1.5 font-medium text-blue-800"><Calendar className="h-3.5 w-3.5" />Site Visit — {a.site_visit_status}</p>
                  <p className="text-blue-700">{a.site_visit_date} {a.site_visit_time && `at ${a.site_visit_time}`}</p>
                  {a.site_visit_notes && <p className="text-xs text-blue-600">{a.site_visit_notes}</p>}
                </div>
              )}

              {/* Agreement info */}
              {a.agreement_url && (
                <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-sm">
                  <p className="flex items-center gap-1.5 font-medium text-amber-800"><FileSignature className="h-3.5 w-3.5" />Agreement — {a.agreement_status || "Issued"}</p>
                  <button type="button" onClick={() => downloadFile(a.agreement_url)} className="inline-flex items-center gap-1 text-amber-700 underline">View agreement <ExternalLink className="h-3 w-3" /></button>
                  {a.agreement_executed_url && <span className="ml-3 text-emerald-700">✓ Executed copy uploaded</span>}
                </div>
              )}

              {/* Payment info */}
              {a.payment_status && a.payment_status !== "" && (
                <div className="mt-2 rounded-lg border border-emerald-200 bg-emerald-50 p-2.5 text-sm">
                  <p className="flex items-center gap-1.5 font-medium text-emerald-800"><Wallet className="h-3.5 w-3.5" />Payment — {a.payment_status}</p>
                  <p className="text-emerald-700">{KES(a.payment_amount)} · Due {a.payment_due_date || "—"}</p>
                  {a.payment_instructions && <p className="text-xs text-emerald-600">{a.payment_instructions}</p>}
                  {a.payment_proof_url && <span className="text-emerald-700">✓ Proof uploaded</span>}
                </div>
              )}

              {a.landlord_response && <div className="mt-2 rounded-lg bg-slate-50 p-2 text-sm text-slate-700"><span className="text-xs font-medium text-slate-500">Provider response: </span>{a.landlord_response}</div>}

              {a.status === "Rejected" && a.landlord_response && (
                <div className="mt-2 rounded-lg border border-rose-200 bg-rose-50 p-2.5 text-sm text-rose-800">
                  <p className="font-medium">Application not accepted</p>
                  <p className="text-rose-700">{a.landlord_response}</p>
                </div>
              )}

              {['Payment Verified','Approved','Completed'].includes(a.status) && <MoveInInspectionPanel app={a} role="tenant" onUpdated={t.reload} />}

              {/* Client actions based on status */}
              <div className="mt-3 flex flex-wrap gap-2">
                {a.status === "More Information Required" && <Button size="sm" variant="outline" className="h-8 border-emerald-200 text-emerald-700 hover:bg-emerald-50" onClick={() => openAction(a, "info")}>Provide Information</Button>}
                <VisitPanel app={a} role="tenant" onUpdated={t.reload} />
                {a.status === "Agreement Issued" && <Button size="sm" variant="outline" className="h-8 border-emerald-200 text-emerald-700 hover:bg-emerald-50" onClick={() => openAction(a, "agreement")}>Upload Executed Agreement</Button>}
                {a.status === "Payment Requested" && <Button size="sm" variant="outline" className="h-8 border-emerald-200 text-emerald-700 hover:bg-emerald-50" onClick={() => setPayApp(a)}>Pay deposit & rent</Button>}
                {a.status === "Completed" && <Link to="/portal/tenancy"><Button size="sm" className="h-8 bg-emerald-600 hover:bg-emerald-700">View Tenancy</Button></Link>}
              </div>
            </div>
          ))}
        </div>
      )}

      {payApp && <ApplicationPayment app={payApp} onClose={() => setPayApp(null)} onDone={t.reload} />}

      <Dialog open={!!actionApp} onOpenChange={(value) => { if (!value && !busy && !uploading) setActionApp(null); }}>
        <DialogContent className="max-w-md">
          {actionApp && (
            <>
              <DialogHeader><DialogTitle>
                {actionType === "info" ? "Provide Information" : actionType === "sitevisit" ? "Propose Site Visit" : actionType === "reschedule" ? "Request Reschedule" : actionType === "agreement" ? "Upload Executed Agreement" : "Submit Payment Proof"}
              </DialogTitle></DialogHeader>
              <div className="space-y-3 py-2">
                {actionType === "info" && (
                  <>
                    <Field label="Your response"><Textarea value={form.info} onChange={(e) => setForm({ ...form, info: e.target.value })} rows={4} placeholder="Provide the requested information..." /></Field>
                    <Field label="Supporting documents (optional)">
                      <FileUploadButton documentContext={{entity:'Application',record_id:actionApp.id,category:actionType === 'agreement' ? 'Lease Agreement' : actionType === 'payment' ? 'Receipt' : 'Other'}} disabled={busy} onBusyChange={setUploading} onUploaded={(file) => setForm(current => ({ ...current, documents: [...current.documents, file.file_uri] }))} label="Upload document" />
                      {form.documents.length > 0 && <p className="text-xs text-emerald-700">{form.documents.length} document(s) attached</p>}
                    </Field>
                  </>
                )}
                {actionType === "sitevisit" && (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      <Field label="Preferred date"><Input type="date" value={form.site_visit_date} onChange={(e) => setForm({ ...form, site_visit_date: e.target.value })} /></Field>
                      <Field label="Preferred time"><Input type="time" value={form.site_visit_time} onChange={(e) => setForm({ ...form, site_visit_time: e.target.value })} /></Field>
                    </div>
                    <p className="text-xs text-slate-500">The provider will confirm or propose an alternative time.</p>
                  </>
                )}
                {actionType === "reschedule" && (
                  <>
                    <p className="text-sm text-slate-600">Current: <span className="font-medium">{actionApp.site_visit_date} {actionApp.site_visit_time && `at ${actionApp.site_visit_time}`}</span></p>
                    <div className="grid grid-cols-2 gap-2">
                      <Field label="New preferred date"><Input type="date" value={form.site_visit_date} onChange={(e) => setForm({ ...form, site_visit_date: e.target.value })} /></Field>
                      <Field label="New preferred time"><Input type="time" value={form.site_visit_time} onChange={(e) => setForm({ ...form, site_visit_time: e.target.value })} /></Field>
                    </div>
                    <p className="text-xs text-slate-500">The provider will confirm the rescheduled time.</p>
                  </>
                )}
                {actionType === "agreement" && (
                  <>
                    {actionApp.agreement_url && <button type="button" onClick={() => downloadFile(actionApp.agreement_url)} className="inline-flex items-center gap-1 text-sm text-amber-700 underline">View original agreement <ExternalLink className="h-3 w-3" /></button>}
                    <Field label="Upload executed (signed) agreement"><FileUploadButton documentContext={{entity:'Application',record_id:actionApp.id,category:actionType === 'agreement' ? 'Lease Agreement' : actionType === 'payment' ? 'Receipt' : 'Other'}} disabled={busy} onUploaded={(file) => setForm((current) => ({ ...current, agreement_executed_url: file?.file_uri || "" }))} onBusyChange={setUploading} label="Upload signed agreement" /></Field>
                  </>
                )}
                {actionType === "payment" && (
                  <>
                    <div className="rounded-lg bg-emerald-50 p-3 text-sm">
                      <p className="font-medium text-emerald-800">Amount: {KES(actionApp.payment_amount)}</p>
                      <p className="text-emerald-700">Due: {actionApp.payment_due_date || "—"}</p>
                      <p className="text-emerald-700">Method: {actionApp.payment_method || "—"}</p>
                      {actionApp.payment_instructions && <p className="mt-1 text-xs text-emerald-600">{actionApp.payment_instructions}</p>}
                    </div>
                    <Field label="Payment reference (optional)"><Input value={form.payment_reference} onChange={(e) => setForm({ ...form, payment_reference: e.target.value })} placeholder="M-Pesa code, bank ref, etc." /></Field>
                    <Field label="Upload payment proof"><FileUploadButton documentContext={{entity:'Application',record_id:actionApp.id,category:actionType === 'agreement' ? 'Lease Agreement' : actionType === 'payment' ? 'Receipt' : 'Other'}} disabled={busy} onBusyChange={setUploading} onUploaded={(file) => setForm(current => ({ ...current, payment_proof_url: file.file_uri }))} label="Upload payment receipt/screenshot" /></Field>
                  </>
                )}
              </div>
              <DialogFooter><Button onClick={submitAction} disabled={busy || uploading || (actionType === "agreement" && !form.agreement_executed_url)} className="bg-emerald-600 hover:bg-emerald-700">{busy ? <><Loader2 className="mr-1.5 h-4 w-4 animate-spin" />Submitting...</> : "Submit"}</Button></DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}