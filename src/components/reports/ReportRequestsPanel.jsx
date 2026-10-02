import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';
import { SectionCard } from '@/components/ui-bits';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import ReportRequestForm from '@/components/reports/ReportRequestForm';
import ReportRequestRow from '@/components/reports/ReportRequestRow';
import ReportVisual from '@/components/reports/ReportVisual';
export default function ReportRequestsPanel({ properties = [] }) {
  const { user } = useAuth(), [view, setView] = useState(null), [status, setStatus] = useState('all');
  const admin = user?.role === 'admin', landlord = (user?.account_type || user?.data?.account_type) === 'landowner';
  const { data = [], isLoading, error, refetch } = useQuery({ queryKey: ['report-requests', user?.id], enabled: !!user && (admin || landlord), refetchInterval: 30000, queryFn: async () => { const records = []; let cursor; do { const page = await base44.entities.ReportRequest.filter(admin ? {} : { owner_user_id: user.id }, { sort: '-created_date', limit: 100, cursor }); records.push(...page.items); cursor = page.has_more ? page.next_cursor : null; } while(cursor); return records; } });
  if (!admin && !landlord) return null;
  return <SectionCard title={admin ? 'Landlord report requests' : 'Request a visual property report'} className="my-6"><div className="space-y-5">{!admin && <ReportRequestForm properties={properties} onSaved={refetch} />}<div><label className="mr-2 text-sm">Request status</label><select value={status} onChange={e => setStatus(e.target.value)} className="rounded-md border border-input bg-background p-2 text-sm">{['all', 'Requested', 'In Progress', 'Completed', 'Declined'].map(s => <option key={s} value={s}>{s === 'all' ? 'All requests' : s}</option>)}</select></div>{isLoading ? <p className="text-sm text-muted-foreground">Loading requests…</p> : error ? <p className="text-sm text-destructive">Could not load requests: {error.message}</p> : <div className="space-y-3">{data.filter(r => status === 'all' || r.status === status).map(r => <ReportRequestRow key={r.id} request={r} admin={admin} onChanged={refetch} onView={setView} />)}{!data.some(r => status === 'all' || r.status === status) && <p className="text-sm text-muted-foreground">No report requests yet.</p>}</div>}</div><Dialog open={!!view} onOpenChange={() => setView(null)}><DialogContent className="max-w-3xl max-h-[90dvh] overflow-y-auto"><DialogHeader><DialogTitle>Property performance report</DialogTitle></DialogHeader>{view && <ReportVisual report={view} />}</DialogContent></Dialog></SectionCard>;
}