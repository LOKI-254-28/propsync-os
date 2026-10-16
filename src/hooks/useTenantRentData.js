import useTenantIdentity from '@/hooks/useTenantIdentity';
import useActiveTenantTenancy from '@/hooks/useActiveTenantTenancy';
import usePagedEntity from '@/hooks/usePagedEntity';
import useEntityAggregate from '@/hooks/useEntityAggregate';
import useApprovedReceipts from '@/hooks/useApprovedReceipts';
export default function useTenantRentData() {
  const identity=useTenantIdentity(),tenancy=useActiveTenantTenancy(!identity.loading,true);
  const ready=!!identity.user&&!identity.loading&&!tenancy.isPending&&!tenancy.error;
  const scope={tenant_user_id:identity.user?.id};
  const ledger=usePagedEntity('RentCharge',scope,'due_date',ready);
  const totals=useEntityAggregate('RentCharge',{query:scope,groupBy:'status',sum:['amount','amount_paid','outstanding'],limit:20},ready);
  const receipts=useApprovedReceipts('',ready,true);
  const stats=totals.rows.reduce((sum,row)=>({charged:sum.charged+Number(row.sum_amount||0),paid:sum.paid+Number(row.sum_amount_paid||0),outstanding:sum.outstanding+(['Paid','Void'].includes(row.status)?0:Number(row.sum_outstanding||0))}),{charged:0,paid:0,outstanding:0});
  const error=identity.error||tenancy.error||ledger.error||totals.error;
  const reload=()=>Promise.all([identity.error?identity.refetch():null,tenancy.refetch(),ledger.refetch(),totals.refetch(),receipts.refresh()]);
  return {...identity,activeTenancy:tenancy.data,charges:ledger.items,ledger,receipts,stats,error,loading:!error&&(identity.loading||tenancy.isPending||totals.isPending),reload};
}