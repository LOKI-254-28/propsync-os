import React from 'react';
import {Link} from 'react-router-dom';
import usePagedEntity from '@/hooks/usePagedEntity';
import RecordPageControls from '@/components/account/RecordPageControls';
import {StatusBadge} from '@/components/ui-bits';
import {KES,monthKey,monthLabel} from '@/lib/finance';
export default function TenantMonthCharges({userId,outstanding}) {
  const page=usePagedEntity('RentCharge',{tenant_user_id:userId,billing_period:monthKey()},'due_date',!!userId);
  return <>
    {page.isPending?<p className="text-sm text-muted-foreground">Loading charges…</p>:page.items.length===0?<p className="text-sm text-muted-foreground">No charges for {monthLabel(monthKey())} yet.</p>:<div className="space-y-2">{page.items.map(c=><div key={c.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5"><div><p className="text-sm font-medium">{monthLabel(c.billing_period)}</p><p className="text-xs text-muted-foreground">Due {c.due_date}</p></div><div className="text-right"><p className="font-semibold">{KES(c.outstanding)}</p><StatusBadge status={c.status}/></div></div>)}{outstanding>0&&<Link className="mt-2 block rounded-lg bg-primary py-2 text-center text-sm font-medium text-primary-foreground" to="/portal/rent">Pay Now</Link>}</div>}
    <RecordPageControls page={page}/>
  </>;
}