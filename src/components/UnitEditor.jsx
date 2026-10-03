import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/ui-bits";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Loader2, X, Save } from 'lucide-react';
import { toast } from "@/components/ui/use-toast";
import FileUploadButton from '@/components/FileUploadButton';
import { Image } from '@/components/ui/image';

const UNIT_TYPES = ["Studio", "1 Bedroom", "2 Bedroom", "3 Bedroom", "Penthouse", "Commercial", "Other"];
const ROOMS = ["Living room", "Kitchen", "Bedroom", "Bathroom", "Balcony", "Exterior"];

export default function UnitEditor({ open, unit, onClose, onSaved }) {
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [uploadingRoom, setUploadingRoom] = useState(null);

  useEffect(() => {
    if (unit) {
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
        description: unit.description || "",
        room_photos: unit.room_photos || [],
      });
    }
  }, [unit]);

  if (!form || !unit) return null;

  const removePhoto = (idx) =>
    setForm({ ...form, room_photos: form.room_photos.filter((_, i) => i !== idx) });

  const save = async () => {
    setBusy(true);
    try {
      const number = form.unit_number.trim();
      if (canRename && number !== unit.unit_number) {
        if (!number) throw new Error("Unit number cannot be empty.");
        const siblings = await base44.entities.Unit.filter({ property_id: unit.property_id });
        if (siblings.some((s) => s.id !== unit.id && s.unit_number === number)) throw new Error(`Unit number ${number} is already used in this property.`);
      }
      await base44.entities.Unit.update(unit.id, {
        ...(canRename && number ? { unit_number: number } : {}),
        unit_type: form.unit_type,
        bedrooms: Number(form.bedrooms) || 1,
        bathrooms: Number(form.bathrooms) || 1,
        size_sqm: Number(form.size_sqm) || 0,
        monthly_rent: Number(form.monthly_rent) || 0,
        security_deposit: Number(form.security_deposit) || 0,
        service_charge: Number(form.service_charge) || 0,
        furnished: form.furnished,
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

  const canRename = !unit.current_tenancy_id && !["Occupied", "Notice Given"].includes(unit.status);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !busy && uploadingRoom === null && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Unit — {unit.unit_number}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 py-2 sm:grid-cols-3">
          <Field label="Unit number" hint={canRename ? "" : "Locked while the unit has a tenancy."}>
            <Input value={form.unit_number} disabled={!canRename} onChange={(e) => setForm({ ...form, unit_number: e.target.value })} className={canRename ? "" : "bg-slate-50"} />
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
                    <FileUploadButton public multiple imageOnly label="Add photo" disabled={busy || uploadingRoom !== null} onBusyChange={value => setUploadingRoom(value ? room : null)} onUploaded={file => setForm(current => ({ ...current, room_photos: [...current.room_photos, { room, url: file.file_url }] }))} />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {photos.map((p) => (
                      <div key={p.i} className="relative h-16 w-24 overflow-hidden rounded-md border border-slate-200">
                        <Image src={p.url} alt={room} className="h-full w-full" />
                        <button
                          type="button"
                          disabled={uploadingRoom !== null}
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

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={busy || uploadingRoom !== null}>
            Cancel
          </Button>
          <Button onClick={save} disabled={busy || uploadingRoom !== null} className="bg-emerald-600 hover:bg-emerald-700">
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