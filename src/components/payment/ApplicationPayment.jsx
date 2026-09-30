import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { KES } from "@/lib/finance";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Landmark } from "lucide-react";
import NextOfKinForm from "@/components/payment/NextOfKinForm";
import MpesaCard from "@/components/payment/MpesaCard";
import ReceiptSubmit from "@/components/payment/ReceiptSubmit";

// Payment screen: next of kin first, then M-Pesa prompt / paybill and bank transfer side by side.
export default function ApplicationPayment({ app, onClose, onDone }) {
  const [kin, setKin] = useState(undefined);
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    base44.entities.NextOfKin.filter({ application_id: app.id }).then((r) => setKin(r[0] || null)).catch(() => setKin(null));
    base44.entities.Settings.list().then((r) => setSettings(r[0] || {})).catch(() => setSettings({}));
  }, [app.id]);

  const done = () => { onClose(); onDone(); };
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader><DialogTitle>Pay for {app.unit_number} · {app.property_name}</DialogTitle></DialogHeader>
        <div className="rounded-lg bg-emerald-50 p-3 text-sm">
          <p className="font-semibold text-emerald-800">Amount due: {KES(app.payment_amount)}</p>
          <p className="text-emerald-700">{app.booked_occupied ? "Half the deposit reserves this unit until the current tenant leaves." : "Deposit + first month's rent."}</p>
        </div>
        {kin === undefined ? <div className="py-8 text-center text-sm text-slate-500">Loading…</div>
          : kin === null ? <NextOfKinForm app={app} onSaved={setKin} />
          : (
            <div className="grid gap-4 md:grid-cols-3">
              <MpesaCard app={app} settings={settings} onDone={done} />
              <div className="space-y-3 rounded-xl border border-slate-200 p-4">
                <h4 className="flex items-center gap-2 font-semibold text-slate-900"><Landmark className="h-5 w-5 text-slate-500" />Bank transfer</h4>
                <div className="space-y-0.5 text-sm text-slate-600">
                  <p>Bank: <b>{settings?.bank_name || "(ask your landlord)"}</b></p>
                  <p>Account name: <b>{settings?.bank_account_name || "—"}</b></p>
                  <p>Account no.: <b>{settings?.bank_account_number || "—"}</b></p>
                  <p>Reference: <b>{app.application_reference}</b></p>
                </div>
                <ReceiptSubmit app={app} method="Bank Transfer" onDone={done} />
              </div>
            </div>
          )}
      </DialogContent>
    </Dialog>
  );
}