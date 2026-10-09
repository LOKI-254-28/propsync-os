import React from "react";
import { Input } from "@/components/ui/input";
import { todayISO } from "@/lib/finance";
import { cn } from "@/lib/utils";

const SLOTS = ["09:00", "10:00", "11:00", "12:00", "14:00", "15:00", "16:00", "17:00"];

// Date picker + fixed time slots (no free-text time).
export default function VisitSlotPicker({ date, time, onChange }) {
  const today = todayISO();
  const nowHM = new Intl.DateTimeFormat('en-GB',{timeZone:'Africa/Nairobi',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date());
  const past = (s) => date === today && s <= nowHM;
  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">Visit times are in East Africa Time (UTC+3).</p>
      <Input aria-label="Visit date" type="date" min={today} value={date} onChange={(e) => onChange({ date: e.target.value, time: "" })} />
      <div className="grid grid-cols-4 gap-1.5">
        {SLOTS.map((s) => (
          <button
            key={s}
            type="button"
            disabled={!date || past(s)}
            onClick={() => onChange({ date, time: s })}
            className={cn("rounded-md border px-2 py-1.5 text-sm disabled:cursor-not-allowed disabled:opacity-40", time === s ? "border-emerald-600 bg-emerald-600 text-white" : "border-slate-200 bg-white text-slate-700 hover:border-emerald-400")}
          >{s}</button>
        ))}
      </div>
    </div>
  );
}