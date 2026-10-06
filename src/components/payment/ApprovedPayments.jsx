import React from 'react';
import {Button} from '@/components/ui/button';
import {SectionCard,EmptyState} from '@/components/ui-bits';
import {Receipt} from 'lucide-react';
import {receiptMoney} from '@/components/payment/receiptData';
export default function ApprovedPayments({payments,onReceipt}) {
  return <SectionCard title="Approved Payments & Receipts" className="mt-6">{!payments.length?<EmptyState icon={Receipt} title="No approved payments yet" description="Receipts appear here once payments are recorded or application payments are verified." />:
    <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b border-border text-left text-muted-foreground">{['Tenant / Unit','Reference','Date','Method','Approved / Paid','Receipt'].map(label=><th key={label} className="pb-3 font-medium">{label}</th>)}</tr></thead>
      <tbody>{payments.map(payment=><tr key={payment.id} className="border-b border-border"><td className="py-3 pr-3">{payment.tenant_name}<p className="text-xs text-muted-foreground">{payment.property_name} / {payment.unit_number}</p></td><td className="py-3 pr-3">{payment.payment_reference||payment.receipt_number}</td><td className="py-3 pr-3">{payment.payment_date||'Not recorded'}</td><td className="py-3 pr-3">{payment.method}</td><td className="py-3 pr-3 font-medium">{receiptMoney(payment.amount)}</td><td className="py-3"><Button size="sm" variant="outline" onClick={()=>onReceipt(payment)}><Receipt className="h-4 w-4" />Receipt</Button></td></tr>)}</tbody>
    </table></div>}
  </SectionCard>;
}