import React from 'react';
import {useQuery} from '@tanstack/react-query';
import {base44} from '@/api/base44Client';
import {Button} from '@/components/ui/button';
export default function TenancyPaymentInstructions({tenancyId,method}){
  const query=useQuery({queryKey:['payment-instructions','tenancy',tenancyId],queryFn:async()=>{const {data}=await base44.functions.invoke('paymentDetails',{action:'instructions',tenancy_id:tenancyId});return data;},enabled:!!tenancyId,staleTime:0});
  if(query.isLoading)return <p className="text-sm text-muted-foreground">Loading your landlord's payment details…</p>;
  if(query.isError)return <p role="alert" className="text-sm text-destructive">{query.error?.response?.data?.error||'Could not load payment instructions.'} <Button variant="link" onClick={()=>query.refetch()}>Retry</Button></p>;
  const d=query.data?.details;if(!d)return null;
  const available=method==='M-Pesa'?d.mpesa_paybill:method==='Bank Transfer'?d.bank_name&&d.bank_account_name&&d.bank_account_number:false;
  if(!['M-Pesa','Bank Transfer'].includes(method))return null;
  return <div className="rounded-lg border border-border bg-muted p-3 text-sm"><p className="mb-1 font-semibold">Payment instructions · {query.data.property_name}</p>{d.payee_name&&<p>Payee: <b>{d.payee_name}</b></p>}{available?method==='M-Pesa'?<p>Paybill: <b>{d.mpesa_paybill}</b></p>:<><p>Bank: <b>{d.bank_name}</b></p><p>Account name: <b>{d.bank_account_name}</b></p><p>Account number: <b>{d.bank_account_number}</b></p>{d.bank_branch&&<p>Branch: {d.bank_branch}</p>}</>:<p className="text-muted-foreground">Your landlord has not configured this payment method. Contact them before sending money.</p>}{available&&<p>Reference: <b>{query.data.reference||'Confirm with your landlord'}</b></p>}{d.payment_instructions&&<p className="mt-2 whitespace-pre-wrap">{d.payment_instructions}</p>}</div>;
}