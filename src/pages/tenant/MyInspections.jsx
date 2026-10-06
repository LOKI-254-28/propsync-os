import React, { useMemo } from "react";
import { useTenantData } from "@/lib/useTenantData";
import { PageHeader, SectionCard, StatusBadge, EmptyState } from "@/components/ui-bits";
import { ClipboardCheck } from "lucide-react";
import MoveInInspectionPanel from '@/components/inspections/MoveInInspectionPanel';
import InspectionDetails from '@/components/inspections/InspectionDetails';

export default function MyInspections() {
  const t = useTenantData();
  const list = useMemo(() => [...t.inspections].sort((a, b) => new Date(b.scheduled_date || b.created_date) - new Date(a.scheduled_date || a.created_date)), [t.inspections]);
  if (t.loading) return <div className="flex h-96 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-700" /></div>;
  return (
    <div>
      <PageHeader title="Inspections" description="Your scheduled and completed inspections." />
      {list.length === 0 ? <EmptyState icon={ClipboardCheck} title="No inspections" /> : (
        <SectionCard>
          <div className="space-y-3">
            {list.map((i) => (
              <div key={i.id} className="flex flex-wrap items-center justify-between rounded-lg border border-slate-100 px-4 py-3">
                <div><p className="font-medium text-slate-900">{i.type} Inspection</p><p className="text-xs text-slate-500">{i.unit_number} · Scheduled {i.scheduled_date}</p>{i.status === "Completed" && i.condition_rating && <p className="text-xs text-slate-600">Condition: {i.condition_rating}</p>}</div>
                <StatusBadge status={i.status} />
                {i.application_id && <div className="w-full">{t.applications.some(a => a.id === i.application_id && a.inspection_id === i.id) ? <MoveInInspectionPanel app={t.applications.find(a => a.id === i.application_id)} role="tenant" onUpdated={t.reload}/> : <InspectionDetails inspection={i}/>}</div>}
              </div>
            ))}
          </div>
        </SectionCard>
      )}
    </div>
  );
}