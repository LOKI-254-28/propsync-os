import { createClientFromRequest } from 'npm:@base44/sdk@0.8.49';

// Entities that require an approved landowner (or admin) to create,
// and that carry owner_user_id for ownership isolation.
const PROVIDER_ENTITIES = [
  'Property', 'Unit', 'Listing', 'Tenancy', 'Lease', 'SaleTransaction',
  'Expense', 'Notice', 'RentCharge', 'Document', 'Inspection', 'Tenant',
];

// Entities that have an owner_user_id field (Tenant does not).
const ENTITIES_WITH_OWNER = [
  'Property', 'Unit', 'Listing', 'Tenancy', 'Lease', 'SaleTransaction',
  'Expense', 'Notice', 'RentCharge', 'Document', 'Inspection',
];

// Validate that child-entity references belong to the authenticated landowner.
// Admins skip this check.
async function validateParentOwnership(base44, user, entity, data) {
  const isAdmin = user.role === 'admin' || user.account_type === 'admin' || user.data?.account_type === 'admin';
  if (isAdmin) return null;

  // property_id — used by Unit, Listing, Tenancy, Lease, SaleTransaction, Expense, Notice, Inspection, Document
  if (data.property_id && entity !== 'Property' && entity !== 'Tenant') {
    const prop = await base44.asServiceRole.entities.Property.get(data.property_id).catch(() => null);
    if (!prop || prop.owner_user_id !== user.id) return 'Property does not belong to your account';
  }

  // unit_id — used by Listing, Tenancy, Lease, SaleTransaction, Inspection, Document
  if (data.unit_id && entity !== 'Unit') {
    const unit = await base44.asServiceRole.entities.Unit.get(data.unit_id).catch(() => null);
    if (!unit || unit.owner_user_id !== user.id) return 'Unit does not belong to your account';
  }

  // tenancy_id — used by RentCharge, Notice, Document, Inspection
  if (data.tenancy_id && entity !== 'Tenancy') {
    const tenancy = await base44.asServiceRole.entities.Tenancy.get(data.tenancy_id).catch(() => null);
    if (!tenancy || tenancy.owner_user_id !== user.id) return 'Tenancy does not belong to your account';
  }

  return null;
}

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Authentication required' }, { status: 401 });

    const body = await req.json();
    const { entity, data } = body;

    if (!entity || !data) return Response.json({ error: 'Entity and data are required' }, { status: 400 });
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

    // Validate parent ownership for child entities
    const ownershipError = await validateParentOwnership(base44, user, entity, data);
    if (ownershipError) return Response.json({ error: ownershipError, code: 'OWNERSHIP' }, { status: 403 });

    // Stamp ownership from the authenticated user — never trust the client value
    const record = { ...data };
    if (ENTITIES_WITH_OWNER.includes(entity)) {
      record.owner_user_id = user.id;
    }

    // Create via service role (bypasses RLS, which blocks direct non-admin creates)
    const created = await base44.asServiceRole.entities[entity].create(record);

    // Audit log
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