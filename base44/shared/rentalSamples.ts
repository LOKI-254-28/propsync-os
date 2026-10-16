const sampleFields = ['property_id','unit_type','bedrooms','bathrooms','size_sqm','monthly_rent','security_deposit','service_charge','furnished','amenities','images','room_photos'];
export const rentalTypes = ['Studio','1 Bedroom','2 Bedroom','3 Bedroom','Penthouse','Commercial','Other'];
export function publicProperty(p) {
  return Object.fromEntries(['id','name','address','description','property_type','amenities','images','latitude','longitude'].map(key=>[key,p[key] ?? (['amenities','images'].includes(key)?[]:null)]));
}
export async function rentalSamples(sr,propertyIds,options={}) {
  if(!propertyIds.length)return [];
  const query={property_id:{$in:propertyIds},status:{$in:['Available','Vacant']},...(options.type?{unit_type:options.type}:{})};
  const groups=await sr.entities.Unit.aggregate({query,groupBy:['property_id','unit_type'],min:'monthly_rent',limit:1000,...(options.maxPrice!=null?{having:{min_monthly_rent:{$lte:options.maxPrice}}}:{})});
  if(groups.truncated)throw new Error('Please narrow your property search.');
  const result=[];
  // A stable lowest-rent sample prevents filters or pagination from enumerating units.
  for(let i=0;i<groups.rows.length;i+=6) {
    const batch=await Promise.all(groups.rows.slice(i,i+6).map(async group=>{
      const page=await sr.entities.Unit.filter({...query,property_id:group.property_id,unit_type:group.unit_type},{sort:'monthly_rent',limit:1,fields:sampleFields});
      const u=page.items[0];
      return u?{property_id:group.property_id,unit_type:group.unit_type,available:true,sample:Object.fromEntries(sampleFields.filter(key=>key!=='property_id').map(key=>[key,u[key]??(['amenities','images','room_photos'].includes(key)?[]:null)]))}:null;
    }));
    result.push(...batch.filter(Boolean));
  }
  return result;
}
export async function rentalCatalog(sr,body) {
  const search=body.search?.trim()||'',pattern=search.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  const query={status:'Active',...(search?{$or:['name','address','description'].map(key=>({[key]:{$regex:pattern,$options:'i'}}))}:{})};
  const page=await sr.entities.Property.filter(query,{sort:'-created_date',limit:12,cursor:body.cursor||undefined,fields:['name','address','description','property_type','amenities','images','latitude','longitude']});
  const samples=await rentalSamples(sr,page.items.map(p=>p.id),{type:body.type,maxPrice:body.maxPrice});
  return {properties:page.items.map(publicProperty),samples,has_more:page.has_more,next_cursor:page.next_cursor,summary_only:true};
}