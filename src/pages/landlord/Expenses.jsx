import React, { useState, useMemo } from "react";
import { usePortfolioData } from "@/lib/useAppData";
import { base44 } from "@/api/base44Client";
import { KES, logAudit, todayISO } from "@/lib/finance";
import { PageHeader, SectionCard, StatCard, EmptyState, Field } from "@/components/ui-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Receipt, Plus, Search } from "lucide-react";

const CATEGORIES = ["Repairs", "Maintenance", "Utilities", "Management", "Security", "Cleaning", "Insurance", "Taxes/Fees", "Other"];

export default function Expenses() {
  const data = usePortfolioData();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ property_id: "", unit_id: "", category: "Maintenance", description: "", amount: 0, date: todayISO(), vendor: "", payment_reference: "", recurring: false, notes: "" });

  const list = useMemo(() => data.expenses
    .filter((e) => !search || e.description?.toLowerCase().includes(search.toLowerCase()) || e.vendor?.toLowerCase().includes(search.toLowerCase()) || e.category?.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => new Date(b.date) - new Date(a.date)), [data.expenses, search]);

  const total = list.reduce((s, e) => s + Number(e.amount || 0), 0);
  const byCategory = CATEGORIES.map((c) => ({ c, total: data.expenses.filter((e) => e.category === c).reduce((s, e) => s + Number(e.amount || 0), 0) })).filter((x) => x.total > 0);

  const create = async () => {
    if (!form.property_id || !form.amount) return;
    const me = await base44.auth.me();
    const prop = data.properties.find((p) => p.id === form.property_id);
    const unit = data.units.find((u) => u.id === form.unit_id);
    const rec = await base44.entities.Expense.create({ ...form, property_name: prop?.name, unit_number: unit?.unit_number || "" });
    await logAudit({ user: me, action: "Expense Recorded", entity: "Expense", entity_id: rec.id, new_value: { amount: form.amount, category: form.category } });
    setOpen(false);
    setForm({ property_id: "", unit_id: "", category: "Maintenance", description: "", amount: 0, date: todayISO(), vendor: "", payment_reference: "", recurring: false, notes: "" });
    data.reload();
  };

  if (data.loading) return <div className="flex h-96 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-700" /></div>;

  return (
    <div>
      <PageHeader title="Expenses" description="Track property expenses feeding into financial reports." actions={<Button onClick={() => setOpen(true)} className="bg-emerald-600 hover:bg-emerald-700"><Plus className="mr-1.5 h-4 w-4" />Record Expense</Button>} />

      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Total Expenses" value={KES(total)} icon={Receipt} accent="gold" />
        <StatCard label="Records" value={list.length} icon={Receipt} accent="slate" />
        <StatCard label="Categories" value={byCategory.length} icon={Receipt} accent="blue" />
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

      {list.length === 0 ? <EmptyState icon={Receipt} title="No expenses recorded" /> : (
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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Record Expense</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2 max-h-[60vh] overflow-y-auto">
            <Field label="Property"><select value={form.property_id} onChange={(e) => setForm({ ...form, property_id: e.target.value, unit_id: "" })} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"><option value="">Select property...</option>{data.properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
            <Field label="Unit (optional)"><select value={form.unit_id} onChange={(e) => setForm({ ...form, unit_id: e.target.value })} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"><option value="">—</option>{data.units.filter((u) => u.property_id === form.property_id).map((u) => <option key={u.id} value={u.id}>{u.unit_number}</option>)}</select></Field>
            <Field label="Category"><select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></Field>
            <Field label="Description"><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
            <Field label="Amount"><Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} /></Field>
            <Field label="Date"><Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></Field>
            <Field label="Vendor"><Input value={form.vendor} onChange={(e) => setForm({ ...form, vendor: e.target.value })} /></Field>
            <Field label="Payment reference"><Input value={form.payment_reference} onChange={(e) => setForm({ ...form, payment_reference: e.target.value })} /></Field>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.recurring} onChange={(e) => setForm({ ...form, recurring: e.target.checked })} className="rounded" /> Recurring expense</label>
            <Field label="Notes"><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} /></Field>
          </div>
          <DialogFooter><Button onClick={create} className="bg-emerald-600 hover:bg-emerald-700">Record Expense</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}