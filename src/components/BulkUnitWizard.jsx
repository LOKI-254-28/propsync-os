import React, { useMemo, useState } from "react";
import { secureBulkCreateUnits } from "@/lib/secureCreate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui-bits";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Loader2, Plus, Trash2, Building2, Layers, Check, AlertCircle } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import NumberingScheme from "@/components/units/NumberingScheme";

const DEFAULT_SCHEME = { mode: "auto", prefix: "", start: 1, pad: 2 };

const UNIT_TYPES = ["Studio", "1 Bedroom", "2 Bedroom", "3 Bedroom", "Penthouse", "Commercial", "Other"];
const BEDROOMS = { Studio: 0, "1 Bedroom": 1, "2 Bedroom": 2, "3 Bedroom": 3, Penthouse: 3, Commercial: 0, Other: 1 };

const emptyGroup = () => ({
  unit_type: "1 Bedroom",
  balcony: false,
  sun: "none",
  monthly_rent: 0,
  count: 1,
  distribution: [{ building: "", floor: "", count: 1 }],
});

// Build a unique short code per building name
function buildingCodes(buildings) {
  const used = new Set();
  const codes = {};
  for (const b of buildings) {
    const letter = (b.match(/[A-Za-z]/) || ["B"])[0].toUpperCase();
    if (!used.has(letter)) {
      codes[b] = letter;
      used.add(letter);
    }
  }
  for (const b of buildings) {
    if (codes[b]) continue;
    const two = (b.match(/[A-Za-z]{1,2}/) || ["B"])[0].toUpperCase();
    if (!used.has(two)) {
      codes[b] = two;
      used.add(two);
    }
  }
  let n = 1;
  for (const b of buildings) {
    if (codes[b]) continue;
    while (used.has(`B${n}`)) n++;
    codes[b] = `B${n}`;
    used.add(`B${n}`);
    n++;
  }
  return codes;
}

// Assign unit numbers across all units, grouped by building then floor.
// Single building  -> 101, 102, 201...
// Multi building   -> A-101, A-201, B-101...
function assignNumbers(allUnits) {
  const buildings = [...new Set(allUnits.map((u) => u.building || ""))];
  const multi = buildings.length > 1;
  const codes = buildingCodes(buildings);

  const byBuilding = {};
  for (const u of allUnits) {
    (byBuilding[u.building] ||= {});
    (byBuilding[u.building][u.floor] ||= []).push(u);
  }
  for (const building of buildings) {
    // floor order = order of first appearance within this building
    const order = [];
    const seen = new Set();
    for (const u of allUnits) {
      if (u.building === building && !seen.has(u.floor)) {
        seen.add(u.floor);
        order.push(u.floor);
      }
    }
    order.forEach((f, i) => {
      const pos = i + 1;
      byBuilding[building][f].forEach((u, j) => {
        const seq = String(j + 1).padStart(2, "0");
        const num = `${pos}${seq}`;
        u.unit_number = multi ? `${codes[building]}-${num}` : num;
      });
    });
  }
}

function featuresFor(g) {
  const a = [];
  if (g.balcony) a.push("Balcony");
  if (g.sun === "morning") a.push("Morning sun");
  if (g.sun === "afternoon") a.push("Afternoon sun");
  return a;
}

