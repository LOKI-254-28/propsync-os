import React from "react";
import { useParams, Link } from "react-router-dom";
import { usePortfolioData } from "@/lib/useAppData";
import { propertyStats, KES } from "@/lib/finance";
import { PageHeader, StatCard, SectionCard, StatusBadge, EmptyState } from "@/components/ui-bits";
import { Building2, DoorOpen, Users, Wallet, AlertTriangle, Wrench, Receipt, ArrowLeft } from "lucide-react";

export default function PropertyDetail() {
  const { id } = useParams();
  const data = usePortfolioData();
  const property = data.properties.find((p) => p.id === id);

  if (data.loading) return <div className="flex h-96 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-700" /></div>;
  if (!property) return <EmptyState icon={Building2} title="Property not found" action={<Link to="/properties" className="text-emerald-700 hover:underline">Back to properties</Link>} />;

  const s = propertyStats(property, data);
  const units = data.units.filter((u) => u.property_id === property.id);
  const tenancies = data.tenancies.filter((t) => t.property_id === property.id);
  const expenses = data.expenses.filter((e) => e.property_id === property.id);
  const maint = data.maintenance.filter((m) => m.property_id === property.id);

  return (
    <div>
      <Link to="/properties" className="mb-3 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-emerald-700"><ArrowLeft className="h-4 w-4" />All properties</Link>
      <PageHeader title={property.name} description={`${property.code} · ${property.address || "No address"}`} actions={<StatusBadge status={property.status} />} />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Units" value={s.units} sub={`${s.occupied} occupied`} icon={DoorOpen} accent="blue" />
        <StatCard label="Occupancy" value={`${s.occupancyRate}%`} icon={Users} accent="emerald" />
        <StatCard label="Expected Rent" value={KES(s.expectedRent)} icon={Wallet} accent="emerald" />
        <StatCard label="Collected (mo)" value={KES(s.collected)} icon={Wallet} accent="emerald" />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Arrears" value={KES(s.arrears)} icon={AlertTriangle} accent="rose" />
        <StatCard label="Expenses" value={KES(s.expenses)} icon={Receipt} accent="gold" />
        <StatCard label="Net Income" value={KES(s.netIncome)} icon={Wallet} accent="emerald" />
        <StatCard label="Open Maintenance" value={s.maintenance} icon={Wrench} accent="gold" />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <SectionCard title="Units" actions={<Link to="/units" className="text-sm text-emerald-700 hover:underline">Manage →</Link>}>
          {units.length === 0 ? <p className="text-sm text-slate-500">No units yet.</p> : (
            <div className="space-y-2">
              {units.map((u) => (
                <div key={u.id} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2">
                  <div><p className="font-medium text-slate-800">{u.unit_number} · {u.unit_type}</p><p className="text-xs text-slate-500">{u.current_tenant_name || "Vacant"}</p></div>
                  <div className="flex items-center gap-3"><span className="text-sm font-medium text-slate-900">{KES(u.monthly_rent)}</span><StatusBadge status={u.status} /></div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
        <SectionCard title="Recent Expenses">
          {expenses.length === 0 ? <p className="text-sm text-slate-500">No expenses recorded.</p> : (
            <div className="space-y-2">
              {expenses.slice(0, 6).map((e) => (
                <div key={e.id} className="flex items-center justify-between border-b border-slate-50 pb-2"><div><p className="text-sm font-medium text-slate-800">{e.category}</p><p className="text-xs text-slate-500">{e.date} · {e.vendor || "—"}</p></div><span className="text-sm font-medium text-slate-900">{KES(e.amount)}</span></div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}