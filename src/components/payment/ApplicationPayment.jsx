import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import {useQuery} from '@tanstack/react-query';
import {Button} from '@/components/ui/button';
import { KES } from "@/lib/finance";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Landmark } from "lucide-react";
import NextOfKinForm from "@/components/payment/NextOfKinForm";
import MpesaCard from "@/components/payment/MpesaCard";
import ReceiptSubmit from "@/components/payment/ReceiptSubmit";

// Payment screen: next of kin first, then M-Pesa prompt / paybill and bank transfer side by side.
export default function ApplicationPayment({ app, onClose, onDone }) {
  const [kin, setKin] = useState(undefined);
  const instructions=useQuery({queryKey:['payment-instructions','application',app.id],queryFn:async()=>{const {data}=await base44.functions.invoke('paymentDetails',{action:'instructions',application_id:app.id});return data;},staleTime:0});
  const settings=instructions.data?.details;
  const [uploads, setUploads] = useState({});
  const uploading = Object.values(uploads).some(Boolean);
  const uploadState = key => value => setUploads(current => ({ ...current, [key]: value }));

  useEffect(() => {
    base44.entities.NextOfKin.filter({ application_id: app.id }).then((r) => setKin(r[0] || null)).catch(() => setKin(null));

  }, [app.id]);

  const done = () => { onClose(); onDone(); };
  return (
    <Dialog open onOpenChange={value => !value && !uploading && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader><DialogTitle>Pay for {app.unit_number} · {app.property_name}</DialogTitle></DialogHeader>
        <div className="rounded-lg bg-emerald-50 p-3 text-sm">
          <p className="font-semibold text-emerald-800">Amount due: {KES(app.payment_amount)}</p>
          <p className="text-emerald-700">{app.booked_occupied ? "Half the deposit reserves this unit until the current tenant leaves." : "Deposit + first month's rent."}</p>
        </div>
        {instructions.isLoading ? <p className="py-6 text-sm text-muted-foreground">Loading your landlord's payment details…</p> : instructions.isError ? <div role="alert" className="text-sm text-destructive">{instructions.error?.response?.data?.error||'Could not load payment instructions.'} <Button variant="outline" onClick={()=>instructions.refetch()}>Retry</Button></div> : kin === undefined ? <div className="py-8 text-center text-sm text-slate-500">Loading…</div>
          : kin === null ? <NextOfKinForm app={app} onSaved={setKin} onBusyChange={uploadState('kin')} />
          : (
            <div className="grid gap-4 md:grid-cols-3">
              {settings?.payment_instructions&&<p className="whitespace-pre-wrap rounded-lg border border-border p-3 text-sm md:col-span-3">{settings.payment_instructions}</p>}
              <MpesaCard app={app} settings={settings} onDone={done} onBusyChange={uploadState('mpesa')} disabled={uploading} />
              <div className="space-y-3 rounded-xl border border-slate-200 p-4">
                <h4 className="flex items-center gap-2 font-semibold text-slate-900"><Landmark className="h-5 w-5 text-slate-500" />Bank transfer</h4>
                <div className="space-y-0.5 text-sm text-slate-600">
                  <p>Bank: <b>{settings?.bank_name || "(ask your landlord)"}</b></p>
                  <p>Account name: <b>{settings?.bank_account_name || "—"}</b></p>
                  <p>Account no.: <b>{settings?.bank_account_number || "—"}</b></p>
                  {settings?.bank_branch&&<p>Branch: <b>{settings.bank_branch}</b></p>}
                  <p>Reference: <b>{app.application_reference}</b></p>
                  {!(settings?.bank_name&&settings?.bank_account_name&&settings?.bank_account_number)&&<p className="mt-2 text-muted-foreground">Bank instructions are not configured. Contact your landlord before sending money.</p>}
                </div>
                <ReceiptSubmit app={app} method="Bank Transfer" onDone={done} onBusyChange={uploadState('bank')} disabled={uploading} />
              </div>
            </div>
          )}
      </DialogContent>
    </Dialog>
  );
}