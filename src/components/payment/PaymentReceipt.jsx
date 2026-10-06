import React from 'react';
import {Receipt,Download} from 'lucide-react';
import {DialogHeader,DialogTitle,DialogFooter} from '@/components/ui/dialog';
import {Button} from '@/components/ui/button';
import {receiptLines,receiptMoney} from '@/components/payment/receiptData';
import {downloadReceipt} from '@/components/payment/receiptPdf';
export default function PaymentReceipt({payment,charges=[]}) {
  if(payment.status!=='Successful') return null;
  const fields=[['Tenant',payment.tenant_name],['Property',payment.property_name],['Unit',payment.unit_number],['Payment / approval date',payment.payment_date||'Not recorded'],['Method',payment.method],['Reference',payment.payment_reference]];
  return <><DialogHeader><DialogTitle className="flex items-center gap-2"><Receipt className="h-5 w-5" />Payment Receipt</DialogTitle></DialogHeader>
    <div className="space-y-4 rounded-lg border border-border bg-card p-5 text-card-foreground">
      <div className="border-b border-border pb-3"><p className="font-heading text-lg font-semibold">PropWiz</p><p className="break-all text-sm text-muted-foreground">Receipt No. {payment.receipt_number||`RCP-${payment.id.toUpperCase()}`}</p><p className="mt-1 text-sm">Approved / Paid</p></div>
      <div className="grid grid-cols-2 gap-3 text-sm">{fields.map(([label,value])=><div key={label}><p className="text-xs text-muted-foreground">{label}</p><p className="break-words font-medium">{value||'Not recorded'}</p></div>)}</div>
      <div className="space-y-2 border-t border-border pt-3 text-sm">{receiptLines(payment,charges).map((line,i)=><div key={i} className="flex justify-between gap-3"><span>{line.label}</span><span className="shrink-0 font-medium">{receiptMoney(line.amount)}</span></div>)}</div>
      <div className="flex justify-between gap-3 border-t border-border pt-3"><span>Total approved / paid</span><strong>{receiptMoney(payment.amount)}</strong></div>
    </div>
    <DialogFooter><Button variant="outline" onClick={()=>downloadReceipt(payment,charges,true)}>Print Receipt</Button><Button variant="outline" onClick={()=>downloadReceipt(payment,charges)}><Download className="h-4 w-4" />Download Receipt PDF</Button></DialogFooter>
  </>;
}