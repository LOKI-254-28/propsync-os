import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { KES } from "@/lib/finance";
import { Building2, MapPin, Bed, Bath } from "lucide-react";
import ImageCarousel from "@/components/booking/ImageCarousel";
import PropertyMap from "@/components/booking/PropertyMap";
import ReviewsSection from "@/components/booking/ReviewsSection";
import ReviewForm from "@/components/booking/ReviewForm";
import UnitDialog from "@/components/booking/UnitDialog";
import UnitStatus from "@/components/booking/UnitStatus";

// Property page shared by the public site (mode="public") and the tenant portal (mode="tenant").
export default function PropertyBrowseView({ propertyId, mode }) {
  const [params] = useSearchParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [unit, setUnit] = useState(null);

  const load = (first) => base44.functions.invoke("getPropertyBrowse", { property_id: propertyId })
    .then((r) => {
      setData(r.data);
      const pre = first === true && r.data.units.find((u) => u.id === params.get("unit"));
      if (pre) setUnit(pre);
    })
    .catch(() => setError("Could not load this property."));

  useEffect(() => { load(true); }, [propertyId]);

  if (error) return <p className="py-16 text-center text-slate-500">{error}</p>;
  if (!data) return <div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-700" /></div>;

  const { property: p, units, reviews, rating } = data;
  const photos = (p.images || []).map((url) => ({ url }));

  return (
    <div className="space-y-6">
      <ImageCarousel items={photos} className="h-72" />
      <div>
        <h1 className="font-heading text-2xl font-semibold text-slate-900">{p.name}</h1>
        {p.address && <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500"><MapPin className="h-4 w-4" />{p.address}</p>}
        {p.description && <p className="mt-3 text-sm text-slate-700">{p.description}</p>}
        {p.amenities.length > 0 && <div className="mt-3 flex flex-wrap gap-1.5">{p.amenities.map((a) => <span key={a} className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs text-emerald-800">{a}</span>)}</div>}
        <div className="mt-4 space-y-4"><section><h2 className="mb-2 font-heading font-semibold">Property reviews</h2><ReviewsSection rating={data.property_rating || {average:0,count:0}} reviews={data.property_reviews || []}/></section><section><h2 className="mb-2 font-heading font-semibold">Tenancy-experience reviews</h2><ReviewsSection rating={data.tenancy_rating || {average:0,count:0}} reviews={data.tenancy_reviews || []}/></section></div>
        {mode === "tenant" && <ReviewForm propertyId={p.id} onSaved={load} />}
      </div>
      {!unit && <PropertyMap latitude={p.latitude} longitude={p.longitude} name={p.name} />}
      <div>
        <h2 className="mb-3 font-medium text-slate-800">Units ({units.length})</h2>
        {units.length === 0 ? <p className="text-sm text-slate-500">No units listed yet.</p> : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {units.map((u) => (
              <button key={u.id} type="button" onClick={() => setUnit(u)} className="rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-emerald-400">
                <div className="flex items-center justify-between"><span className="flex items-center gap-1.5 font-semibold text-slate-900"><Building2 className="h-4 w-4 text-slate-400" />{u.unit_number}</span><span className="text-sm font-bold text-emerald-700">{KES(u.monthly_rent)}</span></div>
                <div className="mt-2"><UnitStatus unit={u} /></div>
                <p className="mt-2 flex gap-3 text-xs text-slate-500"><span className="flex items-center gap-1"><Bed className="h-3.5 w-3.5" />{u.bedrooms}</span><span className="flex items-center gap-1"><Bath className="h-3.5 w-3.5" />{u.bathrooms}</span><span>{u.unit_type}</span></p>
              </button>
            ))}
          </div>
        )}
      </div>
      {unit && <UnitDialog unit={unit} mode={mode} propertyId={p.id} onClose={() => setUnit(null)} />}
    </div>
  );
}