import {registryError} from './documentRegistry.ts';
export const activeStatuses=['Active','Expiring Soon','Notice Given'];
export const blank={$in:['',null]},notBlank={$nin:['',null]};
export function managementAccess(user){
  if(user.role!=='admin'&&(user.account_type||user.data?.account_type)!=='landowner')throw registryError('Landlord access required.',403);
  return user.role==='admin'?{}:{owner_user_id:user.id};
}
export function managementInput(body){
  if(body.cursor!=null&&(typeof body.cursor!=='string'||body.cursor.length>12000))throw registryError('Invalid page cursor.');
  if(body.search!=null&&(typeof body.search!=='string'||body.search.length>100))throw registryError('Search must be text up to 100 characters.');
}
export function searchQuery(text,fields){
  const term=(text||'').trim();if(!term)return {};
  const pattern=term.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  return {$or:fields.map(field=>({[field]:{$regex:pattern,$options:'i'}}))};
}
export const andQuery=(...parts)=>({$and:parts});
// Only distinct relationship keys are read here, never financial records or full portfolio collections.
export async function relationshipKeys(entity,query,field){
  const keys=[];let cursor;
  do{const page=await entity.filter(query,{distinct:field,limit:1000,cursor});keys.push(...page.items);cursor=page.has_more?page.next_cursor:null;}while(cursor);
  return keys;
}
export async function directoryScope(sr,user){
  const scope=managementAccess(user);let tenants={};
  if(user.role!=='admin'){
    const ids=await relationshipKeys(sr.entities.Tenancy,scope,'tenant_id');
    tenants={$or:[scope,{id:{$in:ids}}]};
  }
  const [users,unlinked,ids]=await Promise.all([relationshipKeys(sr.entities.Tenant,andQuery(tenants,{user_id:notBlank}),'user_id'),relationshipKeys(sr.entities.Tenant,andQuery(tenants,{user_id:blank}),'id'),relationshipKeys(sr.entities.Tenant,tenants,'id')]);
  return {scope,tenants,users,unlinked,ids,
    linkedHistory:{...scope,tenant_user_id:{$nin:['',null,...users]},tenant_id:{$nin:unlinked}},
    unlinkedHistory:{...scope,tenant_user_id:blank,tenant_id:{$nin:ids}}};
}
export function checkedRows(result){if(result.truncated)throw registryError('This summary is too large. Narrow the selection.',422);return result.rows;}
export async function managementIdentity(sr,user,key){
  const scope=managementAccess(user);
  if(typeof key!=='string'||! /^(user|tenant):[a-zA-Z0-9_-]{1,100}$/.test(key))throw registryError('Choose a tenant.');
  const [kind,id]=key.split(':'),profile=kind==='user'?{user_id:id}:{id};
  const tenantIds=await relationshipKeys(sr.entities.Tenant,profile,'id');
  const match=kind==='user'?{$or:[{tenant_user_id:id},{tenant_id:{$in:tenantIds}}]}:{tenant_id:id};
  if(user.role!=='admin'){
    const [owned,related]=await Promise.all([sr.entities.Tenant.count(andQuery(scope,profile)),sr.entities.Tenancy.count(andQuery(scope,match))]);
    if(!owned&&!related)throw registryError('This tenant is not in your portfolio.',403);
  }
  return {scope,query:andQuery(scope,match),tenantIds:tenantIds.length?tenantIds:[id]};
}