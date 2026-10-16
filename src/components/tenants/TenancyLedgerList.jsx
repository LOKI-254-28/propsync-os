import React from 'react';
import {KES} from '@/lib/finance';
import RecordPageControls from '@/components/account/RecordPageControls';
import useTenantManagement from '@/hooks/useTenantManagement';
export default function TenancyLedgerList({tenancyId,kind}){
  const page=useTenantManagement('management_ledger',{tenancy_id:tenancyId,kind});
  return <section className="space-y-2"><h4 className="font-medium">{kind==='charges'?'Charges':'Payments'}</h4>
    {page.isPending?<p className="text-muted-foreground">Loading {kind}…</p>:!page.error&&!page.items.length?<p className="text-muted-foreground">No {kind} yet.</p>:page.items.map(row=><p key={row.id}>{kind==='charges'?<>{row.billing_period} · {KES(row.amount)} · Paid {KES(row.amount_paid)} · {row.status}</>:<>{row.payment_date} · {row.payment_reference||row.receipt_number} · {KES(row.amount)} · {row.status}</>}</p>)}
    <RecordPageControls page={page}/>
  </section>;
}