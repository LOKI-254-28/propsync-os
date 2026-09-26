// Randomized seed data generator for Test Profile mode.
// Generates two independent datasets: landlord and tenant.
// Each call produces different random data (names, addresses, counts, statuses, dates).

const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const uid = (p) => `${p}-${Math.random().toString(36).slice(2, 10)}`;
const ref = (p) => `${p}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
const daysAgo = (n) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);
const daysAhead = (n) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
const img = (text, w = 600, h = 400) => `https://placehold.co/${w}x${h}/059669/ffffff?text=${encodeURIComponent(text)}`;
const monthKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
const prevMonthKey = (n) => { const d = new Date(); d.setMonth(d.getMonth() - n); return monthKey(d); };

const FIRST_NAMES = ['James', 'Sarah', 'David', 'Mercy', 'John', 'Grace', 'Peter', 'Faith', 'Daniel', 'Rose', 'Michael', 'Joy', 'Brian', 'Ann', 'Eric', 'Linda'];
const LAST_NAMES = ['Mwangi', 'Wanjiku', 'Otieno', 'Achieng', 'Kamau', 'Njeri', 'Ochieng', 'Wambui', 'Kiptoo', 'Chebet', 'Hassan', 'Ali', 'Omondi', 'Wekesa'];
const AREAS = ['Westlands', 'Karen', 'Kilimani', 'Lavington', 'Kileleshwa', 'Riverside', 'Parklands', 'Runda', 'Gigiri', 'Muthaiga'];
const STREETS = ['Riverside Drive', 'Argwings Kodhek Rd', 'Gitanga Rd', 'James Gichuru Rd', 'Karen Rd', 'Mwanzi Rd', 'Nduru Rd', 'Peponi Rd'];
const PROP_NAMES = ['Garden Heights', 'Riverside Apartments', 'Hillside Villas', 'Acacia Court', 'Palm Grove', 'Cedar Court', 'Bamboo Residences', 'Olive Gardens'];
const PROP_TYPES = ['Apartment Complex', 'Building', 'Mixed Use', 'Commercial', 'Townhouse', 'Villa'];
const UNIT_TYPES = ['Studio', '1 Bedroom', '2 Bedroom', '3 Bedroom', 'Penthouse'];
const AMENITIES = ['Parking', 'Balcony', 'Lift', 'Gym', 'Pool', 'Security', 'Borehole', 'Backup Generator', 'Internet', 'Garden'];
const OCCUPATIONS = ['Teacher', 'Engineer', 'Doctor', 'Accountant', 'Designer', 'Consultant', 'Developer', 'Architect'];
const EMPLOYERS = ['Safaricom', 'KCB', 'Nation Media', 'UN', 'World Bank', 'Google Kenya', 'Equity Bank', 'CIC Insurance'];

function fullName() { return pick(FIRST_NAMES) + ' ' + pick(LAST_NAMES); }
function phoneNum() { return '+2547' + String(rand(10000000, 99999999)); }
function address() { return pick(STREETS) + ', ' + pick(AREAS) + ', Nairobi'; }
function bedroomsFor(type) { return { Studio: 0, '1 Bedroom': 1, '2 Bedroom': 2, '3 Bedroom': 3, Penthouse: 4 }[type] ?? 1; }
function rentFor(type) { return { Studio: rand(25000, 40000), '1 Bedroom': rand(45000, 70000), '2 Bedroom': rand(70000, 120000), '3 Bedroom': rand(120000, 200000), Penthouse: rand(200000, 350000) }[type] ?? 50000; }

function emptyEntities() {
  return {
    Property: [], Unit: [], Tenant: [], Tenancy: [], RentCharge: [], Payment: [],
    Application: [], Maintenance: [], Inspection: [], Notice: [], Document: [],
    Feedback: [], VacationRequest: [], Expense: [], Contractor: [], Notification: [],
    Listing: [], SaleTransaction: [], Lease: [], AuditLog: [],
    Settings: [{ id: 'settings-1', organization_name: 'Verdant Estates', currency: 'KES', default_rent_due_day: 1, default_grace_period_days: 7, default_notice_period_days: 30, payment_methods: ['M-Pesa', 'Bank Transfer'] }],
  };
}

