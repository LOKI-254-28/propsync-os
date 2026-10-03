import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { SectionCard } from '@/components/ui-bits';
import { Trash2, Loader2 } from 'lucide-react';

export default function TenantDataWipe({ onComplete }) {
  const [busy, setBusy] = useState(false), [report, setReport] = useState(null), [error, setError] = useState('');
  const queryClient = useQueryClient();
  const wipe = async () => {
    setBusy(true); setError(''); setReport(null);
    try {
      const { data } = await base44.functions.invoke('purgeTenantData', {});
      setReport(data);
      await Promise.all([onComplete(), queryClient.invalidateQueries()]);
    } catch (err) { setError(err.response?.data?.error || err.message || 'Tenant cleanup failed.'); }
    finally { setBusy(false); }
  };
  return (
    <div className="mt-6"><SectionCard title="Danger Zone">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0"><p className="text-sm font-semibold text-foreground">Full tenant-side wipe</p>
          <p className="mt-1 text-sm text-muted-foreground">Permanently delete tenant accounts, profiles, applications, tenancies, payments and all related tenant records. Admins, landlords and their property setup are preserved; cleared tenancy units become available.</p>
          <p className="mt-2 text-sm font-medium text-destructive">This cannot be undone. Clicking the button starts the wipe immediately.</p>
        </div>
        <Button variant="destructive" disabled={busy} onClick={wipe} className="shrink-0">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}{busy ? 'Wiping tenant data…' : 'Wipe all tenant data'}</Button>
      </div>
      {error && <p role="alert" className="mt-4 text-sm text-destructive">{error}</p>}
      {report && <div role="status" className="mt-4 rounded-lg border border-border bg-muted/30 p-4 text-sm">
        <p className="font-medium">{report.errors.length ? 'Cleanup finished with errors' : 'Tenant cleanup complete'}</p>
        <p className="mt-1 text-muted-foreground">{report.tenantUsersRemoved} accounts removed · {report.tenantUsersKept} accounts kept · {Object.values(report.deletedRecords).reduce((sum, count) => sum + count, 0)} records removed · {report.unitResets} units reset</p>
        <details className="mt-3"><summary className="cursor-pointer font-medium">View cleanup report</summary><div className="mt-2 grid gap-1 sm:grid-cols-2">{Object.entries(report.deletedRecords).map(([name, count]) => <p key={name}>{name}: {count}</p>)}</div>
          {!!report.errors.length && <ul className="mt-3 max-h-48 space-y-1 overflow-auto text-destructive">{report.errors.map((item, index) => <li key={index} className="break-words">{item.entity} ({item.target}): {item.error}</li>)}</ul>}
        </details>
      </div>}
    </SectionCard></div>
  );
}