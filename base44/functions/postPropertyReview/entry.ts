import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

const ELIGIBLE = ['Active', 'Expiring Soon', 'Notice Given', 'Terminated'];

// Only current tenants (or tenants whose tenancy was Terminated) of a property may rate it. One review per tenant per property.
export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const { property_id, rating, comment, check } = await req.json();
    const sr = base44.asServiceRole;

    const tenancies = await sr.entities.Tenancy.filter({ tenant_user_id: user.id, property_id });
    const t = tenancies.find((x) => ELIGIBLE.includes(x.status));
    const existing = (await sr.entities.PropertyReview.filter({ property_id, tenant_user_id: user.id }))[0] || null;
    if (check) return Response.json({ eligible: !!t, existing });
    if (!t) return Response.json({ error: 'Only current tenants of this property can leave a review.' }, { status: 403 });

    const r = Math.round(Number(rating));
    if (!(r >= 1 && r <= 5)) return Response.json({ error: 'Choose a rating from 1 to 5.' }, { status: 400 });

    const data = {
      property_id, property_name: t.property_name, tenant_user_id: user.id,
      tenant_name: user.full_name || user.email, tenancy_id: t.id,
      rating: r, comment: String(comment || '').slice(0, 1000),
    };
    const saved = existing ? await sr.entities.PropertyReview.update(existing.id, data) : await sr.entities.PropertyReview.create(data);
    return Response.json({ ok: true, review: saved });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}