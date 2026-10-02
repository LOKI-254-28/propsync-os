import React from 'react';
import { Link } from 'react-router-dom';
import { FileText, CalendarClock, Wrench, MessageSquare, FolderOpen, BarChart3 } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import AlertBadge from '@/components/alerts/AlertBadge';
export default function DashboardAlerts() {
  const { user } = useAuth(), { pathname } = useLocation(), tenant = pathname.startsWith('/portal');
  const { data, error } = useQuery({ queryKey: ['section-alerts', user?.id], enabled: false });
  const prefix = tenant ? '/portal' : '';
  const items = [[`${prefix}/applications`, 'Applications', FileText], ...(!tenant ? [['/site-visits', 'Site Visits', CalendarClock]] : []), [`${prefix}/maintenance`, 'Maintenance / Repairs', Wrench], [`${prefix}/chat`, 'Messages', MessageSquare], [`${prefix}/documents`, 'Documents', FolderOpen], ...(!tenant ? [['/reports', 'Reports', BarChart3]] : [])];
  return <div className="my-5"><div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{items.map(([to, label, Icon]) => <Link to={to} key={to} className="flex items-center gap-2 rounded-lg border border-border bg-card p-3 text-sm font-medium hover:bg-accent"><Icon className="h-4 w-4 shrink-0 text-muted-foreground" /><span className="flex-1">{label}</span><AlertBadge count={data?.counts?.[to]} /></Link>)}</div>{error && <p className="mt-2 text-xs text-destructive">Action alerts could not be refreshed.</p>}</div>;
}