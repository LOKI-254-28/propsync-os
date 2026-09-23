import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";

// Loads all portfolio records an admin needs for dashboards/lists.
export function usePortfolioData() {
  const [data, setData] = useState({
    properties: [], units: [], tenants: [], tenancies: [], charges: [],
    payments: [], applications: [], maintenance: [], inspections: [],
    notices: [], expenses: [], contractors: [], feedback: [],
    vacationRequests: [], notifications: [], documents: [],
  });
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [
        properties, units, tenants, tenancies, charges, payments,
        applications, maintenance, inspections, notices, expenses,
        contractors, feedback, vacationRequests, documents,
      ] = await Promise.all([
        base44.entities.Property.list("-created_date", 200),
        base44.entities.Unit.list("-created_date", 500),
        base44.entities.Tenant.list("-created_date", 200),
        base44.entities.Tenancy.list("-created_date", 500),
        base44.entities.RentCharge.list("-due_date", 1000),
        base44.entities.Payment.list("-payment_date", 500),
        base44.entities.Application.list("-created_date", 200),
        base44.entities.Maintenance.list("-created_date", 500),
        base44.entities.Inspection.list("-created_date", 200),
        base44.entities.Notice.list("-created_date", 200),
        base44.entities.Expense.list("-created_date", 500),
        base44.entities.Contractor.list("-created_date", 100),
        base44.entities.Feedback.list("-created_date", 200),
        base44.entities.VacationRequest.list("-created_date", 100),
        base44.entities.Document.list("-created_date", 200),
      ]);
      setData({ properties, units, tenants, tenancies, charges, payments, applications, maintenance, inspections, notices, expenses, contractors, feedback, vacationRequests, documents });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);
  return { ...data, loading, reload: load };
}