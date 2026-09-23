import React, { useMemo } from "react";
import { useTenantData } from "@/lib/useTenantData";
import { base44 } from "@/api/base44Client";
import { PageHeader, SectionCard, StatusBadge, EmptyState } from "@/components/ui-bits";
import { Bell, Check } from "lucide-react";

export default function MyNotices() {
  const t = useTenantData();
  const list = useMemo(() => [...t.notices].sort((a, b) => new Date(b.date_issued || b.created_date) - new Date(a.date_issued || a.created_date)), [t.notices]);

  const acknowledge = async (n) => { await base44.entities.Notice.update(n.id, { acknowledged: true, status: "Acknowledged" }); t.reload(); };

  if (t.loading) return <div className="flex h-96 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-700" /></div>;
  return (
    <div>
      <PageHeader title="Notices" description="Formal notices issued to you by your landlord." />
      {list.length === 0 ? <EmptyState icon={Bell} title="No notices" /> : (
        <div className="space-y-3">
          {list.map((n) => (
            <div key={n.id} className={`rounded-xl border p-4 ${n.acknowledged ? "border-slate-200 bg-white" : "border-emerald-200 bg-emerald-50/40"}`}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div><div className="flex items-center gap-2"><span className="font-mono text-xs text-slate-500">{n.notice_reference}</span><StatusBadge status={n.type} /></div><p className="mt-1 font-medium text-slate-900">{n.subject}</p><p className="text-xs text-slate-500">{n.date_issued} · via {n.channel}</p></div>
                {!n.acknowledged && <button onClick={() => acknowledge(n)} className="flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700"><Check className="h-3.5 w-3.5" />Acknowledge</button>}
              </div>
              {n.content && <p className="mt-2 text-sm text-slate-700">{n.content}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}