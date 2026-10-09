import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { ADMIN_NAV } from '@/lib/constants';
import { normalizeUser } from '@/lib/normalizeUser';
import { signOut } from '@/lib/signOut';
import useSectionAlerts from '@/components/alerts/useSectionAlerts';
import AccountShell from '@/components/account/AccountShell';

export default function AdminLayout({ children }) {

  const [user, setUser] = useState(null);
  const [settings, setSettings] = useState(null);
  const { counts, unread } = useSectionAlerts();


  useEffect(() => {
    base44.auth.me().then((raw) => setUser(normalizeUser(raw))).catch(() => {});
    base44.entities.Settings.list().then((s) => setSettings(s[0])).catch(() => {});
  }, []);



  const orgName = settings?.organization_name || "PropWiz";

  const handleLogout = async () => {
    await signOut();
  };

  return <AccountShell items={ADMIN_NAV} role="Administrator" orgName={orgName} profilePath="/profile" fallbackName={user?.full_name || user?.email} counts={counts} unread={unread} onLogout={handleLogout}
    greeting={new Date().toLocaleDateString('en-US', { timeZone: 'Africa/Nairobi', weekday: 'long', month: 'long', day: 'numeric' })}>
    {children}
  </AccountShell>;
}