export default function BulkUnitWizard({ open, onClose, onCreated, properties, defaultPropertyId = "", existingUnits = [] }) {
  const [busy, setBusy] = useState(false);
  const [propertyId, setPropertyId] = useState(defaultPropertyId);
  const [groups, setGroups] = useState([emptyGroup()]);
  const [scheme, setScheme] = useState(DEFAULT_SCHEME);
  const [overrides, setOverrides] = useState({});

  const allBuildings = useMemo(
    () => [...new Set(groups.flatMap((g) => g.distribution.map((d) => d.building.trim()).filter(Boolean)))],
    [groups]
  );

  const setGroup = (idx, patch) => setGroups((gs) => gs.map((g, i) => (i === idx ? { ...g, ...patch } : g)));
  const setDist = (gi, di, patch) =>
    setGroups((gs) =>
      gs.map((g, i) =>
        i === gi ? { ...g, distribution: g.distribution.map((d, j) => (j === di ? { ...d, ...patch } : d)) } : g
      )
    );
  const addDist = (gi) =>
    setGroups((gs) => gs.map((g, i) => (i === gi ? { ...g, distribution: [...g.distribution, { building: "", floor: "", count: 1 }] } : g)));
  const removeDist = (gi, di) =>
    setGroups((gs) =>
      gs.map((g, i) =>
        i === gi ? { ...g, distribution: g.distribution.filter((_, j) => j !== di) } : g
      )
    );

  // Validation
  const groupErrors = groups.map((g) => {
    const distSum = g.distribution.reduce((s, d) => s + (Number(d.count) || 0), 0);
    const errs = [];
    if (distSum !== Number(g.count)) errs.push(`Distribution (${distSum}) must equal count (${g.count})`);
    const keys = g.distribution.map((d) => `${d.building.trim()}|${d.floor.trim()}`);
    if (new Set(keys).size !== keys.length) errs.push("Duplicate building/floor in this group");
    if (g.distribution.some((d) => !d.building.trim() || !d.floor.trim())) errs.push("Every row needs a building and floor");
    return errs;
  });
  const valid = !!propertyId && groups.length > 0 && groupErrors.every((e) => e.length === 0);

  // Preview generated unit numbers
  const preview = useMemo(() => {
    const all = [];
    for (const g of groups) {
      for (const d of g.distribution) {
        if (!d.building.trim() || !d.floor.trim() || !d.count) continue;
        for (let i = 0; i < Number(d.count); i++) {
          all.push({ building: d.building.trim(), floor: d.floor.trim(), unit_type: g.unit_type, monthly_rent: Number(g.monthly_rent) || 0, amenities: featuresFor(g) });
        }
      }
    }
    assignNumbers(all);
    all.forEach((u, i) => {
      if (scheme.mode === "custom") u.unit_number = `${scheme.prefix}${String((Number(scheme.start) || 0) + i).padStart(Number(scheme.pad) || 1, "0")}`;
      if (overrides[i]) u.unit_number = overrides[i];
    });
    return all;
  }, [groups, scheme, overrides]);

  const taken = new Set(existingUnits.filter((x) => x.property_id === propertyId).map((x) => x.unit_number));
  const counts = {};
  preview.forEach((u) => { counts[u.unit_number] = (counts[u.unit_number] || 0) + 1; });
  const isDupe = (n) => !n || counts[n] > 1 || taken.has(n);
  const hasDupes = preview.some((u) => isDupe(u.unit_number));

  const submit = async () => {
    if (!propertyId) {
      toast({ title: "Validation error", description: "Select a property.", variant: "destructive" });
      return;
    }
    if (!valid) {
      toast({ title: "Validation error", description: "Fix the group errors before submitting.", variant: "destructive" });
      return;
    }
    const prop = properties.find((p) => p.id === propertyId);
    if (!prop) {
      toast({ title: "Validation error", description: "Selected property not found.", variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      const records = preview.map((u) => ({
        unit_number: u.unit_number,
        property_id: propertyId,
        property_name: prop.name,
        building: u.building,
        floor: u.floor,
        unit_type: u.unit_type,
        bedrooms: BEDROOMS[u.unit_type] ?? 1,
        bathrooms: 1,
        monthly_rent: u.monthly_rent,
        security_deposit: 0,
        service_charge: 0,
        furnished: false,
        amenities: u.amenities,
        description: "",
        status: "Available",
      }));
      const created = await secureBulkCreateUnits(records);
      toast({ title: "Success", description: `${created.length} unit(s) created.`, variant: "default" });
      setGroups([emptyGroup()]);
      setScheme(DEFAULT_SCHEME);
      setOverrides({});
      onClose?.();
      onCreated?.();
    } catch (err) {
      toast({ title: "Error", description: err.message || "Could not create units.", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const close = () => {
    setGroups([emptyGroup()]);
    setScheme(DEFAULT_SCHEME);
    setOverrides({});
    onClose?.();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Register Units</DialogTitle>
        </DialogHeader>

        <Field label="Property">
          <select
            value={propertyId}
            onChange={(e) => setPropertyId(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="">Select property...</option>
            {properties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </Field>

        {groups.map((g, gi) => {
          const distSum = g.distribution.reduce((s, d) => s + (Number(d.count) || 0), 0);
          return (
            <div key={gi} className="rounded-lg border border-slate-200 p-3">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-xs font-medium uppercase text-slate-500">Unit Group {gi + 1}</span>
                {groups.length > 1 && (
                  <button
                    onClick={() => setGroups(groups.filter((_, i) => i !== gi))}
                    className="text-slate-400 hover:text-rose-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Field label="Unit type">
                  <select
                    value={g.unit_type}
                    onChange={(e) => setGroup(gi, { unit_type: e.target.value })}
                    className="w-full rounded-md border border-input bg-background px-2 py-2 text-sm"
                  >
                    {UNIT_TYPES.map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Monthly rent (per unit)">
                  <Input
                    type="number"
                    value={g.monthly_rent}
                    onChange={(e) => setGroup(gi, { monthly_rent: Number(e.target.value) })}
                  />
                </Field>
                <Field label="Balcony">
                  <select
                    value={g.balcony ? "yes" : "no"}
                    onChange={(e) => setGroup(gi, { balcony: e.target.value === "yes" })}
                    className="w-full rounded-md border border-input bg-background px-2 py-2 text-sm"
                  >
                    <option value="no">No</option>
                    <option value="yes">Yes</option>
                  </select>
                </Field>
                <Field label="Sun exposure">
                  <select
                    value={g.sun}
                    onChange={(e) => setGroup(gi, { sun: e.target.value })}
                    className="w-full rounded-md border border-input bg-background px-2 py-2 text-sm"
                  >
                    <option value="none">None</option>
                    <option value="morning">Morning</option>
                    <option value="afternoon">Afternoon</option>
                  </select>
                </Field>
              </div>

              <div className="mt-3">
                <div className="mb-1.5 flex items-center justify-between">
                  <p className="text-xs font-medium text-slate-600">Building &amp; floor distribution</p>
                  <span
                    className={`text-xs font-medium ${
                      distSum === Number(g.count) ? "text-emerald-700" : "text-amber-600"
                    }`}
                  >
                    {distSum} / {g.count} units
                  </span>
                </div>
                <div className="space-y-2">
                  {g.distribution.map((d, di) => (
                    <div key={di} className="grid grid-cols-12 items-end gap-2">
                      <div className="col-span-4">
                        <Field label={di === 0 ? "Building" : ""}>
                          <Input
                            list="bulk-buildings"
                            value={d.building}
                            onChange={(e) => setDist(gi, di, { building: e.target.value })}
                            placeholder="e.g. Block A"
                          />
                        </Field>
                      </div>
                      <div className="col-span-3">
                        <Field label={di === 0 ? "Floor" : ""}>
                          <Input
                            value={d.floor}
                            onChange={(e) => setDist(gi, di, { floor: e.target.value })}
                            placeholder="e.g. G, L1, 2"
                          />
                        </Field>
                      </div>
                      <div className="col-span-3">
                        <Field label={di === 0 ? "Count" : ""}>
                          <Input
                            type="number"
                            min="0"
                            value={d.count}
                            onChange={(e) => setDist(gi, di, { count: Number(e.target.value) })}
                          />
                        </Field>
                      </div>
                      <div className="col-span-2 flex justify-end pb-1">
                        {g.distribution.length > 1 && (
                          <button
                            onClick={() => removeDist(gi, di)}
                            className="rounded-md p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <datalist id="bulk-buildings">
                  {allBuildings.map((b) => (
                    <option key={b} value={b} />
                  ))}
                </datalist>
                <div className="mt-2 flex items-center justify-between">
                  <Button size="sm" variant="outline" onClick={() => addDist(gi)}>
                    <Plus className="mr-1 h-3.5 w-3.5" />Add row
                  </Button>
                  <div className="flex items-center gap-2 text-xs text-slate-600">
                    <span>Total units in group:</span>
                    <Input
                      type="number"
                      min="1"
                      value={g.count}
                      onChange={(e) => setGroup(gi, { count: Number(e.target.value) })}
                      className="h-7 w-20"
                    />
                  </div>
                </div>
                {groupErrors[gi].map((e, i) => (
                  <p key={i} className="mt-1.5 flex items-center gap-1 text-xs text-rose-600">
                    <AlertCircle className="h-3 w-3" />
                    {e}
                  </p>
                ))}
              </div>
            </div>
          );
        })}

        <Button
          variant="outline"
          size="sm"
          onClick={() => setGroups([...groups, emptyGroup()])}
        >
          <Plus className="mr-1 h-4 w-4" />Add another group
        </Button>

        <NumberingScheme scheme={scheme} onChange={(s) => { setScheme(s); setOverrides({}); }} />

        {/* Preview */}
        {preview.length > 0 && (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase text-slate-500">
              <Layers className="h-3.5 w-3.5" />
              Preview · {preview.length} unit(s)
            </p>
            <div className="flex max-h-48 flex-wrap gap-1.5 overflow-y-auto">
              {preview.map((u, i) => (
                <input
                  key={i}
                  value={u.unit_number}
                  onChange={(e) => setOverrides({ ...overrides, [i]: e.target.value.trim() })}
                  className={`w-24 rounded-md border bg-white px-2 py-0.5 text-xs text-slate-700 ${isDupe(u.unit_number) ? "border-red-400 bg-red-50" : "border-slate-200"}`}
                />
              ))}
            </div>
            {hasDupes && <p className="mt-2 text-xs text-red-600">Unit numbers must be unique and not already used in this property.</p>}
          </div>
        )}

        <DialogFooter className="flex-row justify-between">
          <Button variant="ghost" onClick={close} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={busy || !valid || hasDupes} className="bg-emerald-600 hover:bg-emerald-700">
            {busy ? (
              <>
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Check className="mr-1.5 h-4 w-4" />
                Create {preview.length} unit(s)
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}