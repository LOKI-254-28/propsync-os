import React from "react";
import { StatCard } from "@/components/ui-bits";
import { KES } from "@/lib/finance";
import { Users, Home, AlertTriangle, Wallet, CheckCircle2, TrendingUp } from "lucide-react";

const ACTIVE = ["Active", "Expiring Soon", "Notice Given"];

// Summary statistics computed from real tenants, tenancies and rent charges.
export default function TenantStats({ tenants, tenancies, charges }) {
  const now = new Date();
  const activeTenancies = tenancies.filter((t) => ACTIVE.includes(t.status));
  const housed = new Set(activeTenancies.map((t) => t.tenant_id)).size;
  const due = charges.filter((c) => c.status !== "Void" && c.due_date && new Date(c.due_date) <= now);
  const overdue = due.filter((c) => c.status !== "Paid" && Number(c.outstanding || 0) > 0);
  const inArrears = new Set(overdue.map((c) => c.tenant_id)).size;
  const outstanding = overdue.reduce((s, c) => s + Number(c.outstanding || 0), 0);
  const paidRate = due.length ? Math.round((due.filter((c) => c.status === "Paid").length / due.length) * 100) : 0;
  const avgRent = activeTenancies.length ? activeTenancies.reduce((s, t) => s + Number(t.monthly_rent || 0), 0) / activeTenancies.length : 0;

  return (
    <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
      <StatCard label="Total tenants" value={tenants.length} icon={Users} accent="blue" />
      <StatCard label="Currently housed" value={housed} sub={`${tenants.length - housed} without active tenancy`} icon={Home} />
      <StatCard label="In arrears" value={inArrears} sub={KES(outstanding)} icon={AlertTriangle} accent="rose" />
      <StatCard label="Charges paid" value={`${paidRate}%`} sub={`${due.length} charges due`} icon={CheckCircle2} />
      <StatCard label="Avg. rent" value={KES(avgRent)} icon={TrendingUp} accent="gold" />
      <StatCard label="Outstanding" value={KES(outstanding)} icon={Wallet} accent="slate" />
    </div>
  );
}