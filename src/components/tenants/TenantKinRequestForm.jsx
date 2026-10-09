import React,{useState} from 'react';
import {base44} from '@/api/base44Client';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Field} from '@/components/ui-bits';
export default function TenantKinRequestForm({request,onSaved}) {
  const [fields,setFields]=useState({full_name:'',id_number:'',phone:'',email:''});
  const [busy,setBusy]=useState(false),[error,setError]=useState('');
  const save=async event=>{
    event.preventDefault();setError('');
    if(!fields.phone.trim()&&!fields.email.trim()){setError('Enter a phone number or email address.');return;}
    setBusy(true);
    try{await base44.functions.invoke('tenantOps',{action:'submit_next_of_kin',request_id:request.id,details:fields});await onSaved();}
    catch(e){setError(e.response?.data?.error||e.message);}
    finally{setBusy(false);}
  };
  return <form onSubmit={save} className="space-y-4"><p className="text-sm text-muted-foreground">{request.landlord_name||'Your landlord'} requests your next-of-kin contact details. These details are shared only with this landlord and authorised admins.</p><div className="grid gap-3 sm:grid-cols-2">{[['full_name','Full name'],['id_number','ID / passport number'],['phone','Phone'],['email','Email']].map(([key,label])=><Field key={key} label={label}><Input required={key==='full_name'||key==='id_number'} type={key==='email'?'email':'text'} maxLength={key==='full_name'?254:100} disabled={busy} value={fields[key]} onChange={e=>setFields(current=>({...current,[key]:e.target.value}))}/></Field>)}</div>{error&&<p role="alert" className="text-sm text-destructive">{error}</p>}<Button disabled={busy} type="submit">{busy?'Saving…':'Submit next-of-kin details'}</Button></form>;
}