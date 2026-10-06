import React,{useState} from 'react';
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogFooter} from '@/components/ui/dialog';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Textarea} from '@/components/ui/textarea';
import {Field} from '@/components/ui-bits';
import useFeedbackAction from '@/hooks/useFeedbackAction';
export default function FeedbackComposer({tenancies,onClose,onCreated}) {
  const [form,setForm]=useState({tenancy_id:tenancies[0]?.id || '',type:'Suggestion',category:'',description:''});
  const {send,busy,error}=useFeedbackAction(onCreated);
  const change=(key,value)=>setForm(previous=>({...previous,[key]:value}));
  return <Dialog open onOpenChange={value=>{if(!value&&!busy)onClose();}}><DialogContent className="max-h-[90dvh] max-w-lg overflow-y-auto"><DialogHeader><DialogTitle>Submit Private Feedback</DialogTitle></DialogHeader><fieldset disabled={busy} className="space-y-3"><Field label="Property / tenancy"><select value={form.tenancy_id} onChange={e=>change('tenancy_id',e.target.value)} className="w-full rounded-md border border-input bg-background p-2 text-sm">{tenancies.map(t=><option key={t.id} value={t.id}>{t.property_name} · {t.unit_number} · {t.tenancy_reference || t.status}</option>)}</select></Field><Field label="Type"><select value={form.type} onChange={e=>change('type',e.target.value)} className="w-full rounded-md border border-input bg-background p-2 text-sm">{['Suggestion','Complaint','General Feedback','Improvement Idea'].map(type=><option key={type}>{type}</option>)}</select></Field><Field label="Category (optional)"><Input maxLength={100} value={form.category} onChange={e=>change('category',e.target.value)}/></Field><Field label="Feedback"><Textarea rows={4} maxLength={3000} value={form.description} onChange={e=>change('description',e.target.value)}/></Field><p className="text-xs text-muted-foreground">Private to you, the relevant landlord, explicitly authorized staff and admins. This does not create a maintenance request or tenancy notice.</p></fieldset>{error&&<p role="alert" className="text-sm text-destructive">{error}</p>}<DialogFooter><Button disabled={busy||!form.tenancy_id||!form.description.trim()} onClick={()=>send({action:'create',...form})}>{busy?'Submitting…':'Submit Feedback'}</Button></DialogFooter></DialogContent></Dialog>;
}