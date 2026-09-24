import React, { useMemo } from "react";
import { useTenantData } from "@/lib/useTenantData";
import { KES } from "@/lib/finance";
import { PageHeader, SectionCard, StatusBadge, EmptyState } from "@/components/ui-bits";
import { Building2, Home, FileSignature, ScrollText, Banknote } from "lucide-react";

export default function MyProperties() {
  const t = useTenantData();

  const activeRentals = useMemo(() => (t.tenancies || []).filter((x) => ["Active", "Expiring Soon", "Notice Given"].includes(x.status)), [t.tenancies]);
  const pastRentals = useMemo(() => (t.tenancies || []).filter((x) => ["Terminated", "Vacated", "Archived"].includes(x.status)), [t.tenancies]);
  const purchases = useMemo(() => (t.saleTransactions || []), [t.saleTransactions]);
  const activeLeases = useMemo(() => (t.leases || []).filter((x) => ["Active", "Expiring Soon"].includes(x.status)), [t.leases]);
  const pastLeases = useMemo(() => (t.leases || []).filter((x) => ["Terminated", "Completed"].includes(x.status)), [t.leases]);

  if (t.loading) return <div className="flex h-96 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-700" /></div>;

  const empty = activeRentals.length === 0 && purchases.length === 0 && activeLeases.length === 0;

  return (
    <div>
      <PageHeader title="My Properties" description="Your rentals, purchases, and leases in one place." />

      {empty && pastRentals.length === 0 && pastLeases.length === 0 ? (
        <EmptyState icon={Building2} title="No properties yet" description="Browse listings and apply to get started." />
      ) : (
        <div className="space-y-6">
          {/* Rentals */}
          {(activeRentals.length > 0 || pastRentals.length > 0) && (
            <SectionCard title="Rentals">
              {activeRentals.length > 0 && (
                <div className="mb-4">
                  <p className="mb-2 text-xs font-medium uppercase text-slate-500">Active</p>
                  <div className="space-y-2">
                    {activeRentals.map((r) => (
                      <div key={r.id} className="flex items-center justify-between rounded-lg border border-slate-100 px-4 py-3">
                        <div><p className="font-medium text-slate-800">{r.unit_number} · {r.property_name}</p><p className="text-xs text-slate-500">{KES(r.monthly_rent)}/mo · Started {r.start_date}</p></div>
                        <StatusBadge status={r.status} />
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {pastRentals.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-medium uppercase text-slate-500">Previous</p>
                  <div className="space-y-2">
                    {pastRentals.map((r) => (
                      <div key={r.id} className="flex items-center justify-between rounded-lg border border-slate-100 px-4 py-3 opacity-70">
                        <div><p className="font-medium text-slate-800">{r.unit_number} · {r.property_name}</p><p className="text-xs text-slate-500">{r.start_date} → {r.actual_end_date || "—"}</p></div>
                        <StatusBadge status={r.status} />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </SectionCard>
          )}

          {/* Purchases */}
          {purchases.length > 0 && (
            <SectionCard title="Purchases">
              <div className="space-y-2">
                {purchases.map((p) => (
                  <div key={p.id} className="flex items-center justify-between rounded-lg border border-slate-100 px-4 py-3">
                    <div><p className="font-medium text-slate-800">{p.property_name} {p.unit_number && `· ${p.unit_number}`}</p><p className="text-xs text-slate-500">{KES(p.sale_price)} · Balance {KES(p.balance)}</p></div>
                    <StatusBadge status={p.status} />
                  </div>
                ))}
              </div>
            </SectionCard>
          )}

          {/* Leases */}
          {(activeLeases.length > 0 || pastLeases.length > 0) && (
            <SectionCard title="Leases">
              {activeLeases.length > 0 && (
                <div className="mb-4">
                  <p className="mb-2 text-xs font-medium uppercase text-slate-500">Active</p>
                  <div className="space-y-2">
                    {activeLeases.map((l) => (
                      <div key={l.id} className="flex items-center justify-between rounded-lg border border-slate-100 px-4 py-3">
                        <div><p className="font-medium text-slate-800">{l.property_name} {l.unit_number && `· ${l.unit_number}`}</p><p className="text-xs text-slate-500">{KES(l.monthly_fee)}/mo · {l.start_date} → {l.end_date || "—"}</p></div>
                        <StatusBadge status={l.status} />
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {pastLeases.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-medium uppercase text-slate-500">Previous</p>
                  <div className="space-y-2">
                    {pastLeases.map((l) => (
                      <div key={l.id} className="flex items-center justify-between rounded-lg border border-slate-100 px-4 py-3 opacity-70">
                        <div><p className="font-medium text-slate-800">{l.property_name} {l.unit_number && `· ${l.unit_number}`}</p><p className="text-xs text-slate-500">{l.start_date} → {l.end_date || "—"}</p></div>
                        <StatusBadge status={l.status} />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </SectionCard>
          )}
        </div>
      )}
    </div>
  );
}