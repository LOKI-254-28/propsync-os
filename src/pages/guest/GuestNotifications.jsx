import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { PageHeader, EmptyState } from "@/components/ui-bits";
import { normalizeUser } from "@/lib/normalizeUser";
import { isTestMode, getTestNotifications } from "@/lib/testProfile";
import { Bell } from "lucide-react";

export default function GuestNotifications() {
  const testMode = isTestMode();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(!testMode);

  useEffect(() => {
    if (testMode) {
      setNotifications(getTestNotifications());
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const me = normalizeUser(await base44.auth.me());
        if (me) {
          const n = await base44.entities.Notification.filter({ recipient_user_id: me.id });
          setNotifications(n.sort((a, b) => new Date(b.created_date) - new Date(a.created_date)));
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [testMode]);

  if (loading) return <div className="flex h-96 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-700" /></div>;

  return (
    <div>
      <PageHeader title="Notifications" description="Stay updated on your account activity." />
      {notifications.length === 0 ? (
        <EmptyState icon={Bell} title="No notifications" description="You'll see updates here when there's activity on your account." />
      ) : (
        <div className="space-y-3">
          {notifications.map((n) => (
            <div key={n.id} className="rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium text-slate-900">{n.title || n.subject || "Notification"}</p>
                  {n.body || n.message ? <p className="mt-1 text-sm text-slate-600">{n.body || n.message}</p> : null}
                </div>
                <span className="text-xs text-slate-400">{n.created_date ? new Date(n.created_date).toLocaleDateString() : ""}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}