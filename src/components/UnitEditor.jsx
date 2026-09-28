import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/ui-bits";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Loader2, X, Image as ImageIcon, Save, Send, Copy } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

const UNIT_TYPES = ["Studio", "1 Bedroom", "2 Bedroom", "3 Bedroom", "Penthouse", "Commercial", "Other"];
const AMENITIES = ["Parking", "Balcony", "Lift", "Gym", "Pool", "Security", "Borehole", "Backup Generator", "Internet", "Garden"];
const ROOMS = ["Living room", "Kitchen", "Bedroom", "Bathroom", "Balcony", "Exterior"];

export default function UnitEditor({ open, unit, onClose, onSaved }) {
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [uploadingRoom, setUploadingRoom] = useState(null);
  const [tenants, setTenants] = useState([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (unit) {
      base44.entities.Tenant.list("-created_date", 200).then(setTenants).catch(() => {});
      setInviteEmail("");
      setForm({
        unit_number: unit.unit_number || "",
        unit_type: unit.unit_type || "1 Bedroom",
        bedrooms: unit.bedrooms ?? 1,
        bathrooms: unit.bathrooms ?? 1,
        size_sqm: unit.size_sqm ?? 0,
        monthly_rent: unit.monthly_rent ?? 0,
        security_deposit: unit.security_deposit ?? 0,
        service_charge: unit.service_charge ?? 0,
        furnished: !!unit.furnished,
        amenities: unit.amenities || [],
        description: unit.description || "",
        room_photos: unit.room_photos || [],
      });
    }
  }, [unit]);

  if (!form || !unit) return null;

  const toggleAmenity = (a) =>
    setForm({
      ...form,
      amenities: form.amenities.includes(a) ? form.amenities.filter((x) => x !== a) : [...form.amenities, a],
    });

  const uploadRoom = async (room, files) => {
    const valid = Array.from(files).filter(
      (f) => ["image/jpeg", "image/png", "image/webp"].includes(f.type) && f.size <= 10 * 1024 * 1024
    );
    if (!valid.length) {
      toast({ title: "Upload error", description: "Only JPG, PNG, or WebP up to 10MB.", variant: "destructive" });
      return;
    }
    setUploadingRoom(room);
    try {
      const added = [];
      for (const f of valid) {
        const { file_url } = await base44.integrations.Core.UploadPublicFile({ file: f });
        added.push({ room, url: file_url });
      }
      setForm({ ...form, room_photos: [...form.room_photos, ...added] });
    } catch (e) {
      toast({ title: "Upload failed", description: e.message, variant: "destructive" });
    } finally {
      setUploadingRoom(null);
    }
  };

  const removePhoto = (idx) =>
    setForm({ ...form, room_photos: form.room_photos.filter((_, i) => i !== idx) });

  const save = async () => {
    setBusy(true);
    try {
      await base44.entities.Unit.update(unit.id, {
        unit_type: form.unit_type,
        bedrooms: Number(form.bedrooms) || 1,
        bathrooms: Number(form.bathrooms) || 1,
        size_sqm: Number(form.size_sqm) || 0,
        monthly_rent: Number(form.monthly_rent) || 0,
        security_deposit: Number(form.security_deposit) || 0,
        service_charge: Number(form.service_charge) || 0,
        furnished: form.furnished,
        amenities: form.amenities,
        description: form.description,
        room_photos: form.room_photos,
      });
      toast({ title: "Saved", description: "Unit updated." });
      onClose();
      onSaved?.();
    } catch (e) {
      toast({ title: "Error", description: e.message || "Could not save unit.", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const inviteLink = unit?.invite_code ? `${window.location.origin}/accept-invite?code=${unit.invite_code}` : "";

  const sendInvite = async () => {
    if (!inviteEmail) { toast({ title: "Email required", description: "Enter a tenant email to send the invite.", variant: "destructive" }); return; }
    setSending(true);
    try {
      await base44.functions.invoke("unitInvite", { action: "send", unit_id: unit.id, email: inviteEmail });
      toast({ title: "Invite sent", description: `Invitation emailed to ${inviteEmail}.` });
    } catch (e) {
      toast({ title: "Error", description: e.data?.error || e.message || "Could not send invite.", variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      toast({ title: "Copy failed", variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Unit — {unit.unit_number}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 py-2 sm:grid-cols-3">
          <Field label="Unit number">
            <Input value={form.unit_number} disabled className="bg-slate-50" />
          </Field>
          <Field label="Type">
            <select
              value={form.unit_type}
              onChange={(e) => setForm({ ...form, unit_type: e.target.value })}
              className="w-full rounded-md border border-input bg-background px-2 py-2 text-sm"
            >
              {UNIT_TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </Field>
          <Field label="Size (sqm)">
            <Input type="number" value={form.size_sqm} onChange={(e) => setForm({ ...form, size_sqm: e.target.value })} />
          </Field>
          <Field label="Bedrooms">
            <Input type="number" value={form.bedrooms} onChange={(e) => setForm({ ...form, bedrooms: e.target.value })} />
          </Field>
          <Field label="Bathrooms">
            <Input type="number" value={form.bathrooms} onChange={(e) => setForm({ ...form, bathrooms: e.target.value })} />
          </Field>
          <Field label="Monthly rent">
            <Input type="number" value={form.monthly_rent} onChange={(e) => setForm({ ...form, monthly_rent: e.target.value })} />
          </Field>
          <Field label="Security deposit">
            <Input type="number" value={form.security_deposit} onChange={(e) => setForm({ ...form, security_deposit: e.target.value })} />
          </Field>
          <Field label="Service charge">
            <Input type="number" value={form.service_charge} onChange={(e) => setForm({ ...form, service_charge: e.target.value })} />
          </Field>
          <div className="flex items-end pb-1.5">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.furnished} onChange={(e) => setForm({ ...form, furnished: e.target.checked })} className="rounded" /> Furnished
            </label>
          </div>
        </div>

        <div className="mt-2">
          <p className="mb-1.5 text-sm font-medium text-slate-700">Amenities</p>
          <div className="flex flex-wrap gap-1.5">
            {AMENITIES.map((a) => {
              const sel = form.amenities.includes(a);
              return (
                <button
                  key={a}
                  type="button"
                  onClick={() => toggleAmenity(a)}
                  className={`rounded-full border px-2.5 py-1 text-xs ${sel ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-slate-200 text-slate-600"}`}
                >
                  {a}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-3">
          <Field label="Description">
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
          </Field>
        </div>

        <div className="mt-4">
          <p className="mb-1 text-sm font-medium text-slate-700">Room photos</p>
          <p className="mb-2 text-xs text-slate-500">Public URLs — they render on the public listing without signing in.</p>
          <div className="space-y-3">
            {ROOMS.map((room) => {
              const photos = form.room_photos.map((p, i) => ({ ...p, i })).filter((p) => p.room === room);
              return (
                <div key={room} className="rounded-lg border border-slate-200 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-xs font-medium text-slate-600">{room}</p>
                    <label
                      className={`flex cursor-pointer items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:border-emerald-300 hover:text-emerald-700 ${
                        uploadingRoom === room ? "pointer-events-none opacity-50" : ""
                      }`}
                    >
                      {uploadingRoom === room ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImageIcon className="h-3.5 w-3.5" />}
                      Add photo
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        multiple
                        className="hidden"
                        onChange={(e) => {
                          uploadRoom(room, e.target.files);
                          e.target.value = "";
                        }}
                      />
                    </label>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {photos.map((p) => (
                      <div key={p.i} className="relative h-16 w-24 overflow-hidden rounded-md border border-slate-200">
                        <img src={p.url} alt={room} className="h-full w-full object-cover" />
                        <button
                          type="button"
                          onClick={() => removePhoto(p.i)}
                          className="absolute right-0.5 top-0.5 rounded-full bg-black/60 p-0.5 text-white hover:bg-black/80"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                    {photos.length === 0 && <p className="text-xs text-slate-400">No photos</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50/40 p-4">
          <p className="mb-1 text-sm font-medium text-slate-700">Invite tenant</p>
          <p className="mb-2 text-xs text-slate-500">Send this unit's invite link to an existing tenant — they'll be onboarded to this unit when they accept.</p>
          <div className="grid gap-2 sm:grid-cols-2">
            <select
              value={tenants.find((t) => t.email === inviteEmail)?.id || ""}
              onChange={(e) => {
                const t = tenants.find((x) => x.id === e.target.value);
                setInviteEmail(t ? t.email : "");
              }}
              className="rounded-md border border-input bg-background px-2 py-2 text-sm"
            >
              <option value="">Pick an existing tenant…</option>
              {tenants.map((t) => (
                <option key={t.id} value={t.id}>{t.full_name} · {t.email}</option>
              ))}
            </select>
            <Input value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="or enter email" />
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            <Button size="sm" onClick={sendInvite} disabled={sending} className="bg-emerald-600 hover:bg-emerald-700">
              {sending ? <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />Sending…</> : <><Send className="mr-1.5 h-3.5 w-3.5" />Send invite</>}
            </Button>
            <Button size="sm" variant="outline" onClick={copyLink}>
              <Copy className="mr-1.5 h-3.5 w-3.5" />{copied ? "Copied!" : "Copy link"}
            </Button>
          </div>
          {inviteLink && <p className="mt-2 break-all text-xs text-slate-400">{inviteLink}</p>}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={save} disabled={busy} className="bg-emerald-600 hover:bg-emerald-700">
            {busy ? (
              <>
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-1.5 h-4 w-4" />
                Save
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}