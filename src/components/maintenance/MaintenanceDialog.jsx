import React, { useState } from 'react';
import {useQuery} from '@tanstack/react-query';
import {base44} from '@/api/base44Client';
import {Dialog,DialogContent,DialogHeader,DialogTitle} from '@/components/ui/dialog';
import {StatusBadge} from '@/components/ui-bits';
import MaintenancePhotos from '@/components/maintenance/MaintenancePhotos';
import MaintenanceConversation from '@/components/maintenance/MaintenanceConversation';
import MaintenanceManagement from '@/components/maintenance/MaintenanceManagement';
export default function MaintenanceDialog({ maintenanceId, onClose, onUpdated }) {
  const [busy,setBusy]=useState(false);
  const query=useQuery({queryKey:['maintenance-ticket',maintenanceId],queryFn:async()=>(await base44.functions.invoke('maintenanceOps',{action:'details',maintenance_id:maintenanceId})).data,refetchInterval:20000});
  const ticket=query.data?.ticket;
  return <Dialog open onOpenChange={value=>{if(!value&&!busy)onClose();}}>
    <DialogContent className="flex max-h-[90dvh] w-[calc(100%-2rem)] max-w-2xl flex-col overflow-hidden">
      <DialogHeader className="shrink-0"><DialogTitle>{ticket?.title || 'Maintenance Request'}</DialogTitle></DialogHeader>
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain pr-1">
      {query.isLoading&&<p className="text-sm text-muted-foreground">Loading this request…</p>}
      {query.error&&<p role="alert" className="text-sm text-destructive">{query.error.response?.data?.error || query.error.message}</p>}
      {ticket&&!query.error&&<>
        <div className="grid grid-cols-2 gap-3 text-sm"><p>{ticket.ticket_number}<br/><span className="text-muted-foreground">{ticket.date_reported}</span></p><p>{ticket.property_name} · {ticket.unit_number}</p><p>{ticket.category} · {ticket.priority}</p><StatusBadge status={ticket.status==='Submitted'?'Reported':ticket.status==='Assigned'?'Contractor assigned':ticket.status}/>{ticket.tenant_name&&<p>Tenant: {ticket.tenant_name}</p>}{ticket.contractor_name&&<p>Contractor: {ticket.contractor_name}</p>}</div>
        <p className="whitespace-pre-wrap rounded-lg bg-muted p-3 text-sm">{ticket.description}</p>
        {ticket.images && <MaintenancePhotos images={ticket.images} />}
        {ticket.resolution_notes&&<p className="whitespace-pre-wrap text-sm"><strong>Resolution: </strong>{ticket.resolution_notes}</p>}
        {ticket.public_updates?.length>0&&<section className="space-y-2"><h3 className="text-sm font-semibold">Earlier progress updates</h3>{ticket.public_updates.map((update,index)=><p key={index} className="whitespace-pre-wrap rounded-lg border border-border p-3 text-sm"><span className="text-xs text-muted-foreground">{update.date} · {update.status}</span><br/>{update.message}</p>)}</section>}
        {query.data.can_manage&&<MaintenanceManagement ticket={ticket} contractors={query.data.contractors} statuses={query.data.allowed_statuses} onSaved={onUpdated} onBusyChange={setBusy} locked={busy}/>}
        <MaintenanceConversation ticket={ticket} canMessage={query.data.can_message} onBusyChange={setBusy} locked={busy}/>
      </>}
      </div>
    </DialogContent>
  </Dialog>;
}