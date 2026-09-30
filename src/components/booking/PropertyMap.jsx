import React from "react";
import { MapContainer, TileLayer, Marker } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Navigation } from "lucide-react";

const pin = L.divIcon({
  html: '<div style="width:24px;height:24px;border-radius:50% 50% 50% 0;background:#059669;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.3);transform:rotate(-45deg);"></div>',
  className: "",
  iconSize: [24, 24],
  iconAnchor: [12, 24],
});

// Read-only, pannable/zoomable map with a directions link.
export default function PropertyMap({ latitude, longitude, name }) {
  if (latitude == null || longitude == null) return null;
  const pos = [latitude, longitude];
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="font-medium text-slate-800">Location</h3>
        <a href={`https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm text-emerald-700 hover:underline"><Navigation className="h-4 w-4" />Get directions</a>
      </div>
      <div className="overflow-hidden rounded-xl border border-slate-200" style={{ height: 280 }}>
        <MapContainer center={pos} zoom={15} scrollWheelZoom style={{ height: "100%", width: "100%" }}>
          <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <Marker position={pos} icon={pin} title={name} />
        </MapContainer>
      </div>
    </div>
  );
}