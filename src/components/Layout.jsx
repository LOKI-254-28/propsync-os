import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { LANDLORD_NAV } from '@/lib/constants';
import { normalizeUser } from '@/lib/normalizeUser';
import { signOut } from '@/lib/signOut';
import useSectionAlerts from '@/components/alerts/useSectionAlerts';
import AccountShell from '@/components/account/AccountShell';

export default function Layout({ children }) {

  const [user, setUser] = useState(null);
  const [settings, setSettings] = useState(null);
  const { counts, unread } = useSectionAlerts();

  const [pendingApproval, setPendingApproval] = useState(false);

  useEffect(() => {
    base44.auth.me().then((raw) => {
      const u = normalizeUser(raw);
      setUser(u);
      if (u && u.account_type === 'landowner' && u.approval_status === 'pending') {
        setPendingApproval(true);
      }
    }).catch(() => {});
    base44.entities.Settings.list().then((s) => setSettings(s[0])).catch(() => {});
  }, []);



  const orgName = settings?.organization_name || "PropWiz";

  const handleLogout = async () => {
    await signOut();
  };

  return <AccountShell items={LANDLORD_NAV} role="Landowner" orgName={orgName} profilePath="/profile" fallbackName={user?.full_name || user?.email} counts={counts} unread={unread} onLogout={handleLogout}
    greeting={new Date().toLocaleDateString('en-US', { timeZone: 'Africa/Nairobi', weekday: 'long', month: 'long', day: 'numeric' })}>
    {pendingApproval && <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"><strong>Awaiting admin approval.</strong> You can prepare your portfolio now — properties and listings will go live once an administrator approves your account.</div>}
    {children}
  </AccountShell>;
}