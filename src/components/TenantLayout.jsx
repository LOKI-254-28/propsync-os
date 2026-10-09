import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { TENANT_NAV } from '@/lib/constants';
import { normalizeUser } from '@/lib/normalizeUser';
import { signOut } from '@/lib/signOut';
import useSectionAlerts from '@/components/alerts/useSectionAlerts';
import AssignedWorkLink from '@/components/maintenance/AssignedWorkLink';
import useAccountProfile from '@/hooks/useAccountProfile';
import TenantKinPrompt from '@/components/tenants/TenantKinPrompt';
import AccountShell from '@/components/account/AccountShell';

export default function TenantLayout({ children }) {

  const [user, setUser] = useState(null);
  const [tenant, setTenant] = useState(null);
  const [notLinked, setNotLinked] = useState(false);
  const { counts } = useSectionAlerts();
  const {profile}=useAccountProfile();


  useEffect(() => {
    base44.auth.me().then(async (raw) => {
      const u = normalizeUser(raw);
      setUser(u);
      if (!u) return;
      if (u.account_type === "client" || (!u.account_type && u.role !== "admin")) {
        try {
          const res = await base44.functions.invoke("linkTenant", {});
          setNotLinked(!!res.data?.notFound);
        } catch (e) {}
      }
      const t = await base44.entities.Tenant.filter({ user_id: u.id }).then((r) => r[0]);
      setTenant(t);
    }).catch(() => {});
  }, []);



  const handleLogout = async () => {
    await signOut();
  };

  return <AccountShell items={TENANT_NAV} role="Tenant" profilePath="/portal/profile" fallbackName={tenant?.full_name || user?.full_name || user?.email} counts={counts} onLogout={handleLogout}
    greeting={`Welcome back, ${(profile?.display_name || tenant?.full_name)?.split(' ')[0] || 'Tenant'}`} extraNavigation={<AssignedWorkLink/>}>
    {notLinked && <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800"><strong>No tenancy linked yet.</strong> Browse available listings and apply to join a property to get started.</div>}
    <TenantKinPrompt/>
    {children}
  </AccountShell>;
}