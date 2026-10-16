import React, { useMemo } from "react";
import useTenantTenancyPage from '@/hooks/useTenantTenancyPage';
import TenantTenancyTotals from '@/components/tenants/TenantTenancyTotals';
import RecordPageControls from '@/components/account/RecordPageControls';
import { KES, daysBetween, todayISO } from "@/lib/finance";
import { PageHeader, SectionCard, StatusBadge, EmptyState } from "@/components/ui-bits";
import { ScrollText, FileText, Wrench, Bell } from "lucide-react";
import TenancyRating from '@/components/reviews/TenancyRating';
import { downloadFile } from '@/lib/files';

export default function MyTenancy() {
  const t=useTenantTenancyPage();
  const tenancies=t.items;

  if (t.loading) return <div className="flex h-96 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-700" /></div>;

  return (
    <div>
      <PageHeader title="My Tenancies" description="Your current and previous rentals, agreements and ratings." />
      <RecordPageControls page={t} search placeholder="Search tenancies…"/>
      {t.isPending?<p className="py-6 text-sm text-muted-foreground">Loading tenancies…</p>:tenancies.length === 0 ? <EmptyState icon={ScrollText} title="No tenancy records" /> : (
        <div className="space-y-6">
          {tenancies.map((ten) => {

            const daysToExpiry = ten.expected_end_date ? daysBetween(todayISO(), ten.expected_end_date) : null;
            return (
              <SectionCard key={ten.id} title={ten.tenancy_reference} actions={<StatusBadge status={ten.status} />}>
                <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-3">
                  <Info label="Unit" value={`${ten.unit_number} · ${ten.property_name}`} />
                  <Info label="Start date" value={ten.start_date} />
                  <Info label="Expected end" value={ten.expected_end_date || "Open"} />
                  {ten.actual_end_date && <Info label="Actual end" value={ten.actual_end_date} />}
                  {daysToExpiry !== null && <Info label="Days to expiry" value={daysToExpiry > 0 ? `${daysToExpiry} days` : "Expired"} />}
                  <Info label="Monthly rent" value={KES(ten.monthly_rent)} />
                  <Info label="Security deposit" value={KES(ten.security_deposit)} />
                  <Info label="Service charge" value={KES(ten.service_charge)} />
                  <Info label="Payment due" value={`Day ${ten.payment_due_day}`} />
                  <Info label="Grace period" value={`${ten.grace_period_days} days`} />
                  <Info label="Notice period" value={`${ten.notice_period_days} days`} />
                </div>
                <TenantTenancyTotals id={ten.id} charges={{rows:t.chargeTotals}} maintenance={{rows:t.maintenanceTotals}}/>
                {ten.agreement_document_url && <button type="button" onClick={()=>downloadFile(ten.agreement_document_url)} className="mt-3 inline-flex items-center gap-1.5 text-sm text-emerald-700 hover:underline"><FileText className="h-4 w-4" />View tenancy agreement</button>}
                <TenancyRating tenancy={ten} />
              </SectionCard>
            );
          })}
        </div>
      )}
      <RecordPageControls page={t}/>
    </div>
  );
}

function Info({ label, value }) { return <div><p className="text-xs text-slate-500">{label}</p><p className="font-medium text-slate-800">{value}</p></div>; }