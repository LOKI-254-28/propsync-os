import React,{useState} from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { applicationAction } from '@/lib/applicationActions';
import MoveInInspectionForm from '@/components/inspections/MoveInInspectionForm';
import InspectionDetails from '@/components/inspections/InspectionDetails';
import InspectionResponseForm from '@/components/inspections/InspectionResponseForm';
export default function MoveInInspectionPanel({app,role,onUpdated,onBusyChange}) {
  const [editing,setEditing]=useState(false);
  const enabled=app.payment_status==='Verified'&&['Payment Verified','Approved','Completed'].includes(app.status);
  const {data,isLoading,error,refetch}=useQuery({queryKey:['move-in-inspection',app.id,app.inspection_id],enabled,queryFn:()=>applicationAction(app.id,'inspection_get')});
  if(app.status==='Completed'&&!app.inspection_id)return null;
  const inspection=data?.inspection;
  const updated=async()=>{setEditing(false);await refetch();onUpdated?.();};
  return <section className="mt-4 w-full space-y-3 rounded-lg border border-border bg-card p-4"><h3 className="font-heading font-semibold">Move-in inspection and approval</h3>{!enabled?<p className="text-sm text-muted-foreground">Verified payment is required before the inspection can be shared.</p>:isLoading?<p className="text-sm text-muted-foreground">Loading inspection…</p>:error?<div className="space-y-2"><p role="alert" className="text-sm text-destructive">{error.response?.data?.error||error.message}</p><Button size="sm" variant="outline" onClick={()=>refetch()}>Retry</Button></div>:<>{inspection?<InspectionDetails inspection={inspection}/>:<p className="text-sm text-muted-foreground">{role==='landlord'?'Upload the inspection record and condition photographs for the tenant to approve.':'Waiting for the landlord to share the inspection record.'}</p>}{app.status!=='Completed'&&role==='landlord'&&(!inspection||inspection.tenant_approval_status==='Rejected')&&(editing?<MoveInInspectionForm app={app} onUpdated={updated} onCancel={()=>setEditing(false)} onBusyChange={onBusyChange}/>:<Button onClick={()=>setEditing(true)}>{inspection?'Upload corrected inspection':'Upload inspection record'}</Button>)}{app.status!=='Completed'&&role==='tenant'&&inspection?.tenant_approval_status==='Pending'&&<InspectionResponseForm app={app} inspection={inspection} onUpdated={updated} onBusyChange={onBusyChange}/>}<p className="text-xs text-muted-foreground">{inspection?.tenant_approval_status==='Approved'?'Inspection approved. The landlord can now approve and start the tenancy.':inspection?.tenant_approval_status==='Rejected'?'Corrections are required before tenancy activation.':'Tenancy activation requires verified payment, a signed agreement, tenant inspection approval and landlord approval.'}</p></>}</section>;
}