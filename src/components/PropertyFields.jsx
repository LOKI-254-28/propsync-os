import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Field } from "@/components/ui-bits";
import { Loader2, Check, MapPin, Image as ImageIcon, X } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import MapPicker from "@/components/MapPicker";

export const PROPERTY_TYPES = ["Apartment Complex", "Building", "Mixed Use", "Commercial", "Townhouse", "Villa"];
export const AMENITIES = [
  "Parking", "CCTV", "WiFi", "Borehole water", "Backup generator", "Lift",
  "Gym", "Pool", "Security guard", "Perimeter wall", "Garbage collection", "Kids' playground", "Garden",
];

export function PropertyPhotos({ images, onChange }) {
  const [uploading, setUploading] = useState(false);

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
      onChange([...(images || []), ...urls]);
    } catch (err) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (idx) => onChange((images || []).filter((_, i) => i !== idx));

  return (
    <Field label="Property photos">
      <div className="flex flex-wrap gap-2">
        {(images || []).map((url, i) => (
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
  );
}

export function PropertyAmenities({ selected, onToggle }) {
  return (
    <div>
      <p className="mb-2 text-sm font-medium text-slate-700">Property amenities</p>
      <div className="flex flex-wrap gap-2">
        {AMENITIES.map((a) => {
          const sel = (selected || []).includes(a);
          return (
            <button
              key={a}
              type="button"
              onClick={() => onToggle(a)}
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
  );
}

export function PropertyLocation({ latitude, longitude, onChange }) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-600">Search a location, then drag the pin to fine-tune.</p>
      <MapPicker latitude={latitude} longitude={longitude} onChange={onChange} />
      {latitude != null && (
        <p className="flex items-center gap-1.5 text-xs text-emerald-700">
          <MapPin className="h-3.5 w-3.5" />
          Pinned at {Number(latitude).toFixed(5)}, {Number(longitude).toFixed(5)}
        </p>
      )}
    </div>
  );
}