import React from "react";
import { StatCard } from "@/components/ui-bits";
import { KES } from "@/lib/finance";
import { DoorOpen, Users, DoorClosed, Wrench, Percent, Wallet } from "lucide-react";

const ACTIVE = ["Active", "Expiring Soon", "Notice Given"];
const HELD = ["Reserved", "Application Pending"];

// Unit statistics computed from real units and active tenancies (not the unit status flag alone).
export default function UnitStats({ units, tenancies }) {
  const live = units.filter((u) => u.status !== "Inactive");
  const occupiedIds = new Set(tenancies.filter((t) => ACTIVE.includes(t.status)).map((t) => t.unit_id));
  const occupied = live.filter((u) => occupiedIds.has(u.id));
  const held = live.filter((u) => !occupiedIds.has(u.id) && HELD.includes(u.status));
  const maint = live.filter((u) => !occupiedIds.has(u.id) && u.status === "Under Maintenance");
  const vacant = live.length - occupied.length - held.length - maint.length;
  const rate = live.length ? Math.round((occupied.length / live.length) * 100) : 0;
  const potential = live.reduce((s, u) => s + Number(u.monthly_rent || 0), 0);
  const actual = occupied.reduce((s, u) => s + Number(u.monthly_rent || 0), 0);

  return (
    <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
      <StatCard label="Total units" value={live.length} icon={DoorOpen} accent="blue" />
      <StatCard label="Occupied" value={occupied.length} icon={Users} />
      <StatCard label="Vacant" value={vacant} sub={`${held.length} reserved / pending`} icon={DoorClosed} accent="gold" />
      <StatCard label="Under maintenance" value={maint.length} icon={Wrench} accent="rose" />
      <StatCard label="Occupancy rate" value={`${rate}%`} icon={Percent} accent="slate" />
      <StatCard label="Monthly rent roll" value={KES(actual)} sub={`of ${KES(potential)} potential`} icon={Wallet} />
    </div>
  );
}