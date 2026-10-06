import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { computeUnitAvailability } from '../../shared/unitAvailability.ts';
import { syncRecordFiles } from '../../shared/documentRegistry.ts';

const CLOSED = ['Rejected', 'Withdrawn', 'Cancelled', 'Expired', 'Completed'];
const SLOT = /^([01]\d|2[0-3]):[0-5]\d$/;

// Tenant books a unit: creates the Application (owner stamped server-side) with a visit request or a skipped visit.
export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Please log in to select a unit.' }, { status: 401 });
    const acct = user.account_type || user.data?.account_type;
    if (user.role === 'admin' || acct === 'admin' || acct === 'landowner') {
      return Response.json({ error: 'Only tenant accounts can book a unit.' }, { status: 403 });
    }

    const b = await req.json();
    const sr = base44.asServiceRole;
    if (typeof b.id_document_id !== 'string' || typeof b.photo_document_id !== 'string' || b.id_document_id === b.photo_document_id) return Response.json({ error:'Upload your ID copy and a clear, recent photograph before submitting.' }, { status:400 });
    const identity = await sr.entities.Document.filter({ id:{ $in:[b.id_document_id,b.photo_document_id] } });
    const idDoc = identity.find(d => d.id === b.id_document_id), photoDoc = identity.find(d => d.id === b.photo_document_id);
    if (!idDoc || !photoDoc || identity.some(d => d.uploaded_by_user_id !== user.id || d.storage_type !== 'private' || d.status === 'rejected' || !d.size || d.size > 10*1024*1024) || idDoc.category !== 'ID/Passport' || !['application/pdf','image/jpeg','image/png'].includes(idDoc.mime_type) || photoDoc.category !== 'Applicant Photo' || !['image/jpeg','image/png','image/webp'].includes(photoDoc.mime_type)) return Response.json({ error:'Both documents must be your own valid private uploads.' }, { status:403 });
    const unit = await sr.entities.Unit.get(b.unit_id).catch(() => null);
    if (!unit) return Response.json({ error: 'Unit not found' }, { status: 404 });

    const mine = await sr.entities.Application.filter({ tenant_user_id: user.id, unit_id: unit.id });
    const open = mine.find(a => !CLOSED.includes(a.status));
    if (open) {
      if ((open.documents || []).includes(idDoc.file_uri) && (open.documents || []).includes(photoDoc.file_uri)) {
        await syncRecordFiles(sr,user,'Application',open);
        return Response.json({ok:true,application:open});
      }
      return Response.json({ error: 'You already have an open application for this unit.' }, { status: 409 });
    }
    if (identity.some(d => d.application_id)) return Response.json({ error:'Use new uploads for this application.' }, {status:409});
    const avail = await computeUnitAvailability(sr, unit);
    if (!avail.bookable) return Response.json({ error: 'This unit is not open for booking yet.' }, { status: 409 });

    const today = new Date().toISOString().slice(0, 10);
    const schedule = b.visit === 'schedule';
    if (schedule && (!b.visit_date || b.visit_date < today || !SLOT.test(b.visit_time || ''))) {
      return Response.json({ error: 'Choose a valid visit date and time.' }, { status: 400 });
    }

    const tenant = (await sr.entities.Tenant.filter({ user_id: user.id }))[0];
    let start = b.proposed_start_date || today;
    if (avail.available_from && start < avail.available_from) start = avail.available_from;
    const deposit = Number(unit.security_deposit || 0);
    const amount = avail.half_deposit ? Math.round(deposit / 2) : deposit + Number(unit.monthly_rent || 0);
    const ref = `APP-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;

    const property = await sr.entities.Property.get(unit.property_id);
    const legacyReservation = b.source === 'browse_units';
    const app = await sr.entities.Application.create({
      application_reference: ref,
      tenant_user_id: user.id,
      tenant_id: tenant?.id || '',
      applicant_name: tenant?.full_name || user.full_name || user.email,
      applicant_email: tenant?.email || user.email,
      applicant_phone: tenant?.phone || '',
      id_number: b.id_number || tenant?.id_number || '',
      occupation: b.occupation || tenant?.occupation || '',
      monthly_income: Number(b.monthly_income) || tenant?.monthly_income || 0,
      property_id: unit.property_id,
      property_name: unit.property_name,
      unit_id: unit.id,
      unit_number: unit.unit_number,
      monthly_rent: unit.monthly_rent,
      proposed_start_date: start,
      message: String(b.message || '').slice(0, 1000),
      documents:[idDoc.file_uri,photoDoc.file_uri],
      status: legacyReservation ? 'Pending' : schedule ? 'Site Visit Requested' : 'Submitted',
      ...(legacyReservation ? { reservation_expiry:new Date(Date.now()+3*86400000).toISOString().slice(0,10) } : {}),
      submitted_date: today,
      application_type: 'rental',
      owner_user_id: property.owner_user_id || '',
      booked_occupied: avail.occupied,
      visit_skipped: !schedule,
      site_visit_date: schedule ? b.visit_date : undefined,
      site_visit_time: schedule ? b.visit_time : undefined,
      site_visit_status: schedule ? 'Proposed' : '',
      site_visit_proposed_by: schedule ? 'tenant' : '',
      payment_amount: amount,
    });

    await syncRecordFiles(sr,user,'Application',app);
    if (legacyReservation) await sr.entities.Unit.update(unit.id,{status:'Application Pending'});
    if (property.owner_user_id) {
      await sr.entities.Notification.create({
        recipient_user_id: property.owner_user_id,
        type: 'Application',
        title: schedule ? 'Site visit requested' : 'New application (visit skipped)',
        message: schedule
          ? `${app.applicant_name} proposed a site visit for ${unit.unit_number} on ${b.visit_date} at ${b.visit_time}.`
          : `${app.applicant_name} applied for ${unit.unit_number} and skipped the site visit.`,
        related_entity: 'Application',
        related_id: app.id,
        action_link: schedule ? '/site-visits' : '/applications',
        date: new Date().toISOString(),
        read: false,
      });
    }

    return Response.json({ ok: true, application: app });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}