import React,{useState} from 'react';
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogFooter} from '@/components/ui/dialog';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Textarea} from '@/components/ui/textarea';
import {Field} from '@/components/ui-bits';
import {secureCreate} from '@/lib/secureCreate';
const empty={full_name:'',email:'',phone:'',id_number:'',occupation:'',employer:'',monthly_income:0,emergency_contact_name:'',emergency_contact_phone:'',current_address:'',notes:''};
export default function AddTenantDialog({onClose,onSaved}){
  const [form,setForm]=useState(empty),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const update=(key,value)=>setForm(previous=>({...previous,[key]:value}));
  const create=async event=>{
    event.preventDefault();if(busy||!form.full_name.trim())return;setBusy(true);setError('');
    try{await secureCreate('Tenant',{...form,full_name:form.full_name.trim(),status:'Active'});await onSaved();onClose();}
    catch(error){setError(error.response?.data?.error||error.message);}finally{setBusy(false);}
  };
  return <Dialog open onOpenChange={open=>{if(!open&&!busy)onClose();}}><DialogContent className="max-w-lg"><DialogHeader><DialogTitle>Add Tenant</DialogTitle></DialogHeader><form onSubmit={create}>
    <fieldset disabled={busy} className="grid max-h-[60vh] grid-cols-2 gap-4 overflow-y-auto py-2">
      {[['full_name','Full name'],['email','Email'],['phone','Phone'],['id_number','ID number'],['occupation','Occupation'],['employer','Employer'],['monthly_income','Monthly income'],['emergency_contact_name','Emergency contact'],['emergency_contact_phone','Emergency phone']].map(([key,label])=><Field key={key} label={label}><Input value={form[key]} type={key==='monthly_income'?'number':'text'} onChange={event=>update(key,key==='monthly_income'?Number(event.target.value):event.target.value)}/></Field>)}
      <div className="col-span-2"><Field label="Current address"><Textarea value={form.current_address} onChange={event=>update('current_address',event.target.value)} rows={2}/></Field></div>
      <div className="col-span-2"><Field label="Notes"><Textarea value={form.notes} onChange={event=>update('notes',event.target.value)} rows={2}/></Field></div>
    </fieldset>
    {error&&<p role="alert" className="text-sm text-destructive">{error}</p>}
    <DialogFooter><Button type="submit" disabled={busy||!form.full_name.trim()}>{busy?'Creating…':'Create Tenant'}</Button></DialogFooter>
  </form></DialogContent></Dialog>;
}