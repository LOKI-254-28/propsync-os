import React from 'react';
import {DialogHeader,DialogTitle} from '@/components/ui/dialog';
import {StatusBadge} from '@/components/ui-bits';
import {KES,todayISO,daysBetween} from '@/lib/finance';
import {useTenancyManagementDetail} from '@/hooks/useTenantManagement';
export default function TenancyDetail({tenancy}){
  const result=useTenancyManagementDetail(tenancy.id),days=tenancy.expected_end_date?daysBetween(todayISO(),tenancy.expected_end_date):null;
  const fields=[['Tenant',tenancy.tenant_name],['Unit',`${tenancy.unit_number} · ${tenancy.property_name}`],['Start date',tenancy.start_date],['Expected end',tenancy.expected_end_date||'Open'],...(days===null?[]:[['Days to expiry',days>0?`${days} days`:'Expired']]),['Monthly rent',KES(tenancy.monthly_rent)],['Security deposit',KES(tenancy.security_deposit)],['Due day',`Day ${tenancy.payment_due_day} · ${tenancy.grace_period_days}d grace`],['Notice period',`${tenancy.notice_period_days} days`]];
  return <div><DialogHeader><DialogTitle>Tenancy {tenancy.tenancy_reference}</DialogTitle></DialogHeader>
    <dl className="grid grid-cols-2 gap-3 py-2 text-sm">{fields.map(([label,value])=><div key={label}><dt className="text-xs text-muted-foreground">{label}</dt><dd className="font-medium">{value}</dd></div>)}<div><dt className="text-xs text-muted-foreground">Status</dt><dd><StatusBadge status={tenancy.status}/></dd></div></dl>
    {result.isPending?<p className="text-sm text-muted-foreground">Loading financial summary…</p>:result.error?<p role="alert" className="text-sm text-destructive">Could not load financial details. <button className="underline" onClick={()=>result.refetch()}>Try again</button></p>:<>
      <div className="mt-3 grid grid-cols-3 gap-2 rounded-lg bg-muted p-3 text-center">{[['Total Charged',result.data.totals.amount],['Total Paid',result.data.totals.paid],['Outstanding',result.data.totals.outstanding]].map(([label,value])=><div key={label}><p className="text-xs text-muted-foreground">{label}</p><p className="font-semibold">{KES(value)}</p></div>)}</div>
      <section className="mt-3 max-h-48 overflow-y-auto"><h3 className="mb-2 text-xs font-medium uppercase text-muted-foreground">Recent Charges</h3>{result.data.charges.map(charge=><div key={charge.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-border py-2 text-sm"><span>{charge.billing_period}</span><span>{KES(charge.amount)}</span><span>{KES(charge.amount_paid)}</span><StatusBadge status={charge.status}/></div>)}{!result.data.charges.length&&<p className="text-sm text-muted-foreground">No charges yet.</p>}</section>
    </>}
  </div>;
}