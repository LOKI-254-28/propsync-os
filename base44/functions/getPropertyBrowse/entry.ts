import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { computeUnitAvailability } from '../../shared/unitAvailability.ts';
import { rentalSamples, rentalCatalog, publicProperty, rentalTypes } from '../../shared/rentalSamples.ts';
import { browseReviews } from '../../shared/browseReviews.ts';

// Public: returns a property, its units with derived availability, and its reviews.
export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const sr = base44.asServiceRole;
    const body = await req.json();
    if ((body.cursor != null && (typeof body.cursor !== 'string' || body.cursor.length > 4000)) || (body.search != null && (typeof body.search !== 'string' || body.search.length > 200)) || (body.type && !rentalTypes.includes(body.type)) || (body.maxPrice != null && (typeof body.maxPrice !== 'number' || !Number.isFinite(body.maxPrice) || body.maxPrice < 0))) return Response.json({error:'Invalid browse filters.'},{status:400});
    if (body.action === 'catalog') return Response.json(await rentalCatalog(sr,body));
    if (body.action === 'resolve_listing') {
      if(typeof body.listing_id!=='string'||body.listing_id.length>100)return Response.json({error:'Invalid listing.'},{status:400});
      const listing=await sr.entities.Listing.get(body.listing_id).catch(()=>null);
      if(!listing||!['Published','Active'].includes(listing.status))return Response.json({error:'Listing not found.'},{status:404});
      return Response.json({property_id:listing.property_id});
    }
    const { property_id } = body;
    if (typeof property_id !== 'string' || !property_id || property_id.length > 100) return Response.json({ error: 'property_id is required' }, { status: 400 });

    const p = await sr.entities.Property.get(property_id).catch(() => null);
    if (!p || p.status === 'Archived') return Response.json({ error: 'Property not found' }, { status: 404 });

    const user = await base44.auth.me().catch(() => null);
    const reviewData = user && body.cursor ? {} : await browseReviews(sr,property_id);
    if (!user || body.summary_only === true) return Response.json({property:publicProperty(p),units:[],samples:await rentalSamples(sr,[property_id]),summary_only:true,...reviewData});
    const query = {property_id,status:{$ne:'Inactive'}};
    const [page,units_total] = await Promise.all([sr.entities.Unit.filter(query,{sort:'unit_number',limit:30,cursor:body.cursor||undefined}),body.cursor ? Promise.resolve(undefined) : sr.entities.Unit.count(query)]);
    const decorate = async (u) => {
      const a = await computeUnitAvailability(sr, u);
      return {
        id: u.id, unit_number: u.unit_number, unit_type: u.unit_type, bedrooms: u.bedrooms, bathrooms: u.bathrooms,
        size_sqm: u.size_sqm, monthly_rent: u.monthly_rent, security_deposit: u.security_deposit, furnished: u.furnished,
        description: u.description, images: u.images || [], room_photos: u.room_photos || [],
        state: a.state, bookable: a.bookable, occupied: a.occupied, available_from: a.available_from,
        tenancy_end_date: a.tenancy_end_date || null, exit_confirmed: a.exit_confirmed, half_deposit: a.half_deposit,
      };
    };
    const outUnits=[];
    for(let i=0;i<page.items.length;i+=6) outUnits.push(...await Promise.all(page.items.slice(i,i+6).map(decorate)));
    let selected_unit=null;
    if(typeof body.unit_id==='string' && body.unit_id.length<=100) {
      const selected=await sr.entities.Unit.get(body.unit_id).catch(()=>null);
      if(selected?.property_id===property_id && selected.status!=='Inactive') selected_unit=await decorate(selected);
    }
    return Response.json({property:publicProperty(p),units:outUnits,units_total,selected_unit,summary_only:false,has_more:page.has_more,next_cursor:page.next_cursor,...reviewData});
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}