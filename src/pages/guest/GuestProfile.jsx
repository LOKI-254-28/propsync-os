import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { PageHeader, SectionCard, Field } from "@/components/ui-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Save, Upload, Loader2, Check } from "lucide-react";
import { normalizeUser } from "@/lib/normalizeUser";
import { toast } from "@/components/ui/use-toast";
import { isTestMode, getTestProfile, setTestProfile } from "@/lib/testProfile";

export default function GuestProfile() {
  const testMode = isTestMode();
  const [user, setUser] = useState(null);
  const [form, setForm] = useState({});
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (testMode) {
      const u = getTestProfile();
      setUser(u);
      setForm({
        full_name: u?.full_name || "",
        phone: u?.phone || "",
        address: u?.address || "",
        city: u?.city || "",
        region: u?.region || "",
        postal_code: u?.postal_code || "",
        country: u?.country || "",
        profile_image: u?.profile_image || "",
      });
      return;
    }
    base44.auth.me().then((raw) => {
      const u = normalizeUser(raw);
      setUser(u);
      setForm({
        full_name: u?.full_name || "",
        phone: u?.phone || "",
        address: u?.address || "",
        city: u?.city || "",
        region: u?.region || "",
        postal_code: u?.postal_code || "",
        country: u?.country || "",
        profile_image: u?.profile_image || "",
      });
    }).catch(() => {});
  }, [testMode]);

  const upd = (k, v) => setForm({ ...form, [k]: v });

  const save = async () => {
    setBusy(true);
    try {
      if (testMode) {
        const updated = { ...getTestProfile(), ...form };
        setTestProfile(updated);
        setUser(updated);
        toast({ title: "Profile updated (Test Mode)", description: "Changes are stored locally only." });
        return;
      }
      await base44.auth.updateMe(form);
      const raw = await base44.auth.me();
      setUser(normalizeUser(raw));
      toast({ title: "Profile updated", description: "Your changes have been saved." });
    } catch (e) {
      toast({ title: "Update failed", description: e.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const handlePhoto = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (testMode) {
      setUploading(true);
      try {
        const reader = new FileReader();
        reader.onload = () => {
          upd("profile_image", reader.result);
          const updated = { ...getTestProfile(), profile_image: reader.result };
          setTestProfile(updated);
          setUser(updated);
        };
        reader.readAsDataURL(file);
      } finally {
        setUploading(false);
      }
      return;
    }
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadPublicFile({ file });
      upd("profile_image", file_url);
    } catch (err) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  if (!user) return <div className="flex h-96 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-700" /></div>;

  return (
    <div>
      <PageHeader title="My Profile" description="Keep your details up to date." actions={<Button onClick={save} disabled={busy} className="bg-emerald-600 hover:bg-emerald-700"><Save className="mr-1.5 h-4 w-4" />{busy ? "Saving..." : "Save"}</Button>} />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <div className="rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm">
            {form.profile_image ? (
              <img src={form.profile_image} alt="Profile" className="mx-auto h-20 w-20 rounded-full object-cover" />
            ) : (
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50 text-2xl font-semibold text-emerald-700">{(form.full_name || user.email)?.[0]?.toUpperCase()}</div>
            )}
            <p className="mt-3 font-semibold text-slate-900">{form.full_name || user.email}</p>
            <p className="text-sm text-slate-500">{user.email}</p>
            <div className="mt-3 flex items-center justify-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700"><Check className="h-3 w-3" /> Active</span>
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">Test Profile</span>
            </div>
            <label className="mt-4 inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50">
              {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
              {uploading ? "Uploading..." : "Upload photo"}
              <input type="file" accept="image/*" className="hidden" onChange={handlePhoto} disabled={uploading} />
            </label>
          </div>
        </div>
        <div className="lg:col-span-2 space-y-6">
          <SectionCard title="Personal Information">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Full name"><Input value={form.full_name || ""} onChange={(e) => upd("full_name", e.target.value)} /></Field>
              <Field label="Email"><Input value={user.email || ""} disabled className="bg-slate-50" /></Field>
              <Field label="Phone"><Input value={form.phone || ""} onChange={(e) => upd("phone", e.target.value)} placeholder="+254..." /></Field>
              <Field label="Country"><Input value={form.country || ""} onChange={(e) => upd("country", e.target.value)} placeholder="Kenya" /></Field>
            </div>
          </SectionCard>
          <SectionCard title="Address">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2"><Field label="Address line"><Textarea value={form.address || ""} onChange={(e) => upd("address", e.target.value)} rows={2} /></Field></div>
              <Field label="City"><Input value={form.city || ""} onChange={(e) => upd("city", e.target.value)} /></Field>
              <Field label="State / Region"><Input value={form.region || ""} onChange={(e) => upd("region", e.target.value)} /></Field>
              <Field label="Postal code"><Input value={form.postal_code || ""} onChange={(e) => upd("postal_code", e.target.value)} /></Field>
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}