export async function browseReviews(sr, property_id) {
  const queries = [{property_id,removed:{$ne:true}}, {property_id,removed:false}];
  const result = await Promise.all(['PropertyReview','TenancyReview'].map(async (entity,i) => {
    const [page, totals] = await Promise.all([
      sr.entities[entity].filter(queries[i],{sort:'-created_date',limit:50,fields:['rating','comment','tenant_name','created_date']}),
      sr.entities[entity].aggregate({query:queries[i],sum:'rating'})
    ]);
    const row=totals.rows[0]||{},count=row.count||0;
    return {reviews:page.items.map(r=>({id:r.id,rating:r.rating,comment:r.comment,tenant_name:r.tenant_name,date:r.created_date})),rating:{count,average:count?Math.round((row.sum_rating||0)/count*10)/10:0},sum:row.sum_rating||0};
  }));
  const [p,t]=result,count=p.rating.count+t.rating.count;
  return {property_reviews:p.reviews,tenancy_reviews:t.reviews,property_rating:p.rating,tenancy_rating:t.rating,reviews:[...p.reviews,...t.reviews].sort((a,b)=>String(b.date).localeCompare(String(a.date))),rating:{count,average:count?Math.round((p.sum+t.sum)/count*10)/10:0}};
}