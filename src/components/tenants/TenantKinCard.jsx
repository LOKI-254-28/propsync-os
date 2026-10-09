import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
export default function TenantKinCard({ kin }) {
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const viewId = async () => {
    const tab = window.open('', '_blank');
    if (tab) tab.opener = null;
    setBusy(true); setError('');
    try {
      if (!tab) throw new Error('Allow pop-ups to view the ID copy.');
      const url = /^https?:\/\//i.test(kin.id_document_uri) ? kin.id_document_uri : (await base44.integrations.Core.CreateFileSignedUrl({ file_uri: kin.id_document_uri })).signed_url;
      tab.location.href = url;
    } catch (e) { tab?.close(); setError(e.response?.data?.error || e.message); }
    finally { setBusy(false); }
  };
  return <article className="space-y-3 rounded-lg border border-border bg-card p-4">
    <dl className="grid gap-3 text-sm sm:grid-cols-2">{[['Name', kin.full_name], ['ID / passport', kin.id_number], ['Phone', kin.phone], ['Email', kin.email]].map(([label, value]) => <div key={label}><dt className="text-xs text-muted-foreground">{label}</dt><dd className="break-words">{value || '—'}</dd></div>)}</dl>
    {kin.id_document_uri ? <Button variant="outline" size="sm" disabled={busy} onClick={viewId}>{busy ? 'Opening…' : 'View next-of-kin ID copy'}</Button> : <p className="text-xs text-muted-foreground">No ID copy attached.</p>}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
  </article>;
}