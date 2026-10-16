import React, { useState, useMemo } from "react";
import useContractorPage from '@/hooks/useContractorPage';
import RecordPageControls from '@/components/account/RecordPageControls';
import { secureCreate } from "@/lib/secureCreate";
import { toast } from "@/components/ui/use-toast";
import { KES } from "@/lib/finance";
import { PageHeader, SectionCard, StatusBadge, EmptyState, Field } from "@/components/ui-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { HardHat, Plus, Phone, Mail } from "lucide-react";
import ContractorAccountAccess from '@/components/maintenance/ContractorAccountAccess';

const SERVICES = ["Plumbing", "Electrical", "Structural", "Appliance", "Security", "Cleaning", "General", "HVAC", "Landscaping"];

export default function Contractors() {
  const data=useContractorPage();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", company: "", contact_person: "", phone: "", email: "", services: [], notes: "" });

  const list=data.items;

  const create = async () => {
    if (!form.name) return;
    try {
      await secureCreate("Contractor", { ...form, status: "Active", total_assigned: 0, total_cost: 0 });
    } catch (e) {
      toast({ title: "Could not add contractor", description: e.message, variant: "destructive" });
      return;
    }
    setOpen(false);
    setForm({ name: "", company: "", contact_person: "", phone: "", email: "", services: [], notes: "" });
    data.reload();
  };

  if (data.loading) return <div className="flex h-96 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-700" /></div>;

  return (
    <div>
      <PageHeader title="Contractors" description="Manage contractors and track their maintenance assignments and costs." actions={<Button onClick={() => setOpen(true)} className="bg-emerald-600 hover:bg-emerald-700"><Plus className="mr-1.5 h-4 w-4" />Add Contractor</Button>} />

      <RecordPageControls page={data} search placeholder="Search contractors…"/>
      {data.totals.error&&<p role="alert" className="text-sm text-destructive">Could not load contractor totals. <button className="underline" onClick={()=>data.totals.refetch()}>Try again</button></p>}
      {data.isPending?<p className="py-6 text-sm text-muted-foreground">Loading contractors…</p>:list.length === 0 ? <EmptyState icon={HardHat} title="No contractors yet" /> : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {list.map((c) => (
            <div key={c.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-lg bg-amber-50 text-amber-700"><HardHat className="h-5 w-5" /></div><div><p className="font-semibold text-slate-900">{c.name}</p><p className="text-xs text-slate-500">{c.company}</p></div></div>
                <StatusBadge status={c.status} />
              </div>
              <div className="mt-3 space-y-1 text-xs text-slate-500">
                {c.phone && <p className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" />{c.phone}</p>}
                {c.email && <p className="flex items-center gap-1.5 truncate"><Mail className="h-3.5 w-3.5" />{c.email}</p>}
              </div>
              {c.services?.length > 0 && <div className="mt-2 flex flex-wrap gap-1">{c.services.map((s) => <span key={s} className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600">{s}</span>)}</div>}
              <div className="mt-3 grid grid-cols-2 gap-2 border-t border-slate-100 pt-3 text-center">
                <div><p className="text-sm font-semibold text-slate-900">{data.totals.isPending||data.totals.error?'…':c.jobsCount}</p><p className="text-[10px] uppercase text-slate-500">Jobs</p></div>
                <div><p className="text-sm font-semibold text-slate-900">{data.totals.isPending||data.totals.error?'…':KES(c.totalCost)}</p><p className="text-[10px] uppercase text-slate-500">Total Cost</p></div>
              </div>
              <ContractorAccountAccess contractor={c} onChanged={data.reload}/>
            </div>
          ))}
        </div>
      )}

      <RecordPageControls page={data}/>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add Contractor</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <Field label="Name"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
            <Field label="Company"><Input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} /></Field>
            <Field label="Contact person"><Input value={form.contact_person} onChange={(e) => setForm({ ...form, contact_person: e.target.value })} /></Field>
            <Field label="Phone"><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
            <Field label="Email"><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
            <div><p className="mb-1.5 text-sm font-medium text-slate-700">Services</p><div className="flex flex-wrap gap-1.5">{SERVICES.map((s) => { const sel = form.services.includes(s); return <button key={s} type="button" onClick={() => setForm({ ...form, services: sel ? form.services.filter((x) => x !== s) : [...form.services, s] })} className={`rounded-full border px-2.5 py-1 text-xs ${sel ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-slate-200 text-slate-600"}`}>{s}</button>; })}</div></div>
            <Field label="Notes"><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} /></Field>
          </div>
          <DialogFooter><Button onClick={create} className="bg-emerald-600 hover:bg-emerald-700">Add Contractor</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}