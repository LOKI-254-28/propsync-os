import React, { useState, useMemo } from "react";
import { usePortfolioData } from "@/lib/useAppData";
import { KES } from "@/lib/finance";
import { PageHeader, SectionCard, StatusBadge, EmptyState } from "@/components/ui-bits";
import { Input } from "@/components/ui/input";

import { Wrench, Search, Eye } from "lucide-react";
import MaintenanceStatusTracker from "@/components/MaintenanceStatusTracker";

import MaintenanceDialog from '@/components/maintenance/MaintenanceDialog.jsx';

const STATUSES = ["Submitted", "Acknowledged", "Assigned", "Scheduled", "In Progress", "Awaiting Parts", "Completed", "Closed", "Rejected"];

export default function Maintenance() {
  const data = usePortfolioData();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("");
  const [view, setView] = useState(null);


  const list = useMemo(() => data.maintenance
    .filter((m) => !filter || m.status === filter)
    .filter((m) => !search || m.title?.toLowerCase().includes(search.toLowerCase()) || m.ticket_number?.toLowerCase().includes(search.toLowerCase()) || m.unit_number?.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => new Date(b.date_reported || b.created_date) - new Date(a.date_reported || a.created_date)), [data.maintenance, search, filter]);

  const openView = m => setView(m);

  if (data.loading) return <div className="flex h-96 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-700" /></div>;

  return (
    <div>
      <PageHeader title="Maintenance / Repairs" description="Ticketing system for repairs and maintenance across all units." />

      <div className="mb-4 flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search tickets..." className="pl-9" />
        </div>
        <select value={filter} onChange={(e) => setFilter(e.target.value)} className="rounded-md border border-input bg-background px-3 py-2 text-sm">
          <option value="">All statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s==='Submitted'?'Reported':s==='Assigned'?'Contractor assigned':s}</option>)}
        </select>
      </div>

      {list.length === 0 ? <EmptyState icon={Wrench} title="No maintenance tickets" /> : (
        <SectionCard>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-slate-100 text-left text-xs uppercase text-slate-500">
                <th className="pb-2 font-medium">Ticket</th><th className="pb-2 font-medium">Title</th><th className="pb-2 font-medium">Unit</th><th className="pb-2 font-medium">Category</th><th className="pb-2 font-medium">Priority</th><th className="pb-2 text-right font-medium">Cost</th><th className="pb-2 text-right font-medium">Status</th><th className="pb-2"></th>
              </tr></thead>
              <tbody>
                {list.map((m) => (
                  <tr key={m.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                    <td className="py-2.5 font-mono text-xs text-slate-600">{m.ticket_number}</td>
                    <td className="py-2.5 font-medium text-slate-800">{m.title}</td>
                    <td className="py-2.5 text-slate-600">{m.unit_number}</td>
                    <td className="py-2.5 text-slate-600">{m.category}</td>
                    <td className="py-2.5"><StatusBadge status={m.priority} /></td>
                    <td className="py-2.5 text-right text-slate-900">{m.actual_cost ? KES(m.actual_cost) : "—"}</td>
                    <td className="py-2.5 text-right"><MaintenanceStatusTracker status={m.status} updates={m.public_updates} /></td>
                    <td className="py-2.5 text-right"><button onClick={() => openView(m)} className="text-emerald-700 hover:text-emerald-800"><Eye className="h-4 w-4" /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}

      {view&&<MaintenanceDialog maintenanceId={view.id} onClose={()=>setView(null)} onUpdated={()=>{setView(null);data.reload();}}/>}
    </div>
  );
}