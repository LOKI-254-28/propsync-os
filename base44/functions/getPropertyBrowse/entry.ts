import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { computeUnitAvailability } from '../../shared/unitAvailability.ts';

// Public: returns a property, its units with derived availability, and its reviews.
export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const sr = base44.asServiceRole;
    const { property_id } = await req.json();
    if (!property_id) return Response.json({ error: 'property_id is required' }, { status: 400 });

    const p = await sr.entities.Property.get(property_id).catch(() => null);
    if (!p || p.status === 'Archived') return Response.json({ error: 'Property not found' }, { status: 404 });

    const units = (await sr.entities.Unit.filter({ property_id }, 'unit_number', 300)).filter((u) => u.status !== 'Inactive');
    const outUnits = await Promise.all(units.map(async (u) => {
      const a = await computeUnitAvailability(sr, u);
      return {
        id: u.id, unit_number: u.unit_number, unit_type: u.unit_type, bedrooms: u.bedrooms, bathrooms: u.bathrooms,
        size_sqm: u.size_sqm, monthly_rent: u.monthly_rent, security_deposit: u.security_deposit, furnished: u.furnished,
        description: u.description, images: u.images || [], room_photos: u.room_photos || [],
        state: a.state, bookable: a.bookable, occupied: a.occupied, available_from: a.available_from,
        tenancy_end_date: a.tenancy_end_date || null, exit_confirmed: a.exit_confirmed, half_deposit: a.half_deposit,
      };
    }));

    const reviews = await sr.entities.PropertyReview.filter({ property_id }, '-created_date', 50);
    const avg = reviews.length ? reviews.reduce((s, r) => s + (r.rating || 0), 0) / reviews.length : 0;

    return Response.json({
      property: {
        id: p.id, name: p.name, address: p.address, description: p.description, property_type: p.property_type,
        amenities: p.amenities || [], images: p.images || [], latitude: p.latitude, longitude: p.longitude,
      },
      units: outUnits,
      reviews: reviews.map((r) => ({ id: r.id, rating: r.rating, comment: r.comment, tenant_name: r.tenant_name, date: r.created_date })),
      rating: { average: Math.round(avg * 10) / 10, count: reviews.length },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}