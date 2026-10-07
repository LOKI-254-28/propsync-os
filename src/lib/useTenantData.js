import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { normalizeUser } from "@/lib/normalizeUser";
import { loadDocuments } from '@/lib/documentList';
import reconcileInitialRent from '@/lib/reconcileInitialRent';
import loadAllRecords from '@/lib/loadAllRecords';

async function loadMaintenance() {
  const items=[]; let cursor;
  do { const {data}=await base44.functions.invoke('maintenanceOps',{action:'mine',cursor});items.push(...data.items);cursor=data.has_more?data.next_cursor:null; } while(cursor);
  return items;
}
// Loads the current tenant's own records only (RLS enforces isolation server-side too).
// On first login, calls the linkTenant backend function to auto-link by email.
export function useTenantData() {
  const [user, setUser] = useState(null);
  const [tenant, setTenant] = useState(null);
  const [notLinked, setNotLinked] = useState(false);
  const [data, setData] = useState({ tenancies: [], charges: [], payments: [], applications: [], maintenance: [], inspections: [], notices: [], documents: [], feedback: [], vacationRequests: [], units: [], listings: [] });
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    setNotLinked(false);
    try {
      const me = normalizeUser(await base44.auth.me());
      setUser(me);
      if (!me) return;
      // Auto-link client profile on first login (clients only)
      if (me.account_type === "client" || (!me.account_type && me.role !== "admin")) {
        try {
          const res = await base44.functions.invoke("linkTenant", {});
          if (res.data?.notFound) {
            setNotLinked(true);
          }
        } catch (e) {}
      }
      const t = await base44.entities.Tenant.filter({ user_id: me.id }).then((r) => r[0]);
      setTenant(t);
      const [tenancies, charges, payments, applications, maintenance, inspections, notices, documents, feedback, vacationRequests, units, listings] = await Promise.all([
        loadAllRecords('Tenancy',{ tenant_user_id: me.id }),
        base44.entities.RentCharge.filter({ tenant_user_id: me.id }),
        base44.entities.Payment.filter({ tenant_user_id: me.id }),
        base44.entities.Application.filter({ tenant_user_id: me.id }),
        loadMaintenance(),
        base44.entities.Inspection.filter({ tenant_user_id: me.id }),
        base44.entities.Notice.filter({ tenant_user_id: me.id }),
        loadDocuments(),
        base44.entities.Feedback.filter({ tenant_user_id: me.id }),
        base44.entities.VacationRequest.filter({ tenant_user_id: me.id }),
        base44.entities.Unit.list("-created_date", 500),
        base44.entities.Listing.filter({ status: { $in: ["Published", "Active"] } }, "-created_date", 500),
      ]);
      const reconciledCharges=await reconcileInitialRent(tenancies)?await loadAllRecords('RentCharge',{tenant_user_id:me.id},'-due_date'):charges;
      setData({ tenancies, charges:reconciledCharges, payments, applications, maintenance, inspections, notices, documents, feedback, vacationRequests, units, listings });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);
  return { user, tenant, notLinked, ...data, loading, reload: load, ensureTenant: load };
}