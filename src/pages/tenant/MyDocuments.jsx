import React, { useMemo, useState } from "react";
import useTenantIdentity from '@/hooks/useTenantIdentity';
import useActiveTenantTenancy from '@/hooks/useActiveTenantTenancy';
import useFunctionPage from '@/hooks/useFunctionPage';
import useDebouncedValue from '@/hooks/useDebouncedValue';
import RecordPageControls from '@/components/account/RecordPageControls';
import { base44 } from "@/api/base44Client";
import { PageHeader, SectionCard, StatusBadge, EmptyState, Field } from "@/components/ui-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { FileUploadButton } from "@/components/FileUploadButton";
import { FolderOpen, Trash2, Eye, Plus } from "lucide-react";
import { openDocument } from '@/lib/openDocument';

const TENANT_CATEGORIES = ["ID/Passport", "KRA PIN", "Proof of Income", "Employer Letter", "Other"];

export default function MyDocuments() {
  const t=useTenantIdentity(),[search,setSearch]=useState('');
  const page=useFunctionPage('documentOps',{action:'list',search:useDebouncedValue(search)},'Document','documents',!t.loading);
  const tenancy=useActiveTenantTenancy(!t.loading);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", category: "ID/Passport" });
  const [uploaded, setUploaded] = useState(null);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState("");

  const list=page.items;

  if (t.loading) return <div className="flex h-96 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-700" /></div>;

  const submit = async () => {
    if (!form.title) { setErr("Title is required."); return; }
    if (!uploaded) { setErr("Please select a file to upload."); return; }
    setErr("");
    setBusy(true);
    try {
      if(tenancy.error)throw tenancy.error;
      if(tenancy.isPending)throw new Error('Please wait for your tenancy details to load.');
      const res = await base44.functions.invoke("documentOps", {
        action: "tenant_upload",
        file_uri: uploaded.file_uri, file_name: uploaded.file_name, mime_type: uploaded.mime_type, size: uploaded.size,
        title: form.title, category: form.category, tenancy_id: tenancy.data?.id || "",
      });
      if (res.data?.error) throw new Error(res.data.error);
      setOpen(false);
      setForm({ title: "", category: "ID/Passport" });
      setUploaded(null);
      page.refetch();
    } catch (e) {
      setErr(e.response?.data?.error || e.message || "Failed to upload.");
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

  const del = async (d) => {
    if (d.uploaded_by_role !== "tenant" || d.status !== "pending") return;
    if (!confirm(`Delete "${d.title}"?`)) return;
    try {
      await base44.functions.invoke("documentOps", { action: "tenant_delete", document_id: d.id });
      page.refetch();
    } catch (e) {
      alert("Failed: " + (e.message || "error"));
    }
  };

  return (
    <div>
      <PageHeader title="Documents" description="Your tenancy documents and uploads." actions={<Button onClick={() => setOpen(true)} className="bg-emerald-600 hover:bg-emerald-700"><Plus className="mr-1.5 h-4 w-4" />Upload Document</Button>} />
      <RecordPageControls page={{...page,search,setSearch,error:t.error||page.error,refetch:t.error?t.refetch:page.refetch}} search placeholder="Search documents…"/>
      {page.isPending?<p className="py-6 text-sm text-muted-foreground">Loading documents…</p>:list.length === 0 ? <EmptyState icon={FolderOpen} title="No documents" description="Documents shared by your landlord and your own uploads will appear here." /> : (
        <SectionCard>
          <div className="space-y-2">
            {list.map((d) => (
              <div key={d.id} className="flex items-center justify-between rounded-lg border border-slate-100 px-4 py-3">
                <div>
                  <p className="font-medium text-slate-900">{d.title}</p>
                  <p className="text-xs text-slate-500">{d.category} · {d.date_uploaded}{d.uploaded_by_role === "tenant" ? " · Uploaded by you" : " · Shared by landlord"}</p>
                  {d.status === "rejected" && d.review_note && <p className="mt-1 text-xs text-rose-600">Rejected: {d.review_note}</p>}
                  {d.status === "verified" && d.review_note && <p className="mt-1 text-xs text-emerald-600">Verified: {d.review_note}</p>}
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={d.status} />
                  <button onClick={() => viewDoc(d)} className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-emerald-700" title="View"><Eye className="h-4 w-4" /></button>
                  {d.uploaded_by_role === "tenant" && d.status === "pending" && !d.linked && !d.source_entities?.length && (
                    <button onClick={() => del(d)} className="rounded p-1.5 text-slate-500 hover:bg-rose-50 hover:text-rose-600" title="Delete"><Trash2 className="h-4 w-4" /></button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      <RecordPageControls page={page}/>
      <Dialog open={open} onOpenChange={value => !busy && !uploading && setOpen(value)}>
        <DialogContent className="max-w-md max-h-[90dvh] overflow-y-auto">
          <DialogHeader><DialogTitle>Upload Document</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-xs text-slate-500">Upload a document for your landlord to review. Allowed: PDF, JPG, PNG (max 10 MB).</p>
            <Field label="Title"><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. My KRA PIN Certificate" /></Field>
            <Field label="Category">
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">{TENANT_CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select>
            </Field>
            <Field label="File"><FileUploadButton disabled={busy} onUploaded={setUploaded} onBusyChange={setUploading} label="Choose file" /></Field>
            {err && <p className="text-sm text-red-600">{err}</p>}
            {tenancy.error&&<p role="alert" className="text-sm text-destructive">Could not load your tenancy. <button className="underline" onClick={()=>tenancy.refetch()}>Try again</button></p>}
          </div>
          <DialogFooter><Button onClick={submit} disabled={busy || uploading || !uploaded || tenancy.isPending || !!tenancy.error} className="bg-emerald-600 hover:bg-emerald-700">{busy ? "Uploading..." : "Submit for Review"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}