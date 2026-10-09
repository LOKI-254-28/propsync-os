import {registryError} from './documentRegistry.ts';
import {paymentContext,paymentManager} from './paymentContext.ts';
import {nairobiToday} from './nairobiDates.ts';
const types=['Rent Reminder','Arrears Notice','Breach Notice','Rent Increase','Inspection Notice','Vacation Acknowledgement','Termination Notice','General Notice'];
export async function createNotice(sr,user,data){
  if(!data||typeof data!=='object'||Array.isArray(data)||typeof data.subject!=='string'||!data.subject.trim()||data.subject.length>200||typeof(data.content||'')!=='string'||(data.content||'').length>5000||!types.includes(data.type))throw registryError('Enter a valid notice subject and content.');
  if(user.role!=='admin'&&((user.account_type||user.data?.account_type)!=='landowner'||(user.approval_status||user.data?.approval_status)!=='approved'))throw registryError('Approved landlord access required.',403);
  let links={owner_user_id:user.id};
  if(data.tenancy_id){
    const context=await paymentContext(sr,data.tenancy_id),{tenancy,tenant,unit,property,tenantUserId,ownerUserId}=context;
    if(!paymentManager(user,context))throw registryError('This tenancy is not yours.',403);
    links={tenancy_id:tenancy.id,tenant_id:tenant.id,tenant_user_id:tenantUserId,tenant_name:tenancy.tenant_name||tenant.full_name,property_id:property.id,property_name:property.name||tenancy.property_name,unit_id:unit.id,unit_number:unit.unit_number,owner_user_id:ownerUserId};
    for(const key of ['tenant_id','tenant_user_id','property_id','unit_id','owner_user_id'])if(data[key]&&data[key]!==links[key])throw registryError('The notice recipient and tenancy do not match.',409);
  }else if(['tenant_id','tenant_user_id','property_id','unit_id'].some(key=>data[key]))throw registryError('Choose the tenancy for this notice.');
  if(data.channel&&!['In-app','Email','SMS','WhatsApp','Manual'].includes(data.channel))throw registryError('Choose a valid notice channel.');
  const notice=await sr.entities.Notice.create({...links,notice_reference:`NOT-${crypto.randomUUID().slice(0,8).toUpperCase()}`,type:data.type,subject:data.subject.trim(),content:data.content||'',channel:data.channel||'In-app',date_issued:nairobiToday(),sender:user.email,status:'Issued',acknowledged:false});
  return notice;
}
export async function acknowledgeNotice(sr,user,body){
  if(Object.keys(body).some(key=>!['action','notice_id'].includes(key))||typeof body.notice_id!=='string'||!/^[a-zA-Z0-9_-]{1,100}$/.test(body.notice_id))throw registryError('Choose a valid notice.');
  const notice=await sr.entities.Notice.get(body.notice_id);
  if(!notice.tenant_user_id||notice.tenant_user_id!==user.id||notice.status==='Draft')throw registryError('This notice was not issued to you.',403);
  if(notice.tenancy_id){const context=await paymentContext(sr,notice.tenancy_id);if(context.tenantUserId!==user.id||context.ownerUserId!==notice.owner_user_id)throw registryError('The notice account links are inconsistent.',409);}
  if(!notice.acknowledged)await sr.entities.Notice.update(notice.id,{acknowledged:true,status:'Acknowledged'});
  return {ok:true};
}