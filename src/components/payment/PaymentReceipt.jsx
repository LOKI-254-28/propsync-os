import React from 'react';
import {Receipt,Download} from 'lucide-react';
import {DialogHeader,DialogTitle,DialogFooter} from '@/components/ui/dialog';
import {Button} from '@/components/ui/button';
import {receiptLines,receiptMoney} from '@/components/payment/receiptData';
import {downloadReceipt} from '@/components/payment/receiptPdf';
import {useQuery} from '@tanstack/react-query';
import {base44} from '@/api/base44Client';
import {useAuth} from '@/lib/AuthContext';
import ReceiptParties from '@/components/payment/ReceiptParties';
import {amountInWords} from '@/components/payment/amountInWords';
import ReceiptDeliveryActions from '@/components/payment/ReceiptDeliveryActions';
export default function PaymentReceipt({payment:inputPayment,charges:inputCharges=[]}) {
  const paymentId=inputPayment.id;
  const {user}=useAuth();
  const result=useQuery({queryKey:['receipt-details',user?.id,paymentId],enabled:!!user&&inputPayment.status==='Successful',queryFn:async()=>(await base44.functions.invoke('documentOps',{action:'receipt_details',payment_id:paymentId})).data});
  if(inputPayment.status!=='Successful') return null;
  const details=result.data,payment=details?.payment||inputPayment,charges=details?.charges||inputCharges;
  const fields=[['Tenant',payment.tenant_name],['Property',payment.property_name],['Unit',payment.unit_number],['Payment / approval date',payment.payment_date||'Not recorded'],['Method',payment.method],['Reference',payment.payment_reference]];
  return <><DialogHeader><DialogTitle className="flex items-center gap-2"><Receipt className="h-5 w-5" />Payment Receipt</DialogTitle></DialogHeader>
    <div className="space-y-4 rounded-lg border border-border bg-card p-5 text-card-foreground">
      <div className="border-b border-border pb-3"><p className="font-heading text-lg font-semibold">PropWiz</p><p className="break-all text-sm text-muted-foreground">Receipt No. {payment.receipt_number||`RCP-${payment.id.toUpperCase()}`}</p><p className="mt-1 text-sm">Approved / Paid</p></div>
      {result.isLoading?<p className="text-sm text-muted-foreground">Loading receipt details…</p>:result.error?<p role="alert" className="text-sm text-destructive">Could not load receipt details. <button className="underline" onClick={()=>result.refetch()}>Try again</button></p>:details&&<ReceiptParties details={details}/>}
      <div className="grid grid-cols-2 gap-3 text-sm">{fields.map(([label,value])=><div key={label}><p className="text-xs text-muted-foreground">{label}</p><p className="break-words font-medium">{value||'Not recorded'}</p></div>)}</div>
      <div className="space-y-2 border-t border-border pt-3 text-sm">{receiptLines(payment,charges).map((line,i)=><div key={i} className="flex justify-between gap-3"><span>{line.label}</span><span className="shrink-0 font-medium">{receiptMoney(line.amount)}</span></div>)}</div>
      <div className="flex justify-between gap-3 border-t border-border pt-3"><span>Total received</span><strong>{receiptMoney(payment.amount)}</strong></div>
      <p className="text-sm font-medium">{amountInWords(payment.amount)}</p>
      {details?.property_address&&<p className="text-sm text-muted-foreground">Property address: {details.property_address}</p>}
      <div className="grid gap-4 border-t border-border pt-4 text-xs sm:grid-cols-2"><div><p>Authorised by: {details?.authorised_by||'Not recorded'}</p><p className="mt-4">Signature: ____________________</p></div><div><p>Received by: {payment.tenant_name||details?.payer?.name}</p><p className="mt-4">Signature: ____________________</p></div></div>
      <p className="text-xs text-muted-foreground">Computer-generated acknowledgement of verified payment. Retain this receipt for your records.</p>
    </div>
    <ReceiptDeliveryActions key={paymentId} details={details}/>
    <DialogFooter className="flex-wrap gap-2"><Button variant="outline" disabled={!details} onClick={()=>downloadReceipt(payment,charges,true,details)}>Print Receipt</Button><Button variant="outline" disabled={!details} onClick={()=>downloadReceipt(payment,charges,false,details)}><Download className="h-4 w-4" />Download Receipt PDF</Button></DialogFooter>
  </>;
}