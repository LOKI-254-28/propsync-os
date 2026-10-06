import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { fileFields, syncRecordFiles } from '../../shared/documentRegistry.ts';

// Entities that require an approved landowner (or admin) to create,
// and that carry owner_user_id for ownership isolation.
const PROVIDER_ENTITIES = [
  'Property', 'Unit', 'Listing', 'Tenancy',
  'Expense', 'Notice', 'RentCharge', 'Document', 'Inspection', 'Tenant', 'Contractor',
];

// Entities that have an owner_user_id field (Tenant does not).
const ENTITIES_WITH_OWNER = [
  'Property', 'Unit', 'Listing', 'Tenancy',
  'Expense', 'Notice', 'RentCharge', 'Document', 'Inspection', 'Contractor', 'Tenant',
];

// Validate that child-entity references belong to the authenticated landowner.
// Admins skip this check.
async function validateParentOwnership(base44, user, entity, data) {
  const isAdmin = user.role === 'admin';
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

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Authentication required' }, { status: 401 });

    const body = await req.json();
    const { entity, data, bulk, records } = body;

    if (!entity) return Response.json({ error: 'Entity is required' }, { status: 400 });
    if (!PROVIDER_ENTITIES.includes(entity)) return Response.json({ error: 'Entity type not supported by this function' }, { status: 400 });

    const isAdmin = user.role === 'admin';
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
      if (records.length > 500 || records.some(r=>!r || typeof r!=='object' || Array.isArray(r) || typeof r.property_id!=='string' || !r.property_id)) return Response.json({error:'Choose one to 500 units with valid property links.'},{status:400});
      // Validate ownership of every distinct property referenced
      const propIds = [...new Set(records.map((r) => r.property_id).filter(Boolean))];
      for (const pid of propIds) {
        const prop = await base44.asServiceRole.entities.Property.get(pid).catch(() => null);
        if (!prop) return Response.json({ error: 'Property not found', code: 'NOT_FOUND' }, { status: 404 });
        if (!isAdmin && prop.owner_user_id !== user.id) {
          return Response.json({ error: 'Property does not belong to your account', code: 'OWNERSHIP' }, { status: 403 });
        }
      }

      // Stamp owner server-side (never trust client values)
      const cleaned = records.map((r) => ({
        ...r,
        owner_user_id: user.id,
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

    // All new tenancies must pass payment, agreement and tenant inspection approval.
    if (entity === 'Tenancy') return Response.json({error:'Start tenancies through the approved application and tenant inspection workflow.'},{status:409});
    if (data?.application_id && ['Inspection','Tenancy'].includes(entity)) return Response.json({error:'Use the application approval workflow for this record.'},{status:409});

    // ---- Single record creation ----
    if (!data) return Response.json({ error: 'Data is required' }, { status: 400 });

    const ownershipError = await validateParentOwnership(base44, user, entity, data);
    if (ownershipError) return Response.json({ error: ownershipError, code: 'OWNERSHIP' }, { status: 403 });

    const record = { ...data };
    if (ENTITIES_WITH_OWNER.includes(entity)) {
      record.owner_user_id = user.id;
    }
    if (entity === 'Contractor') {
      if (user.role !== 'admin' && !isApprovedLandowner) return Response.json({error:'Only approved landowners or admins can add contractors.'},{status:403});
      delete record.user_id;
      if (record.property_id) {
        const property = await base44.asServiceRole.entities.Property.get(record.property_id);
        if (user.role !== 'admin' && property.owner_user_id !== user.id) return Response.json({error:'This property is not yours.'},{status:403});
        record.owner_user_id = property.owner_user_id || user.id;
        delete record.property_id;
      }
    }
    if (entity === 'Document') {
      let tenancy = record.tenancy_id ? await base44.asServiceRole.entities.Tenancy.get(record.tenancy_id) : null;
      if (!tenancy && record.tenant_id) {
        const matches = await base44.asServiceRole.entities.Tenancy.filter({ tenant_id: record.tenant_id, ...(isAdmin ? {} : { owner_user_id: user.id }) }, '-created_date', 1);
        tenancy = matches[0];
        if (!isAdmin && !tenancy) return Response.json({ error: 'Choose a tenant linked to your property.' }, { status: 403 });
      }
      if (tenancy) {
        if (!isAdmin && tenancy.owner_user_id !== user.id) return Response.json({ error: 'This tenancy is not yours.' }, { status: 403 });
        record.tenancy_id = tenancy.id; record.tenant_id = tenancy.tenant_id;
        record.tenant_user_id = tenancy.tenant_user_id || '';
        record.property_id = tenancy.property_id; record.unit_id = tenancy.unit_id;
      } else if (record.tenant_id) {
        const tenant = await base44.asServiceRole.entities.Tenant.get(record.tenant_id);
        record.tenant_user_id = tenant.user_id || '';
      } else { record.tenant_user_id = ''; }
      if (record.unit_id && !record.property_id) {
        const unit = await base44.asServiceRole.entities.Unit.get(record.unit_id);
        record.property_id = unit.property_id;
      }
      if (record.property_id) {
        const property = await base44.asServiceRole.entities.Property.get(record.property_id);
        if (!isAdmin && property.owner_user_id !== user.id) return Response.json({ error: 'This property is not yours.' }, { status: 403 });
        record.owner_user_id = property.owner_user_id || user.id;
      }
      if (record.visibility === 'tenant_visible' && !record.tenant_id && !record.tenancy_id && !record.unit_id && !record.property_id) return Response.json({ error: 'Link tenant-visible documents to a tenant, tenancy, unit or property.' }, { status: 400 });
      record.uploaded_by_role = 'staff'; record.uploaded_by = user.email || user.id;
    }

    let created;
    if (entity === 'Document') {
      const existing = (await base44.asServiceRole.entities.Document.filter({file_uri:record.file_uri},'-created_date',1))[0];
      if (!existing || (existing.uploaded_by_user_id !== user.id && existing.uploaded_by !== user.email)) return Response.json({error:'Upload the file using the document picker first.'},{status:403});
      if (existing.linked && existing.owner_user_id && existing.owner_user_id !== record.owner_user_id) return Response.json({error:'The document belongs to a different property owner.'},{status:403});
      const { uploaded_by_user_id, source_entities, storage_type, ...metadata } = record;
      created = await base44.asServiceRole.entities.Document.update(existing.id,{...metadata,linked:!!(record.property_id || record.tenancy_id || record.tenant_id || record.unit_id)});
    } else {
      created = await base44.asServiceRole.entities[entity].create(record);
      if (fileFields[entity]) await syncRecordFiles(base44.asServiceRole,user,entity,created);
    }

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