// Sanity check: fix any implausible fields
function sanitize(seed) {
  seed.entities.RentCharge?.forEach((c) => {
    c.amount = Math.max(0, c.amount);
    c.amount_paid = Math.max(0, Math.min(c.amount_paid, c.amount));
    c.outstanding = Math.max(0, c.amount - c.amount_paid);
  });
  seed.entities.Payment?.forEach((p) => { p.amount = Math.max(0, p.amount); });
  seed.entities.Application?.forEach((a) => {
    if (a.submitted_date && a.proposed_start_date && new Date(a.submitted_date) > new Date(a.proposed_start_date)) {
      a.proposed_start_date = a.submitted_date;
    }
  });
  return seed;
}

export function generateSeed(role) {
  return sanitize(role === 'landlord' ? generateLandlordSeed() : generateTenantSeed());
}

function generateLandlordSeed() {
  const userId = uid('test-landlord');
  const userName = fullName();
  const user = { id: userId, full_name: userName, email: 'test.landlord@propwiz.app', account_type: 'landowner', approval_status: 'approved', phone: phoneNum(), role: 'user', profile_image: img(userName, 200, 200), address: address() };
  const e = emptyEntities();

  const propCount = rand(2, 3);
  const usedNames = new Set();
  for (let i = 0; i < propCount; i++) {
    let propName = pick(PROP_NAMES);
    while (usedNames.has(propName)) propName = pick(PROP_NAMES) + ' ' + rand(1, 99);
    usedNames.add(propName);
    const propId = uid('prop');
    e.Property.push({ id: propId, name: propName, code: ref('PRP'), address: address(), property_type: pick(PROP_TYPES), status: 'Active', acquisition_date: daysAgo(rand(180, 720)), contact_phone: phoneNum(), contact_email: 'manager@verdant.co.ke', images: [img(propName), img(propName + ' 2'), img(propName + ' 3')], monthly_operating_expenses: rand(15000, 45000), currency: 'KES', owner_user_id: userId, description: `${propName} — quality living in Nairobi.`, notes: '' });

    const unitCount = rand(3, 8);
    for (let j = 0; j < unitCount; j++) {
      const unitType = pick(UNIT_TYPES);
      const rent = rentFor(unitType);
      const isOccupied = Math.random() < 0.5;
      const unitId = uid('unit');
      const tenantName = isOccupied ? fullName() : '';
      const tenantId = isOccupied ? uid('tenant') : '';
      const tenantUserId = isOccupied ? uid('user') : '';
      const unit = { id: unitId, unit_number: `${String.fromCharCode(65 + (j % 4))}${100 + j}`, invite_code: `VE-${Math.random().toString(36).slice(2, 8).toUpperCase()}`, property_id: propId, property_name: propName, building: pick(['Block A', 'Block B', '']), floor: String(rand(1, 5)), unit_type: unitType, bedrooms: bedroomsFor(unitType), bathrooms: Math.min(bedroomsFor(unitType) + 1, 3), size_sqm: rand(35, 120), monthly_rent: rent, security_deposit: rent * 2, service_charge: rand(2000, 8000), furnished: Math.random() < 0.3, amenities: AMENITIES.filter(() => Math.random() < 0.4), images: [img(`Unit ${j + 1}`)], description: `${unitType} in ${propName}.`, status: isOccupied ? 'Occupied' : 'Available', current_tenancy_id: '', current_tenant_name: tenantName, owner_user_id: userId };
      e.Unit.push(unit);
      if (isOccupied) {
        e.Tenant.push({ id: tenantId, user_id: tenantUserId, full_name: tenantName, email: tenantName.toLowerCase().replace(' ', '.') + '@email.com', phone: phoneNum(), id_number: String(rand(1000000, 9999999)), occupation: pick(OCCUPATIONS), employer: pick(EMPLOYERS), monthly_income: rand(80000, 300000), status: 'Active', profile_image: img(tenantName, 200, 200), profile_type: 'tenant' });
        const tenancyId = uid('tenancy');
        const startDate = daysAgo(rand(30, 300));
        e.Tenancy.push({ id: tenancyId, tenancy_reference: ref('TEN'), tenant_id: tenantId, tenant_name: tenantName, tenant_user_id: tenantUserId, property_id: propId, property_name: propName, unit_id: unitId, unit_number: unit.unit_number, start_date: startDate, expected_end_date: daysAhead(rand(60, 365)), monthly_rent: rent, security_deposit: rent * 2, service_charge: unit.service_charge, payment_due_day: 1, grace_period_days: 7, notice_period_days: 30, status: 'Active', notes: '', owner_user_id: userId });
        unit.current_tenancy_id = tenancyId;
        for (let m = 0; m < rand(2, 3); m++) {
          const mk = prevMonthKey(m);
          const dueDate = daysAgo(m * 30 - 5);
          const amount = rent + unit.service_charge;
          const paid = Math.random() < 0.7 ? amount : (Math.random() < 0.5 ? Math.round(amount * 0.5) : 0);
          const chargeId = uid('charge');
          e.RentCharge.push({ id: chargeId, tenancy_id: tenancyId, tenant_id: tenantId, tenant_user_id: tenantUserId, tenant_name: tenantName, property_id: propId, property_name: propName, unit_id: unitId, unit_number: unit.unit_number, billing_period: mk, due_date: dueDate, amount, amount_paid: paid, outstanding: amount - paid, status: paid >= amount ? 'Paid' : paid > 0 ? 'Partial' : new Date(dueDate) < new Date() ? 'Overdue' : 'Unpaid', notes: '', owner_user_id: userId });
          if (paid > 0) e.Payment.push({ id: uid('pay'), payment_reference: ref('PAY'), tenant_id: tenantId, tenant_user_id: tenantUserId, tenant_name: tenantName, tenancy_id: tenancyId, property_id: propId, property_name: propName, unit_id: unitId, unit_number: unit.unit_number, amount: paid, payment_date: daysAgo(m * 30 - 3), method: pick(['M-Pesa', 'Bank Transfer', 'Card']), status: 'Successful', allocations: [{ charge_id: chargeId, billing_period: mk, amount: paid }], receipt_number: ref('RCP'), notes: '', recorded_by: userName, owner_user_id: userId });
        }
      }
    }
  }

  for (let i = 0; i < rand(3, 5); i++) {
    const prop = pick(e.Property);
    const propUnits = e.Unit.filter((u) => u.property_id === prop.id);
    const unit = propUnits[rand(0, Math.max(0, propUnits.length - 1))] || e.Unit[0];
    const applicantName = fullName();
    const status = pick(['Submitted', 'Under Review', 'Approved', 'Rejected', 'Payment Requested', 'Agreement Issued']);
    e.Application.push({ id: uid('app'), application_reference: ref('APP'), tenant_user_id: uid('user'), applicant_name: applicantName, applicant_email: applicantName.toLowerCase().replace(' ', '.') + '@email.com', applicant_phone: phoneNum(), id_number: String(rand(1000000, 9999999)), occupation: pick(OCCUPATIONS), monthly_income: rand(80000, 300000), property_id: prop.id, property_name: prop.name, unit_id: unit?.id || '', unit_number: unit?.unit_number || '', monthly_rent: unit?.monthly_rent || 50000, proposed_start_date: daysAhead(rand(7, 30)), message: 'I am interested in this property.', documents: [], status, submitted_date: daysAgo(rand(1, 45)), application_type: 'rental', owner_user_id: userId });
  }

  for (let i = 0; i < rand(2, 3); i++) {
    const occupied = e.Unit.filter((u) => u.status === 'Occupied');
    const unit = occupied[rand(0, Math.max(0, occupied.length - 1))] || e.Unit[0];
    const tenancy = e.Tenancy.find((t) => t.unit_id === unit?.id);
    const status = pick(['Submitted', 'Acknowledged', 'Assigned', 'In Progress', 'Completed']);
    e.Maintenance.push({ id: uid('mnt'), ticket_number: ref('MNT'), title: pick(['Leaking kitchen tap', 'Broken door lock', 'Faulty electrical socket', 'AC not cooling', 'Cracked window pane', 'Blocked drain']), description: 'The issue needs attention.', category: pick(['Plumbing', 'Electrical', 'Structural', 'Appliance', 'Security', 'Cleaning', 'Other']), priority: pick(['Low', 'Medium', 'High', 'Urgent']), date_reported: daysAgo(rand(1, 30)), property_id: unit?.property_id || '', property_name: unit?.property_name || '', unit_id: unit?.id || '', unit_number: unit?.unit_number || '', tenant_id: tenancy?.tenant_id || '', tenant_user_id: tenancy?.tenant_user_id || '', tenant_name: tenancy?.tenant_name || '', tenancy_id: tenancy?.id || '', images: [img('Maintenance Issue'), img('Issue Detail')], estimated_cost: rand(1000, 15000), approved_cost: status === 'Completed' ? rand(1000, 15000) : 0, actual_cost: status === 'Completed' ? rand(1000, 15000) : 0, completion_date: status === 'Completed' ? daysAgo(rand(1, 10)) : '', resolution_notes: status === 'Completed' ? 'Issue resolved.' : '', public_updates: status !== 'Submitted' ? [{ date: daysAgo(rand(0, 5)), status: 'Acknowledged', message: 'We have received your request.' }] : [], status, owner_user_id: userId });
  }

  for (let i = 0; i < rand(2, 4); i++) {
    e.Notification.push({ id: uid('notif'), recipient_user_id: userId, type: pick(['Application', 'Maintenance', 'Payment', 'General']), title: pick(['New application received', 'Maintenance request submitted', 'Payment received', 'Unit now vacant', 'Tenancy expiring soon']), message: 'A new update requires your attention.', related_entity: '', related_id: '', action_link: pick(['/applications', '/maintenance', '/rent', '/units']), date: new Date(Date.now() - rand(1, 72) * 3600000).toISOString(), read: Math.random() < 0.4 });
  }

  for (let i = 0; i < rand(1, 2); i++) {
    e.Contractor.push({ id: uid('ctr'), name: pick(['Nairobi Plumbing Co', 'QuickFix Electricals', 'Apex Maintenance', 'Reliable Handymen']), company: pick(['Ltd', 'Services', 'Kenya']), contact_person: fullName(), phone: phoneNum(), email: 'service@contractor.co.ke', services: [pick(['Plumbing', 'Electrical', 'General Maintenance', 'Cleaning', 'Security'])], status: 'Active', total_assigned: rand(1, 10), total_cost: rand(10000, 100000) });
  }

  for (let i = 0; i < rand(1, 2); i++) {
    const prop = pick(e.Property);
    e.Expense.push({ id: uid('exp'), property_id: prop.id, property_name: prop.name, category: pick(['Repairs', 'Maintenance', 'Utilities', 'Security', 'Cleaning', 'Insurance']), description: pick(['Monthly security service', 'Water bill', 'Garbage collection', 'Lift maintenance', 'Garden upkeep']), amount: rand(3000, 25000), date: daysAgo(rand(1, 30)), vendor: pick(['SecureCo', 'Nairobi Water', 'WastePro', 'LiftTech']), recurring: Math.random() < 0.4, owner_user_id: userId });
  }

  const available = e.Unit.filter((u) => u.status === 'Available');
  for (let i = 0; i < Math.min(rand(1, 2), available.length); i++) {
    const unit = available[i]; if (!unit) break;
    e.Listing.push({ id: uid('lst'), listing_reference: ref('LST'), property_id: unit.property_id, property_name: unit.property_name, unit_id: unit.id, unit_number: unit.unit_number, listing_type: 'Rent', price: unit.monthly_rent, description: `Beautiful ${unit.unit_type} in ${unit.property_name}.`, images: [img(`${unit.property_name} ${unit.unit_number}`)], status: 'Published', date_listed: daysAgo(rand(1, 30)), owner_user_id: userId });
  }

  return { user, entities: e };
}

