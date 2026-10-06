import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { normalizeUser } from "@/lib/normalizeUser";
import { loadDocuments } from '@/lib/documentList';

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
      const isLandowner = me?.account_type === 'landowner';
      const f = isLandowner ? { owner_user_id: me.id } : {};
      // Helper: filter by owner for landowners, list all for admins
      const owned = (entity, sort, limit) => isLandowner
        ? base44.entities[entity].filter(f, sort, limit)
        : base44.entities[entity].list(sort, limit);

      const [
        properties, units, tenants, tenancies, charges, payments,
        applications, maintenance, inspections, notices, expenses,
        contractors, feedback, vacationRequests, documents, listings,
      ] = await Promise.all([
        owned('Property', '-created_date', 200),
        owned('Unit', '-created_date', 500),
        isLandowner ? Promise.resolve([]) : base44.entities.Tenant.list('-created_date', 500),
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
      const visibleTenants=isLandowner ? await base44.entities.Tenant.filter({$or:[{id:{$in:[...new Set(tenancies.map(t=>t.tenant_id).filter(Boolean))]}},{user_id:{$in:[...new Set(tenancies.map(t=>t.tenant_user_id).filter(Boolean))]}},{owner_user_id:me.id}]},'-created_date',500) : tenants;
      setData({ properties, units, tenants:visibleTenants, tenancies, charges, payments, applications, maintenance, inspections, notices, expenses, contractors, feedback, vacationRequests, documents, listings });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if(enabled) load(); }, [enabled]);
  return { ...data, loading, reload: load };
}