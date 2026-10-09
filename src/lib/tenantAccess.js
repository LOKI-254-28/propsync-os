import {base44} from '@/api/base44Client';
export async function loadTenantDirectory(request=read=>read()) {
  const rows=[];let cursor;
  do {const {data}=await request(()=>base44.functions.invoke('tenantOps',{action:'directory',cursor}));rows.push(...data.items);cursor=data.has_more?data.next_cursor:null;}while(cursor);
  return rows;
}
export async function saveOwnTenantProfile(profile) {
  const fields=['id','full_name','email','phone','id_number','occupation','employer','monthly_income','emergency_contact_name','emergency_contact_phone','current_address'];
  const {data}=await base44.functions.invoke('tenantOps',{action:'save_profile',profile:Object.fromEntries(fields.filter(key=>profile[key]!==undefined).map(key=>[key,profile[key]]))});
  return data.tenant;
}