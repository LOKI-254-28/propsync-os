import React,{useState} from 'react';
import {base44} from '@/api/base44Client';
import {Button} from '@/components/ui/button';
export default function RequestKinButton({tenant}) {
  const [busy,setBusy]=useState(false),[sent,setSent]=useState(false),[error,setError]=useState('');
  const request=async()=>{
    setBusy(true);setError('');
    try {await base44.functions.invoke('tenantOps',{action:'request_next_of_kin',tenant_id:tenant.id});setSent(true);}
    catch(e){setError(e.response?.data?.error||e.message);}
    finally{setBusy(false);}
  };
  return <div className="space-y-2"><Button variant="outline" disabled={busy||sent||!tenant.user_id} onClick={request}>{busy?'Sending…':sent?'Request sent':'Request next-of-kin details'}</Button>{sent&&<p role="status" className="text-sm text-muted-foreground">The tenant will be prompted in their portal.</p>}{!tenant.user_id&&<p className="text-xs text-muted-foreground">Link this tenant to an account before requesting details.</p>}{error&&<p role="alert" className="text-sm text-destructive">{error}</p>}</div>;
}