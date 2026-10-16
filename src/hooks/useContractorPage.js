import useLandlordRecordPage from '@/hooks/useLandlordRecordPage';
import useEntityAggregate from '@/hooks/useEntityAggregate';
export default function useContractorPage() {
  const page=useLandlordRecordPage('Contractor',['name','company','email','phone']);
  const totals=useEntityAggregate('Maintenance',{query:{...page.scope,contractor_id:{$in:page.items.map(row=>row.id)}},groupBy:'contractor_id',sum:'actual_cost',limit:1000},!!page.items.length);
  const items=page.items.map(item=>{const row=totals.rows.find(row=>row.contractor_id===item.id);return {...item,jobsCount:row?.count||0,totalCost:row?.sum_actual_cost||0};});
  return {...page,items,totals,refetch:()=>Promise.all([page.refetch(),totals.refetch()]),reload:()=>Promise.all([page.refetch(),page.items.length?totals.refetch():null])};
}