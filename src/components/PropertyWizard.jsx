import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { secureCreate } from "@/lib/secureCreate";
import { genRef, todayISO, logAudit } from "@/lib/finance";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/ui-bits";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Loader2, Plus, Trash2, Check, MapPin, Image as ImageIcon, X } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import MapPicker from "@/components/MapPicker";
import { Image } from "@/components/ui/image";

const PROPERTY_TYPES = ["Apartment Complex", "Building", "Mixed Use", "Commercial", "Townhouse", "Villa"];
const UNIT_TYPES = ["Studio", "1 Bedroom", "2 Bedroom", "3 Bedroom", "Penthouse", "Commercial", "Other"];

const emptyUnit = () => ({ unit_number: "", unit_type: "1 Bedroom", bedrooms: 1, bathrooms: 1, size_sqm: "", monthly_rent: "", security_deposit: "", service_charge: "", furnished: false, publish_listing: true });

const STEPS = ["Basics", "Location", "Units", "Review"];

export default function PropertyWizard({ open, onClose, onCreated }) {
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    name: "", code: "", address: "", property_type: "Apartment Complex",
    contact_phone: "", contact_email: "", monthly_operating_expenses: 0, description: "",
    latitude: null, longitude: null, images: [],
  });
  const [units, setUnits] = useState([emptyUnit()]);

  const reset = () => {
    setStep(0);
    setForm({ name: "", code: "", address: "", property_type: "Apartment Complex", contact_phone: "", contact_email: "", monthly_operating_expenses: 0, description: "", latitude: null, longitude: null, images: [] });
    setUnits([emptyUnit()]);
  };

  const close = () => { reset(); onClose(); };

  const [uploading, setUploading] = useState(false);

  const handleUpload = async (files) => {
    const valid = Array.from(files).filter((f) => ["image/jpeg", "image/png", "image/webp"].includes(f.type) && f.size <= 10 * 1024 * 1024);
    if (!valid.length) { toast({ title: "Upload error", description: "Only JPG, PNG, or WebP images up to 10MB.", variant: "destructive" }); return; }
    setUploading(true);
    try {
      const uris = [];
      for (const f of valid) {
        const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file: f });
        uris.push(file_uri);
      }
      setForm((prev) => ({ ...prev, images: [...prev.images, ...uris] }));
    } catch (err) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (idx) => setForm((prev) => ({ ...prev, images: prev.images.filter((_, i) => i !== idx) }));

  const canNext = () => {
    if (step === 0) return !!form.name;
    if (step === 2) return units.length > 0 && units.every((u) => u.unit_number);
    return true;
  };

  const submit = async () => {
    if (!form.name) { toast({ title: "Validation error", description: "Property name is required.", variant: "destructive" }); return; }
    if (units.some((u) => !u.unit_number)) { toast({ title: "Validation error", description: "Every unit needs a unit number.", variant: "destructive" }); return; }
    setBusy(true);
    try {
      const me = await base44.auth.me();
      const property = await secureCreate("Property", {
        name: form.name, code: form.code || genRef("PRP"), address: form.address,
        property_type: form.property_type, contact_phone: form.contact_phone, contact_email: form.contact_email,
        monthly_operating_expenses: Number(form.monthly_operating_expenses) || 0,
        description: form.description, status: "Active", currency: "KES",
        latitude: form.latitude, longitude: form.longitude, images: form.images,
      });

      // Bulk create units
      const unitRecords = units.map((u) => ({
        unit_number: u.unit_number, property_id: property.id, property_name: property.name,
        unit_type: u.unit_type, bedrooms: Number(u.bedrooms) || 1, bathrooms: Number(u.bathrooms) || 1,
        size_sqm: u.size_sqm ? Number(u.size_sqm) : undefined,
        monthly_rent: Number(u.monthly_rent) || 0, security_deposit: Number(u.security_deposit) || 0,
        service_charge: Number(u.service_charge) || 0, furnished: !!u.furnished,
        status: "Available", description: "", owner_user_id: me.id,
        invite_code: `PW-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
      }));
      const createdUnits = await base44.entities.Unit.bulkCreate(unitRecords);

      // Optionally publish a listing per unit
      const listings = [];
      for (let i = 0; i < createdUnits.length; i++) {
        if (units[i].publish_listing && Number(units[i].monthly_rent) > 0) {
          listings.push({
            listing_reference: genRef("LST"),
            property_id: property.id, property_name: property.name,
            unit_id: createdUnits[i].id, unit_number: createdUnits[i].unit_number,
            listing_type: "Rent", price: Number(units[i].monthly_rent),
            description: `${property.name} — ${createdUnits[i].unit_number}`,
            status: "Published", date_listed: todayISO(), owner_user_id: property.owner_user_id,
          });
        }
      }
      if (listings.length) await base44.entities.Listing.bulkCreate(listings);

      await logAudit({ user: me, action: "Property Created (wizard)", entity: "Property", entity_id: property.id, entity_name: property.name, new_value: { units: createdUnits.length, listings: listings.length } });
      toast({ title: "Success", description: `Property created with ${createdUnits.length} unit(s)${listings.length ? ` and ${listings.length} listing(s)` : ""}.` });
      close();
      onCreated();
    } catch (err) {
      toast({ title: "Error", description: err.message || "Could not create property. Your account may still be awaiting approval.", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>New Property Wizard</DialogTitle></DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center gap-2 py-1">
          {STEPS.map((label, i) => (
            <div key={label} className="flex items-center gap-2">
              <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium ${i === step ? "bg-emerald-600 text-white" : i < step ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-400"}`}>
                {i < step ? <Check className="h-3.5 w-3.5" /> : i + 1}
              </div>
              <span className={`text-xs ${i === step ? "font-medium text-slate-800" : "text-slate-400"}`}>{label}</span>
              {i < STEPS.length - 1 && <div className="h-px w-6 bg-slate-200" />}
            </div>
          ))}
        </div>

        {/* Step 0: Basics */}
        {step === 0 && (
          <div className="grid grid-cols-2 gap-4 py-2">
            <Field label="Property name"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Garden Heights" /></Field>
            <Field label="Code / reference"><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="Auto-generated" /></Field>
            <div className="col-span-2"><Field label="Address"><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></Field></div>
            <Field label="Property type">
              <select value={form.property_type} onChange={(e) => setForm({ ...form, property_type: e.target.value })} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">{PROPERTY_TYPES.map((t) => <option key={t}>{t}</option>)}</select>
            </Field>
            <Field label="Monthly operating expenses"><Input type="number" value={form.monthly_operating_expenses} onChange={(e) => setForm({ ...form, monthly_operating_expenses: Number(e.target.value) })} /></Field>
            <Field label="Contact phone"><Input value={form.contact_phone} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} /></Field>
            <Field label="Contact email"><Input value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} /></Field>
            <div className="col-span-2"><Field label="Description"><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} /></Field></div>
            <div className="col-span-2">
              <Field label="Property photos">
                <div className="flex flex-wrap gap-2">
                  {form.images.map((uri, i) => (
                    <div key={i} className="relative h-20 w-20 overflow-hidden rounded-lg border border-slate-200">
                      <Image src={uri} alt={`Photo ${i + 1}`} fittingType="fill" className="h-full w-full" />
                      <button type="button" onClick={() => removeImage(i)} className="absolute right-0.5 top-0.5 rounded-full bg-black/60 p-0.5 text-white hover:bg-black/80"><X className="h-3 w-3" /></button>
                    </div>
                  ))}
                  <label className={`flex h-20 w-20 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-slate-300 text-slate-400 hover:border-emerald-400 hover:text-emerald-600 ${uploading ? "pointer-events-none opacity-50" : ""}`}>
                    {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImageIcon className="h-5 w-5" />}
                    <input type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={(e) => { handleUpload(e.target.files); e.target.value = ""; }} />
                  </label>
                </div>
                <p className="mt-1 text-xs text-slate-400">JPG, PNG, or WebP — up to 10MB each.</p>
              </Field>
            </div>
          </div>
        )}

        {/* Step 1: Location */}
        {step === 1 && (
          <div className="space-y-3 py-2">
            <p className="text-sm text-slate-600">Click on the map to drop a pin for this property's location.</p>
            <MapPicker latitude={form.latitude} longitude={form.longitude} onChange={(p) => setForm({ ...form, latitude: p.lat, longitude: p.lng })} />
            {form.latitude != null && (
              <p className="flex items-center gap-1.5 text-xs text-emerald-700"><MapPin className="h-3.5 w-3.5" />Pinned at {form.latitude.toFixed(5)}, {form.longitude.toFixed(5)}</p>
            )}
          </div>
        )}

        {/* Step 2: Units */}
        {step === 2 && (
          <div className="space-y-3 py-2">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-600">Add one or more units for this property.</p>
              <Button size="sm" variant="outline" onClick={() => setUnits([...units, emptyUnit()])}><Plus className="mr-1 h-4 w-4" />Add Unit</Button>
            </div>
            {units.map((u, idx) => (
              <div key={idx} className="rounded-lg border border-slate-200 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-medium uppercase text-slate-500">Unit {idx + 1}</span>
                  {units.length > 1 && <button onClick={() => setUnits(units.filter((_, i) => i !== idx))} className="text-slate-400 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>}
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  <Field label="Unit number"><Input value={u.unit_number} onChange={(e) => setUnits(units.map((x, i) => i === idx ? { ...x, unit_number: e.target.value } : x))} placeholder="e.g. 4A" /></Field>
                  <Field label="Type"><select value={u.unit_type} onChange={(e) => setUnits(units.map((x, i) => i === idx ? { ...x, unit_type: e.target.value } : x))} className="w-full rounded-md border border-input bg-background px-2 py-2 text-sm">{UNIT_TYPES.map((t) => <option key={t}>{t}</option>)}</select></Field>
                  <Field label="Size (sqm)"><Input type="number" value={u.size_sqm} onChange={(e) => setUnits(units.map((x, i) => i === idx ? { ...x, size_sqm: e.target.value } : x))} /></Field>
                  <Field label="Monthly rent"><Input type="number" value={u.monthly_rent} onChange={(e) => setUnits(units.map((x, i) => i === idx ? { ...x, monthly_rent: e.target.value } : x))} /></Field>
                  <Field label="Security deposit"><Input type="number" value={u.security_deposit} onChange={(e) => setUnits(units.map((x, i) => i === idx ? { ...x, security_deposit: e.target.value } : x))} /></Field>
                  <Field label="Service charge"><Input type="number" value={u.service_charge} onChange={(e) => setUnits(units.map((x, i) => i === idx ? { ...x, service_charge: e.target.value } : x))} /></Field>
                </div>
                <label className="mt-2 flex items-center gap-2 text-xs text-slate-600">
                  <input type="checkbox" checked={u.publish_listing} onChange={(e) => setUnits(units.map((x, i) => i === idx ? { ...x, publish_listing: e.target.checked } : x))} className="rounded" />
                  Publish as a public listing (if rent set)
                </label>
              </div>
            ))}
          </div>
        )}

        {/* Step 3: Review */}
        {step === 3 && (
          <div className="space-y-3 py-2">
            <div className="rounded-lg bg-slate-50 p-3 text-sm">
              <p className="font-medium text-slate-800">{form.name}</p>
              <p className="text-xs text-slate-500">{form.property_type} · {form.address || "No address"}</p>
              {form.latitude != null && <p className="text-xs text-slate-500">Location: {form.latitude.toFixed(4)}, {form.longitude.toFixed(4)}</p>}
              {form.images.length > 0 && <p className="text-xs text-slate-500">{form.images.length} photo(s)</p>}
            </div>
            <div className="rounded-lg border border-slate-200 p-3">
              <p className="mb-2 text-xs font-medium uppercase text-slate-500">{units.length} Unit(s)</p>
              <div className="space-y-1">
                {units.map((u, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="text-slate-700">{u.unit_number} · {u.unit_type}</span>
                    <span className="text-slate-600">{u.monthly_rent ? `KES ${Number(u.monthly_rent).toLocaleString()}/mo` : "—"}</span>
                  </div>
                ))}
              </div>
            </div>
            <p className="text-xs text-slate-500">On submit, the property and all units will be created. Units with rent and "publish" checked will appear on the public listings page.</p>
          </div>
        )}

        <DialogFooter className="flex-row justify-between">
          <Button variant="ghost" onClick={close} disabled={busy}>Cancel</Button>
          <div className="flex gap-2">
            {step > 0 && <Button variant="outline" onClick={() => setStep(step - 1)} disabled={busy}>Back</Button>}
            {step < STEPS.length - 1
              ? <Button onClick={() => setStep(step + 1)} disabled={!canNext()} className="bg-emerald-600 hover:bg-emerald-700">Next</Button>
              : <Button onClick={submit} disabled={busy} className="bg-emerald-600 hover:bg-emerald-700">{busy ? <><Loader2 className="mr-1.5 h-4 w-4 animate-spin" />Creating...</> : "Create Property"}</Button>}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}