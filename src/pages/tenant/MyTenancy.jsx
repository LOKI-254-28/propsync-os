import React, { useMemo } from "react";
import { useTenantData } from "@/lib/useTenantData";
import { KES, daysBetween, todayISO } from "@/lib/finance";
import { PageHeader, SectionCard, StatusBadge, EmptyState } from "@/components/ui-bits";
import { ScrollText, FileText, Wrench, Bell } from "lucide-react";

export default function MyTenancy() {
  const t = useTenantData();
  const tenancies = useMemo(() => [...t.tenancies].sort((a, b) => new Date(b.start_date) - new Date(a.start_date)), [t.tenancies]);
  const active = tenancies.find((x) => ["Active", "Expiring Soon", "Notice Given"].includes(x.status));

  if (t.loading) return <div className="flex h-96 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-700" /></div>;

  return (
    <div>
      <PageHeader title="My Tenancy" description="Your tenancy agreement and terms." />
      {tenancies.length === 0 ? <EmptyState icon={ScrollText} title="No tenancy records" /> : (
        <div className="space-y-6">
          {tenancies.map((ten) => {
            const charges = t.charges.filter((c) => c.tenancy_id === ten.id);
            const outstanding = charges.filter((c) => c.status !== "Void" && c.status !== "Paid").reduce((s, c) => s + Number(c.outstanding || 0), 0);
            const maint = t.maintenance.filter((m) => m.tenancy_id === ten.id);
            const notices = t.notices.filter((n) => n.tenancy_id === ten.id);
            const daysToExpiry = ten.expected_end_date ? daysBetween(todayISO(), ten.expected_end_date) : null;
            return (
              <SectionCard key={ten.id} title={ten.tenancy_reference} actions={<StatusBadge status={ten.status} />}>
                <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-3">
                  <Info label="Unit" value={`${ten.unit_number} · ${ten.property_name}`} />
                  <Info label="Start date" value={ten.start_date} />
                  <Info label="Expected end" value={ten.expected_end_date || "Open"} />
                  {daysToExpiry !== null && <Info label="Days to expiry" value={daysToExpiry > 0 ? `${daysToExpiry} days` : "Expired"} />}
                  <Info label="Monthly rent" value={KES(ten.monthly_rent)} />
                  <Info label="Security deposit" value={KES(ten.security_deposit)} />
                  <Info label="Service charge" value={KES(ten.service_charge)} />
                  <Info label="Payment due" value={`Day ${ten.payment_due_day}`} />
                  <Info label="Grace period" value={`${ten.grace_period_days} days`} />
                  <Info label="Notice period" value={`${ten.notice_period_days} days`} />
                </div>
                <div className="mt-4 grid grid-cols-3 gap-3 rounded-lg bg-slate-50 p-3 text-center">
                  <div><p className="text-xs text-slate-500">Charges</p><p className="font-semibold">{charges.length}</p></div>
                  <div><p className="text-xs text-slate-500">Outstanding</p><p className={`font-semibold ${outstanding > 0 ? "text-rose-600" : "text-emerald-700"}`}>{KES(outstanding)}</p></div>
                  <div><p className="text-xs text-slate-500">Maintenance</p><p className="font-semibold">{maint.length}</p></div>
                </div>
                {ten.agreement_document_url && <a href={ten.agreement_document_url} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1.5 text-sm text-emerald-700 hover:underline"><FileText className="h-4 w-4" />View tenancy agreement</a>}
              </SectionCard>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Info({ label, value }) { return <div><p className="text-xs text-slate-500">{label}</p><p className="font-medium text-slate-800">{value}</p></div>; }