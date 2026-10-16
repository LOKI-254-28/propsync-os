import React from 'react';
import TenantHistoryRecord from '@/components/tenants/TenantHistoryRecord';
import TenantExitActions from '@/components/vacation/TenantExitActions';
import RecordPageControls from '@/components/account/RecordPageControls';
export default function TenantTenancyHistory({tenant,page}){
  const totals=page.data?.pages.flatMap(part=>part.totals)||[];
  const vacationRequests=page.data?.pages.flatMap(part=>part.vacationRequests)||[];
  return <div className="space-y-4">
    <h3 className="font-heading font-semibold">Current and previous tenancies</h3>
    {page.isPending?<p className="text-sm text-muted-foreground">Loading tenancy history…</p>:!page.error&&!page.items.length?<p className="text-sm text-muted-foreground">No tenancy has been assigned yet.</p>:<>
      <TenantExitActions tenant={{...tenant,tenancies:page.items}} data={{vacationRequests,reload:page.reload}}/>
      {page.items.map(tenancy=><TenantHistoryRecord key={tenancy.id} tenancy={tenancy} totals={totals.find(row=>row.tenancy_id===tenancy.id)}/>)}
    </>}
    <RecordPageControls page={page}/>
  </div>;
}