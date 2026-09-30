import React from "react";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui-bits";

// Choose automatic numbering (101, 102, A-101...) or a custom prefix + sequence (e.g. FLAT-01, FLAT-02).
export default function NumberingScheme({ scheme, onChange }) {
  const set = (patch) => onChange({ ...scheme, ...patch });
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <p className="mb-2 text-sm font-medium text-slate-700">Unit numbering</p>
      <div className="flex flex-wrap gap-4 text-sm">
        <label className="flex items-center gap-2"><input type="radio" checked={scheme.mode === "auto"} onChange={() => set({ mode: "auto" })} />Automatic (by building and floor)</label>
        <label className="flex items-center gap-2"><input type="radio" checked={scheme.mode === "custom"} onChange={() => set({ mode: "custom" })} />My own scheme</label>
      </div>
      {scheme.mode === "custom" && (
        <div className="mt-3 grid grid-cols-3 gap-3">
          <Field label="Prefix"><Input value={scheme.prefix} onChange={(e) => set({ prefix: e.target.value })} placeholder="e.g. FLAT-" /></Field>
          <Field label="Start at"><Input type="number" min={0} value={scheme.start} onChange={(e) => set({ start: e.target.value })} /></Field>
          <Field label="Digits"><Input type="number" min={1} max={6} value={scheme.pad} onChange={(e) => set({ pad: e.target.value })} /></Field>
        </div>
      )}
      <p className="mt-2 text-xs text-slate-500">You can also edit any individual number in the preview below.</p>
    </div>
  );
}