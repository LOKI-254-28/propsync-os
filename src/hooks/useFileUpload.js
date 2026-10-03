import { useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
export default function useFileUpload({ onUploaded, onBusyChange, isPublic, multiple, imageOnly, maxFiles }) {
  const lock = useRef(false);
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [fileName, setFileName] = useState('');
  const handle = async (event) => {
    const input = event.target, files = Array.from(input.files || []); input.value = '';
    if (lock.current || !files.length) return;
    setError('');
    const types = imageOnly ? ['image/jpeg', 'image/png', 'image/webp'] : ['application/pdf', 'image/jpeg', 'image/png'];
    if (files.length > maxFiles) return setError(`Choose up to ${maxFiles} files.`);
    if (files.some(file => !types.includes(file.type) || file.size > 10 * 1024 * 1024)) return setError(imageOnly ? 'Choose JPG, PNG or WebP images up to 10 MB each.' : 'Choose PDF, JPG or PNG files up to 10 MB each.');
    lock.current = true; setBusy(true); setFileName('');
    try {
      onBusyChange?.(true);
      for (const file of (multiple ? files : files.slice(0, 1))) {
        let timer;
        try {
          const result = await Promise.race([
            isPublic ? base44.integrations.Core.UploadPublicFile({ file }) : base44.integrations.Core.UploadPrivateFile({ file }),
            new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('Upload timed out. Please try again.')), 60000); }),
          ]);
          await onUploaded({ ...result, file_name: file.name, mime_type: file.type, size: file.size });
          setFileName(file.name);
        } finally { clearTimeout(timer); }
      }
    } catch (err) { setError(err.message || 'Upload failed. Please try again.'); }
    finally { lock.current = false; setBusy(false); onBusyChange?.(false); }
  };
  return { busy, error, fileName, handle };
}