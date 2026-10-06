import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { PageHeader, SectionCard, Field } from "@/components/ui-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { User, Save, Trash2 } from "lucide-react";
import RatingPanel from '@/components/reviews/RatingPanel';
import {saveOwnTenantProfile} from '@/lib/tenantAccess';
import {
  AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader,
  AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
} from "@/components/ui/alert-dialog";

export default function MyProfile() {
  const [tenant, setTenant] = useState(null);
  const [busy, setBusy] = useState(false);
  const [saveError,setSaveError]=useState('');
  const [user, setUser] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const load = async () => {
    const me = await base44.auth.me();
    setUser(me);
    if (me) { const t = await base44.entities.Tenant.filter({ user_id: me.id }).then((r) => r[0]); setTenant(t || { full_name: me.full_name || "", email: me.email, user_id: me.id, status: "Active" }); }
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    if(busy)return;
    setBusy(true);setSaveError('');
    try {setTenant(await saveOwnTenantProfile(tenant));}
    catch(error){setSaveError(error.response?.data?.error || error.message);}
    finally{setBusy(false);}
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    setDeleteError("");
    try {
      await base44.functions.invoke("deleteMyAccount", {});
      await base44.auth.logout();
      window.location.href = "/";
    } catch (e) {
      const msg = e?.response?.data?.error || e?.message || "Something went wrong";
      setDeleteError(msg);
      setDeleting(false);
      setDeleteOpen(false);
    }
  };

  if (!tenant) return <div className="flex h-96 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-700" /></div>;
  const upd = (k, v) => setTenant({ ...tenant, [k]: v });

  return (
    <div>
      <PageHeader title="My Profile" description="Keep your details up to date." actions={<Button onClick={save} disabled={busy} className="bg-emerald-600 hover:bg-emerald-700"><Save className="mr-1.5 h-4 w-4" />{busy ? "Saving..." : "Save"}</Button>} />
      {saveError&&<p role="alert" className="mb-4 text-sm text-destructive">{saveError}</p>}
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

      {tenant.id && <RatingPanel entity="TenantReview" filter={{ tenant_id: tenant.id }} title="Ratings from your landlords" />}

      {/* Danger Zone */}
      <div className="mt-6">
        <SectionCard title="Danger Zone">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-slate-800">Delete my account</p>
              <p className="text-sm text-slate-500">Permanently remove your account. Blocked if you own property or hold an active tenancy.</p>
            </div>
            <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={deleting}>
                  <Trash2 className="mr-1.5 h-4 w-4" />
                  {deleting ? "Deleting..." : "Delete my account"}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete your account?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This permanently removes your account and signs you out. You will be blocked if you own property or have an active tenancy. This cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                {deleteError && (
                  <p className="text-sm text-rose-600">{deleteError}</p>
                )}
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteAccount}
                    disabled={deleting}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {deleting ? "Deleting..." : "Yes, delete my account"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}