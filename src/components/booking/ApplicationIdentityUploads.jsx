import React from 'react';
import { Field } from '@/components/ui-bits';
import FileUploadButton from '@/components/FileUploadButton';
export default function ApplicationIdentityUploads({ unitId, files, onChange, onBusyChange, disabled }) {
  return <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-3">
    <p className="text-sm font-medium text-foreground">Required application documents</p>
    <Field label="Copy of your ID" hint="PDF, JPG or PNG, up to 10 MB.">
      <FileUploadButton disabled={disabled} documentContext={{ unit_id: unitId, purpose: 'application_id' }} label="Upload ID copy" onBusyChange={value => onBusyChange('id', value)} onUploaded={file => onChange({ ...files, id: file })} />
    </Field>
    <Field label="Clear, recent photograph" hint="A recent photo of you. JPG, PNG or WebP, up to 10 MB.">
      <FileUploadButton disabled={disabled} imageOnly documentContext={{ unit_id: unitId, purpose: 'application_photo' }} label="Upload recent photo" onBusyChange={value => onBusyChange('photo', value)} onUploaded={file => onChange({ ...files, photo: file })} />
    </Field>
  </div>;
}