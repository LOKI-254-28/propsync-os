import {registryError} from './documentRegistry.ts';
export const paymentDetailLimits={payee_name:120,mpesa_paybill:10,bank_name:120,bank_account_name:120,bank_account_number:40,bank_branch:120,payment_instructions:1000};
export function paymentDetailValues(input={}) {
  if(!input||typeof input!=='object'||Array.isArray(input))throw registryError('Enter valid payment details.');
  const result={};
  for(const [key,max] of Object.entries(paymentDetailLimits)){const value=input[key]??'';if(typeof value!=='string'||value.length>max)throw registryError(`Check ${key.replaceAll('_',' ')}.`);result[key]=value.trim();}
  if(result.mpesa_paybill&&!/^\d{5,10}$/.test(result.mpesa_paybill))throw registryError('Enter a paybill with 5–10 digits.');
  const bank=[result.bank_name,result.bank_account_name,result.bank_account_number];
  if(bank.some(Boolean)&&!bank.every(Boolean))throw registryError('Provide the bank name, account name and account number together.');
  if(result.bank_account_number&&!/^[a-zA-Z0-9 -]{3,40}$/.test(result.bank_account_number))throw registryError('Enter a valid bank account number.');
  return result;
}
export function paymentRecordId(value){if(typeof value!=='string'||!/^[a-zA-Z0-9_-]{1,100}$/.test(value))throw registryError('Choose a valid payment context.');return value;}
export async function getOwnerPaymentDetails(sr,ownerId){
  if(!ownerId)throw registryError('The property has no payment owner. Contact your landlord.',409);
  const page=await sr.entities.OwnerPaymentDetails.filter({owner_user_id:ownerId},{limit:1,sort:'-updated_date'});
  const record=page.items[0];return Object.fromEntries(Object.keys(paymentDetailLimits).map(key=>[key,record?.[key]||'']));
}
export async function paymentInstructionContext(sr,user,body){
  const application=!!body.application_id;
  if(application===!!body.tenancy_id)throw registryError('Choose one application or tenancy.');
  const record=await sr.entities[application?'Application':'Tenancy'].get(paymentRecordId(body.application_id||body.tenancy_id));
  if(user.role!=='admin'&&record.tenant_user_id!==user.id&&record.owner_user_id!==user.id)throw registryError('You cannot access these payment instructions.',403);
  const unit=await sr.entities.Unit.get(record.unit_id),property=await sr.entities.Property.get(unit.property_id);
  if(record.property_id!==property.id||(record.owner_user_id&&record.owner_user_id!==property.owner_user_id))throw registryError('The payment ownership links need review. Contact your landlord.',409);
  if(user.role!=='admin'&&record.tenant_user_id!==user.id&&property.owner_user_id!==user.id)throw registryError('You cannot access these payment instructions.',403);
  if(!property.owner_user_id)throw registryError('The property has no payment owner. Contact your landlord.',409);
  return {record,property,reference:application?record.application_reference:record.tenancy_reference};
}