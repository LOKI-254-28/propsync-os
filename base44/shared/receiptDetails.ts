export async function receiptDetails(b,user,body) {
  const fail=(message,status=400)=>{throw Object.assign(new Error(message),{status});};
  if(typeof body.payment_id!=='string'||!body.payment_id.trim()||body.payment_id.length>150)fail('Choose a payment receipt.');
  const sr=b.asServiceRole,booking=body.payment_id.startsWith('application-');
  const record=await sr.entities[booking?'Application':'Payment'].get(booking?body.payment_id.slice(12):body.payment_id);
  if(user.role!=='admin'&&record.tenant_user_id!==user.id&&record.owner_user_id!==user.id)fail('You cannot view this receipt.',403);
  if(booking?record.payment_status!=='Verified':record.status!=='Successful')fail('Receipts are available only for verified payments.',409);
  const property=record.property_id?await sr.entities.Property.get(record.property_id):null;
  const ids=[record.owner_user_id||property?.owner_user_id,record.tenant_user_id].filter(Boolean);
  const people=ids.length?await sr.entities.User.filter({id:{$in:ids}},'-created_date',2,0,['id','full_name','display_name','address','city','region','postal_code','country','phone','email']):[];
  const owner=people.find(p=>p.id===(record.owner_user_id||property?.owner_user_id)),payer=people.find(p=>p.id===record.tenant_user_id);
  const tenant=record.tenant_id?(await sr.entities.Tenant.filter({id:record.tenant_id},'-created_date',1))[0]:null;
  const address=p=>[p?.address,p?.city,p?.region,p?.postal_code,p?.country].filter(Boolean).join(', ');
  return {issuer:{name:owner?.display_name||owner?.full_name||'Landlord',address:address(owner)||property?.address||'',phone:owner?.phone||property?.contact_phone||'',email:owner?.email||property?.contact_email||''},payer:{name:record.tenant_name||record.applicant_name||payer?.display_name||payer?.full_name||'Tenant',address:tenant?.current_address||address(payer)||'',phone:tenant?.phone||record.applicant_phone||payer?.phone||'',email:tenant?.email||record.applicant_email||payer?.email||''},property_address:property?.address||'',authorised_by:record.recorded_by||owner?.display_name||owner?.full_name||'Landlord'};
}