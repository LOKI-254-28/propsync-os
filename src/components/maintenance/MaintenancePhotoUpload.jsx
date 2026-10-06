import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import FileUploadButton from '@/components/FileUploadButton';
import MaintenancePhotos from '@/components/maintenance/MaintenancePhotos';
export default function MaintenancePhotoUpload({ images, onChange, onBusyChange }) {
  const [busy, setBusy] = useState(false);
  const current = useRef(images); current.current = images;
  const uploaded = file => { current.current = [...current.current, file.file_uri]; onChange(current.current); };
  return <div className="space-y-2">
    <FileUploadButton documentContext={{category:'Maintenance Photo'}} multiple imageOnly maxFiles={6 - images.length} disabled={images.length >= 6} label={`Add photos (${images.length}/6)`} onUploaded={uploaded} onBusyChange={value => { setBusy(value); onBusyChange?.(value); }} />
    <p className="text-xs text-muted-foreground">Optional · JPG, PNG or WebP · up to 10 MB each · private</p>
    <MaintenancePhotos images={images} />
    {images.length > 0 && <div className="flex flex-wrap gap-2">{images.map((uri, i) => <Button type="button" key={uri} variant="ghost" size="sm" disabled={busy} onClick={() => onChange(images.filter(x => x !== uri))}>Remove photo {i + 1}</Button>)}</div>}
  </div>;
}