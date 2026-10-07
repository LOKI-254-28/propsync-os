import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { normalizeUser } from "@/lib/normalizeUser";
import { loadDocuments } from '@/lib/documentList';
import { loadTenantDirectory } from '@/lib/tenantAccess';
import loadAllRecords from '@/lib/loadAllRecords';
import reconcileInitialRent from '@/lib/reconcileInitialRent';
import {occupancySummary} from '@/lib/occupancy';

// Loads portfolio records for admin/landowner dashboards.
// Landowners see only their own records (filtered by owner_user_id).
// Admins see all records.
export function usePortfolioData({enabled=true}={}) {
  const [data, setData] = useState({
    properties: [], units: [], tenants: [], tenancies: [], charges: [],
    payments: [], applications: [], maintenance: [], inspections: [],
    notices: [], expenses: [], contractors: [], feedback: [],
    vacationRequests: [], notifications: [], documents: [],
    listings: [],
  });
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const me = normalizeUser(await base44.auth.me());
      const isAdmin = me?.role === 'admin';
      const isLandowner = !isAdmin && me?.account_type === 'landowner';
      const f = isAdmin ? {} : { owner_user_id: me.id };
      // Helper: filter by owner for landowners, list all for admins
      const owned = (entity, sort) => loadAllRecords(entity, f, sort);

      const [
        properties, units, tenants, tenancies, charges, payments,
        applications, maintenance, inspections, notices, expenses,
        contractors, feedback, vacationRequests, documents, listings,
      ] = await Promise.all([
        owned('Property', '-created_date', 200),
        owned('Unit', '-created_date', 500),
        isLandowner || isAdmin ? loadTenantDirectory() : Promise.resolve([]),
        owned('Tenancy', '-created_date', 500),
        owned('RentCharge', '-due_date', 1000),
        owned('Payment', '-payment_date', 500),
        owned('Application', '-created_date', 200),
        owned('Maintenance', '-created_date', 500),
        owned('Inspection', '-created_date', 200),
        owned('Notice', '-created_date', 200),
        owned('Expense', '-created_date', 500),
        owned('Contractor', '-created_date', 100),
        owned('Feedback', '-created_date', 200),
        owned('VacationRequest', '-created_date', 100),
        loadDocuments(),
        owned('Listing', '-created_date', 200),
      ]);
      const reconciledCharges = await reconcileInitialRent(tenancies) ? await owned('RentCharge','-due_date') : charges;
      const reconciledUnits = occupancySummary(units,tenancies).units;
      setData({ properties, units:reconciledUnits, tenants, tenancies, charges:reconciledCharges, payments, applications, maintenance, inspections, notices, expenses, contractors, feedback, vacationRequests, documents, listings });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if(!enabled)return;
    load();
    let timer;
    const refresh=()=>{clearTimeout(timer);timer=setTimeout(load,250);};
    const unsubscribers=['Property','Unit','Tenancy'].map(entity=>base44.entities[entity].subscribe(refresh));
    return ()=>{clearTimeout(timer);unsubscribers.forEach(unsubscribe=>unsubscribe());};
  }, [enabled]);
  return { ...data, loading, reload: load };
}