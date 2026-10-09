import React,{useEffect,useState} from 'react';
import {useQuery} from '@tanstack/react-query';
import {useAuth} from '@/lib/AuthContext';
import {base44} from '@/api/base44Client';
import {Dialog,DialogContent,DialogHeader,DialogTitle} from '@/components/ui/dialog';
import {Button} from '@/components/ui/button';
import TenantKinRequestForm from '@/components/tenants/TenantKinRequestForm';
export default function TenantKinPrompt() {
  const {user}=useAuth(),[dismissed,setDismissed]=useState('');
  const result=useQuery({queryKey:['pending-kin-requests',user?.id],enabled:!!user,queryFn:()=>base44.entities.NextOfKinRequest.filter({tenant_user_id:user.id,status:'Pending'},{sort:'-requested_at',limit:1}),refetchOnWindowFocus:true});
  useEffect(()=>{if(!user)return;return base44.entities.NextOfKinRequest.subscribe(()=>result.refetch());},[user?.id]);
  const request=result.data?.items[0];
  if(result.error)return <p role="alert" className="mb-4 text-sm text-destructive">Could not check next-of-kin requests. <button className="underline" onClick={()=>result.refetch()}>Try again</button></p>;
  if(!request)return null;
  const open=request.id!==dismissed;
  return <><div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card p-4"><p className="text-sm">Your landlord has requested next-of-kin details.</p><Button variant="outline" onClick={()=>setDismissed('')}>Provide details</Button></div><Dialog open={open} onOpenChange={value=>{if(!value)setDismissed(request.id);}}><DialogContent className="max-h-[90dvh] overflow-y-auto"><DialogHeader><DialogTitle>Next-of-kin details</DialogTitle></DialogHeader><TenantKinRequestForm key={request.id} request={request} onSaved={async()=>{setDismissed(request.id);await result.refetch();}}/></DialogContent></Dialog></>;
}