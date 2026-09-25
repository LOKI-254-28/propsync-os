import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { PageHeader, SectionCard, StatusBadge, EmptyState } from "@/components/ui-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Users, Search, ShieldCheck, UserCheck, UserX, Clock } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const all = await base44.entities.User.list("-created_date", 500);
      setUsers(all);
    } catch (e) {
      console.error("[UserManagement load error]", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    return users.filter((u) => {
      const q = search.toLowerCase();
      const matchesSearch = !q || (u.email || "").toLowerCase().includes(q) || (u.full_name || "").toLowerCase().includes(q);
      const matchesFilter = filter === "all" || u.account_type === filter || (filter === "admin" && u.role === "admin");
      return matchesSearch && matchesFilter;
    });
  }, [users, search, filter]);

  const approve = async (userId) => {
    setBusy(true);
    try {
      await base44.functions.invoke("approveUser", { userId, status: "approved" });
      toast({ title: "User approved", description: "The user can now access the platform." });
      load();
    } catch (e) {
      toast({ title: "Error", description: e.message || "Could not approve user.", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const reject = async (userId) => {
    setBusy(true);
    try {
      await base44.functions.invoke("approveUser", { userId, status: "rejected" });
      toast({ title: "User rejected", description: "The user has been notified." });
      load();
    } catch (e) {
      toast({ title: "Error", description: e.message || "Could not reject user.", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <div className="flex h-96 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-700" /></div>;

  const counts = {
    all: users.length,
    landowner: users.filter((u) => u.account_type === "landowner").length,
    client: users.filter((u) => u.account_type === "client").length,
    admin: users.filter((u) => u.account_type === "admin" || u.role === "admin").length,
    pending: users.filter((u) => u.approval_status === "pending").length,
  };

  return (
    <div>
      <PageHeader title="User Management" description="All platform users — landowners, clients, and administrators." />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name or email..." className="pl-9" />
        </div>
        <div className="flex flex-wrap gap-2">
          {[
            { key: "all", label: `All (${counts.all})` },
            { key: "landowner", label: `Landowners (${counts.landowner})` },
            { key: "client", label: `Clients (${counts.client})` },
            { key: "admin", label: `Admins (${counts.admin})` },
            { key: "pending", label: `Pending (${counts.pending})` },
          ].map((f) => (
            <Button key={f.key} size="sm" variant={filter === f.key ? "default" : "outline"} onClick={() => setFilter(f.key)} className={filter === f.key ? "bg-emerald-600 hover:bg-emerald-700" : ""}>
              {f.label}
            </Button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Users} title="No users found" description="Try adjusting your search or filter." />
      ) : (
        <SectionCard>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-slate-100 text-left text-xs uppercase text-slate-500">
                <th className="pb-2 font-medium">User</th><th className="pb-2 font-medium">Account Type</th>
                <th className="pb-2 font-medium">Approval Status</th><th className="pb-2 font-medium">Joined</th>
                <th className="pb-2 text-right font-medium">Actions</th>
              </tr></thead>
              <tbody>
                {filtered.map((u) => (
                  <tr key={u.id} className="border-b border-slate-50">
                    <td className="py-3">
                      <p className="font-medium text-slate-900">{u.full_name || "—"}</p>
                      <p className="text-xs text-slate-500">{u.email}</p>
                    </td>
                    <td className="py-3">
                      <span className="inline-flex items-center gap-1.5 text-slate-700">
                        {u.account_type === "admin" || u.role === "admin" ? <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" /> : <Users className="h-3.5 w-3.5 text-slate-400" />}
                        {u.account_type || u.role || "—"}
                      </span>
                    </td>
                    <td className="py-3">
                      {u.approval_status ? <StatusBadge status={u.approval_status === "approved" ? "Approved" : u.approval_status === "pending" ? "Pending" : "Rejected"} /> : <StatusBadge status="Active" />}
                    </td>
                    <td className="py-3 text-slate-600">{u.created_date ? new Date(u.created_date).toLocaleDateString() : "—"}</td>
                    <td className="py-3 text-right">
                      {u.approval_status === "pending" && (
                        <div className="flex justify-end gap-1.5">
                          <Button size="sm" variant="outline" className="h-7 border-rose-200 text-rose-700 hover:bg-rose-50" onClick={() => reject(u.id)} disabled={busy}><UserX className="mr-1 h-3 w-3" />Reject</Button>
                          <Button size="sm" className="h-7 bg-emerald-600 hover:bg-emerald-700" onClick={() => approve(u.id)} disabled={busy}><UserCheck className="mr-1 h-3 w-3" />Approve</Button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}
    </div>
  );
}