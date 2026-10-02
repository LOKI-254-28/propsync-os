import React, { useState, useMemo } from "react";
import { usePortfolioData } from "@/lib/useAppData";
import { KES } from "@/lib/finance";
import { PageHeader, SectionCard, StatusBadge, EmptyState, Field } from "@/components/ui-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Users, Plus, Search, Phone, Mail } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { secureCreate } from "@/lib/secureCreate";
import TenantStats from "@/components/tenants/TenantStats";
import RatingPanel from '@/components/reviews/RatingPanel';

export default function Tenants() {
  const data = usePortfolioData();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ full_name: "", email: "", phone: "", id_number: "", occupation: "", employer: "", monthly_income: 0, emergency_contact_name: "", emergency_contact_phone: "", current_address: "", notes: "" });

  const tenantsWithStats = useMemo(() => data.tenants.map((t) => {
    const tenancies = data.tenancies.filter((x) => x.tenant_id === t.id);
    const active = tenancies.find((x) => ["Active", "Expiring Soon", "Notice Given"].includes(x.status));
    const charges = data.charges.filter((c) => c.tenant_id === t.id);
    const outstanding = charges.filter((c) => c.status !== "Void" && c.status !== "Paid").reduce((s, c) => s + Number(c.outstanding || 0), 0);
    return { ...t, activeTenancy: active, tenancyCount: tenancies.length, outstanding };
  }), [data]);

  const filtered = tenantsWithStats.filter((t) => t.full_name?.toLowerCase().includes(search.toLowerCase()) || t.email?.toLowerCase().includes(search.toLowerCase()) || t.phone?.includes(search));

  const create = async () => {
    if (!form.full_name) return;
    await secureCreate("Tenant", { ...form, status: "Active" });
    setOpen(false);
    setForm({ full_name: "", email: "", phone: "", id_number: "", occupation: "", employer: "", monthly_income: 0, emergency_contact_name: "", emergency_contact_phone: "", current_address: "", notes: "" });
    data.reload();
  };

  if (data.loading) return <div className="flex h-96 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-700" /></div>;

  return (
    <div>
      <PageHeader title="Tenants" description="Tenant directory with current balances and tenancy history." actions={<Button onClick={() => setOpen(true)} className="bg-emerald-600 hover:bg-emerald-700"><Plus className="mr-1.5 h-4 w-4" />Add Tenant</Button>} />

      <TenantStats tenants={data.tenants} tenancies={data.tenancies} charges={data.charges} />

      <div className="mb-4 relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, email, phone..." className="pl-9" />
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Users} title="No tenants found" />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((t) => (
            <div key={t.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-50 text-base font-semibold text-emerald-700">{t.full_name?.[0]?.toUpperCase()}</div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-slate-900">{t.full_name}</p>
                  <StatusBadge status={t.status} />
                </div>
              </div>
              <div className="mt-3 space-y-1 text-xs text-slate-500">
                {t.phone && <p className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" />{t.phone}</p>}
                {t.email && <p className="flex items-center gap-1.5 truncate"><Mail className="h-3.5 w-3.5" />{t.email}</p>}
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 border-t border-slate-100 pt-3 text-center">
                <div><p className="text-sm font-semibold text-slate-900">{t.activeTenancy ? t.activeTenancy.unit_number : "—"}</p><p className="text-[10px] uppercase text-slate-500">Current Unit</p></div>
                <div><p className={`text-sm font-semibold ${t.outstanding > 0 ? "text-rose-600" : "text-emerald-700"}`}>{KES(t.outstanding)}</p><p className="text-[10px] uppercase text-slate-500">Balance</p></div>
              </div>
              <RatingPanel entity="TenantReview" filter={{ tenant_id: t.id }} targetId={t.id} canRate={t.tenancyCount > 0} title="Tenant ratings" />
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Add Tenant</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2 max-h-[60vh] overflow-y-auto">
            <Field label="Full name"><Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></Field>
            <Field label="Email"><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
            <Field label="Phone"><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
            <Field label="ID number"><Input value={form.id_number} onChange={(e) => setForm({ ...form, id_number: e.target.value })} /></Field>
            <Field label="Occupation"><Input value={form.occupation} onChange={(e) => setForm({ ...form, occupation: e.target.value })} /></Field>
            <Field label="Employer"><Input value={form.employer} onChange={(e) => setForm({ ...form, employer: e.target.value })} /></Field>
            <Field label="Monthly income"><Input type="number" value={form.monthly_income} onChange={(e) => setForm({ ...form, monthly_income: Number(e.target.value) })} /></Field>
            <Field label="Emergency contact"><Input value={form.emergency_contact_name} onChange={(e) => setForm({ ...form, emergency_contact_name: e.target.value })} /></Field>
            <Field label="Emergency phone"><Input value={form.emergency_contact_phone} onChange={(e) => setForm({ ...form, emergency_contact_phone: e.target.value })} /></Field>
            <div className="col-span-2"><Field label="Current address"><Textarea value={form.current_address} onChange={(e) => setForm({ ...form, current_address: e.target.value })} rows={2} /></Field></div>
            <div className="col-span-2"><Field label="Notes"><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} /></Field></div>
          </div>
          <DialogFooter><Button onClick={create} className="bg-emerald-600 hover:bg-emerald-700">Create Tenant</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}