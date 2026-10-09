import React, { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import AccountSurface from '@/components/account/AccountSurface';
import AccountNavigation from '@/components/account/AccountNavigation';
import AccountSidebar from '@/components/account/AccountSidebar';
import AccountTopbar from '@/components/account/AccountTopbar';

export default function AccountShell({ children, items, role, orgName = 'PropWiz', profilePath, fallbackName, counts = {}, unread = 0, onLogout, greeting, extraNavigation }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);
  const { pathname } = useLocation();
  useEffect(() => { setOpen(false); }, [pathname]);
  const navigation = <AccountNavigation items={items} role={role} counts={counts} onNavigate={() => setOpen(false)} extra={extraNavigation}/>;
  const sidebar = <AccountSidebar orgName={orgName} role={role} profilePath={profilePath} fallbackName={fallbackName} onLogout={onLogout}>{navigation}</AccountSidebar>;
  return <AccountSurface>
    <a href="#account-content" className="sr-only z-50 rounded-lg bg-primary px-4 py-3 text-primary-foreground focus:not-sr-only focus:fixed focus:left-4 focus:top-4">Skip to page content</a>
    <aside className="account-sidebar fixed inset-y-0 left-0 z-30 hidden w-[17rem] flex-col border-r border-border lg:flex">{sidebar}</aside>
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent id="account-mobile-menu" side="left" aria-describedby={undefined} onCloseAutoFocus={event => { event.preventDefault(); menuRef.current?.focus(); }} className="account-sidebar flex w-[min(20rem,90vw)] flex-col gap-0 p-0">
        <SheetTitle className="sr-only">{role} navigation</SheetTitle>{sidebar}
      </SheetContent>
    </Sheet>
    <div className="account-main lg:pl-[17rem]">
      <AccountTopbar items={items} role={role} greeting={greeting} unread={unread} menuRef={menuRef} open={open} onOpen={() => setOpen(true)}/>
      <main id="account-content" tabIndex={-1} className="account-content page-container outline-none">{children}</main>
    </div>
  </AccountSurface>;
}