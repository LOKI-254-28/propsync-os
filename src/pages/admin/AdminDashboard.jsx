import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { KES, monthKey, monthLabel } from "@/lib/finance";
import { StatCard, PageHeader, SectionCard, StatusBadge, EmptyState } from "@/components/ui-bits";
import AdminApprovalSection from "@/components/AdminApprovalSection";
import DashboardAlerts from '@/components/alerts/DashboardAlerts';
import TenantDataWipe from '@/components/admin/TenantDataWipe';
import {occupancySummary} from '@/lib/occupancy';
import {
  Building2, DoorOpen, Users, Wallet, AlertTriangle, Wrench, TrendingUp,
  Receipt, ArrowRight, FileText, ScrollText, Clock, Trash2,
} from "lucide-react";

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [properties, setProperties] = useState([]);
  const [units, setUnits] = useState([]);
  const [tenancies, setTenancies] = useState([]);
  const [payments, setPayments] = useState([]);
  const [maintenance, setMaintenance] = useState([]);
  const [applications, setApplications] = useState([]);


  const loadDashboard = async () => {
    try {
      const [u, p, un, t, pay, m, a] = await Promise.all([
        base44.entities.User.list('-created_date', 500),
        base44.entities.Property.list('-created_date', 500),
        base44.entities.Unit.list('-created_date', 500),
        base44.entities.Tenancy.list('-created_date', 500),
        base44.entities.Payment.list('-created_date', 500),
        base44.entities.Maintenance.list('-created_date', 500),
        base44.entities.Application.list('-created_date', 500),
      ]);
      setUsers(u); setProperties(p); setUnits(un); setTenancies(t);
      setPayments(pay); setMaintenance(m); setApplications(a);
    } finally { setLoading(false); }
  };
  useEffect(() => { loadDashboard(); }, []);

  const stats = useMemo(() => {
      const occupancy=occupancySummary(units,tenancies);
      const activeTenancies=occupancy.tenancies;
      const occupiedCount=occupancy.occupied.length,availableCount=occupancy.available.length,vacantCount=occupancy.vacant.length;
      const openMaintenance = maintenance.filter((m) => !["Completed", "Closed", "Rejected"].includes(m.status)).length;
      const mk = monthKey();
      const expectedThisMonth = activeTenancies.reduce((s,t)=>s+Number(t.monthly_rent || 0),0);
      const collectedThisMonth = payments.filter((p) => p.status === "Successful" && p.payment_date && p.payment_date.startsWith(mk)).reduce((s, p) => s + (p.amount || 0), 0);
      const pendingUsers = users.filter((u) => u.approval_status === "pending").length;
      const landowners = users.filter((u) => u.account_type === "landowner").length;
      const clients = users.filter((u) => u.account_type === "client").length;
      const admins = users.filter((u) => u.role === "admin").length;
      return {
        totalUsers: users.length, pendingUsers, landowners, clients, admins,
        properties: properties.length, units: occupancy.live.length, occupiedCount, availableCount, vacantCount,
        activeTenancies: activeTenancies.length, openMaintenance,
        expectedThisMonth, collectedThisMonth,
        applications: applications.length,
      };
    }, [users, properties, units, tenancies, payments, maintenance, applications]);

  if (loading) return <div className="flex h-96 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-700" /></div>;

  const recentPayments = [...payments].sort((a, b) => new Date(b.payment_date) - new Date(a.payment_date)).slice(0, 6);
  const openApps = applications.filter((a) => ["Pending", "Under Review", "Submitted"].includes(a.status)).slice(0, 5);
  const openMaint = maintenance.filter((m) => !["Completed", "Closed", "Rejected"].includes(m.status)).slice(0, 5);

  return (
    <div>
      <PageHeader title="Admin Dashboard" description="Platform-wide oversight — all landowners, properties, and tenant activity." />

      <AdminApprovalSection key={users.length} />
      <DashboardAlerts />

      {/* User Overview */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Users" value={stats.totalUsers} sub={`${stats.landowners} landowners · ${stats.clients} tenants`} icon={Users} accent="emerald" />
        <StatCard label="Pending Approvals" value={stats.pendingUsers} icon={Clock} accent="gold" />
        <StatCard label="Properties" value={stats.properties} icon={Building2} accent="emerald" />
        <StatCard label="Total Units" value={stats.units} sub={`${stats.occupiedCount} occupied · ${stats.availableCount} available`} icon={DoorOpen} accent="blue" />
      </div>

      {/* Financial Overview */}
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={`Expected — ${monthLabel(monthKey())}`} value={KES(stats.expectedThisMonth)} icon={TrendingUp} accent="emerald" />
        <StatCard label={`Collected — ${monthLabel(monthKey())}`} value={KES(stats.collectedThisMonth)} icon={Wallet} accent="emerald" />
        <StatCard label="Active Tenancies" value={stats.activeTenancies} icon={ScrollText} accent="blue" />
        <StatCard label="Open Maintenance" value={stats.openMaintenance} icon={Wrench} accent="gold" />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Applications" value={stats.applications} icon={FileText} accent="blue" />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <SectionCard title="Recent Payments (All Properties)" actions={<Link to="/rent" className="text-sm font-medium text-emerald-700 hover:underline">View ledger →</Link>}>
            {recentPayments.length === 0 ? (
              <EmptyState icon={Wallet} title="No payments recorded yet" description="Payments across all properties will appear here." />
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
          <SectionCard title="Alerts">
            <div className="space-y-3 text-sm">
              <AlertRow icon={Clock} count={stats.pendingUsers} label="Pending approvals" to="/admin/users" />
              <AlertRow icon={FileText} count={openApps.length} label="Open applications" to="/applications" />
              <AlertRow icon={Wrench} count={stats.openMaintenance} label="Open maintenance" to="/maintenance" />
              <AlertRow icon={DoorOpen} count={stats.vacantCount} label="Vacant units" to="/units" />
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
              <QuickAction icon={Building2} label="Properties" to="/properties" />
              <QuickAction icon={Users} label="Tenants" to="/tenants" />
              <QuickAction icon={Wallet} label="Rent" to="/rent" />
              <QuickAction icon={Receipt} label="Reports" to="/reports" />
            </div>
          </SectionCard>
        </div>
      </div>

      <TenantDataWipe onComplete={loadDashboard} />
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