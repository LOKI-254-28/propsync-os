import React, { useMemo, useState } from "react";
import { usePortfolioData } from "@/lib/useAppData";
import { base44 } from "@/api/base44Client";
import { logAudit, notify, todayISO } from "@/lib/finance";
import { secureCreate } from "@/lib/secureCreate";
import { PageHeader, SectionCard, StatusBadge, EmptyState, Field } from "@/components/ui-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { FileUploadButton } from "@/components/FileUploadButton";
import { FolderOpen, Plus, Trash2, CheckCircle2, XCircle, Search, Eye } from "lucide-react";
import { openDocument } from '@/lib/openDocument';

const CATEGORIES = ["Lease Agreement", "ID/Passport", "KRA PIN", "Proof of Income", "Employer Letter", "Receipt", "Inspection Report", "Insurance/Compliance Certificate", "Title Deed", "Other"];
const STATUSES = ["pending", "verified", "rejected"];

export default function Documents() {
  const data = usePortfolioData();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", category: "Other", target_type: "tenancy", target_id: "", visibility: "staff_only", notes: "", expiry_date: "" });
  const [uploaded, setUploaded] = useState(null);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState("");
  const [search, setSearch] = useState("");
  const [fCat, setFCat] = useState("");
  const [fStatus, setFStatus] = useState("");
  const [review, setReview] = useState(null);
  const [reviewNote, setReviewNote] = useState("");

  const list = useMemo(() => {
    let l = [...data.documents].sort((a, b) => new Date(b.date_uploaded || b.created_date) - new Date(a.date_uploaded || a.created_date));
    if (search) l = l.filter((d) => d.title?.toLowerCase().includes(search.toLowerCase()) || d.file_name?.toLowerCase().includes(search.toLowerCase()));
    if (fCat) l = l.filter((d) => d.category === fCat);
    if (fStatus) l = l.filter((d) => d.status === fStatus);
    return l;
  }, [data.documents, search, fCat, fStatus]);

  const targetLabel = (d) => {
    if (d.tenancy_id) return data.tenancies.find((t) => t.id === d.tenancy_id)?.tenant_name || "—";
    if (d.tenant_id) return data.tenants.find((t) => t.id === d.tenant_id)?.full_name || "—";
    if (d.unit_id) return data.units.find((u) => u.id === d.unit_id)?.unit_number || "—";
    if (d.property_id) return data.properties.find((p) => p.id === d.property_id)?.name || "—";
    return "—";
  };

  const create = async () => {
    if (!form.title) { setErr("Title is required."); return; }
    if (!uploaded) { setErr("Please select a file to upload."); return; }
    setErr("");
    setBusy(true);
    try {
      const me = await base44.auth.me();
      let tenant_id = "", tenant_user_id = "", tenancy_id = "", property_id = "", unit_id = "";
      if (form.target_type === "tenancy") {
        const t = data.tenancies.find((t) => t.id === form.target_id);
        tenant_id = t?.tenant_id || ""; tenant_user_id = t?.tenant_user_id || ""; tenancy_id = t?.id || "";
        property_id = t?.property_id || ""; unit_id = t?.unit_id || "";
      } else if (form.target_type === "tenant") {
        const t = data.tenants.find((t) => t.id === form.target_id);
        tenant_id = t?.id || ""; tenant_user_id = t?.user_id || "";
        const ten = data.tenancies.find((x) => x.tenant_id === t?.id && ["Active", "Expiring Soon", "Notice Given"].includes(x.status));
        tenancy_id = ten?.id || ""; property_id = ten?.property_id || ""; unit_id = ten?.unit_id || "";
      } else if (form.target_type === "unit") {
        const u = data.units.find((u) => u.id === form.target_id);
        unit_id = u?.id || ""; property_id = u?.property_id || "";
      } else if (form.target_type === "property") {
        property_id = data.properties.find((p) => p.id === form.target_id)?.id || "";
      }
      const rec = await secureCreate("Document", {
        title: form.title, category: form.category,
        file_uri: uploaded.file_uri, file_name: uploaded.file_name, mime_type: uploaded.mime_type, size: uploaded.size,
        tenant_id, tenant_user_id, tenancy_id, property_id, unit_id,
        uploaded_by: me?.email, uploaded_by_role: "staff",
        visibility: form.visibility, status: "verified",
        date_uploaded: todayISO(), notes: form.notes, expiry_date: form.expiry_date || "",
      });
      if (form.visibility === "tenant_visible" && tenant_user_id) {
        await notify({ recipient_user_id: tenant_user_id, type: "document_shared", title: "New document shared with you", message: `"${form.title}" (${form.category}) is now available in your documents.`, related_entity: "Document", related_id: rec.id });
      }
      setOpen(false);
      setForm({ title: "", category: "Other", target_type: "tenancy", target_id: "", visibility: "staff_only", notes: "", expiry_date: "" });
      setUploaded(null);
      data.reload();
    } catch (e) {
      setErr(e.message || "Failed to upload document.");
    } finally {
      setBusy(false);
    }
  };

  const viewDoc = async (d) => {
    try {
      await openDocument(d.id);
    } catch (e) {
      alert("Could not open document: " + (e.message || "error"));
    }
  };

  const doReview = async (status) => {
    if (!review) return;
    try {
      const me = await base44.auth.me();
      await base44.functions.invoke('documentOps', { action: 'review', document_id: review.id, status, review_note: reviewNote });
      await logAudit({ user: me, action: status === "verified" ? "Document Verified" : "Document Rejected", entity: "Document", entity_id: review.id, entity_name: review.title });

      setReview(null);
      setReviewNote("");
      data.reload();
    } catch (e) {
      alert("Failed: " + (e.message || "error"));
    }
  };

  const del = async (d) => {
    if (!confirm(`Delete "${d.title}"? This cannot be undone.`)) return;
    try {
      const me = await base44.auth.me();
      await base44.functions.invoke('documentOps', { action: 'staff_delete', document_id: d.id });
      await logAudit({ user: me, action: "Document Deleted", entity: "Document", entity_id: d.id, entity_name: d.title });
      data.reload();
    } catch (e) {
      alert("Failed: " + (e.message || "error"));
    }
  };

  if (data.loading) return <div className="flex h-96 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-700" /></div>;

  return (
    <div>
      <PageHeader title="Documents" description="Central repository with access-controlled private storage." actions={<Button onClick={() => setOpen(true)} className="bg-emerald-600 hover:bg-emerald-700"><Plus className="mr-1.5 h-4 w-4" />Upload Document</Button>} />

      <div className="mb-4 flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search documents..." className="pl-9" />
        </div>
        <select value={fCat} onChange={(e) => setFCat(e.target.value)} className="rounded-md border border-input bg-background px-3 py-2 text-sm">
          <option value="">All categories</option>
          {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
        </select>
        <select value={fStatus} onChange={(e) => setFStatus(e.target.value)} className="rounded-md border border-input bg-background px-3 py-2 text-sm">
          <option value="">All statuses</option>
          {STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>

      {list.length === 0 ? <EmptyState icon={FolderOpen} title="No documents yet" description="Upload lease agreements, IDs, receipts and more." /> : (
        <SectionCard>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-slate-100 text-left text-xs uppercase text-slate-500">
                <th className="pb-2 font-medium">Title</th><th className="pb-2 font-medium">Category</th><th className="pb-2 font-medium">Linked to</th><th className="pb-2 font-medium">Uploaded by</th><th className="pb-2 font-medium">Visibility</th><th className="pb-2 font-medium">Status</th><th className="pb-2 font-medium text-right">Actions</th>
              </tr></thead>
              <tbody>
                {list.map((d) => (
                  <tr key={d.id} className="border-b border-slate-50">
                    <td className="py-2.5 font-medium text-slate-800">{d.title}<p className="text-xs text-slate-400 font-normal">{d.file_name}</p></td>
                    <td className="py-2.5 text-slate-600">{d.category}</td>
                    <td className="py-2.5 text-slate-600">{targetLabel(d)}</td>
                    <td className="py-2.5 text-slate-600">{d.uploaded_by_role === "tenant" ? "Tenant" : "Staff"}</td>
                    <td className="py-2.5"><StatusBadge status={d.visibility} /></td>
                    <td className="py-2.5"><StatusBadge status={d.status} /></td>
                    <td className="py-2.5 text-right">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => viewDoc(d)} className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-emerald-700" title="View"><Eye className="h-4 w-4" /></button>
                        {d.status === "pending" && <button onClick={() => { setReview(d); setReviewNote(d.review_note || ""); }} className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-emerald-700" title="Review"><CheckCircle2 className="h-4 w-4" /></button>}
                        <button onClick={() => del(d)} className="rounded p-1.5 text-slate-500 hover:bg-rose-50 hover:text-rose-600" title="Delete"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}

      <Dialog open={open} onOpenChange={value => !busy && !uploading && setOpen(value)}>
        <DialogContent className="max-w-md max-h-[90dvh] overflow-y-auto">
          <DialogHeader><DialogTitle>Upload Document</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <Field label="Title"><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Lease Agreement — Unit 4A" /></Field>
            <Field label="Category">
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select>
            </Field>
            <Field label="Link to">
              <div className="flex gap-2">
                <select value={form.target_type} onChange={(e) => setForm({ ...form, target_type: e.target.value, target_id: "" })} className="rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="tenancy">Tenancy</option><option value="tenant">Tenant</option><option value="unit">Unit</option><option value="property">Property</option>
                </select>
                <select value={form.target_id} onChange={(e) => setForm({ ...form, target_id: e.target.value })} className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="">—</option>
                  {form.target_type === "tenancy" && data.tenancies.map((t) => <option key={t.id} value={t.id}>{t.tenancy_reference} — {t.tenant_name}</option>)}
                  {form.target_type === "tenant" && data.tenants.map((t) => <option key={t.id} value={t.id}>{t.full_name}</option>)}
                  {form.target_type === "unit" && data.units.map((u) => <option key={u.id} value={u.id}>{u.unit_number} — {u.property_name}</option>)}
                  {form.target_type === "property" && data.properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
            </Field>
            <Field label="Visibility">
              <select value={form.visibility} onChange={(e) => setForm({ ...form, visibility: e.target.value })} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="staff_only">Staff only</option><option value="tenant_visible">Tenant visible</option>
              </select>
            </Field>
            <Field label="Expiry date (optional)"><Input type="date" value={form.expiry_date} onChange={(e) => setForm({ ...form, expiry_date: e.target.value })} /></Field>
            <Field label="File (PDF, JPG, PNG — max 10 MB)"><FileUploadButton onUploaded={setUploaded} onBusyChange={setUploading} label="Choose file" /></Field>
            <Field label="Notes"><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} /></Field>
            {err && <p className="text-sm text-red-600">{err}</p>}
          </div>
          <DialogFooter><Button onClick={create} disabled={busy || uploading || !uploaded} className="bg-emerald-600 hover:bg-emerald-700">{busy ? "Saving..." : "Upload"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!review} onOpenChange={() => setReview(null)}>
        <DialogContent className="max-w-md max-h-[90dvh] overflow-y-auto">
          {review && (
            <>
              <DialogHeader><DialogTitle>Review: {review.title}</DialogTitle></DialogHeader>
              <div className="space-y-3 py-2">
                <div className="rounded-lg bg-slate-50 p-3 text-sm">
                  <p className="font-medium text-slate-800">{review.title}</p>
                  <p className="text-xs text-slate-500">{review.category} · uploaded by {review.uploaded_by_role}</p>
                </div>
                <Field label="Review note (optional)"><Textarea value={reviewNote} onChange={(e) => setReviewNote(e.target.value)} rows={3} placeholder="Add a note for the tenant..." /></Field>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => doReview("rejected")} className="border-rose-300 text-rose-600 hover:bg-rose-50"><XCircle className="h-4 w-4" />Reject</Button>
                <Button onClick={() => doReview("verified")} className="bg-emerald-600 hover:bg-emerald-700"><CheckCircle2 className="h-4 w-4" />Verify</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}