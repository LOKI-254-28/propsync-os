import React,{useState} from 'react';
import {useQuery,useQueryClient} from '@tanstack/react-query';
import {useAuth} from '@/lib/AuthContext';
import {base44} from '@/api/base44Client';
import {PageHeader} from '@/components/ui-bits';
import {Button} from '@/components/ui/button';
import PaymentDetailsForm from '@/components/payment/PaymentDetailsForm';
import PaymentOwnerScope from '@/components/payment/PaymentOwnerScope';
export default function PaymentDetails(){
  const {user}=useAuth(),[propertyId,setPropertyId]=useState(''),client=useQueryClient();
  const key=['owner-payment-details',user?.id,propertyId];
  const query=useQuery({queryKey:key,enabled:!!user,queryFn:async()=>{const {data}=await base44.functions.invoke('paymentDetails',{action:'get',property_id:propertyId||undefined});return data;}});
  const saved=data=>{client.setQueryData(key,data);client.invalidateQueries({queryKey:['payment-instructions']});};
  return <div><PageHeader title="Payment Details" description="Set M-Pesa and bank instructions for your properties. Tenants see only their property owner's details."/>{user?.role==='admin'&&<PaymentOwnerScope value={propertyId} onChange={setPropertyId}/>}<p className="mb-5 rounded-lg border border-border bg-muted p-3 text-sm text-muted-foreground">These details apply to every property belonging to the selected owner. Previous shared payment settings are not copied automatically; enter and verify the correct destination before asking tenants to pay.</p>{query.isLoading?<p className="py-8 text-sm text-muted-foreground">Loading payment details…</p>:query.isError?<div role="alert" className="text-sm text-destructive">{query.error?.response?.data?.error||'Could not load payment details.'} <Button variant="outline" onClick={()=>query.refetch()}>Retry</Button></div>:query.data&&<PaymentDetailsForm key={`${user?.id}-${propertyId}`} details={query.data.details} propertyId={propertyId} onSaved={saved}/>}</div>;
}