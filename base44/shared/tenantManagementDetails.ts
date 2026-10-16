import {registryError} from './documentRegistry.ts';
import {managementIdentity,managementAccess,andQuery,searchQuery,checkedRows} from './tenantManagementScope.ts';
export async function tenantManagementDetails(sr,user,body){
  const scope=managementAccess(user);
  if(body.action==='management_tenancies')return await sr.entities.Tenancy.filter(andQuery(scope,searchQuery(body.search,['tenant_name','unit_number','property_name','tenancy_reference'])),{sort:'-created_date',limit:50,cursor:body.cursor||undefined});
  if(body.action==='management_history'){
    const identity=await managementIdentity(sr,user,body.identity);
    const page=await sr.entities.Tenancy.filter(identity.query,{sort:'-start_date',limit:20,cursor:body.cursor||undefined}),ids=page.items.map(row=>row.id);
    if(!ids.length)return {...page,totals:[],vacationRequests:[],tenant_ids:identity.tenantIds};
    const query={...scope,tenancy_id:{$in:ids}};
    const [totals,notices]=await Promise.all([sr.entities.RentCharge.aggregate({query:{...query,status:{$ne:'Void'}},groupBy:'tenancy_id',sum:['amount','amount_paid','outstanding'],limit:20}),sr.entities.VacationRequest.filter({...query,status:{$nin:['Completed','Rejected']}},{sort:'-created_date',limit:50})]);
    return {...page,totals:checkedRows(totals),vacationRequests:notices.items,tenant_ids:identity.tenantIds};
  }
  if(typeof body.tenancy_id!=='string'||!/^[a-zA-Z0-9_-]{1,100}$/.test(body.tenancy_id))throw registryError('Choose a tenancy.');
  const tenancy=await sr.entities.Tenancy.get(body.tenancy_id);
  if(user.role!=='admin'&&tenancy.owner_user_id!==user.id)throw registryError('This tenancy is not yours.',403);
  const query={...scope,tenancy_id:tenancy.id};
  if(body.action==='management_ledger'){
    if(!['charges','payments'].includes(body.kind))throw registryError('Choose a valid financial history.');
    return await sr.entities[body.kind==='charges'?'RentCharge':'Payment'].filter(body.kind==='charges'?{...query,status:{$ne:'Void'}}:query,{sort:body.kind==='charges'?'-due_date':'-payment_date',limit:25,cursor:body.cursor||undefined});
  }
  const [totals,recent]=await Promise.all([sr.entities.RentCharge.aggregate({query,groupBy:'status',sum:['amount','amount_paid','outstanding']}),sr.entities.RentCharge.filter(query,{sort:'-due_date',limit:5})]);
  const rows=checkedRows(totals);
  return {tenancy,charges:recent.items,totals:{amount:rows.reduce((sum,row)=>sum+Number(row.sum_amount||0),0),paid:rows.reduce((sum,row)=>sum+Number(row.sum_amount_paid||0),0),outstanding:rows.filter(row=>!['Void','Paid'].includes(row.status)).reduce((sum,row)=>sum+Number(row.sum_outstanding||0),0)}};
}