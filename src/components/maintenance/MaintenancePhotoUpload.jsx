import React, { useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import MaintenancePhotos from '@/components/maintenance/MaintenancePhotos';
export default function MaintenancePhotoUpload({ images, onChange, onBusyChange }) {
  const ref = useRef(null), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const upload = async e => {
    const files = Array.from(e.target.files || []); e.target.value = ''; setError('');
    if (!files.length) return;
    if (images.length + files.length > 6) { setError('Add up to six photos.'); return; }
    if (files.some(f => !['image/jpeg', 'image/png', 'image/webp'].includes(f.type) || f.size > 10 * 1024 * 1024)) { setError('Choose JPG, PNG or WebP photos up to 10 MB each.'); return; }
    setBusy(true); onBusyChange(true);
    let next = [...images];
    try { for (const file of files) { const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file }); next = [...next, file_uri]; onChange(next); } }
    catch(e) { setError(e.message || 'Photo upload failed.'); }
    finally { setBusy(false); onBusyChange(false); }
  };
  return <div className="space-y-2"><input ref={ref} type="file" multiple accept=".jpg,.jpeg,.png,.webp" className="hidden" onChange={upload} /><Button type="button" variant="outline" disabled={busy || images.length >= 6} onClick={() => ref.current.click()}>{busy ? 'Uploading photos…' : `Add photos (${images.length}/6)`}</Button><p className="text-xs text-muted-foreground">Optional · JPG, PNG or WebP · up to 10 MB each · private</p>{error && <p role="alert" className="text-sm text-destructive">{error}</p>}<MaintenancePhotos images={images} />{images.length > 0 && <div className="flex flex-wrap gap-2">{images.map((uri, i) => <Button type="button" key={uri} variant="ghost" size="sm" disabled={busy} onClick={() => onChange(images.filter(x => x !== uri))}>Remove photo {i + 1}</Button>)}</div>}</div>;
}