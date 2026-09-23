import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import { useTenantData } from "@/lib/useTenantData";
import { KES, monthKey, monthLabel, daysBetween, todayISO } from "@/lib/finance";
import { StatCard, PageHeader, SectionCard, StatusBadge, EmptyState } from "@/components/ui-bits";
import { Wallet, DoorOpen, Wrench, Bell, ScrollText, AlertTriangle, FileText, Search } from "lucide-react";

export default function TenantDashboard() {
  const t = useTenantData();
  const activeTenancy = t.tenancies.find((x) => ["Active", "Expiring Soon", "Notice Given"].includes(x.status));

  const outstanding = useMemo(() => t.charges.filter((c) => c.status !== "Void" && c.status !== "Paid").reduce((s, c) => s + Number(c.outstanding || 0), 0), [t.charges]);
  const thisMonthCharges = t.charges.filter((c) => c.billing_period === monthKey());
  const openMaint = t.maintenance.filter((m) => !["Completed", "Closed", "Rejected"].includes(m.status));
  const unreadNotices = t.notices.filter((n) => !n.acknowledged);

  if (t.loading) return <div className="flex h-96 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-700" /></div>;

  return (
    <div>
      <PageHeader title={`Welcome, ${t.tenant?.full_name?.split(" ")[0] || "Tenant"}`} description="Your rental account overview." />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Current Unit" value={activeTenancy?.unit_number || "—"} sub={activeTenancy?.property_name} icon={DoorOpen} accent="emerald" />
        <StatCard label="Outstanding Balance" value={KES(outstanding)} sub={outstanding > 0 ? "Action required" : "All clear"} icon={Wallet} accent={outstanding > 0 ? "rose" : "emerald"} />
        <StatCard label="Open Maintenance" value={openMaint.length} icon={Wrench} accent="gold" />
        <StatCard label="Unread Notices" value={unreadNotices.length} icon={Bell} accent="blue" />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <SectionCard title="This Month's Rent" actions={<Link to="/portal/rent" className="text-sm text-emerald-700 hover:underline">View ledger →</Link>}>
          {thisMonthCharges.length === 0 ? <p className="text-sm text-slate-500">No charges for {monthLabel(monthKey())} yet.</p> : (
            <div className="space-y-2">
              {thisMonthCharges.map((c) => (
                <div key={c.id} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2.5">
                  <div><p className="text-sm font-medium text-slate-800">{monthLabel(c.billing_period)}</p><p className="text-xs text-slate-500">Due {c.due_date}</p></div>
                  <div className="text-right"><p className="font-semibold text-slate-900">{KES(c.outstanding)}</p><StatusBadge status={c.status} /></div>
                </div>
              ))}
              {outstanding > 0 && <Link to="/portal/rent"><button className="mt-2 w-full rounded-lg bg-emerald-600 py-2 text-sm font-medium text-white hover:bg-emerald-700">Pay Now</button></Link>}
            </div>
          )}
        </SectionCard>

        <SectionCard title="My Tenancy" actions={activeTenancy && <Link to="/portal/tenancy" className="text-sm text-emerald-700 hover:underline">Details →</Link>}>
          {activeTenancy ? (
            <div className="space-y-2 text-sm">
              <Row label="Reference" value={activeTenancy.tenancy_reference} />
              <Row label="Unit" value={`${activeTenancy.unit_number} · ${activeTenancy.property_name}`} />
              <Row label="Monthly rent" value={KES(activeTenancy.monthly_rent)} />
              <Row label="Started" value={activeTenancy.start_date} />
              {activeTenancy.expected_end_date && <Row label="Ends" value={activeTenancy.expected_end_date} />}
              <Row label="Status" value={<StatusBadge status={activeTenancy.status} />} />
            </div>
          ) : <EmptyState icon={ScrollText} title="No active tenancy" description="Browse available units and apply." action={<Link to="/portal/units" className="text-emerald-700 hover:underline">Browse units →</Link>} />}
        </SectionCard>

        <SectionCard title="Recent Maintenance" actions={<Link to="/portal/maintenance" className="text-sm text-emerald-700 hover:underline">All →</Link>}>
          {openMaint.length === 0 ? <p className="text-sm text-slate-500">No open tickets.</p> : (
            <div className="space-y-2">{openMaint.slice(0, 4).map((m) => <div key={m.id} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2"><div><p className="text-sm font-medium text-slate-800">{m.title}</p><p className="text-xs text-slate-500">{m.category}</p></div><StatusBadge status={m.status} /></div>)}</div>
          )}
        </SectionCard>

        <SectionCard title="Recent Notices" actions={<Link to="/portal/notices" className="text-sm text-emerald-700 hover:underline">All →</Link>}>
          {t.notices.length === 0 ? <p className="text-sm text-slate-500">No notices.</p> : (
            <div className="space-y-2">{t.notices.slice(0, 4).map((n) => <div key={n.id} className="rounded-lg border border-slate-100 px-3 py-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-slate-800">{n.subject}</p><StatusBadge status={n.type} /></div><p className="text-xs text-slate-500">{n.date_issued}</p></div>)}</div>
          )}
        </SectionCard>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <QuickLink to="/portal/units" icon={Search} label="Browse Units" />
        <QuickLink to="/portal/maintenance" icon={Wrench} label="Report Issue" />
        <QuickLink to="/portal/feedback" icon={FileText} label="Give Feedback" />
        <QuickLink to="/portal/vacation" icon={AlertTriangle} label="Vacation Notice" />
      </div>
    </div>
  );
}

function Row({ label, value }) { return <div className="flex justify-between"><span className="text-slate-500">{label}</span><span className="font-medium text-slate-800">{value}</span></div>; }
function QuickLink({ to, icon: Icon, label }) { return <Link to={to} className="flex flex-col items-center gap-2 rounded-xl border border-slate-200 bg-white py-5 hover:border-emerald-300 hover:bg-emerald-50/40"><Icon className="h-5 w-5 text-emerald-600" /><span className="text-sm font-medium text-slate-700">{label}</span></Link>; }