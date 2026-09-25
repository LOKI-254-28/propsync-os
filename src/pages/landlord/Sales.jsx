import React, { useState, useMemo } from "react";
import { usePortfolioData } from "@/lib/useAppData";
import { base44 } from "@/api/base44Client";
import { KES, genRef, logAudit } from "@/lib/finance";
import { secureCreate } from "@/lib/secureCreate";
import { PageHeader, SectionCard, StatusBadge, EmptyState, Field } from "@/components/ui-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Banknote, Plus, Search, Loader2, Edit, Eye } from "lucide-react";
import { useCrud } from "@/lib/useCrud";
import { toast } from "@/components/ui/use-toast";

const empty = { property_id: "", unit_id: "", buyer_name: "", sale_price: 0, deposit_paid: 0 };

export default function Sales() {
  const data = usePortfolioData();
  const { submitting, run } = useCrud();
  const [open, setOpen] = useState(false);
  const [editRec, setEditRec] = useState(null);
  const [viewRec, setViewRec] = useState(null);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState(empty);

  const list = useMemo(() => (data.saleTransactions || [])
    .filter((s) => !search || s.buyer_name?.toLowerCase().includes(search.toLowerCase()) || s.property_name?.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => new Date(b.created_date) - new Date(a.created_date)), [data.saleTransactions, search]);

  const openCreate = () => { setForm(empty); setEditRec(null); setOpen(true); };
  const openEdit = (rec) => { setForm({ property_id: rec.property_id, unit_id: rec.unit_id, buyer_name: rec.buyer_name, sale_price: rec.sale_price, deposit_paid: rec.deposit_paid }); setEditRec(rec); setOpen(true); };

  const save = async () => {
    if (!form.property_id) { toast({ title: "Validation error", description: "Please select a property.", variant: "destructive" }); return; }
    if (!form.buyer_name) { toast({ title: "Validation error", description: "Buyer name is required.", variant: "destructive" }); return; }
    if (!form.sale_price || Number(form.sale_price) <= 0) { toast({ title: "Validation error", description: "Sale price must be greater than zero.", variant: "destructive" }); return; }
    await run(async () => {
      const me = await base44.auth.me();
      const prop = data.properties.find((p) => p.id === form.property_id);
      const unit = data.units.find((u) => u.id === form.unit_id);
      if (editRec) {
        await base44.entities.SaleTransaction.update(editRec.id, {
          property_id: form.property_id, property_name: prop?.name || "",
          unit_id: form.unit_id, unit_number: unit?.unit_number || "",
          buyer_name: form.buyer_name, sale_price: Number(form.sale_price), deposit_paid: Number(form.deposit_paid),
          balance: Number(form.sale_price) - Number(form.deposit_paid),
        });
        await logAudit({ user: me, action: "Sale Updated", entity: "SaleTransaction", entity_id: editRec.id, entity_name: editRec.transaction_reference });
      } else {
        await secureCreate("SaleTransaction", {
          transaction_reference: genRef("SAL"), property_id: form.property_id, property_name: prop?.name || "",
          unit_id: form.unit_id, unit_number: unit?.unit_number || "", buyer_name: form.buyer_name,
          sale_price: Number(form.sale_price), deposit_paid: Number(form.deposit_paid),
          balance: Number(form.sale_price) - Number(form.deposit_paid), status: "Pending",
        });
      }
      setOpen(false); setForm(empty); setEditRec(null); data.reload();
    }, { success: editRec ? "Sale updated successfully." : "Sale created successfully.", error: "Could not save sale. Please try again." });
  };

  const changeStatus = async (rec, status) => {
    await run(async () => {
      const me = await base44.auth.me();
      await base44.entities.SaleTransaction.update(rec.id, { status, completion_date: status === "Completed" ? new Date().toISOString().slice(0, 10) : rec.completion_date });
      await logAudit({ user: me, action: `Sale ${status}`, entity: "SaleTransaction", entity_id: rec.id, entity_name: rec.transaction_reference });
      data.reload();
    }, { success: `Sale marked ${status}.`, error: `Could not update sale status.` });
  };

  if (data.loading) return <div className="flex h-96 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-700" /></div>;

  return (
    <div>
      <PageHeader title="Sale Transactions" description="Track property sale transactions from deposit to completion."
        actions={<Button onClick={openCreate} className="bg-emerald-600 hover:bg-emerald-700"><Plus className="mr-1.5 h-4 w-4" />Add Sale</Button>} />
      <div className="mb-4 relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search sales..." className="pl-9" />
      </div>
      {list.length === 0 ? <EmptyState icon={Banknote} title="No sale transactions" /> : (
        <SectionCard>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-slate-100 text-left text-xs uppercase text-slate-500">
                <th className="pb-2 font-medium">Reference</th><th className="pb-2 font-medium">Property</th><th className="pb-2 font-medium">Unit</th><th className="pb-2 font-medium">Buyer</th><th className="pb-2 text-right font-medium">Price</th><th className="pb-2 text-right font-medium">Balance</th><th className="pb-2 text-right font-medium">Status</th><th className="pb-2 text-right font-medium">Actions</th>
              </tr></thead>
              <tbody>
                {list.map((s) => (
                  <tr key={s.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                    <td className="py-2.5 font-mono text-xs text-slate-600">{s.transaction_reference}</td>
                    <td className="py-2.5 text-slate-800">{s.property_name}</td>
                    <td className="py-2.5 text-slate-600">{s.unit_number || "—"}</td>
                    <td className="py-2.5 text-slate-800">{s.buyer_name}</td>
                    <td className="py-2.5 text-right font-medium text-slate-900">{KES(s.sale_price)}</td>
                    <td className="py-2.5 text-right text-slate-600">{KES(s.balance)}</td>
                    <td className="py-2.5 text-right"><StatusBadge status={s.status} /></td>
                    <td className="py-2.5 text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setViewRec(s)} title="View"><Eye className="h-3.5 w-3.5" /></Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(s)} title="Edit"><Edit className="h-3.5 w-3.5" /></Button>
                        {s.status === "Pending" && <Button size="sm" variant="outline" className="h-7 text-xs" disabled={submitting} onClick={() => changeStatus(s, "Under Contract")}>Under Contract</Button>}
                        {s.status === "Under Contract" && <Button size="sm" variant="outline" className="h-7 text-xs border-emerald-200 text-emerald-700 hover:bg-emerald-50" disabled={submitting} onClick={() => changeStatus(s, "Completed")}>Complete</Button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editRec ? "Edit Sale" : "Add Sale Transaction"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <Field label="Property">
              <select value={form.property_id} onChange={(e) => setForm({ ...form, property_id: e.target.value, unit_id: "" })} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="">Select property...</option>
                {data.properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </Field>
            <Field label="Unit (optional)">
              <select value={form.unit_id} onChange={(e) => setForm({ ...form, unit_id: e.target.value })} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="">No specific unit</option>
                {data.units.filter((u) => u.property_id === form.property_id).map((u) => <option key={u.id} value={u.id}>{u.unit_number}</option>)}
              </select>
            </Field>
            <Field label="Buyer name"><Input value={form.buyer_name} onChange={(e) => setForm({ ...form, buyer_name: e.target.value })} placeholder="Buyer full name" /></Field>
            <Field label="Sale price (KES)"><Input type="number" value={form.sale_price} onChange={(e) => setForm({ ...form, sale_price: Number(e.target.value) })} /></Field>
            <Field label="Deposit paid (KES)"><Input type="number" value={form.deposit_paid} onChange={(e) => setForm({ ...form, deposit_paid: Number(e.target.value) })} /></Field>
          </div>
          <DialogFooter><Button onClick={save} disabled={submitting} className="bg-emerald-600 hover:bg-emerald-700">{submitting ? <><Loader2 className="mr-1.5 h-4 w-4 animate-spin" />Saving...</> : editRec ? "Save Changes" : "Create Sale"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewRec} onOpenChange={() => setViewRec(null)}>
        <DialogContent className="max-w-lg">
          {viewRec && (
            <>
              <DialogHeader><DialogTitle>Sale — {viewRec.transaction_reference}</DialogTitle></DialogHeader>
              <div className="grid grid-cols-2 gap-3 py-2 text-sm">
                <Info label="Property" value={viewRec.property_name} />
                <Info label="Unit" value={viewRec.unit_number || "—"} />
                <Info label="Buyer" value={viewRec.buyer_name} />
                <Info label="Sale price" value={KES(viewRec.sale_price)} />
                <Info label="Deposit" value={KES(viewRec.deposit_paid)} />
                <Info label="Balance" value={KES(viewRec.balance)} />
                <Info label="Status" value={<StatusBadge status={viewRec.status} />} />
                <Info label="Completion date" value={viewRec.completion_date || "—"} />
              </div>
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