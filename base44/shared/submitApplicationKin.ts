import {closedApplications,ownedUploads} from './applicationAccess.ts';
import {registryError,syncRecordFiles} from './documentRegistry.ts';
import {tenantKinDetails} from './tenantKinDetails.ts';
export async function submitApplicationKin(sr,user,context,body) {
  const {app,property}=context;
  if(app.tenant_user_id!==user.id)throw registryError('Only the applicant can submit next-of-kin details.',403);
  if(closedApplications.includes(app.status)||app.completion_token)throw registryError('This application is closed or being completed.',409);
  if(!property.owner_user_id||app.owner_user_id!==property.owner_user_id)throw registryError('The application landlord links are inconsistent.',409);
  const details=tenantKinDetails(body.details,true);
  await ownedUploads(sr,user,[details.id_document_uri],{appId:app.id});
  const result=await sr.entities.NextOfKin.upsert([{...details,application_id:app.id,tenant_id:app.tenant_id||'',tenant_user_id:user.id,owner_user_id:property.owner_user_id}],{key:'application_id'});
  const kin=result.records[0];
  await sr.entities.Application.update(app.id,{next_of_kin_id:kin.id});
  await syncRecordFiles(sr,user,'NextOfKin',kin);
  return {next_of_kin:kin};
}