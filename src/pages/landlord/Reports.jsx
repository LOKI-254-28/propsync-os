import React, { useState, useMemo } from "react";
import { usePortfolioData } from "@/lib/useAppData";
import { KES, monthKey, monthLabel } from "@/lib/finance";
import { propertyStats } from "@/lib/finance";
import { PageHeader, SectionCard, EmptyState, Field } from "@/components/ui-bits";
import { Button } from "@/components/ui/button";
import { BarChart3, Download } from "lucide-react";
import ReportRequestsPanel from '@/components/reports/ReportRequestsPanel';
import {occupancySummary} from '@/lib/occupancy';
import {nairobiToday} from '@/lib/nairobiDates';

const REPORTS = [
  { key: "rent", label: "Rent Collection", desc: "All rent charges with paid/outstanding balances" },
  { key: "arrears", label: "Arrears Report", desc: "Outstanding charges past due date" },
  { key: "tenants", label: "Tenant Register", desc: "All tenants with current balances" },
  { key: "occupancy", label: "Occupancy Report", desc: "Units by status across portfolio" },
  { key: "maintenance", label: "Maintenance Report", desc: "All maintenance tickets with costs" },
  { key: "income", label: "Income & Expenses", desc: "Payments received vs expenses" },
  { key: "tenancyExpiry", label: "Tenancy Expiry", desc: "Upcoming tenancy end dates" },
  { key: "payments", label: "Payment History", desc: "All successful payments" },
];

