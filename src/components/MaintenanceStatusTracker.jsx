import React, { useState } from "react";
import { cn } from "@/lib/utils";

const STAGES = ["Pending", "In Progress", "Completed"];

const BUCKET = {
  Submitted: 0,
  Acknowledged: 0,
  Assigned: 1,
  Scheduled: 1,
  "In Progress": 1,
  "Awaiting Parts": 1,
  Completed: 2,
  Closed: 2,
};

export default function MaintenanceStatusTracker({ status, updates = [] }) {
  const [open, setOpen] = useState(false);

  if (status === "Rejected") {
    return <span className="inline-flex items-center rounded-full border border-rose-200 bg-rose-50 px-2.5 py-0.5 text-xs font-medium text-rose-700">Rejected</span>;
  }

  const current = BUCKET[status] ?? 0;
  const lastUpdate = updates && updates.length ? updates[updates.length - 1] : null;

  return (
    <div className="inline-block text-left">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5"
        title="Show details"
      >
        {STAGES.map((s, i) => {
          const done = i < current;
          const active = i === current;
          return (
            <React.Fragment key={s}>
              <span className="flex items-center gap-1">
                <span
                  className={cn(
                    "h-2.5 w-2.5 rounded-full border",
                    done && "border-emerald-600 bg-emerald-600",
                    active && "border-emerald-600 bg-emerald-500 ring-2 ring-emerald-100",
                    !done && !active && "border-slate-300 bg-white"
                  )}
                />
                <span
                  className={cn(
                    "text-xs font-medium",
                    (done || active) ? "text-emerald-700" : "text-slate-400"
                  )}
                >
                  {s}
                </span>
              </span>
              {i < STAGES.length - 1 && (
                <span className={cn("mx-0.5 h-px w-4", i < current ? "bg-emerald-500" : "bg-slate-200")} />
              )}
            </React.Fragment>
          );
        })}
      </button>
      {open && (
        <div className="mt-1 rounded-md border border-slate-100 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-500">
          <p>Status: <span className="font-medium text-slate-700">{status}</span></p>
          {lastUpdate ? (
            <p className="mt-0.5">Last update · {lastUpdate.date}: {lastUpdate.message}</p>
          ) : (
            <p className="mt-0.5">No public updates yet.</p>
          )}
        </div>
      )}
    </div>
  );
}