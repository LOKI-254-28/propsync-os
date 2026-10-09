import React,{useState} from 'react';
import {Button} from '@/components/ui/button';
import ExitScheduleForm from '@/components/vacation/ExitScheduleForm';
import useVacationAction from '@/hooks/useVacationAction';
export default function TenantExitActions({tenant,data}){
  const [chosen,setChosen]=useState('');
  const {send,busy,error}=useVacationAction(async()=>{await data.reload();setChosen('');});
  const tenancies=(tenant.tenancies||[]).filter(t=>['Active','Expiring Soon','Notice Given'].includes(t.status));
  if(!tenancies.length)return null;
  return <section className="space-y-3 border-t border-border pt-4"><h3 className="font-heading font-semibold">End tenancy / approve vacation notice</h3>{tenancies.map(tenancy=>{const notice=data.vacationRequests.find(n=>n.tenancy_id===tenancy.id&&!['Completed','Rejected'].includes(n.status));return <div key={tenancy.id} className="space-y-3"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm">{tenancy.unit_number} · {tenancy.property_name}</p><Button disabled={busy} variant="outline" onClick={()=>setChosen(chosen===tenancy.id?'':tenancy.id)}>{notice?notice.type==='Termination Notice'?'Manage termination / exit':'Approve vacation / schedule exit':'Terminate tenancy'}</Button></div>{chosen===tenancy.id&&<ExitScheduleForm key={notice?.scheduled_release_token||tenancy.id} tenancyId={tenancy.id} notice={notice} send={send} busy={busy}/>}</div>;})}{error&&<p role="alert" className="text-sm text-destructive">{error}</p>}</section>;
}