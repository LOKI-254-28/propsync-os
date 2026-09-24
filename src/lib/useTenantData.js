import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";

// Loads the current tenant's own records only (RLS enforces isolation server-side too).
// On first login, calls the linkTenant backend function to auto-link by email.
export function useTenantData() {
  const [user, setUser] = useState(null);
  const [tenant, setTenant] = useState(null);
  const [notLinked, setNotLinked] = useState(false);
  const [data, setData] = useState({ tenancies: [], charges: [], payments: [], applications: [], maintenance: [], inspections: [], notices: [], documents: [], feedback: [], vacationRequests: [], units: [] });
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    setNotLinked(false);
    try {
      const me = await base44.auth.me();
      setUser(me);
      if (!me) return;
      // Auto-link tenant profile on first login (non-admin only)
      if (me.role !== "admin") {
        try {
          const res = await base44.functions.invoke("linkTenant", {});
          if (res.data?.notFound) {
            setNotLinked(true);
            setLoading(false);
            return;
          }
        } catch (e) {}
      }
      const t = await base44.entities.Tenant.filter({ user_id: me.id }).then((r) => r[0]);
      setTenant(t);
      const [tenancies, charges, payments, applications, maintenance, inspections, notices, documents, feedback, vacationRequests, units] = await Promise.all([
        base44.entities.Tenancy.filter({ tenant_user_id: me.id }),
        base44.entities.RentCharge.filter({ tenant_user_id: me.id }),
        base44.entities.Payment.filter({ tenant_user_id: me.id }),
        base44.entities.Application.filter({ tenant_user_id: me.id }),
        base44.entities.Maintenance.filter({ tenant_user_id: me.id }),
        base44.entities.Inspection.filter({ tenant_user_id: me.id }),
        base44.entities.Notice.filter({ tenant_user_id: me.id }),
        base44.entities.Document.filter({ tenant_user_id: me.id }),
        base44.entities.Feedback.filter({ tenant_user_id: me.id }),
        base44.entities.VacationRequest.filter({ tenant_user_id: me.id }),
        base44.entities.Unit.list("-created_date", 500),
      ]);
      setData({ tenancies, charges, payments, applications, maintenance, inspections, notices, documents, feedback, vacationRequests, units });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);
  return { user, tenant, notLinked, ...data, loading, reload: load, ensureTenant: load };
}