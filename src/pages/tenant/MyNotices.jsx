import React, { useMemo,useState } from "react";
import useTenantRecordPage from '@/hooks/useTenantRecordPage';
import RecordPageControls from '@/components/account/RecordPageControls';
import { base44 } from "@/api/base44Client";
import { PageHeader, SectionCard, StatusBadge, EmptyState } from "@/components/ui-bits";
import { Bell, Check } from "lucide-react";

export default function MyNotices() {
  const t=useTenantRecordPage('Notice',['subject','notice_reference','content'],'-date_issued');
  const list=t.items;

  const [busy,setBusy]=useState(''),[error,setError]=useState('');
  const acknowledge=async n=>{setBusy(n.id);setError('');try{await base44.functions.invoke('createOwnedRecord',{action:'acknowledge_notice',notice_id:n.id});await t.reload();}catch(e){setError(e.response?.data?.error||e.message);}finally{setBusy('');}};

  if (t.loading) return <div className="flex h-96 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-700" /></div>;
  return (
    <div>
      <PageHeader title="Notices" description="Formal notices issued to you by your landlord." />
      <RecordPageControls page={t} search placeholder="Search notices…"/>
      {error&&<p role="alert" className="mb-3 text-sm text-destructive">{error}</p>}
      {t.isPending ? <p className="py-6 text-sm text-muted-foreground">Loading notices…</p> : list.length === 0 ? <EmptyState icon={Bell} title="No notices" /> : (
        <div className="space-y-3">
          {list.map((n) => (
            <div key={n.id} className={`rounded-xl border p-4 ${n.acknowledged ? "border-slate-200 bg-white" : "border-emerald-200 bg-emerald-50/40"}`}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div><div className="flex items-center gap-2"><span className="font-mono text-xs text-slate-500">{n.notice_reference}</span><StatusBadge status={n.type} /></div><p className="mt-1 font-medium text-slate-900">{n.subject}</p><p className="text-xs text-slate-500">{n.date_issued} · via {n.channel}</p></div>
                {!n.acknowledged && <button disabled={!!busy} onClick={() => acknowledge(n)} className="flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700"><Check className="h-3.5 w-3.5" />Acknowledge</button>}
              </div>
              {n.content && <p className="mt-2 text-sm text-slate-700">{n.content}</p>}
            </div>
          ))}
        </div>
      )}
      <RecordPageControls page={t}/>
    </div>
  );
}