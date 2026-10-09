import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Bell, Menu, ChevronRight } from 'lucide-react';
import AlertBadge from '@/components/alerts/AlertBadge';
import { isAccountPathActive } from '@/components/account/accountNavigation';

export default function AccountTopbar({ items, role, greeting, unread, onOpen, menuRef, open }) {
  const { pathname } = useLocation();
  const page = [...items].sort((a, b) => b.path.length - a.path.length).find(item => isAccountPathActive(item.path, pathname));
  return <header className="account-topbar sticky top-0 z-20 border-b border-border bg-card/95 backdrop-blur-xl">
    <div className="page-container flex min-h-20 items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3">
        <button ref={menuRef} type="button" onClick={onOpen} aria-expanded={open} aria-label="Open navigation" aria-controls="account-mobile-menu" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border text-primary lg:hidden"><Menu className="h-5 w-5"/></button>
        <div className="min-w-0"><p className="mb-1 hidden font-mono text-[10px] uppercase tracking-widest text-muted-foreground sm:block">{greeting || `${role} workspace`}</p>
          <div className="flex min-w-0 items-center gap-2 text-sm"><span className="hidden text-muted-foreground sm:inline">Workspace</span><ChevronRight className="hidden h-3 w-3 shrink-0 text-muted-foreground sm:block"/><span className="truncate font-semibold text-foreground">{page?.label || 'Property details'}</span></div>
        </div>
      </div>
      <nav aria-label="Top menu" className="flex shrink-0 items-center gap-2">
        <span className="mr-2 hidden rounded-full border border-border bg-muted px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-primary md:inline">{role}</span>
        <Link to="/" title="Public home page" className="flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm text-muted-foreground hover:bg-accent hover:text-primary"><Home className="h-4 w-4"/><span className="hidden sm:inline">Home</span></Link>
        {role !== 'Tenant' && <Link to="/notifications" aria-label={`Notifications, ${unread || 0} unread`} className="relative flex h-10 w-10 items-center justify-center rounded-lg border border-border text-primary hover:bg-accent"><Bell className="h-4 w-4"/><span className="absolute -right-1 -top-1"><AlertBadge count={unread}/></span></Link>}
      </nav>
    </div>
  </header>;
}