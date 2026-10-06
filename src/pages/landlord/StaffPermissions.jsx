import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { logAudit } from "@/lib/finance";
import { PageHeader, SectionCard, StatusBadge, EmptyState, Field } from "@/components/ui-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ShieldCheck, Plus, Trash2 } from "lucide-react";
import StaffFeedbackScope from '@/components/feedback/StaffFeedbackScope';

const MODULES = ["Dashboard", "Properties", "Units", "Tenants", "Applications", "Tenancies", "Rent", "Payments", "Arrears", "Maintenance", "Inspections", "Notices", "Documents", "Reports", "Expenses", "Contractors", "Feedback"];

export default function StaffPermissions() {
  const [staff, setStaff] = useState([]);
  const [users, setUsers] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ user_id: "", staff_name: "", permissions: ["Dashboard"] });
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const [s, u] = await Promise.all([base44.entities.StaffPermission.list(), base44.entities.User.list()]);
    setStaff(s);
    setUsers(u.filter((x) => x.role === "user"));
  };
  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!form.user_id) return;
    setBusy(true);
    const u = users.find((x) => x.id === form.user_id);
    const me = await base44.auth.me();
    const rec = await base44.entities.StaffPermission.create({ user_id: form.user_id, user_email: u?.email, staff_name: form.staff_name || u?.full_name || u?.email, permissions: form.permissions, feedback_property_ids:form.feedback_property_ids || [], active: true });
    await logAudit({ user: me, action: "Staff Added", entity: "StaffPermission", entity_id: rec.id, entity_name: u?.email });
    setBusy(false);
    setOpen(false);
    setForm({ user_id: "", staff_name: "", permissions: ["Dashboard"] });
    load();
  };

  const togglePerm = async (s, perm) => {
    const perms = s.permissions.includes(perm) ? s.permissions.filter((x) => x !== perm) : [...s.permissions, perm];
    await base44.entities.StaffPermission.update(s.id, { permissions: perms });
    load();
  };

  const remove = async (s) => { await base44.entities.StaffPermission.delete(s.id); load(); };

  return (
    <div>
      <PageHeader title="Staff & Permissions" description="Create staff accounts and configure module-level permissions." actions={<Button onClick={() => setOpen(true)} className="bg-emerald-600 hover:bg-emerald-700"><Plus className="mr-1.5 h-4 w-4" />Add Staff</Button>} />
      {staff.length === 0 ? <EmptyState icon={ShieldCheck} title="No staff configured" description="Add staff members and grant module access. Staff are created from existing user accounts." /> : (
        <div className="space-y-4">
          {staff.map((s) => (
            <SectionCard key={s.id} title={s.staff_name} actions={<button onClick={() => remove(s)} className="text-rose-600 hover:text-rose-700"><Trash2 className="h-4 w-4" /></button>}>
              <p className="mb-3 text-xs text-slate-500">{s.user_email}</p>
              <div className="flex flex-wrap gap-1.5">
                {MODULES.map((m) => {
                  const sel = s.permissions.includes(m);
                  return <button key={m} onClick={() => togglePerm(s, m)} className={`rounded-full border px-2.5 py-1 text-xs ${sel ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-slate-200 text-slate-500 hover:bg-slate-50"}`}>{m}</button>;
                })}
              </div>
              {s.permissions.includes('Feedback')&&<StaffFeedbackScope value={s.feedback_property_ids || []} onChange={async ids=>{await base44.entities.StaffPermission.update(s.id,{feedback_property_ids:ids});await load();}}/>}
            </SectionCard>
          ))}
        </div>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add Staff Member</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <Field label="User account"><select value={form.user_id} onChange={(e) => setForm({ ...form, user_id: e.target.value })} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"><option value="">Select user...</option>{users.map((u) => <option key={u.id} value={u.id}>{u.email}</option>)}</select></Field>
            <Field label="Display name"><Input value={form.staff_name} onChange={(e) => setForm({ ...form, staff_name: e.target.value })} placeholder="Auto from account" /></Field>
            <div><p className="mb-1.5 text-sm font-medium text-slate-700">Initial permissions</p><div className="flex flex-wrap gap-1.5">{MODULES.map((m) => { const sel = form.permissions.includes(m); return <button key={m} type="button" onClick={() => setForm({ ...form, permissions: sel ? form.permissions.filter((x) => x !== m) : [...form.permissions, m] })} className={`rounded-full border px-2.5 py-1 text-xs ${sel ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-slate-200 text-slate-500"}`}>{m}</button>; })}</div></div>
            {form.permissions.includes('Feedback')&&<StaffFeedbackScope value={form.feedback_property_ids || []} onChange={ids=>setForm(previous=>({...previous,feedback_property_ids:ids}))}/>}
            <p className="text-xs text-slate-400">Note: staff accounts are created from existing user accounts. To invite a new user, use the App Users dashboard to send an invitation, then add them here.</p>
          </div>
          <DialogFooter><Button onClick={create} disabled={busy} className="bg-emerald-600 hover:bg-emerald-700">{busy ? "Adding..." : "Add Staff"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}