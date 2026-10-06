import React, { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, Loader2, CheckCircle2 } from 'lucide-react';
import useIdCopyUpload from '@/hooks/useIdCopyUpload';

export default function IdCopyUpload({ disabled, onUploaded, onBusyChange, documentContext }) {
  const input = useRef(null);
  const { busy, error, fileName, handle, cancel } = useIdCopyUpload({ onUploaded, onBusyChange, documentContext });
  return (
    <div className="space-y-1.5">
      <input ref={input} type="file" accept=".pdf,.jpg,.jpeg,.png" disabled={busy || disabled} onChange={handle} className="hidden" />
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" size="sm" disabled={busy || disabled} onClick={() => input.current?.click()}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          {busy ? 'Uploading…' : 'Upload ID copy'}
        </Button>
        {busy && <Button type="button" variant="ghost" size="sm" onClick={cancel}>Cancel upload</Button>}
        {fileName && !busy && <span className="flex min-w-0 items-center gap-1 text-xs text-muted-foreground"><CheckCircle2 className="h-3.5 w-3.5 shrink-0" /><span className="max-w-[220px] truncate">{fileName}</span></span>}
      </div>
      {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
    </div>
  );
}