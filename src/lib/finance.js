import { base44 } from "@/api/base44Client";
import {nairobiToday} from '@/lib/nairobiDates';
import {occupancySummary} from '@/lib/occupancy';

export const KES = (n) =>
  new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", maximumFractionDigits: 0 }).format(Number(n || 0));

export const fmtNum = (n) => new Intl.NumberFormat("en-KE").format(Number(n || 0));

export const todayISO = nairobiToday;

export const monthKey = (d = new Date()) => typeof d === 'string' && /^\d{4}-\d{2}(-\d{2})?$/.test(d) ? d.slice(0,7) : nairobiToday(d).slice(0,7);

export const monthLabel = (key) => {
  const [y, m] = key.split("-");
  const dt = new Date(Date.UTC(Number(y), Number(m) - 1, 1));
  return dt.toLocaleDateString("en-KE", { timeZone: 'Africa/Nairobi', month: "long", year: "numeric" });
};

export const addMonths = (key, n) => {
  const [y, m] = key.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1 + n, 1));
  return dt.toISOString().slice(0,7);
};

export const daysBetween = (a, b) => Math.round((new Date(b) - new Date(a)) / 86400000);

export const genRef = (prefix) => `${prefix}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;

// Allocate an amount across outstanding charges, oldest first.
export function allocatePayment(charges, amount) {
  const sorted = [...charges]
    .filter((c) => (c.outstanding || 0) > 0)
    .sort((a, b) => new Date(a.due_date) - new Date(b.due_date));
  let remaining = Number(amount);
  const allocations = [];
  for (const c of sorted) {
    if (remaining <= 0) break;
    const applied = Math.min(remaining, c.outstanding);
    allocations.push({ charge_id: c.id, billing_period: c.billing_period, amount: applied });
    remaining -= applied;
  }
  return { allocations, unallocated: Math.max(0, remaining) };
}

// Recompute charge status from amount_paid
export function chargeStatus(charge) {
  const paid = Number(charge.amount_paid || 0);
  const amt = Number(charge.amount || 0);
  if (paid >= amt && amt > 0) return "Paid";
  if (paid > 0) return "Partial";
  const overdue = charge.due_date && charge.due_date < todayISO() && paid < amt;
  return overdue ? "Overdue" : "Unpaid";
}

// Aggregate portfolio stats from raw record lists
export function portfolioStats({ properties, units, tenancies, charges, payments, expenses, maintenance }) {
  const occupancy = occupancySummary(units, tenancies);
  const activeTenancies = occupancy.tenancies;
  const occupiedUnits = occupancy.occupied;
  const availableUnits = occupancy.available;
  const vacantUnits = occupancy.vacant;
  const monthlyPotentialRent = activeTenancies.reduce((s, t) => s + Number(t.monthly_rent || 0), 0);
  const expectedThisMonth = charges
    .filter((c) => c.billing_period === monthKey())
    .reduce((s, c) => s + Number(c.amount || 0), 0);
  const collectedThisMonth = payments
    .filter((p) => p.status === "Successful" && p.payment_date && p.payment_date.slice(0, 7) === monthKey())
    .reduce((s, p) => s + Number(p.amount || 0), 0);
  const outstanding = charges
    .filter((c) => c.status !== "Void" && c.status !== "Paid")
    .reduce((s, c) => s + Number(c.outstanding || 0), 0);
  const arrearsCharges = charges.filter((c) => !['Void','Paid'].includes(c.status) && Number(c.outstanding || 0) > 0 && c.due_date && c.due_date < todayISO());
  const arrearsTotal = arrearsCharges.reduce((s, c) => s + Number(c.outstanding || 0), 0);
  const expensesTotal = expenses.reduce((s, e) => s + Number(e.amount || 0), 0);
  const openMaintenance = maintenance.filter((m) => !["Completed", "Closed", "Rejected"].includes(m.status));
  const occupancyRate = occupancy.rate;
  const collectionRate = expectedThisMonth ? Math.round((collectedThisMonth / expectedThisMonth) * 100) : 0;
  return {
    propertiesCount: properties.length,
    unitsCount: occupancy.live.length,
    occupiedCount: occupiedUnits.length,
    availableCount: availableUnits.length,
    vacantCount: vacantUnits.length,
    occupancyRate,
    monthlyPotentialRent,
    expectedThisMonth,
    collectedThisMonth,
    outstanding,
    arrearsTotal,
    arrearsCount: arrearsCharges.length,
    expensesTotal,
    netIncome: collectedThisMonth - expensesTotal,
    openMaintenance: openMaintenance.length,
    collectionRate,
    activeTenancies: activeTenancies.length,
  };
}

// Per-property stats
export function propertyStats(property, { units, tenancies, charges, payments, expenses, maintenance }) {
  const occupancy = occupancySummary(units.filter((u) => u.property_id === property.id), tenancies);
  const pUnits = occupancy.live;
  const pTenancies = occupancy.tenancies;
  const pCharges = charges.filter((c) => c.property_id === property.id);
  const pPayments = payments.filter((p) => p.property_id === property.id && p.status === "Successful");
  const pExpenses = expenses.filter((e) => e.property_id === property.id);
  const pMaint = maintenance.filter((m) => m.property_id === property.id);
  const occupied = occupancy.occupied.length;
  const expectedRent = pTenancies.reduce((s, t) => s + Number(t.monthly_rent || 0), 0);
  const collected = pPayments.filter((p) => p.payment_date && p.payment_date.slice(0, 7) === monthKey()).reduce((s, p) => s + Number(p.amount || 0), 0);
  const arrears = pCharges.filter((c) => !['Void','Paid'].includes(c.status) && c.outstanding > 0 && c.due_date && c.due_date < todayISO()).reduce((s, c) => s + Number(c.outstanding || 0), 0);
  return {
    units: pUnits.length,
    occupied,
    vacant: occupancy.vacant.length,
    occupancyRate: occupancy.rate,
    tenants: pTenancies.length,
    expectedRent,
    collected,
    arrears,
    expenses: pExpenses.reduce((s, e) => s + Number(e.amount || 0), 0),
    netIncome: collected - pExpenses.reduce((s, e) => s + Number(e.amount || 0), 0),
    maintenance: pMaint.filter((m) => !["Completed", "Closed", "Rejected"].includes(m.status)).length,
  };
}

// Generate monthly rent charges for active tenancies (no duplicates).
// Delegates to the generateRentCharges backend function which validates
// permissions and stamps owner_user_id server-side.
export async function generateMonthlyCharges({ tenancies, existingCharges, billingPeriod, dueDay = 1 }) {
  const tenancyIds = tenancies.map((t) => t.id);
  const response = await base44.functions.invoke("generateRentCharges", { billingPeriod, dueDay, tenancyIds });
  return response.data;
}

// Record a payment and allocate it across outstanding charges (oldest first)
export async function recordPayment({ tenancy, amount, method, paymentDate }) {
  const {data}=await base44.functions.invoke('createOwnedRecord',{action:'record_payment',tenancy_id:tenancy?.id,amount:Number(amount),method,payment_date:paymentDate});
  return data;
}

export async function logAudit({ user, action, entity, entity_id, entity_name, previous_value, new_value }) {
  try {
    await base44.entities.AuditLog.create({
      user_id: user?.id,
      user_email: user?.email,
      user_role: user?.role,
      action,
      entity,
      entity_id,
      entity_name,
      previous_value: previous_value ? JSON.stringify(previous_value).slice(0, 2000) : "",
      new_value: new_value ? JSON.stringify(new_value).slice(0, 2000) : "",
      timestamp: new Date().toISOString(),
    });
  } catch (e) {
    // audit logging must never break the main operation
  }
}

export async function notify({related_entity,related_id}) {
  await base44.functions.invoke('createOwnedRecord',{action:'notify_record',related_entity,related_id});
}