import React, { useState, useMemo } from "react";
import { usePortfolioData } from "@/lib/useAppData";
import { base44 } from "@/api/base44Client";
import { KES, genRef, logAudit, notify, todayISO } from "@/lib/finance";
import { PageHeader, SectionCard, StatusBadge, EmptyState, Field } from "@/components/ui-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { FileText, Check, X, MessageSquare, Search } from "lucide-react";

export default function Applications() {
  const data = usePortfolioData();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("");
  const [review, setReview] = useState(null);
  const [response, setResponse] = useState("");
  const [busy, setBusy] = useState(false);

  const list = useMemo(() => data.applications
    .filter((a) => !filter || a.status === filter)
    .filter((a) => !search || a.applicant_name?.toLowerCase().includes(search.toLowerCase()) || a.unit_number?.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => new Date(b.submitted_date || b.created_date) - new Date(a.submitted_date || a.created_date)), [data.applications, search, filter]);

  const decide = async (status) => {
    if (!review) return;
    setBusy(true);
    const me = await base44.auth.me();
    const app = await base44.entities.Application.update(review.id, { status, landlord_response: response });
    await logAudit({ user: me, action: `Application ${status}`, entity: "Application", entity_id: review.id, entity_name: review.application_reference, new_value: { response } });
    if (review.tenant_user_id) await notify({ recipient_user_id: review.tenant_user_id, type: "Application", title: `Application ${status}`, message: `Your application for ${review.unit_number} has been ${status.toLowerCase()}.`, related_entity: "Application", related_id: review.id, action_link: "/portal/applications" });
    if (status === "Rejected") {
      // release unit reservation if it was held
      const unit = data.units.find((u) => u.id === review.unit_id);
      if (unit && unit.status === "Application Pending") await base44.entities.Unit.update(unit.id, { status: "Available" });
    }
    setBusy(false);
    setReview(null);
    setResponse("");
    data.reload();
  };

  const approveAndCreateTenancy = async () => {
    if (!review) return;
    setBusy(true);
    const me = await base44.auth.me();
    const unit = data.units.find((u) => u.id === review.unit_id);
    const tenant = data.tenants.find((t) => t.id === review.tenant_id) || data.tenants.find((t) => t.email === review.applicant_email);
    let tenantRec = tenant;
    if (!tenantRec) {
      tenantRec = await base44.entities.Tenant.create({ full_name: review.applicant_name, email: review.applicant_email, phone: review.applicant_phone, id_number: review.id_number, occupation: review.occupation, monthly_income: review.monthly_income, user_id: review.tenant_user_id, status: "Active" });
    }
    const ref = genRef("TEN");
    const tenancy = await base44.entities.Tenancy.create({
      tenancy_reference: ref, tenant_id: tenantRec.id, tenant_name: tenantRec.full_name, tenant_user_id: tenantRec.user_id || review.tenant_user_id,
      property_id: unit.property_id, property_name: unit.property_name, unit_id: unit.id, unit_number: unit.unit_number,
      start_date: review.proposed_start_date || todayISO(), expected_end_date: "",
      monthly_rent: review.monthly_rent || unit.monthly_rent, security_deposit: unit.security_deposit, service_charge: unit.service_charge,
      payment_due_day: 1, grace_period_days: 7, notice_period_days: 30, status: "Active",
      owner_user_id: unit.owner_user_id || me.id,
    });
    await base44.entities.Unit.update(unit.id, { status: "Occupied", current_tenancy_id: tenancy.id, current_tenant_name: tenantRec.full_name });
    await base44.entities.Application.update(review.id, { status: "Approved", landlord_response: response || "Application approved — tenancy created." });
    const tUserId = tenantRec.user_id || review.tenant_user_id;
    if (tUserId) {
      try { await base44.entities.User.update(tUserId, { approval_status: "approved" }); } catch (e) {}
    }
    await logAudit({ user: me, action: "Application Approved → Tenancy Created", entity: "Tenancy", entity_id: tenancy.id, entity_name: ref });
    if (tUserId) await notify({ recipient_user_id: tUserId, type: "Tenancy", title: "Application Approved!", message: `Your tenancy for ${unit.unit_number} has been created.`, related_entity: "Tenancy", related_id: tenancy.id, action_link: "/portal/tenancy" });
    setBusy(false);
    setReview(null);
    setResponse("");
    data.reload();
  };

  if (data.loading) return <div className="flex h-96 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-700" /></div>;

  return (
    <div>
      <PageHeader title="Applications" description="Review tenant applications and convert approved applications into tenancies." />

      <div className="mb-4 flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search applications..." className="pl-9" />
        </div>
        <select value={filter} onChange={(e) => setFilter(e.target.value)} className="rounded-md border border-input bg-background px-3 py-2 text-sm">
          <option value="">All statuses</option>
          {["Pending", "Under Review", "Approved", "Rejected", "Withdrawn", "Expired"].map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>

      {list.length === 0 ? <EmptyState icon={FileText} title="No applications" /> : (
        <SectionCard>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-slate-100 text-left text-xs uppercase text-slate-500">
                <th className="pb-2 font-medium">Reference</th><th className="pb-2 font-medium">Applicant</th><th className="pb-2 font-medium">Unit</th><th className="pb-2 font-medium">Property</th><th className="pb-2 text-right font-medium">Rent</th><th className="pb-2 text-right font-medium">Status</th><th className="pb-2"></th>
              </tr></thead>
              <tbody>
                {list.map((a) => (
                  <tr key={a.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                    <td className="py-2.5 font-mono text-xs text-slate-600">{a.application_reference}</td>
                    <td className="py-2.5 font-medium text-slate-800">{a.applicant_name}</td>
                    <td className="py-2.5 text-slate-600">{a.unit_number}</td>
                    <td className="py-2.5 text-slate-600">{a.property_name}</td>
                    <td className="py-2.5 text-right text-slate-900">{KES(a.monthly_rent)}</td>
                    <td className="py-2.5 text-right"><StatusBadge status={a.status} /></td>
                    <td className="py-2.5 text-right"><Button size="sm" variant="outline" onClick={() => { setReview(a); setResponse(a.landlord_response || ""); }} className="h-7 text-xs">Review</Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}

      <Dialog open={!!review} onOpenChange={() => setReview(null)}>
        <DialogContent className="max-w-lg">
          {review && (
            <>
              <DialogHeader><DialogTitle>Application — {review.applicant_name}</DialogTitle></DialogHeader>
              <div className="grid grid-cols-2 gap-3 py-2 text-sm">
                <Info label="Reference" value={review.application_reference} />
                <Info label="Submitted" value={review.submitted_date} />
                <Info label="Email" value={review.applicant_email} />
                <Info label="Phone" value={review.applicant_phone} />
                <Info label="ID Number" value={review.id_number || "—"} />
                <Info label="Occupation" value={review.occupation || "—"} />
                <Info label="Monthly income" value={review.monthly_income ? KES(review.monthly_income) : "—"} />
                <Info label="Unit" value={`${review.unit_number} · ${review.property_name}`} />
                <Info label="Proposed start" value={review.proposed_start_date || "—"} />
                <Info label="Status" value={<StatusBadge status={review.status} />} />
              </div>
                {review.message && <div className="mt-2 rounded-lg bg-slate-50 p-3 text-sm text-slate-700"><span className="text-xs font-medium text-slate-500">Applicant message</span><p className="mt-1">{review.message}</p></div>}
              <Field label="Landlord response"><Textarea value={response} onChange={(e) => setResponse(e.target.value)} rows={3} placeholder="Optional message to applicant..." /></Field>
              <DialogFooter className="flex-col gap-2 sm:flex-row">
                {["Pending", "Under Review"].includes(review.status) && (
                  <>
                    <Button onClick={() => decide("Rejected")} disabled={busy} variant="outline" className="border-rose-200 text-rose-700 hover:bg-rose-50"><X className="mr-1.5 h-4 w-4" />Reject</Button>
                    <Button onClick={() => decide("Under Review")} disabled={busy} variant="outline"><MessageSquare className="mr-1.5 h-4 w-4" />Mark Under Review</Button>
                    <Button onClick={approveAndCreateTenancy} disabled={busy} className="bg-emerald-600 hover:bg-emerald-700"><Check className="mr-1.5 h-4 w-4" />Approve → Create Tenancy</Button>
                  </>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Info({ label, value }) {
  return <div><p className="text-xs text-slate-500">{label}</p><p className="font-medium text-slate-800">{value}</p></div>;
}