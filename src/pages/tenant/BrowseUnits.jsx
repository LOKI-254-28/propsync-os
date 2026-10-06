import React, { useState, useMemo } from "react";
import { useTenantData } from "@/lib/useTenantData";
import { base44 } from "@/api/base44Client";
import { KES, genRef, logAudit, notify, todayISO } from "@/lib/finance";
import { PageHeader, SectionCard, StatusBadge, EmptyState, Field } from "@/components/ui-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { DoorOpen, Search, MapPin, Bed, Bath, Maximize } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import ApplicationIdentityUploads from '@/components/booking/ApplicationIdentityUploads';

export default function BrowseUnits() {
  const t = useTenantData();
  const [search, setSearch] = useState("");
  const [apply, setApply] = useState(null);
  const [form, setForm] = useState({ proposed_start_date: todayISO(), message: "", monthly_income: 0, occupation: "", id_number: "" });
  const [busy, setBusy] = useState(false);
  const [identity,setIdentity] = useState({id:null,photo:null});
  const [uploads,setUploads] = useState({id:false,photo:false});
  const uploading = uploads.id || uploads.photo;

  const available = useMemo(() => t.units.filter((u) => ["Available", "Vacant"].includes(u.status))
    .filter((u) => !search || u.unit_number?.toLowerCase().includes(search.toLowerCase()) || u.property_name?.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => a.unit_number.localeCompare(b.unit_number)), [t.units, search]);

  const [err, setErr] = useState("");
  const submit = async () => {
    if (!apply || busy || uploading || !identity.id || !identity.photo) return;
    setErr("");
    setBusy(true);
    try {
      await base44.functions.invoke('bookUnit', {unit_id:apply.id, visit:'skip', source:'browse_units', ...form, id_document_id:identity.id.document_id, photo_document_id:identity.photo.document_id});
      toast({ title: "Success", description: "Application submitted successfully." });
      setApply(null);
      setIdentity({id:null,photo:null});
      setForm({ proposed_start_date: todayISO(), message: "", monthly_income: 0, occupation: "", id_number: "" });
      t.reload();
    } catch (e) {
      setErr(e.message || "Failed to submit application. Please try again.");
      toast({ title: "Error", description: e.message || "Failed to submit application.", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  if (t.loading) return <div className="flex h-96 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-700" /></div>;

  return (
    <div>
      <PageHeader title="Browse Available Units" description="Find your next home and submit an application." />
      <div className="mb-4 relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search units..." className="pl-9" />
      </div>
      {available.length === 0 ? <EmptyState icon={DoorOpen} title="No available units" description="Check back later for new listings." /> : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {available.map((u) => (
            <div key={u.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="flex h-32 items-center justify-center bg-gradient-to-br from-emerald-100 to-emerald-50"><DoorOpen className="h-10 w-10 text-emerald-400" /></div>
              <div className="p-4">
                <div className="flex items-center justify-between"><p className="font-semibold text-slate-900">{u.unit_number}</p><StatusBadge status={u.status} /></div>
                <p className="text-xs text-slate-500">{u.property_name}</p>
                <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-600">
                  <span className="flex items-center gap-1"><Bed className="h-3.5 w-3.5" />{u.bedrooms} bed</span>
                  <span className="flex items-center gap-1"><Bath className="h-3.5 w-3.5" />{u.bathrooms} bath</span>
                  {u.size_sqm > 0 && <span className="flex items-center gap-1"><Maximize className="h-3.5 w-3.5" />{u.size_sqm}m²</span>}
                </div>
                {u.amenities?.length > 0 && <div className="mt-2 flex flex-wrap gap-1">{u.amenities.slice(0, 4).map((a) => <span key={a} className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600">{a}</span>)}</div>}
                <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3"><span className="text-lg font-bold text-emerald-700">{KES(u.monthly_rent)}<span className="text-xs font-normal text-slate-500">/mo</span></span><Button size="sm" onClick={() => {setIdentity({id:null,photo:null});setApply(u);}} className="bg-emerald-600 hover:bg-emerald-700">Apply</Button></div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!apply} onOpenChange={() => {if (!busy && !uploading) setApply(null);}}>
        <DialogContent className="max-w-md max-h-[90dvh] overflow-y-auto">
          {apply && (
            <>
              <DialogHeader><DialogTitle>Apply for {apply.unit_number}</DialogTitle></DialogHeader>
              <div className="space-y-3 py-2">
                <div className="rounded-lg bg-slate-50 p-3 text-sm"><p className="font-medium text-slate-800">{apply.unit_number} · {apply.property_name}</p><p className="text-emerald-700 font-semibold">{KES(apply.monthly_rent)}/month</p></div>
                <Field label="ID number"><Input value={form.id_number} onChange={(e) => setForm({ ...form, id_number: e.target.value })} placeholder={t.tenant?.id_number || ""} /></Field>
                <ApplicationIdentityUploads unitId={apply.id} files={identity} onChange={setIdentity} disabled={busy || uploading} onBusyChange={(kind,value) => setUploads(current => ({...current,[kind]:value}))} />
                <Field label="Occupation"><Input value={form.occupation} onChange={(e) => setForm({ ...form, occupation: e.target.value })} placeholder={t.tenant?.occupation || ""} /></Field>
                <Field label="Monthly income"><Input type="number" value={form.monthly_income} onChange={(e) => setForm({ ...form, monthly_income: Number(e.target.value) })} /></Field>
                <Field label="Proposed start date"><Input type="date" value={form.proposed_start_date} onChange={(e) => setForm({ ...form, proposed_start_date: e.target.value })} /></Field>
                <Field label="Message to landlord"><Textarea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} rows={3} /></Field>
                <p className="text-xs text-slate-400">Submitting will temporarily reserve this unit for 3 days pending landlord review.</p>
                {err && <p className="text-sm text-red-600">{err}</p>}
              </div>
              <DialogFooter><Button onClick={submit} disabled={busy || uploading || !identity.id || !identity.photo} className="bg-emerald-600 hover:bg-emerald-700">{busy ? "Submitting..." : "Submit Application"}</Button></DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}