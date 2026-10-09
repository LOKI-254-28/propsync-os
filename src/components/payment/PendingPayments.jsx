import React,{useState} from 'react';
import {useQuery} from '@tanstack/react-query';
import {base44} from '@/api/base44Client';
import {useAuth} from '@/lib/AuthContext';
import {SectionCard} from '@/components/ui-bits';
import {Button} from '@/components/ui/button';
import {receiptMoney} from '@/components/payment/receiptData';
export default function PendingPayments({onApproved}) {
  const {user}=useAuth(),[busy,setBusy]=useState(''),[error,setError]=useState(''),[cursor,setCursor]=useState(null),[previous,setPrevious]=useState([]);
  const result=useQuery({queryKey:['pending-payments',user?.id,cursor],enabled:!!user,refetchInterval:20000,queryFn:()=>base44.entities.Payment.filter({status:'Pending',...(user.role==='admin'?{}:{owner_user_id:user.id})},{sort:'created_date',limit:50,cursor})});
  const approve=async payment=>{
    setBusy(payment.id);setError('');
    try{await base44.functions.invoke('createOwnedRecord',{action:'approve_payment',payment_id:payment.id});setPrevious([]);setCursor(null);await result.refetch();await onApproved();}
    catch(e){setError(e.response?.data?.error||'Could not verify this payment.');}
    finally{setBusy('');}
  };
  const rows=[...previous,...(result.data?.items||[])];
  if(!result.isLoading&&!result.error&&!rows.length)return null;
  return <SectionCard title="Payments awaiting verification" className="mt-6">
    <p className="mb-3 text-xs text-muted-foreground">Confirm funds were received before verifying. Pending payments do not produce receipts or reduce the outstanding balance.</p>
    {result.isLoading&&<p className="text-sm text-muted-foreground">Loading payments…</p>}
    {result.error&&<p role="alert" className="text-destructive">Could not load pending payments. <button className="underline" onClick={()=>result.refetch()}>Try again</button></p>}
    {rows.map(payment=><div key={payment.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-border py-3"><div><p className="font-medium">{payment.tenant_name} / {payment.unit_number}</p><p className="text-sm text-muted-foreground">{receiptMoney(payment.amount)} · {payment.method} · {payment.payment_date}</p></div><Button size="sm" variant="outline" disabled={!!busy} onClick={()=>approve(payment)}>{busy===payment.id?'Verifying…':'Verify Payment'}</Button></div>)}
    {result.data?.has_more&&<Button variant="outline" className="mt-3" onClick={()=>{setPrevious(rows);setCursor(result.data.next_cursor);}}>Load more</Button>}
    {error&&<p role="alert" className="mt-3 text-sm text-destructive">{error}</p>}
  </SectionCard>;
}