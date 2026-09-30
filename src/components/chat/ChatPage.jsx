import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { PageHeader, EmptyState } from "@/components/ui-bits";
import { MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import ChatThread from "@/components/chat/ChatThread";

// Shared chat screen. role "tenant": their tenancies; role "landlord": tenancies they own.
export default function ChatPage({ role }) {
  const [me, setMe] = useState(null);
  const [tenancies, setTenancies] = useState(null);
  const [sel, setSel] = useState(null);

  useEffect(() => {
    (async () => {
      const u = await base44.auth.me();
      setMe(u);
      const q = role === "tenant" ? { tenant_user_id: u.id } : { owner_user_id: u.id };
      const list = (await base44.entities.Tenancy.filter(q, "-created_date", 200)).filter((t) => t.status !== "Archived");
      setTenancies(list);
      setSel(list[0] || null);
    })();
  }, [role]);

  if (!tenancies) return <div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-700" /></div>;
  return (
    <div>
      <PageHeader title="Messages" description={role === "tenant" ? "Chat with your landlord." : "Chat with your tenants."} />
      {tenancies.length === 0 ? <EmptyState icon={MessageSquare} title="No conversations yet" description="Chat opens once a tenancy is created." /> : (
        <div className="grid gap-4 md:grid-cols-[260px_1fr]">
          <div className="space-y-1.5">
            {tenancies.map((t) => (
              <button key={t.id} type="button" onClick={() => setSel(t)} className={cn("w-full rounded-lg border p-3 text-left text-sm", sel?.id === t.id ? "border-emerald-500 bg-emerald-50" : "border-slate-200 bg-white hover:border-emerald-300")}>
                <p className="font-medium text-slate-900">{role === "tenant" ? t.property_name : t.tenant_name}</p>
                <p className="text-xs text-slate-500">Unit {t.unit_number} · {t.status}</p>
              </button>
            ))}
          </div>
          {sel && me && <ChatThread key={sel.id} tenancy={sel} role={role} userId={me.id} />}
        </div>
      )}
    </div>
  );
}