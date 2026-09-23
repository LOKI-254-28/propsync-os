import React, { useState, useMemo } from "react";
import { usePortfolioData } from "@/lib/useAppData";
import { KES, genRef, logAudit, todayISO, daysBetween, notify } from "@/lib/finance";
import { base44 } from "@/api/base44Client";
import { PageHeader, SectionCard, StatusBadge, EmptyState, Field, Money } from "@/components/ui-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ScrollText, Plus, Search, Eye } from "lucide-react";

export default function Tenancies() {
  const data = usePortfolioData();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [view, setView] = useState(null);
  const [form, setForm] = useState({ tenant_id: "", unit_id: "", start_date: todayISO(), expected_end_date: "", monthly_rent: 0, security_deposit: 0, service_charge: 0, payment_due_day: 1, grace_period_days: 7, notice_period_days: 30 });

  const list = useMemo(() => data.tenancies.filter((t) => t.tenant_name?.toLowerCase().includes(search.toLowerCase()) || t.unit_number?.toLowerCase().includes(search.toLowerCase()) || t.tenancy_reference?.toLowerCase().includes(search.toLowerCase())), [data.tenancies, search]);

  const availableTenants = data.tenants.filter((t) => t.status === "Active");
  const availableUnits = data.units.filter((u) => ["Available", "Vacant"].includes(u.status));

  const create = async () => {
    if (!form.tenant_id || !form.unit_id) return;
    const tenant = data.tenants.find((t) => t.id === form.tenant_id);
    const unit = data.units.find((u) => u.id === form.unit_id);
    const ref = genRef("TEN");
    const rec = await base44.entities.Tenancy.create({
      tenancy_reference: ref,
      tenant_id: tenant.id, tenant_name: tenant.full_name, tenant_user_id: tenant.user_id,
      property_id: unit.property_id, property_name: unit.property_name,
      unit_id: unit.id, unit_number: unit.unit_number,
      start_date: form.start_date, expected_end_date: form.expected_end_date,
      monthly_rent: form.monthly_rent || unit.monthly_rent, security_deposit: form.security_deposit || unit.security_deposit,
      service_charge: form.service_charge || unit.service_charge,
      payment_due_day: form.payment_due_day, grace_period_days: form.grace_period_days, notice_period_days: form.notice_period_days,
      status: "Active",
    });
    await base44.entities.Unit.update(unit.id, { status: "Occupied", current_tenancy_id: rec.id, current_tenant_name: tenant.full_name });
    await logAudit({ user: await base44.auth.me(), action: "Tenancy Created", entity: "Tenancy", entity_id: rec.id, entity_name: ref });
    if (tenant.user_id) await notify({ recipient_user_id: tenant.user_id, type: "Tenancy", title: "Tenancy Activated", message: `Your tenancy for ${unit.unit_number} has been activated.`, related_entity: "Tenancy", related_id: rec.id, action_link: "/portal/tenancy" });
    setOpen(false);
    setForm({ tenant_id: "", unit_id: "", start_date: todayISO(), expected_end_date: "", monthly_rent: 0, security_deposit: 0, service_charge: 0, payment_due_day: 1, grace_period_days: 7, notice_period_days: 30 });
    data.reload();
  };

  if (data.loading) return <div className="flex h-96 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-700" /></div>;

  return (
    <div>
      <PageHeader title="Tenancies" description="All tenancy agreements, active and historical." actions={<Button onClick={() => setOpen(true)} className="bg-emerald-600 hover:bg-emerald-700"><Plus className="mr-1.5 h-4 w-4" />Create Tenancy</Button>} />

      <div className="mb-4 relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search tenancies..." className="pl-9" />
      </div>

      {list.length === 0 ? <EmptyState icon={ScrollText} title="No tenancies found" /> : (
        <SectionCard>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-slate-100 text-left text-xs uppercase text-slate-500">
                <th className="pb-2 font-medium">Reference</th><th className="pb-2 font-medium">Tenant</th><th className="pb-2 font-medium">Unit</th><th className="pb-2 font-medium">Property</th><th className="pb-2 font-medium">Start</th><th className="pb-2 text-right font-medium">Rent</th><th className="pb-2 text-right font-medium">Status</th><th className="pb-2"></th>
              </tr></thead>
              <tbody>
                {list.map((t) => (
                  <tr key={t.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                    <td className="py-2.5 font-mono text-xs text-slate-600">{t.tenancy_reference}</td>
                    <td className="py-2.5 font-medium text-slate-800">{t.tenant_name}</td>
                    <td className="py-2.5 text-slate-600">{t.unit_number}</td>
                    <td className="py-2.5 text-slate-600">{t.property_name}</td>
                    <td className="py-2.5 text-slate-600">{t.start_date}</td>
                    <td className="py-2.5 text-right font-medium text-slate-900">{KES(t.monthly_rent)}</td>
                    <td className="py-2.5 text-right"><StatusBadge status={t.status} /></td>
                    <td className="py-2.5 text-right"><button onClick={() => setView(t)} className="text-emerald-700 hover:text-emerald-800"><Eye className="h-4 w-4" /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}

      {/* Create tenancy */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Create Tenancy</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <Field label="Tenant">
              <select value={form.tenant_id} onChange={(e) => setForm({ ...form, tenant_id: e.target.value })} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="">Select tenant...</option>
                {availableTenants.map((t) => <option key={t.id} value={t.id}>{t.full_name}</option>)}
              </select>
            </Field>
            <Field label="Unit (available only)">
              <select value={form.unit_id} onChange={(e) => { const u = data.units.find((x) => x.id === e.target.value); setForm({ ...form, unit_id: e.target.value, monthly_rent: u?.monthly_rent || 0, security_deposit: u?.security_deposit || 0, service_charge: u?.service_charge || 0 }); }} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="">Select unit...</option>
                {availableUnits.map((u) => <option key={u.id} value={u.id}>{u.unit_number} — {u.property_name}</option>)}
              </select>
            </Field>
            <Field label="Start date"><Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} /></Field>
            <Field label="Expected end date"><Input type="date" value={form.expected_end_date} onChange={(e) => setForm({ ...form, expected_end_date: e.target.value })} /></Field>
            <Field label="Monthly rent"><Input type="number" value={form.monthly_rent} onChange={(e) => setForm({ ...form, monthly_rent: Number(e.target.value) })} /></Field>
            <Field label="Security deposit"><Input type="number" value={form.security_deposit} onChange={(e) => setForm({ ...form, security_deposit: Number(e.target.value) })} /></Field>
            <Field label="Service charge"><Input type="number" value={form.service_charge} onChange={(e) => setForm({ ...form, service_charge: Number(e.target.value) })} /></Field>
            <Field label="Payment due day"><Input type="number" value={form.payment_due_day} onChange={(e) => setForm({ ...form, payment_due_day: Number(e.target.value) })} /></Field>
            <Field label="Grace period (days)"><Input type="number" value={form.grace_period_days} onChange={(e) => setForm({ ...form, grace_period_days: Number(e.target.value) })} /></Field>
            <Field label="Notice period (days)"><Input type="number" value={form.notice_period_days} onChange={(e) => setForm({ ...form, notice_period_days: Number(e.target.value) })} /></Field>
          </div>
          <DialogFooter><Button onClick={create} className="bg-emerald-600 hover:bg-emerald-700">Create Tenancy</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View tenancy */}
      <Dialog open={!!view} onOpenChange={() => setView(null)}>
        <DialogContent className="max-w-lg">
          {view && <TenancyDetailDialog tenancy={view} data={data} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TenancyDetailDialog({ tenancy, data }) {
  const charges = data.charges.filter((c) => c.tenancy_id === tenancy.id).sort((a, b) => new Date(a.due_date) - new Date(b.due_date));
  const payments = data.payments.filter((p) => p.tenancy_id === tenancy.id).sort((a, b) => new Date(b.payment_date) - new Date(a.payment_date));
  const outstanding = charges.filter((c) => c.status !== "Void" && c.status !== "Paid").reduce((s, c) => s + Number(c.outstanding || 0), 0);
  const paid = charges.reduce((s, c) => s + Number(c.amount_paid || 0), 0);
  const daysToExpiry = tenancy.expected_end_date ? daysBetween(todayISO(), tenancy.expected_end_date) : null;
  return (
    <div>
      <DialogHeader><DialogTitle>Tenancy {tenancy.tenancy_reference}</DialogTitle></DialogHeader>
      <div className="grid grid-cols-2 gap-3 py-2 text-sm">
        <Info label="Tenant" value={tenancy.tenant_name} />
        <Info label="Unit" value={`${tenancy.unit_number} · ${tenancy.property_name}`} />
        <Info label="Start date" value={tenancy.start_date} />
        <Info label="Expected end" value={tenancy.expected_end_date || "Open"} />
        {daysToExpiry !== null && <Info label="Days to expiry" value={daysToExpiry > 0 ? `${daysToExpiry} days` : "Expired"} />}
        <Info label="Monthly rent" value={KES(tenancy.monthly_rent)} />
        <Info label="Security deposit" value={KES(tenancy.security_deposit)} />
        <Info label="Due day" value={`Day ${tenancy.payment_due_day} · ${tenancy.grace_period_days}d grace`} />
        <Info label="Notice period" value={`${tenancy.notice_period_days} days`} />
        <Info label="Status" value={<StatusBadge status={tenancy.status} />} />
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 rounded-lg bg-slate-50 p-3 text-center">
        <div><p className="text-xs text-slate-500">Total Charged</p><p className="font-semibold text-slate-900">{KES(charges.reduce((s, c) => s + Number(c.amount || 0), 0))}</p></div>
        <div><p className="text-xs text-slate-500">Total Paid</p><p className="font-semibold text-emerald-700">{KES(paid)}</p></div>
        <div><p className="text-xs text-slate-500">Outstanding</p><p className="font-semibold text-rose-600">{KES(outstanding)}</p></div>
      </div>
      <div className="mt-3 max-h-48 overflow-y-auto">
        <p className="mb-1.5 text-xs font-medium uppercase text-slate-500">Recent Charges</p>
        {charges.slice(-5).reverse().map((c) => (
          <div key={c.id} className="flex items-center justify-between border-b border-slate-50 py-1.5 text-sm"><span className="text-slate-600">{c.billing_period}</span><span className="text-slate-900">{KES(c.amount)}</span><span className="text-emerald-700">{KES(c.amount_paid)}</span><StatusBadge status={c.status} /></div>
        ))}
        {charges.length === 0 && <p className="text-sm text-slate-400">No charges yet.</p>}
      </div>
    </div>
  );
}

function Info({ label, value }) {
  return <div><p className="text-xs text-slate-500">{label}</p><p className="font-medium text-slate-800">{value}</p></div>;
}