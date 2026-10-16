import React, { useMemo, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import useDashboardSummary from '@/hooks/useDashboardSummary';
import { base44 } from "@/api/base44Client";
import { portfolioStats, KES, monthKey, monthLabel } from "@/lib/finance";
import { StatCard, PageHeader, SectionCard, StatusBadge, EmptyState } from "@/components/ui-bits";
import AdminApprovalSection from "@/components/AdminApprovalSection";
import DashboardAlerts from '@/components/alerts/DashboardAlerts';
import {nairobiToday,addDays} from '@/lib/nairobiDates';
import {
  Building2, DoorOpen, Users, Wallet, AlertTriangle, Wrench, TrendingUp,
  Receipt, Columns3, ArrowRight, ClipboardCheck, FileText, ScrollText,
} from "lucide-react";

export default function Dashboard() {
  const summary = useDashboardSummary();
  const isAdmin = summary.user?.role === 'admin';
  if (summary.loading) return <div className="flex h-96 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-border border-t-primary" /></div>;
  if (summary.error) return <p role="alert" className="text-destructive">Could not load your dashboard. <button className="underline" onClick={()=>summary.refetch()}>Try again</button></p>;
  const {stats,recentPayments,openApps,openMaint} = summary.data;

  return (
    <div>
      <PageHeader title={isAdmin ? "Admin Dashboard" : "Portfolio Dashboard"} description={isAdmin ? "Platform overview and pending account approvals." : "Live performance across all properties — every figure is computed from real records."} />

      {isAdmin && <AdminApprovalSection />}
      <DashboardAlerts />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Properties" value={stats.propertiesCount} icon={Building2} accent="emerald" />
        <StatCard label="Total Units" value={stats.unitsCount} sub={`${stats.occupiedCount} occupied · ${stats.availableCount} available`} icon={DoorOpen} accent="blue" />
        <StatCard label="Occupancy Rate" value={`${stats.occupancyRate}%`} sub={`${stats.activeTenancies} active tenancies`} icon={Users} accent="emerald" />
        <StatCard label="Open Maintenance" value={stats.openMaintenance} icon={Wrench} accent="gold" />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={`Expected — ${monthLabel(monthKey())}`} value={KES(stats.expectedThisMonth)} icon={TrendingUp} accent="emerald" />
        <StatCard label={`Collected — ${monthLabel(monthKey())}`} value={KES(stats.collectedThisMonth)} sub={`${stats.collectionRate}% collection rate`} icon={Wallet} accent="emerald" />
        <StatCard label="Outstanding Rent" value={KES(stats.outstanding)} icon={Receipt} accent="gold" />
        <StatCard label="Arrears" value={KES(stats.arrearsTotal)} sub={`${stats.arrearsCount} overdue charges`} icon={AlertTriangle} accent="rose" />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <SectionCard title="Recent Payments" actions={<Link to="/rent" className="text-sm font-medium text-emerald-700 hover:underline">View ledger →</Link>}>
            {recentPayments.length === 0 ? (
              <EmptyState icon={Wallet} title="No payments recorded yet" description="Recorded payments will appear here." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-slate-100 text-left text-xs uppercase text-slate-500"><th className="pb-2 font-medium">Reference</th><th className="pb-2 font-medium">Tenant</th><th className="pb-2 font-medium">Unit</th><th className="pb-2 font-medium">Date</th><th className="pb-2 text-right font-medium">Amount</th><th className="pb-2 text-right font-medium">Status</th></tr></thead>
                  <tbody>
                    {recentPayments.map((p) => (
                      <tr key={p.id} className="border-b border-slate-50">
                        <td className="py-2.5 font-mono text-xs text-slate-600">{p.payment_reference}</td>
                        <td className="py-2.5 text-slate-800">{p.tenant_name}</td>
                        <td className="py-2.5 text-slate-600">{p.unit_number}</td>
                        <td className="py-2.5 text-slate-600">{p.payment_date}</td>
                        <td className="py-2.5 text-right font-medium text-slate-900">{KES(p.amount)}</td>
                        <td className="py-2.5 text-right"><StatusBadge status={p.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>

          <SectionCard title="Open Maintenance Tickets" actions={<Link to="/maintenance" className="text-sm font-medium text-emerald-700 hover:underline">All tickets →</Link>}>
            {openMaint.length === 0 ? <EmptyState icon={Wrench} title="No open tickets" /> : (
              <div className="space-y-2">
                {openMaint.map((m) => (
                  <Link key={m.id} to="/maintenance" className="flex items-center justify-between rounded-lg border border-slate-100 px-4 py-2.5 hover:bg-slate-50">
                    <div><p className="font-medium text-slate-800">{m.title}</p><p className="text-xs text-slate-500">{m.unit_number} · {m.category} · {m.ticket_number}</p></div>
                    <div className="flex items-center gap-3"><StatusBadge status={m.priority} /><StatusBadge status={m.status} /></div>
                  </Link>
                ))}
              </div>
            )}
          </SectionCard>
        </div>

        <div className="space-y-6">
          <SectionCard title="Alerts" >
            <div className="space-y-3 text-sm">
              <AlertRow icon={FileText} count={stats.pendingApplications} label="Pending applications" to="/applications" />
              <AlertRow icon={ScrollText} count={stats.expiringTenancies} label="Expiring tenancies" to="/tenants?tab=tenancies" />
              <AlertRow icon={AlertTriangle} count={stats.arrearsCount} label="Arrears charges" to="/arrears" />
              <AlertRow icon={DoorOpen} count={stats.vacantCount} label="Vacant units" to="/units" />
              <AlertRow icon={Wrench} count={stats.openMaintenance} label="Open maintenance" to="/maintenance" />
            </div>
          </SectionCard>

          <SectionCard title="Pending Applications">
            {openApps.length === 0 ? <p className="text-sm text-slate-500">No pending applications.</p> : (
              <div className="space-y-2">
                {openApps.map((a) => (
                  <Link key={a.id} to="/applications" className="block rounded-lg border border-slate-100 px-3 py-2 hover:bg-slate-50">
                    <p className="text-sm font-medium text-slate-800">{a.applicant_name}</p>
                    <p className="text-xs text-slate-500">{a.unit_number} · {a.property_name}</p>
                  </Link>
                ))}
              </div>
            )}
          </SectionCard>

          <SectionCard title="Quick Actions">
            <div className="grid grid-cols-2 gap-2">
              <QuickAction icon={Wallet} label="Generate Rent" to="/rent" />
              <QuickAction icon={Columns3} label="Compare" to="/comparison" />
              <QuickAction icon={ClipboardCheck} label="Inspections" to="/inspections" />
              <QuickAction icon={Receipt} label="Expenses" to="/expenses" />
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}

function AlertRow({ icon: Icon, count, label, to }) {
  return (
    <Link to={to} className="flex items-center justify-between rounded-lg px-2 py-1.5 hover:bg-slate-50">
      <div className="flex items-center gap-2.5"><Icon className="h-4 w-4 text-slate-400" /><span className="text-slate-700">{label}</span></div>
      <div className="flex items-center gap-1.5"><span className="font-semibold text-slate-900">{count}</span><ArrowRight className="h-3.5 w-3.5 text-slate-400" /></div>
    </Link>
  );
}

function QuickAction({ icon: Icon, label, to }) {
  return (
    <Link to={to} className="flex flex-col items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-4 text-center hover:border-emerald-300 hover:bg-emerald-50/40">
      <Icon className="h-5 w-5 text-emerald-600" /><span className="text-xs font-medium text-slate-700">{label}</span>
    </Link>
  );
}