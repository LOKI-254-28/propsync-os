import { base44 } from '@/api/base44Client';
export async function applicationAction(applicationId,action,payload={}) {
  const {data} = await base44.functions.invoke('applicationOps',{application_id:applicationId,action,...payload});
  if (data.error) throw new Error(data.error);
  return data;
}
export async function patchApplication(applicationId,updates) {
  return applicationAction(applicationId,'patch',{updates});
}
export async function completeApplication(applicationId,response) {
  const key = `propwiz-completion-${applicationId}`;
  let requestId = localStorage.getItem(key);
  if (!requestId) { requestId=crypto.randomUUID();localStorage.setItem(key,requestId); }
  const result = await applicationAction(applicationId,'complete',{response,request_id:requestId});
  localStorage.removeItem(key);
  return result;
}