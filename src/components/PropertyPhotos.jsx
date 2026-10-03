import React, { useRef, useState } from 'react';
import { X } from 'lucide-react';
import { Field } from '@/components/ui-bits';
import { Image } from '@/components/ui/image';
import FileUploadButton from '@/components/FileUploadButton';
export default function PropertyPhotos({ images = [], onChange, onBusyChange, label = 'Property photos' }) {
  const [busy, setBusy] = useState(false);
  const current = useRef(images); current.current = images;
  const uploaded = file => { current.current = [...current.current, file.file_url]; onChange(current.current); };
  return <Field label={label}>
    <div className="flex flex-wrap gap-2">
      {images.map((url, i) => <div key={`${url}-${i}`} className="relative h-20 w-20 overflow-hidden rounded-lg border border-border">
        <Image src={url} alt={`Photo ${i + 1}`} className="h-full w-full" />
        <button type="button" aria-label={`Remove photo ${i + 1}`} disabled={busy} onClick={() => onChange(images.filter((_, index) => index !== i))} className="absolute right-0.5 top-0.5 rounded-full bg-background/80 p-0.5 text-foreground disabled:opacity-50"><X className="h-3 w-3" /></button>
      </div>)}
    </div>
    <FileUploadButton public multiple imageOnly label="Add photos" onUploaded={uploaded} onBusyChange={value => { setBusy(value); onBusyChange?.(value); }} />
    <p className="mt-1 text-xs text-muted-foreground">JPG, PNG, or WebP — up to 10MB each. Photos are public so they render on the listings page.</p>
  </Field>;
}