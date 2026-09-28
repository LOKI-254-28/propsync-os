import React, { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Search, MapPin, Loader2 } from "lucide-react";

// Custom pin
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

// Pan/zoom to a target when it changes (used after a search result is picked)
function FlyTo({ target }) {
  const map = useMap();
  useEffect(() => {
    if (target) map.flyTo(target, 16, { duration: 0.8 });
  }, [target, map]);
  return null;
}

export default function MapPicker({ latitude, longitude, onChange, height = 300 }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [flyTo, setFlyTo] = useState(null);

  const hasPin = latitude != null && longitude != null;
  const center = [latitude || -1.2864, longitude || 36.8172]; // Nairobi default

  // Debounced Nominatim geocoding search (free, no API key)
  useEffect(() => {
    if (query.trim().length < 3) {
      setResults([]);
      return;
    }
    let cancelled = false;
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
            query
          )}&limit=5&accept-language=en`
        );
        const data = await res.json();
        if (!cancelled) setResults(Array.isArray(data) ? data : []);
      } catch (e) {
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 450);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query]);

  const pick = (r) => {
    const lat = parseFloat(r.lat);
    const lng = parseFloat(r.lon);
    onChange({ lat, lng });
    setFlyTo([lat, lng]);
    setResults([]);
    setQuery(r.display_name);
  };

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search a location — e.g. Kilimani, Nairobi"
          className="w-full rounded-md border border-input bg-background py-2 pl-9 pr-9 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
        {searching && (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-slate-400" />
        )}
        {results.length > 0 && (
          <div className="absolute z-[1000] mt-1 max-h-60 w-full overflow-y-auto rounded-md border border-slate-200 bg-white shadow-lg">
            {results.map((r, i) => (
              <button
                key={i}
                type="button"
                onClick={() => pick(r)}
                className="block w-full border-b border-slate-100 px-3 py-2 text-left text-xs text-slate-700 last:border-0 hover:bg-emerald-50"
              >
                <MapPin className="mr-1 inline h-3 w-3 text-emerald-600" />
                {r.display_name}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200" style={{ height }}>
        <MapContainer center={center} zoom={hasPin ? 15 : 12} style={{ height: "100%", width: "100%" }}>
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="&copy; OpenStreetMap contributors"
          />
          <ClickHandler onClick={onChange} />
          <FlyTo target={flyTo} />
          {hasPin && (
            <Marker
              position={[latitude, longitude]}
              icon={pinIcon}
              draggable
              eventHandlers={{
                dragend: (e) => {
                  const ll = e.target.getLatLng();
                  onChange({ lat: ll.lat, lng: ll.lng });
                },
              }}
            />
          )}
        </MapContainer>
      </div>
      <p className="text-xs text-slate-500">
        Search a location, then drag the pin to fine-tune. Or click anywhere on the map to drop a pin.
      </p>
    </div>
  );
}