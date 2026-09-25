import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { PageHeader, StatusBadge, EmptyState } from "@/components/ui-bits";
import { normalizeUser } from "@/lib/normalizeUser";
import { FileText } from "lucide-react";

export default function GuestApplications() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const me = normalizeUser(await base44.auth.me());
        if (me) {
          const apps = await base44.entities.Application.filter({ tenant_user_id: me.id });
          setApplications(apps.sort((a, b) => new Date(b.submitted_date || b.created_date) - new Date(a.submitted_date || a.created_date)));
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <div className="flex h-96 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-700" /></div>;

  return (
    <div>
      <PageHeader title="My Applications" description="Track the status of your property applications." />
      {applications.length === 0 ? (
        <EmptyState icon={FileText} title="No applications yet" description="Explore properties and apply to get started." action={<Link to="/guest/explore" className="text-emerald-700 hover:underline">Explore properties →</Link>} />
      ) : (
        <div className="space-y-3">
          {applications.map((a) => (
            <div key={a.id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
              <div>
                <p className="font-medium text-slate-900">{a.property_name || "Property"}</p>
                <p className="text-xs text-slate-500">{a.unit_number || "Any unit"} · Submitted {a.submitted_date || "—"}</p>
              </div>
              <StatusBadge status={a.status} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}