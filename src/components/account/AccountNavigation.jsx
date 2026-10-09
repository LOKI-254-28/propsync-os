import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Building2, DoorOpen, Users, FileText, ScrollText, Wallet, AlertTriangle, Wrench, ClipboardCheck, Bell, FolderOpen, Receipt, BarChart3, Columns3, BellRing, ShieldCheck, Settings, Circle, Tag, LogOut, CalendarClock, MessageSquare, UserCog, User } from 'lucide-react';
import AlertBadge from '@/components/alerts/AlertBadge';
import { accountNavigation, isAccountPathActive } from '@/components/account/accountNavigation';

const icons = { LayoutDashboard, Building2, DoorOpen, Users, FileText, ScrollText, Wallet, AlertTriangle, Wrench, ClipboardCheck, Bell, FolderOpen, Receipt, BarChart3, Columns3, BellRing, ShieldCheck, Settings, Circle, Tag, LogOut, CalendarClock, MessageSquare, UserCog, User };
export default function AccountNavigation({ items, role, counts, onNavigate, extra }) {
  const { pathname } = useLocation();
  return <nav aria-label={`${role} navigation`} className="account-navigation flex-1 overflow-y-auto px-3 pb-4">
    {accountNavigation(items, role).map(group => <section key={group.label} className="mt-5 first:mt-1">
      <h2 className="px-3 pb-2 font-mono text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{group.label}</h2>
      <div className="space-y-1">{group.items.map(item => {
        const Icon = icons[item.icon] || Circle;
        const active = isAccountPathActive(item.path, pathname);
        return <Link key={item.path} to={item.path} onClick={onNavigate} aria-current={active ? 'page' : undefined}
          className={`account-nav-item group flex min-h-10 items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-colors ${active ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'}`}>
          <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.7}/><span className="flex-1">{item.label}</span><AlertBadge count={counts[item.path] || 0}/>
        </Link>;
      })}</div>
    </section>)}
    {extra && <section className="mt-4 border-t border-border pt-3">{extra}</section>}
  </nav>;
}