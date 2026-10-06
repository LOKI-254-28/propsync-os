import React, { useState, useMemo } from "react";
import { usePortfolioData } from "@/lib/useAppData";
import { base44 } from "@/api/base44Client";
import { KES, genRef, logAudit, notify, todayISO } from "@/lib/finance";
import { secureCreate } from "@/lib/secureCreate";
import { PageHeader, SectionCard, StatusBadge, EmptyState, Field } from "@/components/ui-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { FileText, Check, X, MessageSquare, Search, Calendar, FileSignature, Wallet, Loader2 } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { downloadFile } from "@/lib/files";
import VisitPanel from "@/components/applications/VisitPanel";
import ProceedPanel from "@/components/applications/ProceedPanel";
import { patchApplication, completeApplication } from '@/lib/applicationActions';
import MoveInInspectionPanel from '@/components/inspections/MoveInInspectionPanel';

const STATUSES = ["Submitted", "Under Review", "More Information Required", "Information Provided", "Site Visit Requested", "Site Visit Scheduled", "Site Visit Completed", "Agreement Issued", "Agreement Executed", "Payment Requested", "Payment Proof Submitted", "Payment Verified", "Approved", "Completed", "Rejected", "Withdrawn", "Cancelled", "Expired"];

export default function Applications() {
  const data = usePortfolioData();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("");
  const [review, setReview] = useState(null);
  const [response, setResponse] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [inspectionApproved, setInspectionApproved] = useState(false);
  const [workflow, setWorkflow] = useState({ site_visit_date: "", site_visit_time: "", site_visit_notes: "", agreement_url: "", payment_amount: 0, payment_due_date: "", payment_method: "M-Pesa", payment_instructions: "" });

  const list = useMemo(() => data.applications
    .filter((a) => !filter || a.status === filter)
    .filter((a) => !search || a.applicant_name?.toLowerCase().includes(search.toLowerCase()) || a.unit_number?.toLowerCase().includes(search.toLowerCase()) || a.application_reference?.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => new Date(b.submitted_date || b.created_date) - new Date(a.submitted_date || a.created_date)), [data.applications, search, filter]);

  const openReview = (a) => {
    setReview(a);
    setInspectionApproved(data.inspections.find(i=>i.id === a.inspection_id)?.tenant_approval_status === 'Approved');
    setResponse(a.landlord_response || "");
    setWorkflow({ site_visit_date: a.site_visit_date || "", site_visit_time: a.site_visit_time || "", site_visit_notes: a.site_visit_notes || "", agreement_url: a.agreement_url || "", payment_amount: a.payment_amount || a.monthly_rent || 0, payment_due_date: a.payment_due_date || "", payment_method: a.payment_method || "M-Pesa", payment_instructions: a.payment_instructions || "" });
  };

  const patch = async (updates, actionLabel, notifyClient = true) => {
    if (!review) return;
    setBusy(true);
    try {
      const me = await base44.auth.me();
      await patchApplication(review.id, updates);
      await logAudit({ user: me, action: `Application ${actionLabel}`, entity: "Application", entity_id: review.id, entity_name: review.application_reference, new_value: updates });
      if (notifyClient && review.tenant_user_id) await notify({ recipient_user_id: review.tenant_user_id, type: "Application", title: `Application ${actionLabel}`, message: `Your application for ${review.unit_number} has been updated: ${actionLabel}.`, related_entity: "Application", related_id: review.id, action_link: "/portal/applications" });
      toast({ title: "Success", description: `Application ${actionLabel.toLowerCase()}.` });
      setReview(null); setResponse(""); data.reload();
    } catch (err) {
      console.error("[Application workflow error]", err);
      toast({ title: "Error", description: `Could not ${actionLabel.toLowerCase()}. Please try again.`, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const reject = async () => {
    if (!review) return;
    setBusy(true);
    try {
      const me = await base44.auth.me();
      await patchApplication(review.id, { status: "Rejected", landlord_response: response });
      const unit = data.units.find((u) => u.id === review.unit_id);
      if (unit && unit.status === "Application Pending") await base44.entities.Unit.update(unit.id, { status: "Available" });
      if (review.listing_id) {
        const listing = data.listings?.find((l) => l.id === review.listing_id);
        if (listing && listing.status === "Under Application") await base44.entities.Listing.update(review.listing_id, { status: "Published" });
      }
      await logAudit({ user: me, action: "Application Rejected", entity: "Application", entity_id: review.id, entity_name: review.application_reference });
      if (review.tenant_user_id) await notify({ recipient_user_id: review.tenant_user_id, type: "Application", title: "Application Rejected", message: `Your application for ${review.unit_number} has been rejected.`, related_entity: "Application", related_id: review.id, action_link: "/portal/applications" });
      toast({ title: "Success", description: "Application rejected." });
      setReview(null); setResponse(""); data.reload();
    } catch (err) {
      console.error("[Application reject error]", err);
      toast({ title: "Error", description: "Could not reject application. Please try again.", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const approveAndComplete = async () => {
    if (!review) return;
    setBusy(true);
    try {
      await completeApplication(review.id, response || 'Application approved and completed.');
      toast({ title: "Success", description: "Application approved and completed." });
      setReview(null); setResponse(""); data.reload();
    } catch (err) {
      console.error("[Application approve error]", err);
      toast({ title: "Error", description: err.message || "Could not approve application. Please try again.", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  if (data.loading) return <div className="flex h-96 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-700" /></div>;

  const s = review?.status || "";
  const appTypeLabel = "Rental";

  return (
    <div>
      <PageHeader title="Applications" description="Review applications and guide them through the full approval workflow." />

      <div className="mb-4 flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search applications..." className="pl-9" />
        </div>
        <select value={filter} onChange={(e) => setFilter(e.target.value)} className="rounded-md border border-input bg-background px-3 py-2 text-sm">
          <option value="">All statuses</option>
          {STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>

      {list.length === 0 ? <EmptyState icon={FileText} title="No applications" /> : (
        <SectionCard>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-slate-100 text-left text-xs uppercase text-slate-500">
                <th className="pb-2 font-medium">Reference</th><th className="pb-2 font-medium">Applicant</th><th className="pb-2 font-medium">Type</th><th className="pb-2 font-medium">Unit</th><th className="pb-2 font-medium">Property</th><th className="pb-2 text-right font-medium">Amount</th><th className="pb-2 text-right font-medium">Status</th><th className="pb-2"></th>
              </tr></thead>
              <tbody>
                {list.map((a) => (
                  <tr key={a.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                    <td className="py-2.5 font-mono text-xs text-slate-600">{a.application_reference}</td>
                    <td className="py-2.5 font-medium text-slate-800">{a.applicant_name}</td>
                    <td className="py-2.5"><StatusBadge status={a.application_type} /></td>
                    <td className="py-2.5 text-slate-600">{a.unit_number || "—"}</td>
                    <td className="py-2.5 text-slate-600">{a.property_name}</td>
                    <td className="py-2.5 text-right text-slate-900">{KES(a.monthly_rent)}</td>
                    <td className="py-2.5 text-right"><StatusBadge status={a.status} /></td>
                    <td className="py-2.5 text-right"><Button size="sm" variant="outline" onClick={() => openReview(a)} className="h-7 text-xs">Review</Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}

      <Dialog open={!!review} onOpenChange={(value) => { if (!value && !uploading && !busy) setReview(null); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {review && (
            <>
              <DialogHeader><DialogTitle>Application — {review.applicant_name}</DialogTitle></DialogHeader>
              <div className="flex items-center gap-2">
                <StatusBadge status={review.application_type} />
                <StatusBadge status={review.status} />
              </div>
              <div className="grid grid-cols-2 gap-3 py-2 text-sm sm:grid-cols-3">
                <Info label="Reference" value={review.application_reference} />
                <Info label="Submitted" value={review.submitted_date} />
                <Info label="Email" value={review.applicant_email} />
                <Info label="Phone" value={review.applicant_phone} />
                <Info label="ID Number" value={review.id_number || "—"} />
                <Info label="Occupation" value={review.occupation || "—"} />
                <Info label="Income" value={review.monthly_income ? KES(review.monthly_income) : "—"} />
                <Info label="Unit" value={`${review.unit_number || "—"} · ${review.property_name}`} />
                <Info label="Start date" value={review.proposed_start_date || "—"} />
              </div>
              {review.message && <div className="mt-2 rounded-lg bg-slate-50 p-3 text-sm text-slate-700"><span className="text-xs font-medium text-slate-500">Applicant message</span><p className="mt-1">{review.message}</p></div>}

              {/* Site visit info */}
              {review.site_visit_status && review.site_visit_status !== "" && (
                <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50 p-3">
                  <p className="mb-1 flex items-center gap-1.5 text-xs font-medium text-blue-800"><Calendar className="h-3.5 w-3.5" />Site Visit — {review.site_visit_status}</p>
                  <p className="text-sm text-blue-700">{review.site_visit_date} {review.site_visit_time && `at ${review.site_visit_time}`}</p>
                  {review.site_visit_notes && <p className="mt-1 text-xs text-blue-600">{review.site_visit_notes}</p>}
                </div>
              )}

              {/* Agreement info */}
              {review.agreement_status && review.agreement_status !== "" && (
                <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
                  <p className="mb-1 flex items-center gap-1.5 text-xs font-medium text-amber-800"><FileSignature className="h-3.5 w-3.5" />Agreement — {review.agreement_status}</p>
                  {review.agreement_url && <button type="button" onClick={() => downloadFile(review.agreement_url)} className="text-sm text-amber-700 underline">View agreement</button>}
                  {review.agreement_executed_url && <button type="button" onClick={() => downloadFile(review.agreement_executed_url)} className="ml-3 text-sm text-emerald-700 underline">View executed copy</button>}
                </div>
              )}

              {/* Payment info */}
              {review.payment_status && review.payment_status !== "" && (
                <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                  <p className="mb-1 flex items-center gap-1.5 text-xs font-medium text-emerald-800"><Wallet className="h-3.5 w-3.5" />Payment — {review.payment_status}</p>
                  <p className="text-sm text-emerald-700">{KES(review.payment_amount)} · Due {review.payment_due_date || "—"}</p>
                  {review.payment_proof_url && <button type="button" onClick={() => downloadFile(review.payment_proof_url)} className="mt-1 inline-block text-xs text-emerald-600 underline">View payment proof</button>}
                </div>
              )}

              <Field label="Landlord response"><Textarea value={response} onChange={(e) => setResponse(e.target.value)} rows={2} placeholder="Message to applicant..." /></Field>

              {['Payment Verified','Approved','Completed'].includes(s) && <MoveInInspectionPanel app={review} role="landlord" onBusyChange={setUploading} onApprovalChange={setInspectionApproved} onUpdated={() => {setReview(null);data.reload();}} />}

              {/* Workflow actions based on status */}
              <div className="mt-2 space-y-3 border-t border-slate-100 pt-3">
                <fieldset disabled={uploading}>
                  <VisitPanel app={review} role="landlord" onUpdated={() => { setReview(null); data.reload(); }} />
                </fieldset>
                <ProceedPanel app={review} onBusyChange={setUploading} onUpdated={() => { setReview(null); data.reload(); }} />

                {["Submitted", "Pending"].includes(s) && !review.visit_skipped && (
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={() => patch({ status: "Under Review" }, "Marked Under Review")} disabled={busy} variant="outline"><MessageSquare className="mr-1.5 h-4 w-4" />Mark Under Review</Button>
                    <Button onClick={reject} disabled={busy} variant="outline" className="border-rose-200 text-rose-700 hover:bg-rose-50"><X className="mr-1.5 h-4 w-4" />Reject</Button>
                  </div>
                )}

                {s === "Under Review" && (
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-2">
                      <Button onClick={() => patch({ status: "More Information Required", landlord_response: response || "Please provide additional information." }, "Information Requested")} disabled={busy} variant="outline"><MessageSquare className="mr-1.5 h-4 w-4" />Request More Info</Button>
                      <Button onClick={() => patch({ status: "Site Visit Requested", site_visit_status: "Requested" }, "Site Visit Requested")} disabled={busy} variant="outline"><Calendar className="mr-1.5 h-4 w-4" />Request Site Visit</Button>
                      <Button onClick={reject} disabled={busy} variant="outline" className="border-rose-200 text-rose-700 hover:bg-rose-50"><X className="mr-1.5 h-4 w-4" />Reject</Button>
                    </div>
                  </div>
                )}

                {["Information Provided"].includes(s) && (
                  <div className="space-y-3">

                    <div className="flex flex-wrap gap-2">
                      <Button onClick={() => patch({status:'Under Review'},'Marked Under Review')} disabled={busy} variant="outline">Continue Review</Button>
                      <Button onClick={reject} disabled={busy} variant="outline" className="border-rose-200 text-rose-700 hover:bg-rose-50"><X className="mr-1.5 h-4 w-4" />Reject</Button>
                    </div>
                  </div>
                )}

                {s === "Agreement Issued" && (
                  <div className="rounded-lg bg-blue-50 p-3 text-sm text-blue-700">Waiting for client to review and upload the executed agreement.</div>
                )}

                {s === "Agreement Executed" && (
                  <div className="space-y-3">
                    <div className="rounded-lg border border-slate-200 p-3">
                      <p className="mb-2 text-xs font-medium uppercase text-slate-500">Request Payment</p>
                      <div className="grid grid-cols-2 gap-2">
                        <Field label="Amount"><Input type="number" value={workflow.payment_amount} onChange={(e) => setWorkflow({ ...workflow, payment_amount: Number(e.target.value) })} /></Field>
                        <Field label="Due date"><Input type="date" value={workflow.payment_due_date} onChange={(e) => setWorkflow({ ...workflow, payment_due_date: e.target.value })} /></Field>
                      </div>
                      <Field label="Payment method"><Input value={workflow.payment_method} onChange={(e) => setWorkflow({ ...workflow, payment_method: e.target.value })} /></Field>
                      <Field label="Instructions"><Textarea value={workflow.payment_instructions} onChange={(e) => setWorkflow({ ...workflow, payment_instructions: e.target.value })} rows={2} /></Field>
                      <Button onClick={() => patch({ status: "Payment Requested", payment_amount: workflow.payment_amount, payment_due_date: workflow.payment_due_date, payment_method: workflow.payment_method, payment_instructions: workflow.payment_instructions, payment_status: "Requested" }, "Payment Requested")} disabled={busy || !workflow.payment_amount} className="mt-2 bg-emerald-600 hover:bg-emerald-700"><Wallet className="mr-1.5 h-4 w-4" />Request Payment</Button>
                    </div>
                  </div>
                )}

                {s === "Payment Requested" && (
                  <div className="rounded-lg bg-blue-50 p-3 text-sm text-blue-700">Waiting for client to submit payment proof.</div>
                )}

                {s === "Payment Proof Submitted" && (
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={() => patch({ status: "Payment Verified", payment_status: "Verified" }, "Payment Verified")} disabled={busy} className="bg-emerald-600 hover:bg-emerald-700"><Check className="mr-1.5 h-4 w-4" />Verify Payment</Button>
                    <Button onClick={() => patch({ status: "Payment Requested", payment_status: "Rejected", landlord_response: response || "Payment proof rejected. Please resubmit." }, "Payment Rejected")} disabled={busy} variant="outline" className="border-rose-200 text-rose-700 hover:bg-rose-50"><X className="mr-1.5 h-4 w-4" />Reject Proof</Button>
                  </div>
                )}

                {s === "Payment Verified" && (
                  <Button onClick={approveAndComplete} disabled={busy || uploading || !inspectionApproved} className="bg-emerald-600 hover:bg-emerald-700"><Check className="mr-1.5 h-4 w-4" />Approve & Start Tenancy</Button>
                )}

                {s === "Approved" && (
                  <Button onClick={approveAndComplete} disabled={busy || uploading || !inspectionApproved} className="bg-emerald-600 hover:bg-emerald-700"><Check className="mr-1.5 h-4 w-4" />Approve & Start Tenancy</Button>
                )}

                {(s === "Completed") && <div className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">This application has been completed.</div>}
                {(s === "Rejected" || s === "Withdrawn" || s === "Cancelled" || s === "Expired") && <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">This application is {s.toLowerCase()}.</div>}
              </div>

              {busy && <div className="mt-2 flex items-center gap-2 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" />Processing...</div>}
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