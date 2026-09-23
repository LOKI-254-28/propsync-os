import React, { useMemo } from "react";
import { useTenantData } from "@/lib/useTenantData";
import { KES } from "@/lib/finance";
import { PageHeader, SectionCard, StatusBadge, EmptyState } from "@/components/ui-bits";
import { FileText } from "lucide-react";

export default function MyApplications() {
  const t = useTenantData();
  const list = useMemo(() => [...t.applications].sort((a, b) => new Date(b.submitted_date || b.created_date) - new Date(a.submitted_date || a.created_date)), [t.applications]);
  if (t.loading) return <div className="flex h-96 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-700" /></div>;
  return (
    <div>
      <PageHeader title="My Applications" description="Track the status of your unit applications." />
      {list.length === 0 ? <EmptyState icon={FileText} title="No applications submitted" description="Browse available units to apply." /> : (
        <div className="space-y-3">
          {list.map((a) => (
            <div key={a.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div><p className="font-mono text-xs text-slate-500">{a.application_reference}</p><p className="font-medium text-slate-900">{a.unit_number} · {a.property_name}</p><p className="text-xs text-slate-500">Submitted {a.submitted_date} · {KES(a.monthly_rent)}/mo</p></div>
                <StatusBadge status={a.status} />
              </div>
              {a.landlord_response && <div className="mt-2 rounded-lg bg-slate-50 p-2 text-sm text-slate-700"><span className="text-xs font-medium text-slate-500">Landlord response: </span>{a.landlord_response}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}