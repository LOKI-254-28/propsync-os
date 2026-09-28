import { createClientFromRequest } from 'npm:@base44/sdk@0.8.49';

// Entities that require an approved landowner (or admin) to create,
// and that carry owner_user_id for ownership isolation.
const PROVIDER_ENTITIES = [
  'Property', 'Unit', 'Listing', 'Tenancy',
  'Expense', 'Notice', 'RentCharge', 'Document', 'Inspection', 'Tenant',
];

// Entities that have an owner_user_id field (Tenant does not).
const ENTITIES_WITH_OWNER = [
  'Property', 'Unit', 'Listing', 'Tenancy',
  'Expense', 'Notice', 'RentCharge', 'Document', 'Inspection',
];

// Validate that child-entity references belong to the authenticated landowner.
// Admins skip this check.
async function validateParentOwnership(base44, user, entity, data) {
  const isAdmin = user.role === 'admin' || user.account_type === 'admin' || user.data?.account_type === 'admin';
  if (isAdmin) return null;

  if (data.property_id && entity !== 'Property' && entity !== 'Tenant') {
    const prop = await base44.asServiceRole.entities.Property.get(data.property_id).catch(() => null);
    if (!prop || prop.owner_user_id !== user.id) return 'Property does not belong to your account';
  }

  if (data.unit_id && entity !== 'Unit') {
    const unit = await base44.asServiceRole.entities.Unit.get(data.unit_id).catch(() => null);
    if (!unit || unit.owner_user_id !== user.id) return 'Unit does not belong to your account';
  }

  if (data.tenancy_id && entity !== 'Tenancy') {
    const tenancy = await base44.asServiceRole.entities.Tenancy.get(data.tenancy_id).catch(() => null);
    if (!tenancy || tenancy.owner_user_id !== user.id) return 'Tenancy does not belong to your account';
  }

  return null;
}

function genInviteCode() {
  return `PW-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Authentication required' }, { status: 401 });

    const body = await req.json();
    const { entity, data, bulk, records } = body;

    if (!entity) return Response.json({ error: 'Entity is required' }, { status: 400 });
    if (!PROVIDER_ENTITIES.includes(entity)) return Response.json({ error: 'Entity type not supported by this function' }, { status: 400 });

    const isAdmin = user.role === 'admin' || user.account_type === 'admin' || user.data?.account_type === 'admin';
    const isApprovedLandowner = (user.account_type === 'landowner' || user.data?.account_type === 'landowner')
      && (user.approval_status === 'approved' || user.data?.approval_status === 'approved');

    if (!isAdmin && !isApprovedLandowner) {
      const reason = user.account_type === 'landowner' && user.approval_status !== 'approved'
        ? 'Your account is awaiting admin approval. You will be able to create records once approved.'
        : 'You do not have permission to create this record type.';
      return Response.json({ error: reason, code: 'FORBIDDEN' }, { status: 403 });
    }

    // ---- Bulk unit creation (bulk unit-registration wizard) ----
    if (bulk && entity === 'Unit' && Array.isArray(records) && records.length > 0) {
      // Validate ownership of every distinct property referenced
      const propIds = [...new Set(records.map((r) => r.property_id).filter(Boolean))];
      for (const pid of propIds) {
        const prop = await base44.asServiceRole.entities.Property.get(pid).catch(() => null);
        if (!prop) return Response.json({ error: 'Property not found', code: 'NOT_FOUND' }, { status: 404 });
        if (!isAdmin && prop.owner_user_id !== user.id) {
          return Response.json({ error: 'Property does not belong to your account', code: 'OWNERSHIP' }, { status: 403 });
        }
      }

      // Stamp owner + invite code server-side (never trust client values)
      const cleaned = records.map((r) => ({
        ...r,
        owner_user_id: user.id,
        invite_code: r.invite_code || genInviteCode(),
        status: r.status || 'Available',
      }));

      const created = await base44.asServiceRole.entities.Unit.bulkCreate(cleaned);

      try {
        await base44.asServiceRole.entities.AuditLog.create({
          user_id: user.id,
          user_email: user.email,
          user_role: user.role,
          action: 'Units Bulk Created',
          entity: 'Unit',
          entity_id: created[0]?.id || '',
          entity_name: `${created.length} units`,
          new_value: JSON.stringify({ property_id: propIds[0] || '', count: created.length }).slice(0, 2000),
          timestamp: new Date().toISOString(),
        });
      } catch (e) {}

      return Response.json({ ok: true, records: created });
    }

    // ---- Single record creation ----
    if (!data) return Response.json({ error: 'Data is required' }, { status: 400 });

    const ownershipError = await validateParentOwnership(base44, user, entity, data);
    if (ownershipError) return Response.json({ error: ownershipError, code: 'OWNERSHIP' }, { status: 403 });

    const record = { ...data };
    if (ENTITIES_WITH_OWNER.includes(entity)) {
      record.owner_user_id = user.id;
    }
    // Units always get a server-generated invite code
    if (entity === 'Unit' && !record.invite_code) {
      record.invite_code = genInviteCode();
    }

    const created = await base44.asServiceRole.entities[entity].create(record);

    try {
      await base44.asServiceRole.entities.AuditLog.create({
        user_id: user.id,
        user_email: user.email,
        user_role: user.role,
        action: `${entity} Created`,
        entity,
        entity_id: created.id,
        entity_name: data.name || data.unit_number || data.listing_reference || data.tenancy_reference || data.ticket_number || data.full_name || created.id,
        timestamp: new Date().toISOString(),
      });
    } catch (e) {}

    return Response.json({ ok: true, record: created });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}