function generateTenantSeed() {
  const userId = uid('test-tenant');
  const userName = fullName();
  const user = { id: userId, full_name: userName, email: 'test.tenant@propwiz.app', account_type: 'client', approval_status: 'approved', phone: phoneNum(), role: 'user', profile_image: img(userName, 200, 200), address: address() };
  const e = emptyEntities();
  const landlordId = uid('landlord');

  const tenantId = uid('tenant');
  e.Tenant.push({ id: tenantId, user_id: userId, full_name: userName, email: user.email, phone: user.phone, id_number: String(rand(1000000, 9999999)), occupation: pick(OCCUPATIONS), employer: pick(EMPLOYERS), monthly_income: rand(80000, 300000), status: 'Active', profile_image: user.profile_image, profile_type: 'tenant' });

  const propId = uid('prop');
  const propName = pick(PROP_NAMES);
  const unitId = uid('unit');
  const unitType = pick(UNIT_TYPES);
  const rent = rentFor(unitType);
  const tenancyId = uid('tenancy');
  const startDate = daysAgo(rand(60, 200));

  e.Property.push({ id: propId, name: propName, code: ref('PRP'), address: address(), property_type: pick(PROP_TYPES), status: 'Active', images: [img(propName)], owner_user_id: landlordId });
  e.Unit.push({ id: unitId, unit_number: 'A101', property_id: propId, property_name: propName, unit_type: unitType, bedrooms: bedroomsFor(unitType), bathrooms: Math.min(bedroomsFor(unitType) + 1, 3), monthly_rent: rent, security_deposit: rent * 2, service_charge: rand(2000, 8000), status: 'Occupied', current_tenancy_id: tenancyId, current_tenant_name: userName, images: [img('My Unit')], owner_user_id: landlordId });
  e.Tenancy.push({ id: tenancyId, tenancy_reference: ref('TEN'), tenant_id: tenantId, tenant_name: userName, tenant_user_id: userId, property_id: propId, property_name: propName, unit_id: unitId, unit_number: 'A101', start_date: startDate, expected_end_date: daysAhead(rand(60, 200)), monthly_rent: rent, security_deposit: rent * 2, service_charge: e.Unit[0].service_charge, payment_due_day: 1, grace_period_days: 7, notice_period_days: 30, status: 'Active', owner_user_id: landlordId });

  for (let m = 0; m < rand(2, 3); m++) {
    const mk = prevMonthKey(m);
    const dueDate = daysAgo(m * 30 - 5);
    const amount = rent + e.Unit[0].service_charge;
    const isPaid = m > 0 || Math.random() < 0.5;
    const paid = isPaid ? amount : 0;
    const chargeId = uid('charge');
    e.RentCharge.push({ id: chargeId, tenancy_id: tenancyId, tenant_id: tenantId, tenant_user_id: userId, tenant_name: userName, property_id: propId, property_name: propName, unit_id: unitId, unit_number: 'A101', billing_period: mk, due_date: dueDate, amount, amount_paid: paid, outstanding: amount - paid, status: paid >= amount ? 'Paid' : paid > 0 ? 'Partial' : new Date(dueDate) < new Date() ? 'Overdue' : 'Unpaid', owner_user_id: landlordId });
    if (paid > 0) e.Payment.push({ id: uid('pay'), payment_reference: ref('PAY'), tenant_id: tenantId, tenant_user_id: userId, tenant_name: userName, tenancy_id: tenancyId, property_id: propId, property_name: propName, unit_id: unitId, unit_number: 'A101', amount: paid, payment_date: daysAgo(m * 30 - 3), method: pick(['M-Pesa', 'Bank Transfer']), status: 'Successful', allocations: [{ charge_id: chargeId, billing_period: mk, amount: paid }], receipt_number: ref('RCP'), owner_user_id: landlordId });
  }

  const otherPropId = uid('prop');
  const otherPropName = (PROP_NAMES.find((n) => n !== propName) || 'Other Estate');
  const otherUnitId = uid('unit');
  e.Property.push({ id: otherPropId, name: otherPropName, code: ref('PRP'), address: address(), property_type: pick(PROP_TYPES), status: 'Active', images: [img(otherPropName)], owner_user_id: uid('landlord') });
  e.Unit.push({ id: otherUnitId, unit_number: 'B205', property_id: otherPropId, property_name: otherPropName, unit_type: pick(UNIT_TYPES), bedrooms: rand(1, 3), bathrooms: 2, monthly_rent: rentFor('2 Bedroom'), status: 'Available', images: [img('Available Unit')], owner_user_id: e.Property[1].owner_user_id });

  for (let i = 0; i < rand(2, 3); i++) {
    const useOther = i === 0;
    const pid = useOther ? otherPropId : propId;
    const pname = useOther ? otherPropName : propName;
    const uid2 = useOther ? otherUnitId : unitId;
    const unum = useOther ? 'B205' : 'A101';
    e.Application.push({ id: uid('app'), application_reference: ref('APP'), tenant_user_id: userId, applicant_name: userName, applicant_email: user.email, applicant_phone: user.phone, property_id: pid, property_name: pname, unit_id: uid2, unit_number: unum, monthly_rent: rentFor('2 Bedroom'), proposed_start_date: daysAhead(rand(7, 30)), status: pick(['Submitted', 'Under Review', 'Approved', 'Rejected']), submitted_date: daysAgo(rand(1, 30)), application_type: 'rental', message: 'I would like to apply for this property.', owner_user_id: e.Property.find((p) => p.id === pid)?.owner_user_id || '' });
  }

  for (let i = 0; i < rand(2, 3); i++) {
    const status = pick(['Submitted', 'Acknowledged', 'Assigned', 'In Progress', 'Completed']);
    e.Maintenance.push({ id: uid('mnt'), ticket_number: ref('MNT'), title: pick(['Leaking kitchen tap', 'Broken door lock', 'Faulty electrical socket', 'AC not cooling', 'Cracked window pane']), description: 'The issue needs attention.', category: pick(['Plumbing', 'Electrical', 'Structural', 'Appliance', 'Security', 'Cleaning', 'Other']), priority: pick(['Low', 'Medium', 'High', 'Urgent']), date_reported: daysAgo(rand(1, 20)), property_id: propId, property_name: propName, unit_id: unitId, unit_number: 'A101', tenant_id: tenantId, tenant_user_id: userId, tenant_name: userName, tenancy_id: tenancyId, images: [img('Issue Photo 1'), img('Issue Photo 2')], status, public_updates: status !== 'Submitted' ? [{ date: daysAgo(rand(0, 5)), status: 'Acknowledged', message: 'We have received your request.' }] : [], owner_user_id: landlordId });
  }

  for (let i = 0; i < rand(2, 4); i++) {
    e.Notification.push({ id: uid('notif'), recipient_user_id: userId, type: pick(['Maintenance', 'Payment', 'Notice', 'General']), title: pick(['Maintenance update', 'Payment received', 'Rent reminder', 'Inspection scheduled', 'Notice received']), message: 'You have a new update.', date: new Date(Date.now() - rand(1, 72) * 3600000).toISOString(), read: Math.random() < 0.4 });
  }

  for (let i = 0; i < rand(1, 2); i++) {
    e.Notice.push({ id: uid('notice'), notice_reference: ref('NTC'), type: pick(['Rent Reminder', 'Inspection Notice', 'General Notice']), date_issued: daysAgo(rand(1, 15)), sender: 'Verdant Estates', property_id: propId, property_name: propName, unit_id: unitId, unit_number: 'A101', tenant_id: tenantId, tenant_user_id: userId, tenant_name: userName, tenancy_id: tenancyId, subject: pick(['Rent due reminder', 'Scheduled inspection', 'Water supply notice']), content: 'This is a notice from your landlord.', status: 'Issued', acknowledged: Math.random() < 0.5, owner_user_id: landlordId });
  }

  e.Inspection.push({ id: uid('insp'), inspection_reference: ref('INS'), type: 'Routine', property_id: propId, property_name: propName, unit_id: unitId, unit_number: 'A101', tenancy_id: tenancyId, tenant_id: tenantId, tenant_user_id: userId, tenant_name: userName, scheduled_date: daysAhead(rand(7, 30)), status: 'Scheduled', condition_rating: 'Good', owner_user_id: landlordId });

  for (let i = 0; i < rand(3, 5); i++) {
    e.Listing.push({ id: uid('lst'), listing_reference: ref('LST'), property_id: uid('prop'), property_name: pick(PROP_NAMES) + ' ' + rand(1, 99), unit_id: uid('unit'), unit_number: `${String.fromCharCode(67 + i)}${100 + i}`, listing_type: 'Rent', price: rentFor(pick(UNIT_TYPES)), description: 'Beautiful unit available for rent.', images: [img('Listing ' + i)], status: 'Published', date_listed: daysAgo(rand(1, 20)), owner_user_id: uid('landlord') });
  }

  return { user, entities: e };
}