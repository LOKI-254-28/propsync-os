import React, { useState, useMemo } from "react";
import { usePortfolioData } from "@/lib/useAppData";
import { KES, propertyStats } from "@/lib/finance";
import { PageHeader, SectionCard, EmptyState } from "@/components/ui-bits";
import { Columns3, TrendingUp, TrendingDown } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";

export default function PropertyComparison() {
  const data = usePortfolioData();
  const [selected, setSelected] = useState([]);

  const toggle = (id) => setSelected((s) => s.includes(id) ? s.filter((x) => x !== id) : s.length < 4 ? [...s, id] : s);

  const compared = useMemo(() => selected.map((id) => {
    const p = data.properties.find((x) => x.id === id);
    const s = propertyStats(p, data);
    const maint = data.maintenance.filter((m) => m.property_id === id);
    const resolved = maint.filter((m) => ["Completed", "Closed"].includes(m.status));
    const avgResDays = resolved.length ? Math.round(resolved.reduce((sum, m) => {
      const d = m.completion_date && m.date_reported ? (new Date(m.completion_date) - new Date(m.date_reported)) / 86400000 : 0; return sum + d;
    }, 0) / resolved.length) : 0;
    const maintCost = maint.reduce((sum, m) => sum + Number(m.actual_cost || 0), 0);
    return { name: p.name, ...s, maintCount: maint.length, maintCost, avgResDays, collectionRate: s.expectedRent ? Math.round((s.collected / s.expectedRent) * 100) : 0, vacancyRate: 100 - s.occupancyRate };
  }), [selected, data]);

  const metrics = [
    { key: "units", label: "Units" }, { key: "occupied", label: "Occupied" }, { key: "occupancyRate", label: "Occupancy %", suffix: "%" },
    { key: "expectedRent", label: "Expected Rent", money: true }, { key: "collected", label: "Collected", money: true }, { key: "collectionRate", label: "Collection %", suffix: "%" },
    { key: "arrears", label: "Arrears", money: true }, { key: "expenses", label: "Expenses", money: true }, { key: "netIncome", label: "Net Income", money: true },
    { key: "maintCount", label: "Maintenance" }, { key: "maintCost", label: "Maint. Cost", money: true }, { key: "avgResDays", label: "Avg Resolution (d)" }, { key: "vacancyRate", label: "Vacancy %", suffix: "%" },
  ];

  if (data.loading) return <div className="flex h-96 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-700" /></div>;

  const chartData = compared.map((c) => ({ name: c.name.split(" ")[0], "Expected Rent": c.expectedRent, Collected: c.collected, Arrears: c.arrears, Expenses: c.expenses }));

  return (
    <div>
      <PageHeader title="Property Comparison" description="Select up to 4 properties. All figures derive from real records." />

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {data.properties.map((p) => (
          <button key={p.id} onClick={() => toggle(p.id)} className={`rounded-xl border p-3 text-left transition ${selected.includes(p.id) ? "border-emerald-500 bg-emerald-50" : "border-slate-200 bg-white hover:border-emerald-300"}`}>
            <div className="flex items-center justify-between"><span className="font-medium text-slate-900 text-sm">{p.name}</span>{selected.includes(p.id) && <span className="h-2 w-2 rounded-full bg-emerald-500" />}</div>
            <p className="text-xs text-slate-500">{data.units.filter((u) => u.property_id === p.id).length} units</p>
          </button>
        ))}
      </div>

      {compared.length < 2 ? (
        <EmptyState icon={Columns3} title="Select at least 2 properties to compare" description="Pick properties above to see side-by-side metrics and charts." />
      ) : (
        <div className="space-y-6">
          <SectionCard title="Financial Comparison">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-slate-100 text-left text-xs uppercase text-slate-500"><th className="pb-2 font-medium">Metric</th>{compared.map((c) => <th key={c.name} className="pb-2 text-right font-medium">{c.name}</th>)}</tr></thead>
                <tbody>
                  {metrics.map((m) => {
                    const max = Math.max(...compared.map((c) => Number(c[m.key]) || 0));
                    return (
                      <tr key={m.key} className="border-b border-slate-50">
                        <td className="py-2 font-medium text-slate-700">{m.label}</td>
                        {compared.map((c) => {
                          const val = Number(c[m.key]) || 0;
                          const isMax = val === max && max > 0;
                          return <td key={c.name} className={`py-2 text-right ${isMax ? "font-semibold text-emerald-700" : "text-slate-800"}`}>{m.money ? KES(val) : `${val}${m.suffix || ""}`}</td>;
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </SectionCard>

          {chartData.length > 0 && (
            <SectionCard title="Revenue & Arrears Chart">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
                  <Tooltip formatter={(v) => KES(v)} contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0" }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="Expected Rent" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Collected" fill="#059669" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Arrears" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Expenses" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </SectionCard>
          )}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {compared.map((c) => (
              <SectionCard key={c.name} title={c.name}>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <Metric label="Occupancy" value={`${c.occupancyRate}%`} good={c.occupancyRate >= 80} />
                  <Metric label="Collection Rate" value={`${c.collectionRate}%`} good={c.collectionRate >= 80} />
                  <Metric label="Net Income" value={KES(c.netIncome)} good={c.netIncome > 0} />
                  <Metric label="Arrears" value={KES(c.arrears)} good={c.arrears === 0} />
                  <Metric label="Avg Resolution" value={`${c.avgResDays}d`} />
                  <Metric label="Vacancy" value={`${c.vacancyRate}%`} good={c.vacancyRate < 20} />
                </div>
              </SectionCard>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Metric({ label, value, good }) {
  return <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2"><span className="text-slate-600">{label}</span><span className={`flex items-center gap-1 font-semibold ${good === true ? "text-emerald-700" : good === false ? "text-rose-600" : "text-slate-900"}`}>{good === true && <TrendingUp className="h-3.5 w-3.5" />}{good === false && <TrendingDown className="h-3.5 w-3.5" />}{value}</span></div>;
}