import React from 'react';
import { Link } from 'react-router-dom';
import { Home, LogOut } from 'lucide-react';
import AccountIdentity from '@/components/profile/AccountIdentity';

export default function AccountSidebar({ orgName, role, profilePath, fallbackName, onLogout, children }) {
  return <>
    <Link to="/" className="account-brand flex shrink-0 items-center gap-3 border-b border-border px-6 py-6">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm"><Home className="h-5 w-5" strokeWidth={1.7}/></span>
      <span className="min-w-0"><span className="block truncate font-heading text-lg font-bold tracking-tight text-foreground">{orgName}</span><span className="block font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{role} workspace</span></span>
    </Link>
    {children}
    <div className="account-identity flex shrink-0 items-center gap-3 border-t border-border bg-muted/50 p-4">
      <AccountIdentity to={profilePath} role={role} fallbackName={fallbackName}/>
      <button type="button" onClick={onLogout} aria-label="Sign out" title="Sign out" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-primary"><LogOut className="h-4 w-4"/></button>
    </div>
  </>;
}