import React from 'react';
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogFooter} from '@/components/ui/dialog';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Textarea} from '@/components/ui/textarea';
import {Field} from '@/components/ui-bits';
import MaintenancePhotoUpload from '@/components/maintenance/MaintenancePhotoUpload';
const CATEGORIES=['Plumbing','Electrical','Structural','Appliance','Security','Cleaning','Other'];
const PRIORITIES=['Low','Medium','High','Urgent'];
export default function MaintenanceRequestForm({onClose,form,setForm,busy,uploading,setUploading,images,setImages,tenancies,tenancyId,setTenancyId,onSubmit}) {
  const disabled=busy||uploading;
  return <Dialog open onOpenChange={value=>{if(!value&&!disabled)onClose();}}>
    <DialogContent className="flex max-h-[90dvh] w-[calc(100%-2rem)] max-w-md flex-col overflow-hidden">
      <DialogHeader className="shrink-0"><DialogTitle>Report Maintenance Issue</DialogTitle></DialogHeader>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1">
        <fieldset disabled={disabled} className="space-y-3 py-2">
          <Field label="Property / tenancy"><select value={tenancyId} onChange={e=>setTenancyId(e.target.value)} className="w-full rounded-md border border-input bg-background p-2 text-sm">{tenancies.map(t=><option key={t.id} value={t.id}>{t.property_name} · {t.unit_number}</option>)}</select></Field>
          <Field label="Title"><Input value={form.title} onChange={e=>setForm({...form,title:e.target.value})} placeholder="e.g. Leaking kitchen tap"/></Field>
          <Field label="Description"><Textarea value={form.description} onChange={e=>setForm({...form,description:e.target.value})} rows={4}/></Field>
          <Field label="Category"><select value={form.category} onChange={e=>setForm({...form,category:e.target.value})} className="w-full rounded-md border border-input bg-background p-2 text-sm">{CATEGORIES.map(c=><option key={c}>{c}</option>)}</select></Field>
          <Field label="Priority"><select value={form.priority} onChange={e=>setForm({...form,priority:e.target.value})} className="w-full rounded-md border border-input bg-background p-2 text-sm">{PRIORITIES.map(p=><option key={p}>{p}</option>)}</select></Field>
        </fieldset>
        <MaintenancePhotoUpload images={images} onChange={setImages} onBusyChange={setUploading}/>
      </div>
      <DialogFooter className="shrink-0 border-t border-border pt-3"><Button onClick={onSubmit} disabled={disabled}>{busy?'Submitting...':'Submit Request'}</Button></DialogFooter>
    </DialogContent>
  </Dialog>;
}