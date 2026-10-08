import React,{useState} from 'react';
import {Link} from 'react-router-dom';
import {useInfiniteQuery} from '@tanstack/react-query';
import {base44} from '@/api/base44Client';
import {useAuth} from '@/lib/AuthContext';
import {PageHeader,EmptyState,StatusBadge} from '@/components/ui-bits';
import {Button} from '@/components/ui/button';
import {Wrench} from 'lucide-react';
import MaintenanceDialog from '@/components/maintenance/MaintenanceDialog';
export default function AssignedMaintenance() {
  const {user}=useAuth(),[selected,setSelected]=useState(null);
  const home=user?.role==='admin'?'/admin':user?.account_type==='landowner'?'/dashboard':'/portal';
  const query=useInfiniteQuery({queryKey:['assigned-work',user?.id],initialPageParam:null,queryFn:async({pageParam})=>(await base44.functions.invoke('maintenanceOps',{action:'assigned',cursor:pageParam})).data,getNextPageParam:page=>page.has_more?page.next_cursor:undefined,refetchInterval:20000});
  const jobs=query.data?.pages.flatMap(page=>page.items) || [];
  return <main className="page-container min-h-screen bg-background py-8"><Link to={home} className="text-sm text-muted-foreground underline">Back to your dashboard</Link><div className="mt-6"><PageHeader title="Assigned Maintenance" description="Only work assigned to your linked contractor account is shared here."/></div>{query.isLoading&&<p className="py-12 text-center text-muted-foreground">Loading assigned work…</p>}{query.error&&<p role="alert" className="text-sm text-destructive">{query.error.response?.data?.error || query.error.message}</p>}{!query.isLoading&&!jobs.length&&<EmptyState icon={Wrench} title="No assigned work" description="The property landlord must link your registered account and assign your contractor record to a request."/>}<div className="space-y-3">{jobs.map(job=><article key={job.id} className="rounded-xl border border-border bg-card p-5"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-heading font-semibold">{job.title}</h2><StatusBadge status={job.status}/></div><p className="mt-2 text-sm text-muted-foreground">{job.ticket_number} · {job.property_name} · {job.unit_number}</p><p className="mt-3 whitespace-pre-wrap text-sm">{job.description}</p><Button className="mt-4" variant="outline" onClick={()=>setSelected(job.id)}>View Conversation</Button></article>)}</div>{query.hasNextPage&&<Button className="mt-4" disabled={query.isFetchingNextPage} onClick={()=>query.fetchNextPage()}>{query.isFetchingNextPage?'Loading…':'Load More Work'}</Button>}{selected&&<MaintenanceDialog maintenanceId={selected} onClose={()=>setSelected(null)}/>}</main>;
}