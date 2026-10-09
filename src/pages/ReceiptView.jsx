import React from 'react';
import {useParams,useNavigate} from 'react-router-dom';
import {useQuery} from '@tanstack/react-query';
import {base44} from '@/api/base44Client';
import {useAuth} from '@/lib/AuthContext';
import {Dialog,DialogContent,DialogHeader,DialogTitle} from '@/components/ui/dialog';
import {Button} from '@/components/ui/button';
import PaymentReceipt from '@/components/payment/PaymentReceipt';
export default function ReceiptView() {
  const {id}=useParams(),{user}=useAuth(),navigate=useNavigate();
  const result=useQuery({queryKey:['receipt-details',user?.id,id],enabled:!!user,queryFn:async()=>(await base44.functions.invoke('documentOps',{action:'receipt_details',payment_id:id})).data});
  const close=()=>navigate(user?.role==='admin'?'/admin':user?.account_type==='landowner'?'/rent':'/portal/rent');
  return <Dialog open onOpenChange={close}><DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
    {result.data?<PaymentReceipt payment={result.data.payment} charges={result.data.charges}/>:<><DialogHeader><DialogTitle>Payment receipt</DialogTitle></DialogHeader>{result.isLoading?<p className="text-muted-foreground">Loading receipt…</p>:<><p role="alert" className="text-destructive">{result.error?.response?.data?.error||'This receipt could not be opened.'}</p><Button variant="outline" onClick={()=>result.refetch()}>Try again</Button></>}</>}
  </DialogContent></Dialog>;
}