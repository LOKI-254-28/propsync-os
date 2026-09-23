import React, { useMemo, useState } from "react";
import { usePortfolioData } from "@/lib/useAppData";
import { base44 } from "@/api/base44Client";
import { logAudit, todayISO } from "@/lib/finance";
import { PageHeader, SectionCard, StatusBadge, EmptyState, Field } from "@/components/ui-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { FolderOpen, Upload, Download, Plus } from "lucide-react";

const DOC_TYPES = ["Identification", "Tenancy Agreement", "Renewal", "Notice", "Receipt", "Inspection Report", "Maintenance Report", "Application Document", "Other"];

export default function Documents() {
  const data = usePortfolioData();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", document_type: "Other", tenancy_id: "", visibility: "Staff", notes: "" });
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);

  const list = useMemo(() => [...data.documents].sort((a, b) => new Date(b.date_uploaded || b.created_date) - new Date(a.date_uploaded || a.created_date)), [data.documents]);

  const create = async () => {
    if (!form.name) return;
    setBusy(true);
    const me = await base44.auth.me();
    let file_url = "";
    if (file) {
      const { file_url: url } = await base44.integrations.Core.UploadPublicFile({ file });
      file_url = url;
    }
    const tenancy = data.tenancies.find((t) => t.id === form.tenancy_id);
    const rec = await base44.entities.Document.create({
      name: form.name, document_type: form.document_type, file_url,
      tenancy_id: form.tenancy_id, tenant_id: tenancy?.tenant_id, tenant_user_id: tenancy?.tenant_user_id,
      property_id: tenancy?.property_id, unit_id: tenancy?.unit_id,
      visibility: form.visibility, date_uploaded: todayISO(), uploader: me?.email, notes: form.notes,
    });
    await logAudit({ user: me, action: "Document Uploaded", entity: "Document", entity_id: rec.id, entity_name: form.name });
    setBusy(false);
    setOpen(false);
    setForm({ name: "", document_type: "Other", tenancy_id: "", visibility: "Staff", notes: "" });
    setFile(null);
    data.reload();
  };

  if (data.loading) return <div className="flex h-96 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-700" /></div>;

  return (
    <div>
      <PageHeader title="Documents" description="Central document repository linked to tenancies and records." actions={<Button onClick={() => setOpen(true)} className="bg-emerald-600 hover:bg-emerald-700"><Plus className="mr-1.5 h-4 w-4" />Upload Document</Button>} />
      {list.length === 0 ? <EmptyState icon={FolderOpen} title="No documents yet" /> : (
        <SectionCard>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-slate-100 text-left text-xs uppercase text-slate-500"><th className="pb-2 font-medium">Name</th><th className="pb-2 font-medium">Type</th><th className="pb-2 font-medium">Tenant</th><th className="pb-2 font-medium">Uploaded</th><th className="pb-2 font-medium">Visibility</th><th className="pb-2"></th></tr></thead>
              <tbody>
                {list.map((d) => (
                  <tr key={d.id} className="border-b border-slate-50">
                    <td className="py-2.5 font-medium text-slate-800">{d.name}</td>
                    <td className="py-2.5 text-slate-600">{d.document_type}</td>
                    <td className="py-2.5 text-slate-600">{data.tenancies.find((t) => t.id === d.tenancy_id)?.tenant_name || "—"}</td>
                    <td className="py-2.5 text-slate-600">{d.date_uploaded}</td>
                    <td className="py-2.5"><StatusBadge status={d.visibility} /></td>
                    <td className="py-2.5 text-right">{d.file_url && <a href={d.file_url} target="_blank" rel="noreferrer" className="text-emerald-700 hover:text-emerald-800"><Download className="h-4 w-4" /></a>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Upload Document</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <Field label="Document name"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
            <Field label="Type"><select value={form.document_type} onChange={(e) => setForm({ ...form, document_type: e.target.value })} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">{DOC_TYPES.map((t) => <option key={t}>{t}</option>)}</select></Field>
            <Field label="Linked tenancy"><select value={form.tenancy_id} onChange={(e) => setForm({ ...form, tenancy_id: e.target.value })} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"><option value="">—</option>{data.tenancies.map((t) => <option key={t.id} value={t.id}>{t.tenancy_reference} — {t.tenant_name}</option>)}</select></Field>
            <Field label="Visibility"><select value={form.visibility} onChange={(e) => setForm({ ...form, visibility: e.target.value })} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">{["Private", "Tenant", "Staff", "Public"].map((v) => <option key={v}>{v}</option>)}</select></Field>
            <Field label="File"><input type="file" onChange={(e) => setFile(e.target.files?.[0])} className="text-sm" /></Field>
            <Field label="Notes"><Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
          </div>
          <DialogFooter><Button onClick={create} disabled={busy} className="bg-emerald-600 hover:bg-emerald-700">{busy ? "Uploading..." : "Upload"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}