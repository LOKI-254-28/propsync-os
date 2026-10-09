import {receiptContext} from './receiptContext.ts';
export async function receiptDetails(b,user,body) {
  const context=await receiptContext(b,user,body),{record,payment,property,tenant,ownerUserId,tenantUserId}=context,sr=b.asServiceRole;
  const ids=[ownerUserId,tenantUserId].filter(Boolean);
  const people=ids.length?await sr.entities.User.filter({id:{$in:ids}},'-created_date',2,0,['id','full_name','display_name','address','city','region','postal_code','country','phone','email']):[];
  const owner=people.find(p=>p.id===ownerUserId),payer=people.find(p=>p.id===tenantUserId);
  const address=p=>[p?.address,p?.city,p?.region,p?.postal_code,p?.country].filter(Boolean).join(', ');
  const allocations=payment.allocations||[],idsToLoad=allocations.map(a=>a.charge_id);
  const page=idsToLoad.length?await sr.entities.RentCharge.filter({tenancy_id:record.tenancy_id,id:{$in:idsToLoad}},{limit:100,fields:['bill_name','charge_type','billing_period']}):{items:[]};
  return {payment,charges:page.items,recipient_email:payer?.email||'',recipient_phone:payer?.phone||tenant?.phone||record.applicant_phone||'',issuer:{name:owner?.display_name||owner?.full_name||'Landlord',address:address(owner)||property.address||'',phone:owner?.phone||property.contact_phone||'',email:owner?.email||property.contact_email||''},payer:{name:payment.tenant_name||payer?.display_name||payer?.full_name||'Tenant',address:tenant?.current_address||address(payer)||'',phone:tenant?.phone||record.applicant_phone||payer?.phone||'',email:payer?.email||''},property_address:property.address||'',authorised_by:record.recorded_by||owner?.display_name||owner?.full_name||'Landlord'};
}