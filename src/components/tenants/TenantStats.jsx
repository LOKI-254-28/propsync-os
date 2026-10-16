import React from 'react';
import {StatCard} from '@/components/ui-bits';
import {KES} from '@/lib/finance';
import {Users,Home,AlertTriangle,CheckCircle2,TrendingUp} from 'lucide-react';
import {useTenantManagementStats} from '@/hooks/useTenantManagement';
export default function TenantStats(){
  const result=useTenantManagementStats(),stats=result.data;
  if(result.error)return <p role="alert" className="mb-4 text-sm text-destructive">Could not load tenant statistics. <button className="underline" onClick={()=>result.refetch()}>Try again</button></p>;
  const value=(key,format=number=>number)=>stats?format(stats[key]):'—';
  return <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-5" aria-busy={result.isPending}>
    <StatCard label="Total tenants" value={value('total')} icon={Users} accent="blue"/>
    <StatCard label="Currently housed" value={value('housed')} sub={stats?`${stats.unhoused} without active tenancy`:'Loading statistics…'} icon={Home}/>
    <StatCard label="Arrears balance" value={value('outstanding',KES)} sub={stats?`${stats.inArrears} tenant${stats.inArrears===1?'':'s'} · current and former`:undefined} icon={AlertTriangle} accent="rose"/>
    <StatCard label="Charges paid" value={value('paidRate',number=>`${number}%`)} sub={stats?`${stats.dueCount} charges due`:undefined} icon={CheckCircle2}/>
    <StatCard label="Avg. rent" value={value('avgRent',KES)} icon={TrendingUp} accent="gold"/>
  </div>;
}