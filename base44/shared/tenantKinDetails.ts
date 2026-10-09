import {registryError} from './documentRegistry.ts';
export function tenantKinDetails(details,withIdCopy=false) {
  const fields=['full_name','id_number','phone','email',...(withIdCopy?['id_document_uri']:[])];
  if(!details||typeof details!=='object'||Array.isArray(details)||Object.keys(details).some(key=>!fields.includes(key)))throw registryError('Submit only next-of-kin contact details. Account links cannot be changed.');
  const data={};
  for(const key of fields) {
    const limit=key==='id_document_uri'?2048:key==='full_name'?254:100;
    if(typeof details[key]!=='string'||details[key].length>limit)throw registryError('Enter valid next-of-kin contact details.');
    data[key]=details[key].trim();
  }
  if(!data.full_name||!data.id_number||(!data.phone&&!data.email))throw registryError('Enter a name, ID number and phone or email.');
  if(data.email&&!/^\S+@\S+\.\S+$/.test(data.email))throw registryError('Enter a valid email address.');
  if(withIdCopy&&!data.id_document_uri.startsWith('mp/private/'))throw registryError('Upload a private copy of the next-of-kin ID.');
  return data;
}