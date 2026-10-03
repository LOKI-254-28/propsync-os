import { useEffect, useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';

export default function useIdCopyUpload({ onUploaded, onBusyChange }) {
  const request = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [fileName, setFileName] = useState('');
  useEffect(() => () => request.current?.abort(), []);
  const handle = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || request.current) return;
    setError('');
    if (!['application/pdf', 'image/jpeg', 'image/png'].includes(file.type) || file.size > 10 * 1024 * 1024) {
      setError('Choose a PDF, JPG or PNG file up to 10 MB.'); return;
    }
    const controller = new AbortController();
    request.current = controller;
    setBusy(true);
    let timedOut = false;
    const timer = setTimeout(() => { timedOut = true; controller.abort(); }, 60000);
    try {
      onBusyChange?.(true);
      const body = new FormData();
      body.append('file', file, file.name);
      const { appId } = base44.getConfig();
      // Let the browser set the multipart boundary; abort the actual request, not just a waiting promise.
      const response = await base44.fetchWithAuth(`/api/apps/${encodeURIComponent(appId)}/integration-endpoints/Core/UploadPrivateFile`, {
        method: 'POST', body, signal: controller.signal,
        headers: { 'X-App-Id': appId, 'X-Origin-URL': window.location.href, Accept: 'application/json' },
      });
      const result = await response.json();
      if (!response.ok) throw new Error(typeof result.detail === 'string' ? result.detail : result.error?.message || result.message || `ID upload failed (${response.status}). Please try again.`);
      if (!result.file_uri) throw new Error('The upload did not return a saved ID. Please try again.');
      if (controller.signal.aborted) throw new DOMException('Upload cancelled', 'AbortError');
      onUploaded({ file_uri: result.file_uri, file_name: file.name, mime_type: file.type, size: file.size });
      setFileName(file.name);
    } catch (err) {
      setError(controller.signal.aborted ? (timedOut ? 'Upload timed out. The request was stopped; please retry.' : 'Upload cancelled. You can choose the file again.') : err.message || 'ID upload failed. Please try again.');
    } finally {
      clearTimeout(timer); request.current = null;
      setBusy(false); onBusyChange?.(false);
    }
  };
  return { busy, error, fileName, handle, cancel: () => request.current?.abort() };
}