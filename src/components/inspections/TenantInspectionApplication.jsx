import React from 'react';
import {useQuery} from '@tanstack/react-query';
import {base44} from '@/api/base44Client';
import {useAuth} from '@/lib/AuthContext';
import MoveInInspectionPanel from '@/components/inspections/MoveInInspectionPanel';
import InspectionDetails from '@/components/inspections/InspectionDetails';
export default function TenantInspectionApplication({inspection,onUpdated}) {
  const {user}=useAuth();
  const app=useQuery({queryKey:['inspection-application',user?.id,inspection.application_id],queryFn:()=>base44.entities.Application.get(inspection.application_id),enabled:!!user&&!!inspection.application_id});
  if(app.isPending)return <p className="text-sm text-muted-foreground">Loading inspection…</p>;
  if(app.error)return <p role="alert" className="text-sm text-destructive">Could not load the inspection application. <button className="underline" onClick={()=>app.refetch()}>Try again</button></p>;
  return app.data?.inspection_id===inspection.id?<MoveInInspectionPanel app={app.data} role="tenant" onUpdated={async()=>{await app.refetch();onUpdated();}}/>:<InspectionDetails inspection={inspection}/>;
}