import {createClientFromRequest} from 'npm:@base44/sdk@0.8.52';
import {waitUntil} from 'base44:runtime';
import {allRelated} from '../../shared/documentAccess.ts';
const profileFields=['full_name','email','phone','id_number','occupation','employer','monthly_income','emergency_contact_name','emergency_contact_phone','current_address'];
export default async function(req:Request):Promise<Response> {
  try {
    const b=createClientFromRequest(req),user=await b.auth.me();
    if(!user)return Response.json({error:'Please sign in.'},{status:401});
    const sr=b.asServiceRole,body=await req.json();
    if(body.action==='directory') {
      if(body.cursor!=null&&(typeof body.cursor!=='string'||body.cursor.length>2000))return Response.json({error:'Invalid page cursor.'},{status:400});
      if(user.role==='admin')return Response.json(await sr.entities.Tenant.list({sort:'-created_date',limit:100,cursor:body.cursor || undefined}));
      if((user.account_type || user.data?.account_type)!=='landowner')return Response.json({error:'Landlord access required.'},{status:403});
      const properties=await allRelated(sr.entities.Property,{owner_user_id:user.id});
      const tenancies=await allRelated(sr.entities.Tenancy,{owner_user_id:user.id,property_id:{$in:properties.map(p=>p.id)}});
      const query={$or:[{owner_user_id:user.id},{id:{$in:[...new Set(tenancies.map(t=>t.tenant_id).filter(Boolean))]}},{user_id:{$in:[...new Set(tenancies.map(t=>t.tenant_user_id).filter(Boolean))]}}]};
      return Response.json(await sr.entities.Tenant.filter(query,{sort:'-created_date',limit:100,cursor:body.cursor || undefined}));
    }
    if(body.action!=='save_profile'||!body.profile||typeof body.profile!=='object'||Array.isArray(body.profile))return Response.json({error:'Choose a valid profile action.'},{status:400});
    const profile=Object.fromEntries(profileFields.filter(key=>key in body.profile).map(key=>[key,body.profile[key]]));
    if(typeof profile.full_name!=='string'||!profile.full_name.trim()||profile.full_name.length>254)return Response.json({error:'Enter your full name.'},{status:400});
    for(const [key,value] of Object.entries(profile)) {
      if(key==='monthly_income'){if(typeof value!=='number'||!Number.isFinite(value)||value<0||value>1e9)return Response.json({error:'Enter a valid monthly income.'},{status:400});}
      else if(typeof value!=='string'||value.length>2000)return Response.json({error:'Profile details must be text up to 2,000 characters.'},{status:400});
    }
    if(profile.email&&(!/^\S+@\S+\.\S+$/.test(profile.email)||profile.email.length>254))return Response.json({error:'Enter a valid contact email.'},{status:400});
    let existing;
    if(body.profile.id) {
      if(typeof body.profile.id!=='string'||body.profile.id.length>100)return Response.json({error:'Invalid profile reference.'},{status:400});
      existing=await sr.entities.Tenant.get(body.profile.id);
      if(existing.user_id!==user.id)return Response.json({error:'You can only update your own tenant profile.'},{status:403});
    }else existing=(await sr.entities.Tenant.filter({user_id:user.id},'-created_date',1))[0];
    const tenant=existing?await sr.entities.Tenant.update(existing.id,profile):await sr.entities.Tenant.create({...profile,full_name:profile.full_name.trim(),email:profile.email || user.email,user_id:user.id,status:'Active',profile_type:'tenant'});
    waitUntil(sr.entities.AuditLog.create({user_id:user.id,user_role:user.role,action:'Tenant Profile Saved',entity:'Tenant',entity_id:tenant.id,timestamp:new Date().toISOString()}));
    return Response.json({tenant});
  }catch(error){return Response.json({error:error.message},{status:error.status || 500});}
}