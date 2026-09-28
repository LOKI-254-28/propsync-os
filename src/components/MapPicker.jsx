import React, { useEffect } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix default marker icon for bundlers
const pinIcon = L.divIcon({
  html: '<div style="width:24px;height:24px;border-radius:50% 50% 50% 0;background:#059669;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.3);transform:rotate(-45deg);"></div>',
  className: "",
  iconSize: [24, 24],
  iconAnchor: [12, 24],
});

function ClickHandler({ onClick }) {
  useMapEvents({
    click(e) {
      onClick({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

export default function MapPicker({ latitude, longitude, onChange, height = 300 }) {
  const center = [latitude || -1.2864, longitude || 36.8172]; // Nairobi default
  const hasPin = latitude != null && longitude != null;

  // Recalculate map size when container mounts (leaflet often renders grey without this)
  return (
    <div className="rounded-lg overflow-hidden border border-slate-200" style={{ height }}>
      <MapContainer center={center} zoom={hasPin ? 15 : 12} style={{ height: "100%", width: "100%" }}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; OpenStreetMap contributors'
        />
        <ClickHandler onClick={onChange} />
        {hasPin && <Marker position={[latitude, longitude]} icon={pinIcon} />}
      </MapContainer>
    </div>
  );
}