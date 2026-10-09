import React,{useState} from 'react';
import {useQuery} from '@tanstack/react-query';
import {base44} from '@/api/base44Client';
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogFooter} from '@/components/ui/dialog';
import {Button} from '@/components/ui/button';
import {KES} from '@/lib/finance';
import ArrearsTenancySelect from '@/components/arrears/ArrearsTenancySelect';
export default function RentReminderDialog({target,onClose,onSaved}){
  const [id,setId]=useState(target.charges[0]?.tenancy_id||''),[email,setEmail]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState('');
  const context=useQuery({queryKey:['rent-reminder-context',id],enabled:!!id,queryFn:async()=>(await base44.functions.invoke('sendRentDueNotices',{action:'reminder_context',tenancy_id:id})).data});
  const details=context.data;
  const send=async e=>{e.preventDefault();setBusy(true);setError('');try{const {data}=await base44.functions.invoke('sendRentDueNotices',{action:'send_reminder',tenancy_id:id,email});setMessage(data.message);await onSaved();}catch(e){setError(e.response?.data?.error||e.message);}finally{setBusy(false);}};
  const text=details?`Hello ${details.tenant_name}, ${KES(details.amount)} is outstanding for ${details.property_name}, unit ${details.unit_number}. Please review your rent account (sign in required): ${window.location.origin}/portal/rent. If you have already paid, please contact your landlord.`:'';
  const change=value=>{setId(value);setMessage('');setError('');setEmail(false);};
  return <Dialog open onOpenChange={open=>!open&&!busy&&onClose()}><DialogContent className="max-h-[90vh] max-w-md overflow-y-auto"><DialogHeader><DialogTitle>Send payment reminder</DialogTitle></DialogHeader><form onSubmit={send} className="space-y-4">
    <p className="font-medium">{target.tenant_name}</p><ArrearsTenancySelect tenantId={target.tenant_id} value={id} onChange={change} disabled={busy}/>
    {context.isFetching&&<p className="text-sm text-muted-foreground">Checking current balance…</p>}
    {details&&<><div className="rounded-lg bg-muted p-3 text-sm"><p>{details.property_name} / {details.unit_number}</p><p className="font-semibold">Outstanding: {KES(details.amount)}</p><p>Earliest due date: {details.due_date||'Not recorded'}</p></div><p className="text-xs text-muted-foreground">An in-app notice is issued. Email goes only to the tenant’s registered account. One reminder per channel choice per day.</p><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={email} disabled={busy||!!message||!details.email_available} onChange={e=>setEmail(e.target.checked)}/>Also send email</label>{!details.in_app_available&&<p className="text-sm text-destructive">Link this tenant to an app account before issuing a reminder.</p>}
    <Button type="button" variant="outline" asChild><a href={`https://wa.me/${details.phone}?text=${encodeURIComponent(text)}`} target="_blank" rel="noopener noreferrer">Share on WhatsApp</a></Button><p className="text-xs text-muted-foreground">WhatsApp opens a message for you to review and send.</p></>}
    {(error||context.error)&&<p role="alert" className="text-sm text-destructive">{error||context.error.response?.data?.error||context.error.message}</p>}{message&&<p role="status" className="text-sm text-primary">{message}</p>}
    <DialogFooter><Button type="button" variant="outline" disabled={busy} onClick={onClose}>Close</Button><Button disabled={busy||context.isFetching||!details?.in_app_available||!details?.amount||!!message}>{busy?'Issuing…':'Issue reminder'}</Button></DialogFooter>
  </form></DialogContent></Dialog>;
}