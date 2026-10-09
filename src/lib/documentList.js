import { base44 } from '@/api/base44Client';
export async function loadDocuments(request = read => read()) {
  const documents = []; let cursor;
  do {
    const response = await request(() => base44.functions.invoke('documentOps', { action: 'list', cursor }));
    documents.push(...response.data.documents);
    cursor = response.data.has_more ? response.data.next_cursor : null;
  } while (cursor);
  return documents;
}