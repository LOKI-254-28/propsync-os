import React,{useState} from 'react';
import {PageHeader,EmptyState} from '@/components/ui-bits';
import {Button} from '@/components/ui/button';
import {LogOut,Plus} from 'lucide-react';
import VacationNoticeForm from '@/components/vacation/VacationNoticeForm';
import VacationNoticeDialog from '@/components/vacation/VacationNoticeDialog';
import ScheduleTerminationDialog from '@/components/vacation/ScheduleTerminationDialog';
import VacationNoticeCard from '@/components/vacation/VacationNoticeCard';
export default function VacationNoticePage({data,manager=false}) {
  const [creating,setCreating]=useState(false),[view,setView]=useState(null),[terminationId,setTerminationId]=useState(null);
  const openTenancyIds=new Set(data.vacationRequests.filter(n=>!['Completed','Rejected'].includes(n.status)).map(n=>n.tenancy_id));
  const live=data.tenancies.filter(t=>['Active','Expiring Soon','Notice Given'].includes(t.status));
  const active=live.filter(t=>!openTenancyIds.has(t.id));
  const list=[...data.vacationRequests].sort((a,b)=>String(b.date_submitted||b.created_date).localeCompare(String(a.date_submitted||a.created_date)));
  const currentView=list.find(n=>n.id===view?.id)||view;
  const changed=async notice=>{setView(notice);await data.reload();};
  if(data.loading&&!list.length)return <p className="py-16 text-center text-muted-foreground">Loading tenancy notices…</p>;
  return <div>
    <PageHeader title="Vacation & Termination" description={manager?'Issue notices, schedule disconnection and confirm handovers.':'View and respond to your tenancy notices, or submit a notice to leave.'} actions={<>
      {manager&&live.length>0&&<Button onClick={()=>setTerminationId(live[0].id)}>Terminate / schedule exit</Button>}
      {active.length>0&&<Button variant={manager?'outline':'default'} onClick={()=>setCreating(true)}><Plus className="h-4 w-4"/>{manager?'Issue Notice':'Submit Notice'}</Button>}
    </>}/>
    {!list.length?<EmptyState icon={LogOut} title="No vacation or termination notices" description={active.length?'Choose an active tenancy to begin.':'No active tenancy is available for a new notice.'}/>:<div className="space-y-3">{list.map(notice=><VacationNoticeCard key={notice.id} notice={notice} manager={manager} onView={()=>setView(notice)} onSchedule={()=>setTerminationId(notice.tenancy_id)}/>)}</div>}
    {terminationId&&<ScheduleTerminationDialog initialTenancyId={terminationId} tenancies={live} notices={data.vacationRequests} onClose={()=>setTerminationId(null)} onChanged={async()=>{await data.reload();}}/>}
    {creating&&<VacationNoticeForm tenancies={active} manager={manager} onClose={()=>setCreating(false)} onCreated={async()=>{setCreating(false);await data.reload();}}/>}
    {currentView&&<VacationNoticeDialog notice={currentView} manager={manager} inspections={data.inspections} onClose={()=>setView(null)} onChanged={changed}/>}
  </div>;
}