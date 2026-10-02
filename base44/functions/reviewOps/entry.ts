import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

export default async function(req: Request): Promise<Response> {
  try {
    const b = createClientFromRequest(req);
    const user = await b.auth.me();
    if (!user) return Response.json({ error: 'Please sign in.' }, { status: 401 });
    const { action, entity, target_id, review_id, rating, comment = '' } = await req.json();
    if (!['TenancyReview', 'TenantReview'].includes(entity)) return Response.json({ error: 'Invalid review type.' }, { status: 400 });
    const sr = b.asServiceRole;
    const admin = user.role === 'admin';
    if (action === 'remove') {
      if (typeof review_id !== 'string') return Response.json({ error: 'Review is required.' }, { status: 400 });
      const review = await sr.entities[entity].get(review_id);
      const property = entity === 'TenancyReview' ? await sr.entities.Property.get(review.property_id) : null;
      if (!admin && !(entity === 'TenancyReview' && property?.owner_user_id === user.id)) return Response.json({ error: 'You cannot remove this review.' }, { status: 403 });
      if (!review.removed) await sr.entities[entity].update(review.id, { removed: true, removed_by: user.id, removed_date: new Date().toISOString() });
      return Response.json({ ok: true });
    }
    if (action !== 'submit' || typeof target_id !== 'string' || !Number.isInteger(rating) || rating < 1 || rating > 5 || typeof comment !== 'string' || comment.length > 2000) return Response.json({ error: 'Choose 1–5 stars and a comment of up to 2,000 characters.' }, { status: 400 });
    let data;
    let unique;
    if (entity === 'TenancyReview') {
      const ten = await b.entities.Tenancy.get(target_id);
      if (ten.tenant_user_id !== user.id) return Response.json({ error: 'You can only rate your own tenancy.' }, { status: 403 });
      const today = new Date(new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Nairobi', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()) + 'T00:00:00Z');
      const cutoff = new Date(today); cutoff.setUTCMonth(cutoff.getUTCMonth() - 6);
      const current = ['Active', 'Expiring Soon', 'Notice Given'].includes(ten.status);
      const start = new Date(ten.start_date + 'T00:00:00Z');
      const end = new Date((ten.actual_end_date || ten.expected_end_date) + 'T00:00:00Z');
      const eligible = current ? start <= cutoff : ['Terminated', 'Vacated', 'Archived'].includes(ten.status) && end >= cutoff && end <= today;
      if (!eligible) return Response.json({ error: 'Rate after six months of occupancy, or within six months after your tenancy ends.' }, { status: 403 });
      const property = await sr.entities.Property.get(ten.property_id);
      unique = { tenancy_id: ten.id, tenant_user_id: user.id };
      data = { ...unique, tenant_name: ten.tenant_name || user.full_name || 'Tenant', property_id: ten.property_id, property_name: ten.property_name, owner_user_id: property.owner_user_id };
    } else {
      if ((user.account_type || user.data?.account_type) !== 'landowner') return Response.json({ error: 'Only the tenant’s landlord may rate them.' }, { status: 403 });
      const tenancies = await b.entities.Tenancy.filter({ tenant_id: target_id, owner_user_id: user.id }, '-created_date', 1);
      if (!tenancies.length) return Response.json({ error: 'You have no tenancy with this tenant.' }, { status: 403 });
      const tenant = await b.entities.Tenant.get(target_id);
      unique = { tenant_id: target_id, owner_user_id: user.id };
      data = { ...unique, tenant_user_id: tenant.user_id || tenancies[0].tenant_user_id || '', landlord_name: user.full_name || 'Landlord' };
    }
    const previous = await sr.entities[entity].filter(unique, '-created_date', 1);
    if (previous.length) return Response.json({ error: 'This rating has already been submitted and is locked.' }, { status: 409 });
    const review = await sr.entities[entity].create({ ...data, rating, comment: comment.trim(), removed: false });
    return Response.json({ id: review.id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}