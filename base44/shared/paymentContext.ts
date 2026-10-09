import {registryError} from './documentRegistry.ts';
export async function paymentContext(sr,tenancyId) {
  if(typeof tenancyId!=='string'||!/^[a-zA-Z0-9_-]{1,100}$/.test(tenancyId))throw registryError('Choose a tenancy.');
  const tenancy=await sr.entities.Tenancy.get(tenancyId);
  const [tenant,unit,property]=await Promise.all([sr.entities.Tenant.get(tenancy.tenant_id),sr.entities.Unit.get(tenancy.unit_id),sr.entities.Property.get(tenancy.property_id)]);
  if(unit.property_id!==property.id||tenancy.owner_user_id!==property.owner_user_id||(tenant.user_id&&tenancy.tenant_user_id&&tenant.user_id!==tenancy.tenant_user_id))throw registryError('The tenancy account links are inconsistent.',409);
  return {tenancy,tenant,unit,property,tenantUserId:tenancy.tenant_user_id||tenant.user_id||'',ownerUserId:property.owner_user_id};
}
export function paymentManager(user,context) {
  return user.role==='admin'||(context.ownerUserId===user.id&&(user.account_type||user.data?.account_type)==='landowner'&&(user.approval_status||user.data?.approval_status)==='approved');
}
export function validatePaymentLinks(payment,context) {
  if(payment.tenant_id!==context.tenant.id||payment.property_id!==context.property.id||payment.unit_id!==context.unit.id||(payment.tenant_user_id&&payment.tenant_user_id!==context.tenantUserId)||(payment.owner_user_id&&payment.owner_user_id!==context.ownerUserId))throw registryError('The payment account links are inconsistent.',409);
}