import React, { useMemo } from "react";
import { useTenantData } from "@/lib/useTenantData";
import { PageHeader, SectionCard, StatusBadge, EmptyState } from "@/components/ui-bits";
import { FolderOpen, Download } from "lucide-react";

export default function MyDocuments() {
  const t = useTenantData();
  const list = useMemo(() => [...t.documents].sort((a, b) => new Date(b.date_uploaded || b.created_date) - new Date(a.date_uploaded || a.created_date)), [t.documents]);
  if (t.loading) return <div className="flex h-96 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-700" /></div>;
  return (
    <div>
      <PageHeader title="Documents" description="Your tenancy-related documents." />
      {list.length === 0 ? <EmptyState icon={FolderOpen} title="No documents" description="Documents shared by your landlord will appear here." /> : (
        <SectionCard>
          <div className="space-y-2">
            {list.map((d) => (
              <div key={d.id} className="flex items-center justify-between rounded-lg border border-slate-100 px-4 py-3">
                <div><p className="font-medium text-slate-900">{d.name}</p><p className="text-xs text-slate-500">{d.document_type} · {d.date_uploaded}</p></div>
                <div className="flex items-center gap-3"><StatusBadge status={d.visibility} />{d.file_url && <a href={d.file_url} target="_blank" rel="noreferrer" className="text-emerald-700 hover:text-emerald-800"><Download className="h-4 w-4" /></a>}</div>
              </div>
            ))}
          </div>
        </SectionCard>
      )}
    </div>
  );
}