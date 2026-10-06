import React, { useState, useMemo } from "react";
import { usePortfolioData } from "@/lib/useAppData";
import { base44 } from "@/api/base44Client";
import {
  monthKey, monthLabel, addMonths, generateMonthlyCharges, recordPayment,
  chargeStatus, genRef, logAudit, notify, todayISO,
} from "@/lib/finance";
import { PageHeader, SectionCard, StatusBadge, EmptyState, StatCard, Field } from "@/components/ui-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Wallet, Zap, Search, Receipt, CheckCircle2, Plus } from "lucide-react";
import BillForm from '@/components/payment/BillForm';
import PaymentReceipt from '@/components/payment/PaymentReceipt';
import ApprovedPayments from '@/components/payment/ApprovedPayments';
import {approvedReceipts,receiptMoney as KES} from '@/components/payment/receiptData';

export default function RentPayments() {
  const data = usePortfolioData();
  const [period, setPeriod] = useState(monthKey());
  const [search, setSearch] = useState("");
  const [genOpen, setGenOpen] = useState(false);
  const [genResult, setGenResult] = useState(null);
  const [genScope, setGenScope] = useState("all");
  const [genProp, setGenProp] = useState("");
  const [genTenancy, setGenTenancy] = useState("");
  const [payOpen, setPayOpen] = useState(false);
  const [payCharge, setPayCharge] = useState(null);
  const [payAmount, setPayAmount] = useState(0);
  const [payMethod, setPayMethod] = useState("M-Pesa");
  const [payDate, setPayDate] = useState(todayISO());
  const [receipt, setReceipt] = useState(null);
  const [busy, setBusy] = useState(false);
  const [billOpen,setBillOpen] = useState(false);
  const approvedPayments = useMemo(()=>approvedReceipts(data.payments,data.applications).filter(p=>!search||`${p.tenant_name} ${p.unit_number}`.toLowerCase().includes(search.toLowerCase())),[data.payments,data.applications,search]);

  const charges = useMemo(() => data.charges
    .filter((c) => c.billing_period === period)
    .filter((c) => !search || c.tenant_name?.toLowerCase().includes(search.toLowerCase()) || c.unit_number?.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => new Date(a.due_date) - new Date(b.due_date)), [data.charges, period, search]);

  const totals = useMemo(() => ({
    expected: charges.reduce((s, c) => s + Number(c.amount || 0), 0),
    collected: charges.reduce((s, c) => s + Number(c.amount_paid || 0), 0),
    outstanding: charges.reduce((s, c) => s + Number(c.outstanding || 0), 0),
  }), [charges]);

  const runGenerate = async () => {
    setBusy(true);
    let tenancies = data.tenancies.filter((t) => ["Active", "Expiring Soon", "Notice Given"].includes(t.status));
    if (genScope === "property" && genProp) tenancies = tenancies.filter((t) => t.property_id === genProp);
    if (genScope === "tenancy" && genTenancy) tenancies = tenancies.filter((t) => t.id === genTenancy);
    const res = await generateMonthlyCharges({ tenancies, existingCharges: data.charges, billingPeriod: period, dueDay: 1 });
    setGenResult(res);
    await logAudit({ user: await base44.auth.me(), action: "Rent Charges Generated", entity: "RentCharge", entity_name: period, new_value: { created: res.created, scope: genScope } });
    setBusy(false);
    data.reload();
  };

  const openPay = (charge) => {
    setPayCharge(charge);
    setPayAmount(Number(charge.outstanding || 0));
    setPayMethod("M-Pesa");
    setPayDate(todayISO());
    setPayOpen(true);
  };

  const submitPayment = async () => {
    if (!payCharge || payAmount <= 0) return;
    setBusy(true);
    const tenant = data.tenants.find((t) => t.id === payCharge.tenant_id);
    const tenancy = data.tenancies.find((t) => t.id === payCharge.tenancy_id);
    const me = await base44.auth.me();
    const result = await recordPayment({ tenant, tenancy, amount: payAmount, method: payMethod, paymentDate: payDate, recordedBy: me?.email });
    await logAudit({ user: me, action: "Payment Recorded", entity: "Payment", entity_id: result.payment.id, entity_name: result.payment.payment_reference, new_value: { amount: payAmount, method: payMethod } });
    if (tenant?.user_id) await notify({ recipient_user_id: tenant.user_id, type: "Payment", title: "Payment Received", message: `Your payment of ${KES(payAmount)} has been recorded.`, related_entity: "Payment", related_id: result.payment.id, action_link: "/portal/rent" });
    setReceipt(result.payment);
    setPayOpen(false);
    setBusy(false);
    data.reload();
  };

  if (data.loading) return <div className="flex h-96 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-700" /></div>;

  return (
    <div>
      <PageHeader title="Rent & Payments" description="The rent ledger — generate monthly charges, record payments, and track allocation."
        actions={<><Button variant="outline" onClick={()=>setBillOpen(true)}><Plus className="h-4 w-4" />Add Other Bill</Button><Button onClick={() => { setGenResult(null); setGenOpen(true); }} className="bg-emerald-600 hover:bg-emerald-700"><Zap className="mr-1.5 h-4 w-4" />Generate Charges</Button></>} />

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <Field label="Billing period">
          <div className="flex items-center gap-1">
            <button onClick={() => setPeriod(addMonths(period, -1))} className="rounded-md border border-slate-200 px-2 py-2 text-sm hover:bg-slate-50">←</button>
            <div className="min-w-[160px] rounded-md border border-slate-200 bg-white px-3 py-2 text-center text-sm font-medium">{monthLabel(period)}</div>
            <button onClick={() => setPeriod(addMonths(period, 1))} className="rounded-md border border-slate-200 px-2 py-2 text-sm hover:bg-slate-50">→</button>
          </div>
        </Field>
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by tenant or unit..." className="pl-9" />
        </div>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Expected" value={KES(totals.expected)} icon={Wallet} accent="emerald" />
        <StatCard label="Collected" value={KES(totals.collected)} icon={CheckCircle2} accent="emerald" />
        <StatCard label="Outstanding" value={KES(totals.outstanding)} icon={Receipt} accent="rose" />
      </div>

      {charges.length === 0 ? (
        <EmptyState icon={Wallet} title={`No charges for ${monthLabel(period)}`} description="Generate this month's rent charges to populate the ledger." action={<Button onClick={() => { setGenResult(null); setGenOpen(true); }} className="bg-emerald-600 hover:bg-emerald-700"><Zap className="mr-1.5 h-4 w-4" />Generate Charges</Button>} />
      ) : (
        <SectionCard title={`Ledger — ${monthLabel(period)}`}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-slate-100 text-left text-xs uppercase text-slate-500">
                <th className="pb-2 font-medium">Tenant</th><th className="pb-2 font-medium">Unit</th><th className="pb-2 font-medium">Bill</th><th className="pb-2 font-medium">Due</th><th className="pb-2 text-right font-medium">Amount</th><th className="pb-2 text-right font-medium">Paid</th><th className="pb-2 text-right font-medium">Outstanding</th><th className="pb-2 text-right font-medium">Status</th><th className="pb-2"></th>
              </tr></thead>
              <tbody>
                {charges.map((c) => (
                  <tr key={c.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                    <td className="py-2.5 font-medium text-slate-800">{c.tenant_name}</td>
                    <td className="py-2.5 text-slate-600">{c.unit_number}</td>
                    <td className="py-2.5 text-slate-600">{c.bill_name||c.charge_type||'Rent & Service Charge'}</td>
                    <td className="py-2.5 text-slate-600">{c.due_date}</td>
                    <td className="py-2.5 text-right text-slate-900">{KES(c.amount)}</td>
                    <td className="py-2.5 text-right text-emerald-700">{KES(c.amount_paid)}</td>
                    <td className="py-2.5 text-right font-medium text-rose-600">{KES(c.outstanding)}</td>
                    <td className="py-2.5 text-right"><StatusBadge status={c.status} /></td>
                    <td className="py-2.5 text-right">{c.outstanding > 0 && <Button size="sm" variant="outline" onClick={() => openPay(c)} className="h-7 text-xs">Record Payment</Button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}

      <ApprovedPayments payments={approvedPayments} onReceipt={setReceipt} />
      {billOpen&&<BillForm tenancies={data.tenancies} period={period} onClose={()=>setBillOpen(false)} onSaved={data.reload} />}
      {/* Generate charges dialog */}
      <Dialog open={genOpen} onOpenChange={setGenOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Generate Rent Charges — {monthLabel(period)}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <Field label="Scope">
              <div className="grid grid-cols-3 gap-2">
                {[["all", "All tenancies"], ["property", "By property"], ["tenancy", "Single tenancy"]].map(([v, l]) => (
                  <button key={v} onClick={() => setGenScope(v)} className={`rounded-lg border px-3 py-2 text-sm ${genScope === v ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-slate-200 text-slate-600"}`}>{l}</button>
                ))}
              </div>
            </Field>
            {genScope === "property" && (
              <Field label="Property">
                <select value={genProp} onChange={(e) => setGenProp(e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="">Select property...</option>
                  {data.properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </Field>
            )}
            {genScope === "tenancy" && (
              <Field label="Tenancy">
                <select value={genTenancy} onChange={(e) => setGenTenancy(e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="">Select tenancy...</option>
                  {data.tenancies.filter((t) => ["Active", "Expiring Soon", "Notice Given"].includes(t.status)).map((t) => <option key={t.id} value={t.id}>{t.tenancy_reference} — {t.tenant_name} ({t.unit_number})</option>)}
                </select>
              </Field>
            )}
            <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800">Duplicate charges for the same tenancy and billing period are automatically skipped.</div>
            {genResult && (
              <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-sm text-emerald-800">
                Created <strong>{genResult.created}</strong> new charge(s). Skipped {genResult.skipped} existing.
              </div>
            )}
          </div>
          <DialogFooter><Button onClick={runGenerate} disabled={busy} className="bg-emerald-600 hover:bg-emerald-700">{busy ? "Generating..." : "Generate"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Record payment dialog */}
      <Dialog open={payOpen} onOpenChange={setPayOpen}>
        <DialogContent className="max-w-md">
          {payCharge && (
            <>
              <DialogHeader><DialogTitle>Record Payment</DialogTitle></DialogHeader>
              <div className="space-y-3 py-2">
                <div className="rounded-lg bg-slate-50 p-3 text-sm">
                  <p className="font-medium text-slate-800">{payCharge.tenant_name} — {payCharge.unit_number}</p>
                  <p className="text-slate-600">{monthLabel(payCharge.billing_period)} · Due {payCharge.due_date}</p>
                  <div className="mt-2 flex justify-between"><span className="text-slate-500">Outstanding</span><span className="font-semibold text-rose-600">{KES(payCharge.outstanding)}</span></div>
                </div>
                <Field label="Amount (KES)"><Input type="number" value={payAmount} onChange={(e) => setPayAmount(Number(e.target.value))} /></Field>
                <Field label="Payment method">
                  <select value={payMethod} onChange={(e) => setPayMethod(e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                    {["M-Pesa", "Bank Transfer", "Card", "Cash", "Manual Adjustment", "Other"].map((m) => <option key={m}>{m}</option>)}
                  </select>
                </Field>
                <Field label="Payment date"><Input type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)} /></Field>
                <div className="rounded-lg bg-blue-50 border border-blue-200 px-3 py-2 text-xs text-blue-800">Payment is allocated to the oldest outstanding charge first. Partial payments are supported. Sandbox mode — no real money moves.</div>
              </div>
              <DialogFooter><Button onClick={submitPayment} disabled={busy} className="bg-emerald-600 hover:bg-emerald-700">{busy ? "Recording..." : "Record Payment"}</Button></DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Receipt dialog */}
      <Dialog open={!!receipt} onOpenChange={() => setReceipt(null)}>
        <DialogContent className="max-w-md">
          {receipt && <PaymentReceipt payment={receipt} charges={data.charges} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}