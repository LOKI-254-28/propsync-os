import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { PageHeader, SectionCard, StatusBadge, EmptyState } from "@/components/ui-bits";
import { normalizeUser } from "@/lib/normalizeUser";
import { isTestMode, getTestProfile, getTestApplications, getTestNotifications } from "@/lib/testProfile";
import { toast } from "@/components/ui/use-toast";
import {
  Home, Building2, Wrench, User, Search, FileText, Bell,
  Circle, ArrowRight, Loader2,
} from "lucide-react";

export default function GuestDashboard() {
  const testMode = isTestMode();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(!testMode);
  const [applications, setApplications] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [transitioning, setTransitioning] = useState("");

  useEffect(() => {
    if (testMode) {
      setUser(getTestProfile());
      setApplications(getTestApplications());
      setNotifications(getTestNotifications());
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const me = normalizeUser(await base44.auth.me());
        setUser(me);
        if (me) {
          const [apps, notifs] = await Promise.all([
            base44.entities.Application.filter({ tenant_user_id: me.id }).catch(() => []),
            base44.entities.Notification.filter({ recipient_user_id: me.id }).then((n) => n.filter((x) => !x.read)).catch(() => []),
          ]);
          setApplications(apps);
          setNotifications(notifs);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [testMode]);

  const profileCompletion = useMemo(() => {
    if (!user) return 0;
    const fields = ["full_name", "email", "phone", "address", "city", "country", "profile_image"];
    const filled = fields.filter((f) => user[f] && String(user[f]).trim()).length;
    return Math.round((filled / fields.length) * 100);
  }, [user]);

  const transition = async (type) => {
    if (testMode) {
      toast({ title: "Test Profile mode", description: "Role transitions aren't available in test mode. Register to continue." });
      return;
    }
    setTransitioning(type);
    try {
      if (type === "tenant") {
        await base44.auth.updateMe({ account_type: "client", operational_profiles: ["tenant"], approval_status: "pending" });
        window.location.href = "/portal";
      } else if (type === "landlord") {
        await base44.auth.updateMe({ account_type: "landowner", operational_profiles: ["landlord"], approval_status: "pending" });
        window.location.href = "/";
      } else if (type === "vendor") {
        await base44.auth.updateMe({ account_type: "landowner", operational_profiles: ["vendor"], approval_status: "pending" });
        window.location.href = "/";
      }
    } catch {
      setTransitioning("");
    }
  };

  if (loading) return <div className="flex h-96 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-700" /></div>;

  const missingFields = [
    { key: "full_name", label: "Name" },
    { key: "phone", label: "Phone" },
    { key: "address", label: "Address" },
    { key: "city", label: "City" },
    { key: "country", label: "Country" },
    { key: "profile_image", label: "Profile photo" },
  ].filter((f) => !user?.[f.key]);

  const p = testMode ? "/test-profile" : "/guest";

  return (
    <div>
      <PageHeader title={`Welcome, ${user?.full_name?.split(" ")[0] || "Test User"}`} description="Explore PropWiz and choose your path." />

      {testMode && (
        <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <strong>Test Profile mode:</strong> You're exploring a demo. No data is saved to the real system.
        </div>
      )}

      <div className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-700">Profile Completion</p>
            <p className="text-xs text-slate-500">{profileCompletion === 100 ? "Your profile is complete!" : "Complete your profile to get started."}</p>
          </div>
          <span className="text-2xl font-semibold text-emerald-700">{profileCompletion}%</span>
        </div>
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${profileCompletion}%` }} />
        </div>
        {missingFields.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {missingFields.map((f) => (
              <Link key={f.key} to={`${p}/profile`} className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs text-amber-700 hover:bg-amber-100">
                <Circle className="h-3 w-3" /> {f.label}
              </Link>
            ))}
          </div>
        )}
      </div>

      <SectionCard title="What would you like to do?" className="mb-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <RoleCard icon={Home} title="Become a Tenant" desc="Find a property and apply to rent." onClick={() => transition("tenant")} loading={transitioning === "tenant"} />
          <RoleCard icon={Building2} title="Become a Landlord" desc="List and manage your properties." onClick={() => transition("landlord")} loading={transitioning === "landlord"} />
          <RoleCard icon={Wrench} title="Become a Vendor" desc="Offer property services." onClick={() => transition("vendor")} loading={transitioning === "vendor"} />
        </div>
      </SectionCard>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <QuickLink to={`${p}/explore`} icon={Search} label="Explore Properties" />
        <QuickLink to={`${p}/applications`} icon={FileText} label="My Applications" />
        <QuickLink to={`${p}/profile`} icon={User} label="Edit Profile" />
        <QuickLink to={`${p}/notifications`} icon={Bell} label="Notifications" />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <SectionCard title="Recent Applications" actions={<Link to={`${p}/applications`} className="text-sm text-emerald-700 hover:underline">All →</Link>}>
          {applications.length === 0 ? <EmptyState icon={FileText} title="No applications yet" description="Explore properties and apply to get started." action={<Link to={`${p}/explore`} className="text-emerald-700 hover:underline">Explore properties →</Link>} /> : (
            <div className="space-y-2">
              {applications.slice(0, 4).map((a) => (
                <div key={a.id} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2">
                  <div><p className="text-sm font-medium text-slate-800">{a.property_name || "Property"}</p><p className="text-xs text-slate-500">{a.unit_number || ""} · {a.submitted_date || ""}</p></div>
                  <StatusBadge status={a.status} />
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard title="Notifications" actions={<Link to={`${p}/notifications`} className="text-sm text-emerald-700 hover:underline">All →</Link>}>
          {notifications.length === 0 ? <EmptyState icon={Bell} title="No notifications" /> : (
            <div className="space-y-2">
              {notifications.slice(0, 4).map((n) => (
                <div key={n.id} className="rounded-lg border border-slate-100 px-3 py-2">
                  <p className="text-sm font-medium text-slate-800">{n.title || n.subject || "Notification"}</p>
                  <p className="text-xs text-slate-500">{n.created_date ? new Date(n.created_date).toLocaleDateString() : ""}</p>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}

function RoleCard({ icon: Icon, title, desc, onClick, loading }) {
  return (
    <button onClick={onClick} disabled={loading} className="flex flex-col items-start gap-2 rounded-xl border-2 border-slate-200 p-5 text-left transition-colors hover:border-emerald-400 hover:bg-emerald-50/40 disabled:opacity-50">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700"><Icon className="h-5 w-5" /></div>
      <p className="font-semibold text-slate-900">{title}</p>
      <p className="text-xs text-slate-500">{desc}</p>
      <div className="mt-1">{loading ? <Loader2 className="h-4 w-4 animate-spin text-emerald-600" /> : <ArrowRight className="h-4 w-4 text-emerald-600" />}</div>
    </button>
  );
}

function QuickLink({ to, icon: Icon, label }) {
  return (
    <Link to={to} className="flex flex-col items-center gap-2 rounded-xl border border-slate-200 bg-white py-5 hover:border-emerald-300 hover:bg-emerald-50/40">
      <Icon className="h-5 w-5 text-emerald-600" />
      <span className="text-sm font-medium text-slate-700">{label}</span>
    </Link>
  );
}