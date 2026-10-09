import React,{useState} from 'react';
import {useInfiniteQuery} from '@tanstack/react-query';
import {useAuth} from '@/lib/AuthContext';
import {base44} from '@/api/base44Client';
import {KES} from '@/lib/finance';
import {PageHeader,EmptyState,StatCard} from '@/components/ui-bits';
import {Button} from '@/components/ui/button';
import {AlertTriangle,Clock} from 'lucide-react';
import ArrearsAccountCard from '@/components/arrears/ArrearsAccountCard';
import ArrearsNoticeDialog from '@/components/arrears/ArrearsNoticeDialog';
import RentReminderDialog from '@/components/arrears/RentReminderDialog';
export default function Arrears(){
  const {user}=useAuth(),[notice,setNotice]=useState(null),[reminder,setReminder]=useState(null);
  const result=useInfiniteQuery({queryKey:['arrears-overview',user?.id],enabled:!!user,initialPageParam:null,staleTime:60000,queryFn:async({pageParam})=>(await base44.functions.invoke('sendRentDueNotices',{action:'arrears_overview',cursor:pageParam})).data,getNextPageParam:page=>page.has_more?page.next_cursor:undefined});
  const rows=result.data?.pages.flatMap(page=>page.items)||[],totals=result.data?.pages[0]?.totals;
  if(result.isLoading)return <p className="py-12 text-center text-muted-foreground">Loading arrears…</p>;
  return <div><PageHeader title="Arrears Dashboard" description="Outstanding rent, calculated live from the ledger. Historical arrears are preserved even after payment."/>
    {result.error&&<p role="alert" className="mb-4 text-sm text-destructive">{result.error.response?.data?.error||result.error.message} <button className="underline" onClick={()=>result.refetch()}>Try again</button></p>}
    {totals&&<div className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-4"><StatCard label="Total Arrears" value={KES(totals.totalArrears)} icon={AlertTriangle} accent="rose"/><StatCard label="Accounts in Arrears" value={totals.accounts} icon={Clock} accent="gold"/><StatCard label="Serious Arrears" value={totals.serious} icon={AlertTriangle} accent="rose"/><StatCard label="Overdue Charges" value={totals.overdueCharges} icon={Clock} accent="gold"/></div>}
    {!result.error&&!rows.length?<EmptyState icon={AlertTriangle} title="No arrears — all accounts current" description="Outstanding charges past their due date will appear here."/>:<div className="space-y-4">{rows.map(account=><ArrearsAccountCard key={account.tenant_id} account={account} onNotice={setNotice} onReminder={setReminder}/>)}</div>}
    {result.hasNextPage&&<Button className="mt-4" variant="outline" disabled={result.isFetchingNextPage} onClick={()=>result.fetchNextPage()}>{result.isFetchingNextPage?'Loading…':'Load more accounts'}</Button>}
    {notice&&<ArrearsNoticeDialog target={notice} onClose={()=>setNotice(null)} onSaved={()=>result.refetch()}/>}
    {reminder&&<RentReminderDialog target={reminder} onClose={()=>setReminder(null)} onSaved={()=>result.refetch()}/>}
  </div>;
}