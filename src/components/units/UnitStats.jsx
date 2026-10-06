import React from "react";
import { StatCard } from "@/components/ui-bits";
import { KES } from "@/lib/finance";
import { DoorOpen, Users, DoorClosed, Wrench, Percent, Wallet } from "lucide-react";

import {occupancySummary} from '@/lib/occupancy';

// Unit statistics computed from real units and active tenancies (not the unit status flag alone).
export default function UnitStats({ units, tenancies }) {
  const {live,occupied,held,maintenance:maint,vacant:vacantUnits,rate}=occupancySummary(units,tenancies);
  const vacant=vacantUnits.length;
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