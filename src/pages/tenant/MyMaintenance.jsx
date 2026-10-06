import React, { useState, useMemo } from "react";
import { useTenantData } from "@/lib/useTenantData";
import { base44 } from "@/api/base44Client";
import { genRef } from "@/lib/finance";
import { PageHeader, StatusBadge, EmptyState, Field } from "@/components/ui-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Wrench, Plus, Eye } from "lucide-react";
import MaintenanceStatusTracker from "@/components/MaintenanceStatusTracker";
import { toast } from "@/components/ui/use-toast";
import MaintenancePhotoUpload from '@/components/maintenance/MaintenancePhotoUpload';
import MaintenanceDialog from '@/components/maintenance/MaintenanceDialog';

const CATEGORIES = ["Plumbing", "Electrical", "Structural", "Appliance", "Security", "Cleaning", "Other"];
const PRIORITIES = ["Low", "Medium", "High", "Urgent"];

export default function MyMaintenance() {
  const t = useTenantData();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState(null);
  const [form, setForm] = useState({ title: "", description: "", category: "Plumbing", priority: "Medium" });
  const [busy, setBusy] = useState(false);
  const [images, setImages] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [submissionRef, setSubmissionRef] = useState(() => genRef('MNT'));

  const [tenancyId,setTenancyId]=useState('');
  const activeTenancies=t.tenancies.filter(x=>['Active','Expiring Soon','Notice Given'].includes(x.status));
  const activeTenancy=activeTenancies.find(x=>x.id===tenancyId) || activeTenancies[0];
  const list = useMemo(() => [...t.maintenance].sort((a, b) => new Date(b.date_reported || b.created_date) - new Date(a.date_reported || a.created_date)), [t.maintenance]);

  const create = async () => {
    if (!form.title) { toast({ title: "Validation error", description: "Title is required.", variant: "destructive" }); return; }
    if (!activeTenancy) { toast({ title: "Error", description: "You need an active tenancy to report maintenance.", variant: "destructive" }); return; }
    setBusy(true);
    try {
      await base44.functions.invoke('submitMaintenanceRequest', { ...form, tenancy_id: activeTenancy.id, ticket_number: submissionRef, images });
      toast({ title: "Success", description: "Maintenance request submitted." });
      setOpen(false);
      setForm({ title: "", description: "", category: "Plumbing", priority: "Medium" });
      setImages([]);
      setSubmissionRef(genRef('MNT'));
      t.reload();
    } catch (err) {
      console.error("[Maintenance create error]", err);
      toast({ title: "Error", description: err.response?.data?.error || err.message || "Could not submit maintenance request. Please try again.", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  if (t.loading) return <div className="flex h-96 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-700" /></div>;

  return (
    <div>
      <PageHeader title="Maintenance / Repairs" description="Report and track repair requests." actions={activeTenancy && <Button onClick={() => setOpen(true)} className="bg-emerald-600 hover:bg-emerald-700"><Plus className="mr-1.5 h-4 w-4" />Report Issue</Button>} />
      {list.length === 0 ? <EmptyState icon={Wrench} title={activeTenancy?'No maintenance requests':'No active tenancy'} description={!activeTenancy?'You need an active tenancy to report new maintenance.':undefined}/> : (
        <div className="space-y-3">
          {list.map((m) => (
            <div key={m.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div><div className="flex items-center gap-2"><span className="font-mono text-xs text-slate-500">{m.ticket_number}</span><StatusBadge status={m.priority} /><MaintenanceStatusTracker status={m.status} updates={m.public_updates} /></div><p className="mt-1 font-medium text-slate-900">{m.title}</p><p className="text-xs text-slate-500">{m.category} · Reported {m.date_reported}</p></div>
                <Button size="sm" variant="outline" onClick={() => setView(m)}><Eye className="mr-1.5 h-3.5 w-3.5" />Track</Button>
              </div>
              <p className="mt-2 text-sm text-slate-700">{m.description}</p>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={value => !busy && !uploading && setOpen(value)}>
        <DialogContent className="max-w-md max-h-[90dvh] overflow-y-auto overscroll-contain">
          <DialogHeader><DialogTitle>Report Maintenance Issue</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <Field label="Property / tenancy"><select disabled={busy||uploading} value={activeTenancy?.id || ''} onChange={e=>setTenancyId(e.target.value)} className="w-full rounded-md border border-input bg-background p-2 text-sm">{activeTenancies.map(x=><option key={x.id} value={x.id}>{x.property_name} · {x.unit_number}</option>)}</select></Field>
            <Field label="Title"><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Leaking kitchen tap" /></Field>
            <Field label="Description"><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={4} /></Field>
            <Field label="Category"><select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></Field>
            <Field label="Priority"><select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">{PRIORITIES.map((p) => <option key={p}>{p}</option>)}</select></Field>
          </div>
          <MaintenancePhotoUpload images={images} onChange={setImages} onBusyChange={setUploading} />
          <DialogFooter><Button onClick={create} disabled={busy || uploading} className="bg-emerald-600 hover:bg-emerald-700">{busy ? "Submitting..." : "Submit Request"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {view&&<MaintenanceDialog maintenanceId={view.id} onClose={()=>setView(null)}/>}
    </div>
  );
}