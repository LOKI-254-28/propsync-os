import React from 'react';
import { Check, MapPin } from 'lucide-react';
import MapPicker from "@/components/MapPicker";

export const PROPERTY_TYPES = ["Apartment Complex", "Building", "Mixed Use", "Commercial", "Townhouse", "Villa"];
export const AMENITIES = [
  "Parking", "CCTV", "WiFi", "Borehole water", "Backup generator", "Lift",
  "Gym", "Pool", "Security guard", "Perimeter wall", "Garbage collection", "Kids' playground", "Garden",
];

export { default as PropertyPhotos } from '@/components/PropertyPhotos';

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