import React, { useMemo } from "react";
import useTenantRecordPage from '@/hooks/useTenantRecordPage';
import RecordPageControls from '@/components/account/RecordPageControls';
import TenantInspectionApplication from '@/components/inspections/TenantInspectionApplication';
import { PageHeader, SectionCard, StatusBadge, EmptyState } from "@/components/ui-bits";
import { ClipboardCheck } from "lucide-react";
import MoveInInspectionPanel from '@/components/inspections/MoveInInspectionPanel';
import InspectionDetails from '@/components/inspections/InspectionDetails';

export default function MyInspections() {
  const t=useTenantRecordPage('Inspection',['inspection_reference','type','unit_number'],'-scheduled_date');
  const list=t.items;
  if (t.loading) return <div className="flex h-96 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-700" /></div>;
  return (
    <div>
      <PageHeader title="Inspections" description="Your scheduled and completed inspections." />
      <RecordPageControls page={t} search placeholder="Search inspections…"/>
      {t.isPending?<p className="py-6 text-sm text-muted-foreground">Loading inspections…</p>:list.length === 0 ? <EmptyState icon={ClipboardCheck} title="No inspections" /> : (
        <SectionCard>
          <div className="space-y-3">
            {list.map((i) => (
              <div key={i.id} className="flex flex-wrap items-center justify-between rounded-lg border border-slate-100 px-4 py-3">
                <div><p className="font-medium text-slate-900">{i.type} Inspection</p><p className="text-xs text-slate-500">{i.unit_number} · Scheduled {i.scheduled_date}</p>{i.status === "Completed" && i.condition_rating && <p className="text-xs text-slate-600">Condition: {i.condition_rating}</p>}</div>
                <StatusBadge status={i.status} />
                {i.application_id && <div className="w-full"><TenantInspectionApplication inspection={i} onUpdated={t.reload}/></div>}
              </div>
            ))}
          </div>
        </SectionCard>
      )}
      <RecordPageControls page={t}/>
    </div>
  );
}