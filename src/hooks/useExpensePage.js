import useLandlordRecordPage from '@/hooks/useLandlordRecordPage';
import useEntityAggregate from '@/hooks/useEntityAggregate';
export default function useExpensePage() {
  const page=useLandlordRecordPage('Expense',['description','vendor','category'],'-date');
  const totals=useEntityAggregate('Expense',{query:page.query,sum:'amount'},!!page.user);
  const categories=useEntityAggregate('Expense',{query:page.scope,groupBy:'category',sum:'amount',having:{sum_amount:{$gt:0}},limit:20},!!page.user);
  return {...page,total:totals.rows[0]?.sum_amount||0,count:totals.rows[0]?.count||0,byCategory:categories.rows.map(row=>({c:row.category,total:row.sum_amount})),summaryLoading:totals.isPending||categories.isPending||!!totals.error||!!categories.error,error:page.error||totals.error||categories.error,refetch:()=>Promise.all([page.refetch(),totals.refetch(),categories.refetch()]),reload:()=>Promise.all([page.refetch(),totals.refetch(),categories.refetch()])};
}