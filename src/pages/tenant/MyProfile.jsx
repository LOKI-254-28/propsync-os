import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { PageHeader, SectionCard, Field } from "@/components/ui-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { User, Save } from "lucide-react";

export default function MyProfile() {
  const [tenant, setTenant] = useState(null);
  const [busy, setBusy] = useState(false);
  const [user, setUser] = useState(null);

  const load = async () => {
    const me = await base44.auth.me();
    setUser(me);
    if (me) { const t = await base44.entities.Tenant.filter({ user_id: me.id }).then((r) => r[0]); setTenant(t || { full_name: me.full_name || "", email: me.email, user_id: me.id, status: "Active" }); }
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    setBusy(true);
    if (tenant.id) await base44.entities.Tenant.update(tenant.id, tenant);
    else await base44.entities.Tenant.create({ ...tenant, user_id: user.id, status: "Active" });
    setBusy(false);
    load();
  };

  if (!tenant) return <div className="flex h-96 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-700" /></div>;
  const upd = (k, v) => setTenant({ ...tenant, [k]: v });

  return (
    <div>
      <PageHeader title="My Profile" description="Keep your details up to date." actions={<Button onClick={save} disabled={busy} className="bg-emerald-600 hover:bg-emerald-700"><Save className="mr-1.5 h-4 w-4" />{busy ? "Saving..." : "Save"}</Button>} />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <div className="rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50 text-2xl font-semibold text-emerald-700">{tenant.full_name?.[0]?.toUpperCase() || "T"}</div>
            <p className="mt-3 font-semibold text-slate-900">{tenant.full_name}</p>
            <p className="text-sm text-slate-500">{tenant.email}</p>
          </div>
        </div>
        <div className="lg:col-span-2">
          <SectionCard title="Personal Information">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Full name"><Input value={tenant.full_name || ""} onChange={(e) => upd("full_name", e.target.value)} /></Field>
              <Field label="Email"><Input value={tenant.email || ""} onChange={(e) => upd("email", e.target.value)} /></Field>
              <Field label="Phone"><Input value={tenant.phone || ""} onChange={(e) => upd("phone", e.target.value)} /></Field>
              <Field label="ID number"><Input value={tenant.id_number || ""} onChange={(e) => upd("id_number", e.target.value)} /></Field>
              <Field label="Occupation"><Input value={tenant.occupation || ""} onChange={(e) => upd("occupation", e.target.value)} /></Field>
              <Field label="Employer"><Input value={tenant.employer || ""} onChange={(e) => upd("employer", e.target.value)} /></Field>
              <Field label="Monthly income"><Input type="number" value={tenant.monthly_income || 0} onChange={(e) => upd("monthly_income", Number(e.target.value))} /></Field>
              <Field label="Emergency contact"><Input value={tenant.emergency_contact_name || ""} onChange={(e) => upd("emergency_contact_name", e.target.value)} /></Field>
              <Field label="Emergency phone"><Input value={tenant.emergency_contact_phone || ""} onChange={(e) => upd("emergency_contact_phone", e.target.value)} /></Field>
              <div className="col-span-2"><Field label="Current address"><Textarea value={tenant.current_address || ""} onChange={(e) => upd("current_address", e.target.value)} rows={2} /></Field></div>
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}