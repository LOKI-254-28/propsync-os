import { nairobiToday } from './nairobiDates.ts';
// Derived unit availability (never stored) — computed from Unit + Tenancy + VacationRequest + Inspection.
const LIVE_TENANCY = ['Active', 'Expiring Soon', 'Notice Given', 'Pending'];
const EXIT_STATUSES = ['Notice Given', 'Terminated', 'Vacated'];
const VACANT_UNIT = ['Available', 'Vacant', 'Application Pending'];
const OCCUPIED_UNIT = ['Occupied', 'Notice Given'];

export async function computeUnitAvailability(sr, unit) {
  if (VACANT_UNIT.includes(unit.status)) {
    return { state: 'Vacant', bookable: true, occupied: false, available_from: null, half_deposit: false, exit_confirmed: false };
  }
  if (!OCCUPIED_UNIT.includes(unit.status)) {
    return { state: unit.status, bookable: false, occupied: false, available_from: null, half_deposit: false, exit_confirmed: false };
  }

  const tenancies = await sr.entities.Tenancy.filter({ unit_id: unit.id });
  const current = tenancies.filter((t) => LIVE_TENANCY.includes(t.status))
    .sort((a, b) => String(b.start_date || '').localeCompare(String(a.start_date || '')))[0];
  if (!current) {
    return { state: 'Occupied', bookable: false, occupied: true, available_from: null, half_deposit: false, exit_confirmed: false };
  }

  const [vacations, inspections] = await Promise.all([
    sr.entities.VacationRequest.filter({ tenancy_id: current.id, status: { $in: ['Approved','Final Inspection Scheduled','Completed'] } }),
    sr.entities.Inspection.filter({ tenancy_id: current.id, status: 'Completed' }),
  ]);
  const vac = vacations.filter(v=>v.proposed_vacation_date).sort((a,b)=>String(b.date_submitted || b.created_date).localeCompare(String(a.date_submitted || a.created_date)))[0];
  const available_from = vac?.proposed_vacation_date || current.expected_end_date || null;
  const exitInspection = !!vac && inspections.some(i=>['Final','Move-out'].includes(i.type) && i.completed_date && i.completed_date <= nairobiToday() && i.completed_date >= vac.date_submitted);
  const exitRequested = EXIT_STATUSES.includes(current.status) || vacations.length > 0;
  const exit_confirmed = exitInspection && exitRequested;

  return {
    state: 'Occupied',
    bookable: exit_confirmed,
    occupied: true,
    available_from,
    tenancy_end_date: current.expected_end_date || null,
    half_deposit: exit_confirmed,
    exit_confirmed,
  };
}