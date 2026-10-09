import React,{useState} from 'react';
import {Dialog,DialogContent,DialogHeader,DialogTitle} from '@/components/ui/dialog';
import {Field} from '@/components/ui-bits';
import ExitScheduleForm from '@/components/vacation/ExitScheduleForm';
import useVacationAction from '@/hooks/useVacationAction';
export default function ScheduleTerminationDialog({tenancies,notices,onClose,onChanged,initialTenancyId}){
  const [id,setId]=useState(initialTenancyId||tenancies[0]?.id||'');
  const {send,busy,error}=useVacationAction(async notice=>{await onChanged(notice);onClose();});
  const notice=notices.find(n=>n.tenancy_id===id&&!['Completed','Rejected'].includes(n.status));
  return <Dialog open onOpenChange={value=>!value&&!busy&&onClose()}><DialogContent className="max-h-[90dvh] max-w-lg overflow-y-auto"><DialogHeader><DialogTitle>Terminate tenancy / approve vacation</DialogTitle></DialogHeader><Field label="Tenancy"><select disabled={busy} className="w-full rounded-md border border-input bg-background p-2 text-sm" value={id} onChange={e=>setId(e.target.value)}>{tenancies.map(t=><option key={t.id} value={t.id}>{t.tenant_name} · {t.unit_number} · {t.property_name}</option>)}</select></Field><ExitScheduleForm key={`${id}:${notice?.scheduled_release_token||''}`} tenancyId={id} notice={notice} send={send} busy={busy}/>{error&&<p role="alert" className="text-sm text-destructive">{error}</p>}</DialogContent></Dialog>;
}