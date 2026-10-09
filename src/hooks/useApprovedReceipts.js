import {useAuth} from '@/lib/AuthContext';
import usePagedEntity from '@/hooks/usePagedEntity';
import entitySearch from '@/lib/entitySearch';
import {approvedReceipts} from '@/components/payment/receiptData';
export default function useApprovedReceipts(search,enabled){
  const {user}=useAuth(),ready=enabled&&!!user,owner=user?.role==='admin'?{}:{owner_user_id:user?.id};
  const ledger=usePagedEntity('Payment',{...owner,status:'Successful',...entitySearch(search,['tenant_name','unit_number','property_name'])},'-payment_date',ready);
  const bookings=usePagedEntity('Application',{...owner,payment_status:'Verified',$and:[{$or:[{payment_approved_amount:{$gt:0}},{payment_approved_amount:{$exists:false},payment_amount:{$gt:0}},{payment_approved_amount:null,payment_amount:{$gt:0}}]},entitySearch(search,['applicant_name','unit_number','property_name'])]},'-payment_approved_at',ready);
  return {payments:approvedReceipts(ledger.items,bookings.items),loading:ready&&(ledger.isLoading||bookings.isLoading),error:ledger.error||bookings.error,hasMore:ledger.hasNextPage||bookings.hasNextPage,loadingMore:ledger.isFetchingNextPage||bookings.isFetchingNextPage,loadMore:()=>Promise.all([ledger.hasNextPage?ledger.fetchNextPage():null,bookings.hasNextPage?bookings.fetchNextPage():null]),refresh:()=>Promise.all([ledger.refetch(),bookings.refetch()])};
}