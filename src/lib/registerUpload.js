import { base44 } from '@/api/base44Client';
export async function registerUpload(file, context = {}) {
  const { data } = await base44.functions.invoke('documentOps', { action: 'register_upload', file, context });
  if (data.error) throw new Error(data.error);
  window.dispatchEvent(new Event('documents-changed'));
  return { ...file, document_id: data.document.id };
}
export async function syncUploadedDocuments(entity, recordId) {
  const { data } = await base44.functions.invoke('documentOps', { action: 'sync_record', entity, record_id: recordId });
  if (data.error) throw new Error(data.error);
  window.dispatchEvent(new Event('documents-changed'));
  return data;
}