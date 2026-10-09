import {createClientFromRequest} from 'npm:@base44/sdk@0.8.52';
import {registryError,isStaff} from '../../shared/documentRegistry.ts';
import {paymentDetailValues,paymentRecordId,getOwnerPaymentDetails,paymentInstructionContext} from '../../shared/ownerPaymentDetails.ts';
export default async function(req:Request):Promise<Response>{
  try{
    const b=createClientFromRequest(req),user=await b.auth.me();
    if(!user)return Response.json({error:'Please sign in.'},{status:401});
    const body=await req.json();
    if(!['get','save','instructions'].includes(body.action))throw registryError('Choose a valid payment details action.');
    const sr=b.asServiceRole;
    if(body.action==='instructions'){
      const context=await paymentInstructionContext(sr,user,body);
      return Response.json({details:await getOwnerPaymentDetails(sr,context.property.owner_user_id),reference:context.reference||'',property_name:context.property.name});
    }
    if(!isStaff(user))throw registryError('Only landlords and administrators can manage payment details.',403);
    let ownerId=user.id;
    if(body.property_id){const property=await sr.entities.Property.get(paymentRecordId(body.property_id));if(user.role!=='admin'&&property.owner_user_id!==user.id)throw registryError('You cannot manage this owner\'s payment details.',403);ownerId=property.owner_user_id;}
    if(!ownerId)throw registryError('Assign a property owner before configuring payments.',409);
    if(body.action==='get')return Response.json({details:await getOwnerPaymentDetails(sr,ownerId)});
    const values=paymentDetailValues(body.details);
    await sr.entities.OwnerPaymentDetails.upsert([{owner_user_id:ownerId,...values}],{key:'owner_user_id'});
    await sr.entities.AuditLog.create({user_id:user.id,user_email:user.email,user_role:user.role,action:'Owner Payment Details Updated',entity:'OwnerPaymentDetails',entity_id:ownerId,timestamp:new Date().toISOString()});
    return Response.json({details:values});
  }catch(error){return Response.json({error:error.message},{status:error.status||500});}
}