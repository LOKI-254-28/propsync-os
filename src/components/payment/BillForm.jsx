import React, {useState} from 'react';
import {base44} from '@/api/base44Client';
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogFooter} from '@/components/ui/dialog';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Field} from '@/components/ui-bits';
import {todayISO} from '@/lib/finance';
const types=['Garbage Collection','Water','Electricity','Internet','Parking','Security','Other'];
export default function BillForm({tenancies,period,onClose,onSaved}) {
  const [form,setForm]=useState({tenancyId:'',billingPeriod:period,dueDate:todayISO(),chargeType:'Garbage Collection',billName:'Garbage Collection',amount:''});
  const [busy,setBusy]=useState(false),[error,setError]=useState('');
  const update=(key,value)=>setForm(f=>({...f,[key]:value}));
  const submit=async e=>{
    e.preventDefault();setBusy(true);setError('');
    try {await base44.functions.invoke('generateRentCharges',{action:'add_bill',...form,amount:Number(form.amount)});onSaved();onClose();}
    catch(e){setError(e.response?.data?.error||e.message);}
    finally {setBusy(false);}
  };
  return <Dialog open onOpenChange={value=>!value&&!busy&&onClose()}><DialogContent className="max-w-md max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>Add Other Bill</DialogTitle></DialogHeader>
    <form onSubmit={submit} className="space-y-4">
      <Field label="Tenancy"><select required disabled={busy} value={form.tenancyId} onChange={e=>update('tenancyId',e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"><option value="">Select tenant and unit...</option>{tenancies.filter(t=>['Active','Expiring Soon','Notice Given'].includes(t.status)).map(t=><option key={t.id} value={t.id}>{t.tenant_name} — {t.property_name} / {t.unit_number}</option>)}</select></Field>
      <Field label="Bill type"><select disabled={busy} value={form.chargeType} onChange={e=>setForm(f=>({...f,chargeType:e.target.value,billName:e.target.value==='Other'?'':e.target.value}))} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">{types.map(type=><option key={type}>{type}</option>)}</select></Field>
      <Field label="Bill name"><Input required maxLength={120} disabled={busy} value={form.billName} onChange={e=>update('billName',e.target.value)} placeholder="e.g. Water bill or shared cleaning" /></Field>
      <Field label="Amount (KES)"><Input required type="number" min="0.01" max="100000000" step="0.01" disabled={busy} value={form.amount} onChange={e=>update('amount',e.target.value)} /></Field>
      <div className="grid grid-cols-2 gap-3"><Field label="Billing month"><Input required type="month" disabled={busy} value={form.billingPeriod} onChange={e=>update('billingPeriod',e.target.value)} /></Field><Field label="Due date"><Input required type="date" disabled={busy} value={form.dueDate} onChange={e=>update('dueDate',e.target.value)} /></Field></div>
      <p className="text-xs text-muted-foreground">This bill is added separately to the tenant's ledger and included in their outstanding balance.</p>
      {error&&<p role="alert" className="text-sm text-destructive">{error}</p>}
      <DialogFooter><Button type="button" variant="outline" disabled={busy} onClick={onClose}>Cancel</Button><Button disabled={busy}>{busy?'Saving...':'Add Bill'}</Button></DialogFooter>
    </form>
  </DialogContent></Dialog>;
}