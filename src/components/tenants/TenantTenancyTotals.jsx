import React from 'react';
import {KES} from '@/lib/finance';
export default function TenantTenancyTotals({id,charges,maintenance}) {
  const groups=charges.rows.filter(row=>row.tenancy_id===id);
  const chargeCount=groups.reduce((sum,row)=>sum+row.count,0);
  const outstanding=groups.reduce((sum,row)=>sum+(['Void','Paid'].includes(row.status)?0:Number(row.sum_outstanding||0)),0);
  const jobs=maintenance.rows.find(row=>row.tenancy_id===id)?.count||0;
  if(charges.error||maintenance.error)return <p role="alert" className="mt-4 text-sm text-destructive">Could not load tenancy totals. <button className="underline" onClick={()=>{charges.refetch();maintenance.refetch();}}>Try again</button></p>;
  if(charges.isPending||maintenance.isPending)return <p className="mt-4 text-sm text-muted-foreground">Loading tenancy totals…</p>;
  return <div className="mt-4 grid grid-cols-3 gap-3 rounded-lg bg-muted p-3 text-center">
    <div><p className="text-xs text-muted-foreground">Charges</p><p className="font-semibold">{chargeCount}</p></div>
    <div><p className="text-xs text-muted-foreground">Outstanding</p><p className="font-semibold">{KES(outstanding)}</p></div>
    <div><p className="text-xs text-muted-foreground">Maintenance</p><p className="font-semibold">{jobs}</p></div>
  </div>;
}