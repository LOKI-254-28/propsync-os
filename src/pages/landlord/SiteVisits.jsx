import React, { useMemo } from "react";
import { usePortfolioData } from "@/lib/useAppData";
import { PageHeader, StatusBadge, EmptyState } from "@/components/ui-bits";
import { CalendarClock } from "lucide-react";
import VisitPanel from "@/components/applications/VisitPanel";
import ProceedPanel from "@/components/applications/ProceedPanel";

export default function SiteVisits() {
  const data = usePortfolioData();
  const list = useMemo(() => data.applications
    .filter((a) => ["Site Visit Requested", "Site Visit Scheduled", "Site Visit Completed"].includes(a.status))
    .sort((a, b) => `${a.site_visit_date || ""}${a.site_visit_time || ""}`.localeCompare(`${b.site_visit_date || ""}${b.site_visit_time || ""}`)), [data.applications]);
  const pending = list.filter((a) => a.status === "Site Visit Requested" && a.site_visit_proposed_by !== "landlord").length;

  if (data.loading) return <div className="flex h-96 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-700" /></div>;

  return (
    <div>
      <PageHeader title="Site Visits" description={pending ? `${pending} visit request(s) waiting for your response.` : "Accept or reschedule visit requests from prospective tenants."} />
      {list.length === 0 ? <EmptyState icon={CalendarClock} title="No site visits" description="Visit requests from tenants will appear here." /> : (
        <div className="space-y-3">
          {list.map((a) => (
            <div key={a.id} className="space-y-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-slate-900">{a.applicant_name} · {a.unit_number} · {a.property_name}</p>
                  <p className="font-mono text-xs text-slate-500">{a.application_reference}</p>
                </div>
                <StatusBadge status={a.status} />
              </div>
              <VisitPanel app={a} role="landlord" onUpdated={data.reload} />
              <ProceedPanel app={a} onUpdated={data.reload} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}