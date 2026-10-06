import React,{useState} from 'react';
import {useInfiniteQuery} from '@tanstack/react-query';
import {base44} from '@/api/base44Client';
import {useAuth} from '@/lib/AuthContext';
import {PageHeader,StatusBadge,EmptyState} from '@/components/ui-bits';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {MessageSquare,Plus} from 'lucide-react';
import FeedbackComposer from '@/components/feedback/FeedbackComposer';
import FeedbackDialog from '@/components/feedback/FeedbackDialog';
export default function FeedbackPage({view='auto'}) {
  const {user}=useAuth(),[search,setSearch]=useState(''),[creating,setCreating]=useState(false),[selected,setSelected]=useState(null);
  const query=useInfiniteQuery({queryKey:['feedback-list',user?.id,view],initialPageParam:null,queryFn:async({pageParam})=>(await base44.functions.invoke('feedbackOps',{action:'list',view,cursor:pageParam})).data,getNextPageParam:page=>page.has_more?page.next_cursor:undefined,refetchInterval:30000});
  const first=query.data?.pages[0],manager=!!first?.can_manage,tenancies=first?.tenancies || [],records=query.data?.pages.flatMap(page=>page.items) || [];
  const filtered=records.filter(f=>!search||[f.description,f.tenant_name,f.property_name,f.category].some(value=>value?.toLowerCase().includes(search.toLowerCase())));
  if(query.isLoading)return <p className="py-16 text-center text-muted-foreground">Loading private feedback…</p>;
  return <div>
    <PageHeader title={manager?'Feedback & Responses':'Suggestions & Complaints'} description={manager?'Review private feedback for your authorized properties and retain each response.':'Discuss suggestions, complaints and ideas with the relevant landlord.'} actions={tenancies.length>0&&<Button onClick={()=>setCreating(true)}><Plus className="h-4 w-4"/>New Feedback</Button>}/>
    <div className="mb-4 flex gap-2"><Input aria-label="Search feedback" placeholder="Search feedback…" value={search} onChange={e=>setSearch(e.target.value)} className="max-w-sm"/><Button variant="outline" disabled={query.isFetching} onClick={()=>query.refetch()}>Refresh</Button></div>
    {query.error&&<p role="alert" className="mb-4 text-sm text-destructive">{query.error.response?.data?.error || query.error.message}</p>}
    {!filtered.length?<EmptyState icon={MessageSquare} title={search?'No matching feedback':'No feedback yet'} description={!manager&&!tenancies.length?'An established tenancy is required to submit property-linked feedback.':undefined}/>:<div className="space-y-3">
      {filtered.map(f=><article key={f.id} className="space-y-3 rounded-xl border border-border bg-card p-4"><div className="flex flex-wrap items-start justify-between gap-2"><div><StatusBadge status={f.type}/><p className="mt-2 font-medium">{f.tenant_name || 'Tenant'} · {f.property_name || 'Historical feedback'} · {f.unit_number || '—'}</p><p className="text-xs text-muted-foreground">{f.date_submitted} · {f.category || 'General'}</p></div><div className="flex items-center gap-2"><StatusBadge status={f.status}/><Button variant="outline" size="sm" onClick={()=>setSelected(f)}>View & Reply</Button></div></div><p className="whitespace-pre-wrap text-sm">{f.description}</p>{f.staff_response&&<p className="whitespace-pre-wrap text-sm text-muted-foreground">Latest response: {f.staff_response}</p>}</article>)}
    </div>}
    {query.hasNextPage&&<Button className="mt-4" variant="outline" disabled={query.isFetchingNextPage} onClick={()=>query.fetchNextPage()}>{query.isFetchingNextPage?'Loading…':'Load more feedback'}</Button>}
    {creating && <FeedbackComposer tenancies={tenancies} onClose={()=>setCreating(false)} onCreated={()=>setCreating(false)} />}
    {selected && <FeedbackDialog feedback={selected} onClose={()=>setSelected(null)} onSaved={setSelected} />}
  </div>;
}