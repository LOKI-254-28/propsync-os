import React from 'react';
import {StatusBadge} from '@/components/ui-bits';
import VisitPanel from '@/components/applications/VisitPanel';
import ProceedPanel from '@/components/applications/ProceedPanel';
export default function SiteVisitCard({application,onUpdated}){
  return <article className="space-y-3 rounded-xl border border-border bg-card p-4 shadow-sm"><div className="flex flex-wrap items-start justify-between gap-2"><div><p className="font-medium text-foreground">{application.applicant_name} · {application.unit_number} · {application.property_name}</p><p className="font-mono text-xs text-muted-foreground">{application.application_reference}</p></div><StatusBadge status={application.status}/></div><VisitPanel app={application} role="landlord" onUpdated={onUpdated}/><ProceedPanel app={application} onUpdated={onUpdated}/></article>;
}