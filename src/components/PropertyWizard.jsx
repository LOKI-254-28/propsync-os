import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { secureCreate } from "@/lib/secureCreate";
import { genRef, todayISO, logAudit } from "@/lib/finance";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/ui-bits";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Loader2, Check, MapPin, Image as ImageIcon, X, Globe } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import MapPicker from "@/components/MapPicker";

const PROPERTY_TYPES = ["Apartment Complex", "Building", "Mixed Use", "Commercial", "Townhouse", "Villa"];
const AMENITIES = [
  "Parking", "CCTV", "WiFi", "Borehole water", "Backup generator", "Lift",
  "Gym", "Pool", "Security guard", "Perimeter wall", "Garbage collection", "Kids' playground", "Garden",
];

const STEPS = ["Basics", "Location", "Amenities", "Review"];

export default function PropertyWizard({ open, onClose, onCreated }) {
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({
    name: "", code: "", address: "", property_type: "Apartment Complex",
    contact_phone: "", contact_email: "", monthly_operating_expenses: 0,
    description: "", expected_unit_count: 0, latitude: null, longitude: null,
    images: [], amenities: [], publish: true,
  });

  const reset = () => {
    setStep(0);
    setForm({
      name: "", code: "", address: "", property_type: "Apartment Complex",
      contact_phone: "", contact_email: "", monthly_operating_expenses: 0,
      description: "", expected_unit_count: 0, latitude: null, longitude: null,
      images: [], amenities: [], publish: true,
    });
  };

  const close = () => {
    reset();
    onClose();
  };

  const handleUpload = async (files) => {
    const valid = Array.from(files).filter(
      (f) => ["image/jpeg", "image/png", "image/webp"].includes(f.type) && f.size <= 10 * 1024 * 1024
    );
    if (!valid.length) {
      toast({ title: "Upload error", description: "Only JPG, PNG, or WebP images up to 10MB.", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const urls = [];
      for (const f of valid) {
        const { file_url } = await base44.integrations.Core.UploadPublicFile({ file: f });
        urls.push(file_url);
      }
      setForm((prev) => ({ ...prev, images: [...prev.images, ...urls] }));
    } catch (err) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (idx) =>
    setForm((prev) => ({ ...prev, images: prev.images.filter((_, i) => i !== idx) }));

  const toggleAmenity = (a) =>
    setForm((prev) => ({
      ...prev,
      amenities: prev.amenities.includes(a) ? prev.amenities.filter((x) => x !== a) : [...prev.amenities, a],
    }));

  const canNext = () => {
    if (step === 0) return !!form.name;
    return true;
  };

  const submit = async () => {
    if (!form.name) {
      toast({ title: "Validation error", description: "Property name is required.", variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      const me = await base44.auth.me();
      const property = await secureCreate("Property", {
        name: form.name,
        code: form.code || genRef("PRP"),
        address: form.address,
        property_type: form.property_type,
        contact_phone: form.contact_phone,
        contact_email: form.contact_email,
        monthly_operating_expenses: Number(form.monthly_operating_expenses) || 0,
        description: form.description,
        status: "Active",
        currency: "KES",
        latitude: form.latitude,
        longitude: form.longitude,
        images: form.images,
        amenities: form.amenities,
        expected_unit_count: Number(form.expected_unit_count) || 0,
      });

      let listing = null;
      if (form.publish) {
        listing = await secureCreate("Listing", {
          listing_reference: genRef("LST"),
          property_id: property.id,
          property_name: property.name,
          unit_id: "",
          unit_number: "",
          listing_type: "Rent",
          price: 0,
          description: form.description || `${property.name} — rentals available`,
          images: form.images,
          status: "Published",
          date_listed: todayISO(),
        });
      }

      await logAudit({
        user: me,
        action: "Property Created (wizard)",
        entity: "Property",
        entity_id: property.id,
        entity_name: property.name,
        new_value: { published: !!form.publish, listing: listing?.id || null },
      });
      toast({
        title: "Success",
        description: `Property created${form.publish ? " and published to public listings" : ""}. Add units next from the Units page.`,
      });
      close();
      onCreated?.();
    } catch (err) {
      toast({
        title: "Error",
        description: err.message || "Could not create property. Your account may still be awaiting approval.",
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Property</DialogTitle>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center gap-2 py-1">
          {STEPS.map((label, i) => (
            <div key={label} className="flex items-center gap-2">
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium ${
                  i === step
                    ? "bg-emerald-600 text-white"
                    : i < step
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-slate-100 text-slate-400"
                }`}
              >
                {i < step ? <Check className="h-3.5 w-3.5" /> : i + 1}
              </div>
              <span className={`text-xs ${i === step ? "font-medium text-slate-800" : "text-slate-400"}`}>
                {label}
              </span>
              {i < STEPS.length - 1 && <div className="h-px w-6 bg-slate-200" />}
            </div>
          ))}
        </div>

        {/* Step 0: Basics */}
        {step === 0 && (
          <div className="grid grid-cols-2 gap-4 py-2">
            <Field label="Property name">
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Garden Heights" />
            </Field>
            <Field label="Code / reference">
              <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="Auto-generated" />
            </Field>
            <div className="col-span-2">
              <Field label="Address">
                <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Street, area, city" />
              </Field>
            </div>
            <Field label="Property type">
              <select
                value={form.property_type}
                onChange={(e) => setForm({ ...form, property_type: e.target.value })}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {PROPERTY_TYPES.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </Field>
            <Field label="Expected unit count" hint="Informational — you'll add units separately.">
              <Input
                type="number"
                value={form.expected_unit_count}
                onChange={(e) => setForm({ ...form, expected_unit_count: Number(e.target.value) })}
              />
            </Field>
            <Field label="Contact phone">
              <Input value={form.contact_phone} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} />
            </Field>
            <Field label="Contact email">
              <Input value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} />
            </Field>
            <Field label="Monthly operating expenses">
              <Input
                type="number"
                value={form.monthly_operating_expenses}
                onChange={(e) => setForm({ ...form, monthly_operating_expenses: Number(e.target.value) })}
              />
            </Field>
            <div className="col-span-2">
              <Field label="Description">
                <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
              </Field>
            </div>
            <div className="col-span-2">
              <Field label="Property photos">
                <div className="flex flex-wrap gap-2">
                  {form.images.map((url, i) => (
                    <div key={i} className="relative h-20 w-20 overflow-hidden rounded-lg border border-slate-200">
                      <img src={url} alt={`Photo ${i + 1}`} className="h-full w-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeImage(i)}
                        className="absolute right-0.5 top-0.5 rounded-full bg-black/60 p-0.5 text-white hover:bg-black/80"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  <label
                    className={`flex h-20 w-20 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-slate-300 text-slate-400 hover:border-emerald-400 hover:text-emerald-600 ${
                      uploading ? "pointer-events-none opacity-50" : ""
                    }`}
                  >
                    {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImageIcon className="h-5 w-5" />}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      multiple
                      className="hidden"
                      onChange={(e) => {
                        handleUpload(e.target.files);
                        e.target.value = "";
                      }}
                    />
                  </label>
                </div>
                <p className="mt-1 text-xs text-slate-400">JPG, PNG, or WebP — up to 10MB each. Photos are public so they render on the listings page.</p>
              </Field>
            </div>
          </div>
        )}

        {/* Step 1: Location */}
        {step === 1 && (
          <div className="space-y-3 py-2">
            <p className="text-sm text-slate-600">Search a location, then drag the pin to fine-tune.</p>
            <MapPicker
              latitude={form.latitude}
              longitude={form.longitude}
              onChange={(p) => setForm({ ...form, latitude: p.lat, longitude: p.lng })}
            />
            {form.latitude != null && (
              <p className="flex items-center gap-1.5 text-xs text-emerald-700">
                <MapPin className="h-3.5 w-3.5" />
                Pinned at {form.latitude.toFixed(5)}, {form.longitude.toFixed(5)}
              </p>
            )}
          </div>
        )}

        {/* Step 2: Amenities */}
        {step === 2 && (
          <div className="space-y-4 py-2">
            <div>
              <p className="mb-2 text-sm font-medium text-slate-700">Property amenities</p>
              <div className="flex flex-wrap gap-2">
                {AMENITIES.map((a) => {
                  const sel = form.amenities.includes(a);
                  return (
                    <button
                      key={a}
                      type="button"
                      onClick={() => toggleAmenity(a)}
                      className={`rounded-full border px-3 py-1.5 text-xs transition ${
                        sel
                          ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                          : "border-slate-200 text-slate-600 hover:border-emerald-300"
                      }`}
                    >
                      {sel && <Check className="mr-1 inline h-3 w-3" />}
                      {a}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <label className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-800">Publish to public listings</p>
                  <p className="text-xs text-slate-500">When on, this property appears on the public Browse page immediately.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, publish: !form.publish })}
                  className={`relative h-6 w-11 rounded-full transition ${form.publish ? "bg-emerald-600" : "bg-slate-300"}`}
                >
                  <span
                    className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${form.publish ? "left-5" : "left-0.5"}`}
                  />
                </button>
              </label>
            </div>
          </div>
        )}

        {/* Step 3: Review */}
        {step === 3 && (
          <div className="space-y-3 py-2">
            <div className="rounded-lg bg-slate-50 p-3 text-sm">
              <p className="font-medium text-slate-800">{form.name}</p>
              <p className="text-xs text-slate-500">
                {form.property_type} · {form.address || "No address"}
              </p>
              {form.latitude != null && (
                <p className="text-xs text-slate-500">
                  Location: {form.latitude.toFixed(4)}, {form.longitude.toFixed(4)}
                </p>
              )}
              <p className="text-xs text-slate-500">
                {form.images.length} photo(s) · {form.amenities.length} amenit(ies) · Expected units: {form.expected_unit_count || 0}
              </p>
              <p className="mt-1 flex items-center gap-1.5 text-xs font-medium text-emerald-700">
                <Globe className="h-3.5 w-3.5" />
                {form.publish ? "Will be published to public listings" : "Will be private (not published)"}
              </p>
            </div>
            <p className="text-xs text-slate-500">
              On submit, the property is created. Add units separately from the Units page using the "Register Units" wizard.
            </p>
          </div>
        )}

        <DialogFooter className="flex-row justify-between">
          <Button variant="ghost" onClick={close} disabled={busy}>
            Cancel
          </Button>
          <div className="flex gap-2">
            {step > 0 && (
              <Button variant="outline" onClick={() => setStep(step - 1)} disabled={busy}>
                Back
              </Button>
            )}
            {step < STEPS.length - 1 ? (
              <Button onClick={() => setStep(step + 1)} disabled={!canNext()} className="bg-emerald-600 hover:bg-emerald-700">
                Next
              </Button>
            ) : (
              <Button onClick={submit} disabled={busy} className="bg-emerald-600 hover:bg-emerald-700">
                {busy ? (
                  <>
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Property"
                )}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}