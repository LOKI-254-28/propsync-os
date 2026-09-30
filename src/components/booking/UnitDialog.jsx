import React, { useState } from "react";
import { Link } from "react-router-dom";
import { KES } from "@/lib/finance";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Bed, Bath, Maximize } from "lucide-react";
import ImageCarousel from "@/components/booking/ImageCarousel";
import SelectUnitFlow from "@/components/booking/SelectUnitFlow";
import UnitStatus from "@/components/booking/UnitStatus";

// Unit detail: room photos, live status, and the Select Unit action.
export default function UnitDialog({ unit, mode, propertyId, onClose }) {
  const [selecting, setSelecting] = useState(false);
  const photos = [
    ...(unit.room_photos || []).filter((p) => p.url).map((p) => ({ url: p.url, caption: p.room })),
    ...(unit.images || []).map((url) => ({ url })),
  ];
  const back = encodeURIComponent(`/portal/property/${propertyId}?unit=${unit.id}`);

  if (selecting) return <SelectUnitFlow unit={unit} onClose={() => { setSelecting(false); onClose(); }} />;
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader><DialogTitle>Unit {unit.unit_number} · {unit.unit_type}</DialogTitle></DialogHeader>
        <ImageCarousel items={photos} className="h-56" />
        <UnitStatus unit={unit} />
        <div className="flex flex-wrap gap-4 text-sm text-slate-600">
          <span className="flex items-center gap-1"><Bed className="h-4 w-4" />{unit.bedrooms} bed</span>
          <span className="flex items-center gap-1"><Bath className="h-4 w-4" />{unit.bathrooms} bath</span>
          {unit.size_sqm > 0 && <span className="flex items-center gap-1"><Maximize className="h-4 w-4" />{unit.size_sqm}m²</span>}
        </div>
        {unit.description && <p className="text-sm text-slate-600">{unit.description}</p>}
        <div className="flex items-end justify-between border-t border-slate-100 pt-3">
          <div>
            <p className="text-2xl font-bold text-emerald-700">{KES(unit.monthly_rent)}<span className="text-sm font-normal text-slate-500">/month</span></p>
            {unit.security_deposit > 0 && <p className="text-xs text-slate-500">Deposit {KES(unit.security_deposit)}{unit.half_deposit ? ` · half (${KES(unit.security_deposit / 2)}) reserves this unit` : ""}</p>}
          </div>
          {!unit.bookable ? <Button disabled variant="outline">Not open for booking</Button>
            : mode === "public" ? <Link to={`/login?returnTo=${back}`}><Button className="bg-emerald-600 hover:bg-emerald-700">Log in to select unit</Button></Link>
            : <Button onClick={() => setSelecting(true)} className="bg-emerald-600 hover:bg-emerald-700">Select unit</Button>}
        </div>
      </DialogContent>
    </Dialog>
  );
}