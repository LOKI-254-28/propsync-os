import { base44 } from '@/api/base44Client';
export async function loadDocuments() {
  const documents = []; let cursor;
  do {
    const response = await base44.functions.invoke('documentOps', { action: 'list', cursor });
    documents.push(...response.data.documents);
    cursor = response.data.has_more ? response.data.next_cursor : null;
  } while (cursor);
  return documents;
}