import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Smartphone, Loader2 } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import ReceiptSubmit from "@/components/payment/ReceiptSubmit";

// M-Pesa STK prompt, with the manual paybill steps + receipt upload laid out below it.
export default function MpesaCard({ app, settings, onDone, onBusyChange, disabled = false }) {
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [waiting, setWaiting] = useState(false);

  useEffect(() => {
    if (!waiting) return;
    let tries = 0;
    const t = setInterval(async () => {
      tries += 1;
      const a = await base44.entities.Application.get(app.id).catch(() => null);
      if (a && a.status !== "Payment Requested") { clearInterval(t); toast({ title: "Payment received" }); onDone(); }
      else if (tries >= 12) { clearInterval(t); setWaiting(false); setMsg("We haven't received confirmation yet. If you paid, it will update shortly."); }
    }, 5000);
    return () => clearInterval(t);
  }, [waiting]);

  const send = async () => {
    setBusy(true);
    setMsg("");
    try {
      const { data } = await base44.functions.invoke("initiateMpesaPayment", { application_id: app.id, phone });
      setMsg(data.message || "");
      if (data.ok) setWaiting(true);
    } catch (e) {
      setMsg(e.response?.data?.error || e.data?.error || "Could not send the prompt. Try the manual steps below.");
    } finally {
      setBusy(false);
    }
  };

  const paybill = settings?.mpesa_paybill || "(ask your landlord)";
  return (
    <div className="space-y-4 rounded-xl border-2 border-emerald-500 p-4 md:col-span-2">
      <h4 className="flex items-center gap-2 font-semibold text-slate-900"><Smartphone className="h-5 w-5 text-emerald-600" />Pay with M-Pesa</h4>
      <div className="flex gap-2">
        <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="M-Pesa number, e.g. 0712345678" />
        <Button onClick={send} disabled={busy || waiting || disabled || !phone} className="shrink-0 bg-emerald-600 hover:bg-emerald-700">{(busy || waiting) && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}{waiting ? "Waiting for PIN…" : "Send prompt"}</Button>
      </div>
      {msg && <p className="text-sm text-slate-600">{msg}</p>}
      <div className="rounded-lg bg-slate-50 p-3 text-sm">
        <p className="mb-2 font-medium text-slate-800">Or pay manually with paybill</p>
        <ol className="list-decimal space-y-1 pl-5 text-slate-600">
          <li>Open M-Pesa → Lipa na M-Pesa → Pay Bill</li>
          <li>Business number: <b>{paybill}</b></li>
          <li>Account number: <b>{app.application_reference}</b></li>
          <li>Amount: <b>KES {Number(app.payment_amount || 0).toLocaleString()}</b></li>
          <li>Enter your PIN, then upload the confirmation below</li>
        </ol>
        <div className="mt-3"><ReceiptSubmit app={app} method="M-Pesa Paybill" onDone={onDone} onBusyChange={onBusyChange} disabled={disabled || waiting || busy} /></div>
      </div>
    </div>
  );
}