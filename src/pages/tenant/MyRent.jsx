import React, { useState, useMemo } from "react";
import { useTenantData } from "@/lib/useTenantData";
import { base44 } from "@/api/base44Client";
import { recordPayment, genRef, todayISO, monthKey, monthLabel } from "@/lib/finance";
import PaymentReceipt from '@/components/payment/PaymentReceipt';
import PendingPayments from '@/components/payment/PendingPayments';
import TenancyPaymentInstructions from '@/components/payment/TenancyPaymentInstructions';
import {approvedReceipts,receiptMoney as KES} from '@/components/payment/receiptData';
import { PageHeader, SectionCard, StatusBadge, EmptyState, StatCard, Field } from "@/components/ui-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Wallet, Download, Receipt } from "lucide-react";

export default function MyRent() {
  const t = useTenantData();
  const [payOpen, setPayOpen] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState("M-Pesa");
  const [receipt, setReceipt] = useState(null);
  const [busy, setBusy] = useState(false);
  const [paymentMessage,setPaymentMessage]=useState('');
  const [paymentError,setPaymentError]=useState('');

  const activeTenancy = t.tenancies.find((x) => ["Active", "Expiring Soon", "Notice Given"].includes(x.status));
  const charges = useMemo(() => [...t.charges].sort((a, b) => new Date(a.due_date) - new Date(b.due_date)), [t.charges]);
  const payments = useMemo(() => approvedReceipts(t.payments,t.applications), [t.payments,t.applications]);
  const outstanding = charges.filter((c) => c.status !== "Void" && c.status !== "Paid").reduce((s, c) => s + Number(c.outstanding || 0), 0);
  const paid = charges.reduce((s, c) => s + Number(c.amount_paid || 0), 0);

  const pay = async () => {
    if (busy || !activeTenancy) return;
    const amount=Number(payAmount);
    if(!Number.isFinite(amount)||amount<=0||amount>1e9||Math.abs(Math.round(amount*100)-amount*100)>1e-6){setPaymentError('Enter an amount greater than zero, with up to two decimal places.');return;}
    setBusy(true);setPaymentError('');setPaymentMessage('');
    try {
      const result = await recordPayment({ tenant: t.tenant, tenancy: activeTenancy, amount, method: payMethod, paymentDate: todayISO(), recordedBy: t.tenant?.full_name });
      if(result.payment.status==='Successful')setReceipt(result.payment);
      else setPaymentMessage('Payment submitted. Your landlord must verify it before a receipt is issued and your balance is updated.');
      setPayOpen(false);
      t.reload();
    } catch(e){setPaymentError(e.response?.data?.error||'Could not submit your payment. Please try again.');}
    finally { setBusy(false); }
  };

  if (t.loading) return <div className="flex h-96 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-700" /></div>;

  return (
    <div>
      <PageHeader title="Rent & Payments" description="Your rent ledger and payment history." actions={<Button disabled={!activeTenancy || outstanding<=0} onClick={() => { setPayAmount(outstanding.toFixed(2)); setPaymentError(''); setPayOpen(true); }} className="bg-emerald-600 hover:bg-emerald-700"><Wallet className="mr-1.5 h-4 w-4" />Pay Outstanding Charges</Button>} />

      {paymentMessage&&<p role="status" className="mb-4 text-sm text-primary">{paymentMessage}</p>}
      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Total Charged" value={KES(charges.reduce((s, c) => s + Number(c.amount || 0), 0))} icon={Receipt} accent="slate" />
        <StatCard label="Total Paid" value={KES(paid)} icon={Wallet} accent="emerald" />
        <StatCard label="Outstanding" value={KES(outstanding)} icon={Wallet} accent={outstanding > 0 ? "rose" : "emerald"} />
      </div>

      <SectionCard title="Rent Ledger">
        {charges.length === 0 ? <EmptyState icon={Wallet} title="No charges yet" /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-slate-100 text-left text-xs uppercase text-slate-500"><th className="pb-2 font-medium">Period</th><th className="pb-2 font-medium">Bill</th><th className="pb-2 font-medium">Due</th><th className="pb-2 text-right font-medium">Amount</th><th className="pb-2 text-right font-medium">Paid</th><th className="pb-2 text-right font-medium">Outstanding</th><th className="pb-2 text-right font-medium">Status</th></tr></thead>
              <tbody>
                {charges.map((c) => (
                  <tr key={c.id} className="border-b border-slate-50">
                    <td className="py-2.5 text-slate-700">{monthLabel(c.billing_period)}</td>
                    <td className="py-2.5 text-slate-600">{c.bill_name||c.charge_type||'Rent & Service Charge'}</td>
                    <td className="py-2.5 text-slate-600">{c.due_date}</td>
                    <td className="py-2.5 text-right text-slate-900">{KES(c.amount)}</td>
                    <td className="py-2.5 text-right text-emerald-700">{KES(c.amount_paid)}</td>
                    <td className="py-2.5 text-right font-medium text-rose-600">{KES(c.outstanding)}</td>
                    <td className="py-2.5 text-right"><StatusBadge status={c.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      <PendingPayments readOnly/>
      <SectionCard title="Payment History" className="mt-6">
        {payments.length === 0 ? <EmptyState icon={Receipt} title="No payments yet" /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-slate-100 text-left text-xs uppercase text-slate-500"><th className="pb-2 font-medium">Reference</th><th className="pb-2 font-medium">Date</th><th className="pb-2 font-medium">Method</th><th className="pb-2 text-right font-medium">Amount</th><th className="pb-2 text-right font-medium">Receipt</th></tr></thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id} className="border-b border-slate-50">
                    <td className="py-2.5 font-mono text-xs text-slate-600">{p.payment_reference}</td>
                    <td className="py-2.5 text-slate-600">{p.payment_date}</td>
                    <td className="py-2.5 text-slate-600">{p.method}</td>
                    <td className="py-2.5 text-right font-medium text-emerald-700">{KES(p.amount)}</td>
                    <td className="py-2.5 text-right"><button onClick={() => setReceipt(p)} className="text-emerald-700 hover:text-emerald-800"><Download className="h-4 w-4" /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      <Dialog open={payOpen} onOpenChange={open=>!busy&&setPayOpen(open)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Make a Payment</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="rounded-lg bg-slate-50 p-3 text-sm"><p className="text-slate-500">Outstanding balance</p><p className="text-xl font-bold text-rose-600">{KES(outstanding)}</p></div>
            <Field label="Amount paying now (KES)" hint="Edit this amount to pay in instalments. Only the verified amount will reduce your balance."><Input type="number" inputMode="decimal" min="0.01" max="1000000000" step="0.01" required disabled={busy} value={payAmount} onFocus={e=>e.target.select()} onChange={e=>{setPayAmount(e.target.value);setPaymentError('');}} /></Field>
            <Field label="Payment method"><select value={payMethod} onChange={(e) => setPayMethod(e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">{["M-Pesa", "Bank Transfer", "Card", "Cash"].map((m) => <option key={m}>{m}</option>)}</select></Field>
            {payOpen&&activeTenancy&&<TenancyPaymentInstructions tenancyId={activeTenancy.id} method={payMethod}/>}
            <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800">Submitting does not move money. Your landlord must confirm receipt of funds before the payment is allocated and a receipt is issued.</div>
          </div>
          {paymentError&&<p role="alert" className="text-sm text-destructive">{paymentError}</p>}
          <DialogFooter><Button onClick={pay} disabled={busy||!payAmount||!Number.isFinite(Number(payAmount))||Number(payAmount)<=0} className="bg-emerald-600 hover:bg-emerald-700">{busy ? "Processing..." : "Confirm Payment"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!receipt} onOpenChange={() => setReceipt(null)}>
        <DialogContent className="max-h-[90dvh] max-w-lg overflow-hidden">
          {receipt && <PaymentReceipt payment={receipt} charges={charges} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}