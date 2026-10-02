import { base44 } from '@/api/base44Client';
export async function openDocument(documentId) {
  const tab = window.open('', '_blank');
  if (tab) tab.opener = null;
  try {
    const { data } = await base44.functions.invoke('documentOps', { action: 'get', document_id: documentId });
    if (!data.file_uri) throw new Error('No file is attached to this document.');
    const url = /^https?:\/\//i.test(data.file_uri) ? data.file_uri : (await base44.integrations.Core.CreateFileSignedUrl({ file_uri: data.file_uri })).signed_url;
    if (tab) tab.location.href = url;
    else throw new Error('Allow pop-ups to view documents.');
  } catch(error) { tab?.close(); throw error; }
}