import React from 'react';
import {StatusBadge} from '@/components/ui-bits';
import {Button} from '@/components/ui/button';
import {KES} from '@/lib/finance';
import {downloadFile} from '@/lib/files';
import {nairobiToday} from '@/lib/nairobiDates';
import RatingPanel from '@/components/reviews/RatingPanel';
import TenancyFinancialHistory from '@/components/tenants/TenancyFinancialHistory';
export default function TenantHistoryRecord({tenancy:ten,totals={}}){
  const fields=[['Start / actual end',`${ten.start_date||'—'} / ${ten.actual_end_date||'—'}`],['Expected end',ten.expected_end_date||'Open-ended'],['Monthly rent',KES(ten.monthly_rent)],['Deposit / service charge',`${KES(ten.security_deposit)} / ${KES(ten.service_charge)}`],['Payment terms',`Day ${ten.payment_due_day} · ${ten.grace_period_days} days grace`],['Notice period',`${ten.notice_period_days} days`],['Total charged / paid',`${KES(totals.sum_amount)} / ${KES(totals.sum_amount_paid)}`],['Outstanding',KES(totals.sum_outstanding)]];
  return <section className="space-y-3 rounded-lg border border-border p-4">
    <div className="flex flex-wrap items-center justify-between gap-2"><div><p className="font-medium">{ten.unit_number} · {ten.property_name}</p><p className="text-xs text-muted-foreground">{ten.tenancy_reference}</p></div><StatusBadge status={ten.status}/></div>
    <dl className="grid grid-cols-2 gap-3 text-sm">{fields.map(([label,value])=><div key={label}><dt className="text-muted-foreground">{label}</dt><dd>{value}</dd></div>)}</dl>
    {ten.notes&&<p className="whitespace-pre-wrap text-sm text-muted-foreground">{ten.notes}</p>}
    {ten.agreement_document_url&&<Button size="sm" variant="outline" onClick={()=>downloadFile(ten.agreement_document_url)}>View tenancy agreement</Button>}
    <TenancyFinancialHistory tenancyId={ten.id}/>
    <RatingPanel entity="TenantReview" filter={{tenancy_id:ten.id}} targetId={ten.id} canRate={['Active','Expiring Soon','Notice Given','Terminated','Vacated','Archived'].includes(ten.status)&&!!ten.start_date&&ten.start_date<=nairobiToday()} title="Rate tenant for this tenancy"/>
  </section>;
}