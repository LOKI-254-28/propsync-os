import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";

// Loads the current tenant's own records only (RLS enforces isolation server-side too).
export function useTenantData() {
  const [user, setUser] = useState(null);
  const [tenant, setTenant] = useState(null);
  const [data, setData] = useState({ tenancies: [], charges: [], payments: [], applications: [], maintenance: [], inspections: [], notices: [], documents: [], feedback: [], vacationRequests: [], units: [] });
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const me = await base44.auth.me();
      setUser(me);
      if (!me) return;
      let t = await base44.entities.Tenant.filter({ user_id: me.id }).then((r) => r[0]);
      // First-login auto-link: if no Tenant record has this user's id yet, find one by email
      // and link it (and all its related records) so invited tenants see their data immediately.
      if (!t && me.email) {
        const byEmail = await base44.entities.Tenant.filter({ email: me.email }).then((r) => r[0]);
        if (byEmail) {
          await base44.entities.Tenant.update(byEmail.id, { user_id: me.id });
          const rels = ["Tenancy", "RentCharge", "Payment", "Application", "Maintenance", "Inspection", "Notice", "Document", "Feedback", "VacationRequest"];
          await Promise.all(rels.map((e) => base44.entities[e].updateMany({ tenant_id: byEmail.id }, { $set: { tenant_user_id: me.id } })));
          t = { ...byEmail, user_id: me.id };
        }
      }
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
  return { user, tenant, ...data, loading, reload: load, ensureTenant: load };
}