import React, { useState, useMemo } from "react";
import useExpensePage from '@/hooks/useExpensePage';
import EntityPicker from '@/components/account/EntityPicker';
import RecordPageControls from '@/components/account/RecordPageControls';
import { base44 } from "@/api/base44Client";
import { KES, todayISO } from "@/lib/finance";
import { secureCreate } from "@/lib/secureCreate";
import { PageHeader, SectionCard, StatCard, EmptyState, Field } from "@/components/ui-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Receipt, Plus, Search, Loader2 } from "lucide-react";
import { useCrud } from "@/lib/useCrud";
import { toast } from "@/components/ui/use-toast";

const CATEGORIES = ["Repairs", "Maintenance", "Utilities", "Management", "Security", "Cleaning", "Insurance", "Taxes/Fees", "Other"];

export default function Expenses() {
  const data = useExpensePage();
  const {search,setSearch}=data;
  const { submitting, run } = useCrud();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ property_id: "", unit_id: "", category: "Maintenance", description: "", amount: 0, date: todayISO(), vendor: "", payment_reference: "", recurring: false, notes: "" });

  const list=data.items;
  const {total,byCategory}=data;

  const create = async () => {
    if (!form.property_id) { toast({ title: "Validation error", description: "Property is required.", variant: "destructive" }); return; }
    if (!form.amount || Number(form.amount) <= 0) { toast({ title: "Validation error", description: "Amount must be greater than zero.", variant: "destructive" }); return; }
    await run(async () => {
      await secureCreate("Expense", { ...form, amount: Number(form.amount) });
      setOpen(false);
      setForm({ property_id: "", unit_id: "", category: "Maintenance", description: "", amount: 0, date: todayISO(), vendor: "", payment_reference: "", recurring: false, notes: "" });
      data.reload();
    }, { success: "Expense recorded successfully.", error: "Could not record expense. Your account may still be awaiting approval." });
  };

  if (data.loading) return <div className="flex h-96 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-700" /></div>;

  return (
    <div>
      <PageHeader title="Expenses" description="Track property expenses feeding into financial reports." actions={<Button onClick={() => setOpen(true)} className="bg-emerald-600 hover:bg-emerald-700"><Plus className="mr-1.5 h-4 w-4" />Record Expense</Button>} />

      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Total Expenses" value={data.summaryLoading?'…':KES(total)} icon={Receipt} accent="gold" />
        <StatCard label="Records" value={data.summaryLoading?'…':data.count} icon={Receipt} accent="slate" />
        <StatCard label="Categories" value={data.summaryLoading?'…':byCategory.length} icon={Receipt} accent="blue" />
      </div>

      {byCategory.length > 0 && (
        <div className="mb-4 rounded-xl border border-slate-200 bg-white p-4">
          <p className="mb-2 text-xs font-medium uppercase text-slate-500">By Category</p>
          <div className="flex flex-wrap gap-2">{byCategory.map((x) => <span key={x.c} className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700">{x.c}: <strong className="text-slate-900">{KES(x.total)}</strong></span>)}</div>
        </div>
      )}

      <div className="mb-4 relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search expenses..." className="pl-9" />
      </div>

      {data.isPending?<p className="py-6 text-sm text-muted-foreground">Loading expenses…</p>:list.length === 0 ? <EmptyState icon={Receipt} title="No expenses recorded" /> : (
        <SectionCard>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-slate-100 text-left text-xs uppercase text-slate-500"><th className="pb-2 font-medium">Date</th><th className="pb-2 font-medium">Property</th><th className="pb-2 font-medium">Category</th><th className="pb-2 font-medium">Description</th><th className="pb-2 font-medium">Vendor</th><th className="pb-2 text-right font-medium">Amount</th></tr></thead>
              <tbody>
                {list.map((e) => (<tr key={e.id} className="border-b border-slate-50"><td className="py-2.5 text-slate-600">{e.date}</td><td className="py-2.5 text-slate-700">{e.property_name}</td><td className="py-2.5 text-slate-600">{e.category}</td><td className="py-2.5 text-slate-700">{e.description}</td><td className="py-2.5 text-slate-600">{e.vendor || "—"}</td><td className="py-2.5 text-right font-medium text-slate-900">{KES(e.amount)}</td></tr>))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}

      <RecordPageControls page={data}/>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Record Expense</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2 max-h-[60vh] overflow-y-auto">
            <Field label="Property"><EntityPicker entity="Property" query={data.scope} value={form.property_id} onChange={property_id=>setForm({...form,property_id,unit_id:''})} placeholder="Select property…"/></Field>
            <Field label="Unit (optional)"><EntityPicker entity="Unit" query={{...data.scope,property_id:form.property_id}} fields={['unit_number']} value={form.unit_id} disabled={!form.property_id} onChange={unit_id=>setForm({...form,unit_id})} placeholder="No specific unit"/></Field>
            <Field label="Category"><select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></Field>
            <Field label="Description"><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
            <Field label="Amount"><Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} /></Field>
            <Field label="Date"><Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></Field>
            <Field label="Vendor"><Input value={form.vendor} onChange={(e) => setForm({ ...form, vendor: e.target.value })} /></Field>
            <Field label="Payment reference"><Input value={form.payment_reference} onChange={(e) => setForm({ ...form, payment_reference: e.target.value })} /></Field>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.recurring} onChange={(e) => setForm({ ...form, recurring: e.target.checked })} className="rounded" /> Recurring expense</label>
            <Field label="Notes"><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} /></Field>
          </div>
          <DialogFooter><Button onClick={create} disabled={submitting} className="bg-emerald-600 hover:bg-emerald-700">{submitting ? <><Loader2 className="mr-1.5 h-4 w-4 animate-spin" />Recording...</> : "Record Expense"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}