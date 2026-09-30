import React from "react";
import { StatusBadge } from "@/components/ui-bits";

// Vacant / Occupied (with tenancy end date) / Occupied but open for booking (exit confirmed).
export default function UnitStatus({ unit }) {
  return (
    <div className="space-y-1">
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge status={unit.state} />
        {unit.exit_confirmed && <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700">Available for booking</span>}
      </div>
      {unit.occupied && (
        <p className="text-xs text-slate-500">
          {unit.tenancy_end_date ? `Tenancy ends ${unit.tenancy_end_date}` : "Tenancy end date not set"}
          {unit.exit_confirmed && unit.available_from ? ` · free from ${unit.available_from}` : ""}
        </p>
      )}
    </div>
  );
}