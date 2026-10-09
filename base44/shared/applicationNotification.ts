export async function applicationNotification(sr,user,context,app){
  const recipient=context.staff?app.tenant_user_id:context.property.owner_user_id;
  if(!recipient||recipient===user.id)return;
  const eventKey=`Application:${app.id}:${app.updated_date||app.created_date}:${recipient}`;
  if(await sr.entities.Notification.count({event_key:eventKey}))return;
  const visit=['Site Visit Requested','Site Visit Scheduled','Site Visit Completed'].includes(app.status);
  const status=visit?app.site_visit_status||app.status:app.status;
  await sr.entities.Notification.create({recipient_user_id:recipient,type:'Application',title:`${visit?'Site visit':'Application'}: ${status}`,message:`${app.unit_number||'Unit'} · ${app.property_name||context.property.name}: ${status}${visit&&app.site_visit_date?` (${app.site_visit_date} ${app.site_visit_time||''} EAT)`:''}.`,related_entity:'Application',related_id:app.id,action_link:context.staff?'/portal/applications':visit?'/site-visits':'/applications',date:new Date().toISOString(),read:false,event_key:eventKey});
}