import React,{useState} from 'react';
import {base44} from '@/api/base44Client';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
export default function ContractorAccountAccess({contractor,onChanged}) {
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[email,setEmail]=useState(contractor.email || '');
  const toggle=async()=>{setBusy(true);setError('');try{await base44.functions.invoke('maintenanceOps',{action:'linkContractor',contractor_id:contractor.id,enabled:!contractor.user_id,email});await onChanged?.();}catch(e){setError(e.response?.data?.error || e.message);}finally{setBusy(false);}};
  return <div className="mt-3 space-y-2 border-t border-border pt-3"><p className="text-xs text-muted-foreground">{contractor.user_id?'Linked account can access only its assigned work and repair conversations.':'Optional: the contractor registers with the email above, then you grant assigned-work access.'}</p>{!contractor.user_id&&<Input aria-label="Registered contractor email" type="email" maxLength={254} placeholder="Registered contractor email" value={email} disabled={busy} onChange={e=>setEmail(e.target.value)}/>}<Button variant="outline" size="sm" disabled={busy||!email.trim()&&!contractor.user_id} onClick={toggle}>{busy?'Saving…':contractor.user_id?'Revoke Assigned-Work Access':'Grant Assigned-Work Access'}</Button>{error&&<p role="alert" className="text-xs text-destructive">{error}</p>}</div>;
}