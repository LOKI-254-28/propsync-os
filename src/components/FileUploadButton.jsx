import React, { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, CheckCircle2, Loader2 } from 'lucide-react';
import useFileUpload from '@/hooks/useFileUpload';

export function FileUploadButton({ onUploaded, onBusyChange, public: isPublic = false, multiple = false, imageOnly = false, maxFiles = Infinity, disabled = false, label = 'Choose File', variant = 'outline', size = 'sm', className = '' }) {
  const inputRef = useRef(null);
  const { busy, error, fileName, handle } = useFileUpload({ onUploaded, onBusyChange, isPublic, multiple, imageOnly, maxFiles });
  return (
    <div className={className}>
      <input ref={inputRef} type="file" multiple={multiple} accept={imageOnly ? '.jpg,.jpeg,.png,.webp' : '.pdf,.jpg,.jpeg,.png'} disabled={busy || disabled} onChange={handle} className="hidden" />
      <div className="flex items-center gap-2">
        <Button type="button" variant={variant} size={size} onClick={() => inputRef.current?.click()} disabled={busy || disabled}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          {busy ? 'Uploading...' : label}
        </Button>
        {fileName && !busy && <span className="flex max-w-[220px] items-center gap-1 truncate text-xs text-muted-foreground"><CheckCircle2 className="h-3.5 w-3.5 shrink-0" />{fileName}</span>}
      </div>
      {busy && <div role="progressbar" aria-label="Uploading file" className="mt-1.5 h-1.5 w-full max-w-xs animate-pulse rounded-full bg-muted"><div className="h-full w-3/5 rounded-full bg-primary" /></div>}
      {error && <p role="alert" className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}
export default FileUploadButton;