export default function Reports() {
  const data = usePortfolioData();
  const [active, setActive] = useState("rent");
  const [filterProp, setFilterProp] = useState("");

  const rows = useMemo(() => {
    let r = [];
    if (active === "rent") r = data.charges.filter((c) => !filterProp || c.property_id === filterProp).map((c) => ({ Period: c.billing_period, Tenant: c.tenant_name, Unit: c.unit_number, Property: c.property_name, Amount: c.amount, Paid: c.amount_paid, Outstanding: c.outstanding, Status: c.status }));
    else if (active === "arrears") r = data.charges.filter((c) => c.status !== "Void" && c.outstanding > 0 && c.due_date && c.due_date < nairobiToday() && (!filterProp || c.property_id === filterProp)).map((c) => ({ Period: c.billing_period, Tenant: c.tenant_name, Unit: c.unit_number, Due: c.due_date, Outstanding: c.outstanding, Status: c.status }));
    else if (active === "tenants") r = data.tenants.map((t) => { const outstanding = data.charges.filter((c) => c.tenant_id === t.id && c.status !== "Void" && c.status !== "Paid").reduce((s, c) => s + Number(c.outstanding || 0), 0); const tenancy = data.tenancies.find((x) => x.tenant_id === t.id && ["Active", "Expiring Soon", "Notice Given"].includes(x.status)); return { Name: t.full_name, Email: t.email, Phone: t.phone, Unit: tenancy?.unit_number || "—", Status: t.status, Outstanding: outstanding }; });
    else if (active === "occupancy") r = occupancySummary(data.units,data.tenancies).units.filter((u) => !filterProp || u.property_id === filterProp).map((u) => ({ Unit: u.unit_number, Property: u.property_name, Type: u.unit_type, Bedrooms: u.bedrooms, Rent: u.monthly_rent, Tenant: u.current_tenant_name || "—", Status: u.status }));
    else if (active === "maintenance") r = data.maintenance.filter((m) => !filterProp || m.property_id === filterProp).map((m) => ({ Ticket: m.ticket_number, Title: m.title, Unit: m.unit_number, Category: m.category, Priority: m.priority, Status: m.status, Cost: m.actual_cost || 0, Date: m.date_reported }));
    else if (active === "income") { const pays = data.payments.filter((p) => p.status === "Successful" && (!filterProp || p.property_id === filterProp)); const exps = data.expenses.filter((e) => !filterProp || e.property_id === filterProp); r = [...pays.map((p) => ({ Date: p.payment_date, Type: "Income", Description: `Payment — ${p.tenant_name}`, Amount: p.amount })), ...exps.map((e) => ({ Date: e.date, Type: "Expense", Description: `${e.category} — ${e.description}`, Amount: -e.amount }))].sort((a, b) => new Date(b.Date) - new Date(a.Date)); }
    else if (active === "tenancyExpiry") r = data.tenancies.filter((t) => t.expected_end_date && (!filterProp || t.property_id === filterProp)).sort((a, b) => new Date(a.expected_end_date) - new Date(b.expected_end_date)).map((t) => ({ Reference: t.tenancy_reference, Tenant: t.tenant_name, Unit: t.unit_number, Start: t.start_date, End: t.expected_end_date, Status: t.status }));
    else if (active === "payments") r = data.payments.filter((p) => p.status === "Successful" && (!filterProp || p.property_id === filterProp)).sort((a, b) => new Date(b.payment_date) - new Date(a.payment_date)).map((p) => ({ Reference: p.payment_reference, Date: p.payment_date, Tenant: p.tenant_name, Unit: p.unit_number, Method: p.method, Amount: p.amount, Receipt: p.receipt_number }));
    return r;
  }, [active, data, filterProp]);

  const exportCSV = () => {
    if (!rows.length) return;
    const headers = Object.keys(rows[0]);
    const csv = [headers.join(","), ...rows.map((r) => headers.map((h) => `"${String(r[h] ?? "").replace(/"/g, '""')}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `${active}-report-${monthKey()}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  if (data.loading) return <div className="flex h-96 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-700" /></div>;

  return (
    <div>
      <PageHeader title="Reports" description="Generate and export reports from live data." actions={<Button onClick={exportCSV} variant="outline" disabled={!rows.length}><Download className="mr-1.5 h-4 w-4" />Export CSV</Button>} />

      <ReportRequestsPanel properties={data.properties} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {REPORTS.map((r) => (
          <button key={r.key} onClick={() => setActive(r.key)} className={`rounded-xl border p-4 text-left transition ${active === r.key ? "border-emerald-500 bg-emerald-50" : "border-slate-200 bg-white hover:border-emerald-300"}`}>
            <BarChart3 className={`mb-2 h-5 w-5 ${active === r.key ? "text-emerald-600" : "text-slate-400"}`} />
            <p className="font-medium text-slate-900">{r.label}</p>
            <p className="text-xs text-slate-500">{r.desc}</p>
          </button>
        ))}
      </div>

      <div className="mt-4"><Field label="Filter by property"><select value={filterProp} onChange={(e) => setFilterProp(e.target.value)} className="rounded-md border border-input bg-background px-3 py-2 text-sm"><option value="">All properties</option>{data.properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field></div>

      <SectionCard title={`${REPORTS.find((r) => r.key === active)?.label} — ${rows.length} records`} className="mt-4">
        {rows.length === 0 ? <EmptyState icon={BarChart3} title="No data for this report" /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-slate-100 text-left text-xs uppercase text-slate-500">{Object.keys(rows[0]).map((h) => <th key={h} className="pb-2 pr-4 font-medium">{h}</th>)}</tr></thead>
              <tbody>
                {rows.slice(0, 100).map((r, i) => (
                  <tr key={i} className="border-b border-slate-50">{Object.keys(r).map((h) => <td key={h} className="py-2 pr-4 text-slate-700">{["Amount", "Paid", "Outstanding", "Rent", "Cost", "Outstanding"].includes(h) ? KES(r[h]) : String(r[h] ?? "")}</td>)}</tr>
                ))}
              </tbody>
            </table>
            {rows.length > 100 && <p className="mt-2 text-xs text-slate-400">Showing first 100 records. Export CSV for full data.</p>}
          </div>
        )}
      </SectionCard>
    </div>
  );
}