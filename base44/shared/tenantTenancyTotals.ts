export async function tenantTenancyTotals(sr,user,body) {
  if(!Array.isArray(body.tenancy_ids)||body.tenancy_ids.length>50||body.tenancy_ids.some(id=>typeof id!=='string'||!id||id.length>100))throw Object.assign(new Error('Choose up to 50 tenancy references.'),{status:400});
  if(!body.tenancy_ids.length)return {charges:[],maintenance:[]};
  const query={tenant_user_id:user.id,tenancy_id:{$in:body.tenancy_ids}};
  const [charges,maintenance]=await Promise.all([
    sr.entities.RentCharge.aggregate({query,groupBy:['tenancy_id','status'],sum:'outstanding',limit:1000}),
    sr.entities.Maintenance.aggregate({query,groupBy:'tenancy_id',limit:1000})
  ]);
  return {charges:charges.rows,maintenance:maintenance.rows};
}