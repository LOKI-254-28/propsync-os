import React, { useState, useMemo } from "react";
import { usePortfolioData } from "@/lib/useAppData";
import { base44 } from "@/api/base44Client";
import { genRef, notify, todayISO } from "@/lib/finance";
import { secureCreate } from "@/lib/secureCreate";
import { PageHeader, SectionCard, StatusBadge, EmptyState, Field } from "@/components/ui-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Bell, Plus, Search } from "lucide-react";

const TYPES = ["Rent Reminder", "Arrears Notice", "Breach Notice", "Rent Increase", "Inspection Notice", "Vacation Acknowledgement", "Termination Notice", "General Notice"];

export default function Notices() {
  const data = usePortfolioData();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ type: "General Notice", tenancy_id: "", subject: "", content: "", channel: "In-app" });
  const [busy, setBusy] = useState(false);
  const [error,setError]=useState('');

  const list = useMemo(() => data.notices
    .filter((n) => !search || n.subject?.toLowerCase().includes(search.toLowerCase()) || n.tenant_name?.toLowerCase().includes(search.toLowerCase()) || n.notice_reference?.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => new Date(b.date_issued || b.created_date) - new Date(a.date_issued || a.created_date)), [data.notices, search]);

  const create = async () => {
    if (!form.subject) return;
    setBusy(true);setError('');
    try {
    const me = await base44.auth.me();
    const tenancy = data.tenancies.find((t) => t.id === form.tenancy_id);
    const ref = genRef("NOT");
    const rec = await secureCreate("Notice", {
      notice_reference: ref, type: form.type, date_issued: todayISO(), sender: me?.email || "Landlord",
      property_id: tenancy?.property_id, property_name: tenancy?.property_name, unit_id: tenancy?.unit_id, unit_number: tenancy?.unit_number,
      tenant_id: tenancy?.tenant_id, tenant_user_id: tenancy?.tenant_user_id, tenant_name: tenancy?.tenant_name, tenancy_id: tenancy?.id,
      subject: form.subject, content: form.content, status: "Issued", channel: form.channel, acknowledged: false,
    });
    if (tenancy?.tenant_user_id) await notify({ recipient_user_id: tenancy.tenant_user_id, type: "Notice", title: form.subject, message: form.content, related_entity: "Notice", related_id: rec.id, action_link: "/portal/notices" });
    setOpen(false);
    setForm({ type: "General Notice", tenancy_id: "", subject: "", content: "", channel: "In-app" });
    await data.reload();
    } catch(e){setError(e.response?.data?.error||e.message);}
    finally{setBusy(false);}
  };

  if (data.loading) return <div className="flex h-96 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-700" /></div>;

  return (
    <div>
      <PageHeader title="Notices" description="Issue and track formal notices to tenants." actions={<Button onClick={() => setOpen(true)} className="bg-emerald-600 hover:bg-emerald-700"><Plus className="mr-1.5 h-4 w-4" />Issue Notice</Button>} />

      <div className="mb-4 relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search notices..." className="pl-9" />
      </div>

      {list.length === 0 ? <EmptyState icon={Bell} title="No notices issued" /> : (
        <SectionCard>
          <div className="space-y-3">
            {list.map((n) => (
              <div key={n.id} className="rounded-lg border border-slate-100 p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div><div className="flex items-center gap-2"><span className="font-mono text-xs text-slate-500">{n.notice_reference}</span><StatusBadge status={n.type} /><StatusBadge status={n.status} /></div><p className="mt-1 font-medium text-slate-900">{n.subject}</p><p className="text-xs text-slate-500">{n.tenant_name} · {n.unit_number} · {n.date_issued} · via {n.channel}</p></div>
                  {n.acknowledged && <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700">Acknowledged</span>}
                </div>
                {n.content && <p className="mt-2 text-sm text-slate-600">{n.content}</p>}
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Issue Notice</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <Field label="Type"><select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">{TYPES.map((t) => <option key={t}>{t}</option>)}</select></Field>
            <Field label="Tenancy (recipient)"><select value={form.tenancy_id} onChange={(e) => setForm({ ...form, tenancy_id: e.target.value })} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"><option value="">Select tenancy...</option>{data.tenancies.filter((t) => ["Active", "Expiring Soon", "Notice Given"].includes(t.status)).map((t) => <option key={t.id} value={t.id}>{t.tenant_name} — {t.unit_number}</option>)}</select></Field>
            <Field label="Channel"><select value={form.channel} onChange={(e) => setForm({ ...form, channel: e.target.value })} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">{["In-app", "Email", "SMS", "WhatsApp", "Manual"].map((c) => <option key={c}>{c}</option>)}</select></Field>
            <Field label="Subject"><Input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} /></Field>
            <Field label="Content"><Textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} rows={4} /></Field>
          </div>
          {error&&<p role="alert" className="text-sm text-destructive">{error}</p>}
          <DialogFooter><Button onClick={create} disabled={busy} className="bg-emerald-600 hover:bg-emerald-700">{busy ? "Issuing..." : "Issue Notice"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}