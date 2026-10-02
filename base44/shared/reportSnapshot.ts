import { nairobiToday } from './nairobiDates.ts';
export async function buildReportSnapshot(sr, request) {
  const propertyQuery = { owner_user_id: request.owner_user_id, ...(request.scope === 'Property' ? { id: request.property_id } : {}) };
  const propertyIds = []; let cursor;
  do { const page = await sr.entities.Property.filter(propertyQuery, { limit: 200, cursor, fields: ['id'] }); propertyIds.push(...page.items.map(p => p.id)); cursor = page.has_more ? page.next_cursor : null; } while (cursor);
  const query = { property_id: { $in: propertyIds } };
  const summary = { properties: propertyIds.length, units: 0, occupied: 0, charged: 0, paidAgainstCharges: 0, outstanding: 0, arrears: 0, income: 0, expenses: 0, openMaintenance: 0 };
  const monthly = new Map(), occupancy = new Map();
  const today = nairobiToday(), start = new Date(`${today.slice(0,7)}-01T00:00:00Z`);
  start.setUTCMonth(start.getUTCMonth() - 11);
  for (let i = 0; i < 12; i++) { const date = new Date(start); date.setUTCMonth(date.getUTCMonth() + i); const month = date.toISOString().slice(0,7); monthly.set(month, { month, income: 0, expenses: 0 }); }
  const scan = async (name, handle, extra = {}) => {
    let next;
    do { const page = await sr.entities[name].filter({ ...query, ...extra }, { limit: 200, cursor: next }); page.items.forEach(handle); next = page.has_more ? page.next_cursor : null; } while (next);
  };
  await Promise.all([
    scan('Unit', u => { summary.units++; if (['Occupied', 'Notice Given'].includes(u.status)) summary.occupied++; occupancy.set(u.status || 'Unknown', (occupancy.get(u.status || 'Unknown') || 0) + 1); }),
    scan('RentCharge', c => { summary.charged += Number(c.amount || 0); summary.paidAgainstCharges += Number(c.amount_paid || 0); summary.outstanding += Number(c.outstanding || 0); if (c.due_date < today && Number(c.outstanding) > 0) summary.arrears += Number(c.outstanding); }, { status: { $ne: 'Void' } }),
    scan('Payment', p => { const amount = Number(p.amount || 0); summary.income += amount; const row = monthly.get((p.payment_date || '').slice(0,7)); if (row) row.income += amount; }, { status: 'Successful' }),
    scan('Expense', e => { const amount = Number(e.amount || 0); summary.expenses += amount; const row = monthly.get((e.date || '').slice(0,7)); if (row) row.expenses += amount; }),
    scan('Maintenance', () => { summary.openMaintenance++; }, { status: { $nin: ['Completed', 'Closed', 'Rejected'] } }),
  ]);
  return { summary, monthly: [...monthly.values()], occupancy: [...occupancy].map(([status, count]) => ({ status, count })) };
}