import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { KES } from "@/lib/finance";
import { SectionCard, StatusBadge, EmptyState } from "@/components/ui-bits";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ShieldCheck, UserCheck, UserX, Clock, Building2, DoorOpen, Users, FileText, ScrollText, Banknote, Loader2 } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

export default function AdminApprovalSection() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reviewUser, setReviewUser] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [stats, setStats] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const [allUsers, properties, units, tenancies, listings, applications, leases, sales] = await Promise.all([
        base44.entities.User.list("-created_date", 500),
        base44.entities.Property.list("-created_date", 500),
        base44.entities.Unit.list("-created_date", 500),
        base44.entities.Tenancy.list("-created_date", 500),
        base44.entities.Listing.list("-created_date", 500),
        base44.entities.Application.list("-created_date", 500),
        base44.entities.Lease.list("-created_date", 500),
        base44.entities.SaleTransaction.list("-created_date", 500),
      ]);
      setUsers(allUsers);
      setStats({
        totalUsers: allUsers.length,
        pendingUsers: allUsers.filter((u) => u.approval_status === "pending").length,
        properties: properties.length,
        units: units.length,
        listings: listings.length,
        applications: applications.length,
        activeTenancies: tenancies.filter((t) => ["Active", "Expiring Soon", "Notice Given"].includes(t.status)).length,
        leases: leases.length,
        sales: sales.length,
      });
    } catch (e) {
      console.error("[Admin load error]", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const pendingLandowners = users.filter((u) => u.account_type === "landowner" && u.approval_status === "pending");
  const pendingClients = users.filter((u) => u.account_type === "client" && u.approval_status === "pending");

  const approve = async (userId) => {
    setBusy(true);
    try {
      await base44.functions.invoke("approveUser", { userId, status: "approved" });
      toast({ title: "User approved", description: "The user can now access the platform." });
      setReviewUser(null);
      load();
    } catch (e) {
      toast({ title: "Error", description: e.message || "Could not approve user.", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const reject = async () => {
    if (!reviewUser) return;
    setBusy(true);
    try {
      await base44.functions.invoke("approveUser", { userId: reviewUser.id, status: "rejected", reason: rejectReason });
      toast({ title: "User rejected", description: "The user has been notified." });
      setReviewUser(null);
      setRejectReason("");
      load();
    } catch (e) {
      toast({ title: "Error", description: e.message || "Could not reject user.", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <div className="flex h-32 items-center justify-center"><div className="h-6 w-6 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-700" /></div>;

  return (
    <div className="space-y-6">
      {/* Platform Overview */}
      {stats && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
          <OverviewStat icon={Users} label="Users" value={stats.totalUsers} />
          <OverviewStat icon={Clock} label="Pending" value={stats.pendingUsers} accent="amber" />
          <OverviewStat icon={Building2} label="Properties" value={stats.properties} />
          <OverviewStat icon={DoorOpen} label="Units" value={stats.units} />
          <OverviewStat icon={FileText} label="Listings" value={stats.listings} />
          <OverviewStat icon={ScrollText} label="Tenancies" value={stats.activeTenancies} />
          <OverviewStat icon={ShieldCheck} label="Leases" value={stats.leases} />
          <OverviewStat icon={Banknote} label="Sales" value={stats.sales} />
        </div>
      )}

      {/* Pending Landowner Applications */}
      <SectionCard title="Pending Landowner Applications" actions={<span className="text-xs text-slate-500">{pendingLandowners.length} pending</span>}>
        {pendingLandowners.length === 0 ? (
          <p className="text-sm text-slate-500">No pending landowner applications.</p>
        ) : (
          <div className="space-y-2">
            {pendingLandowners.map((u) => (
              <div key={u.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-100 px-4 py-3">
                <div>
                  <p className="font-medium text-slate-900">{u.full_name || u.email}</p>
                  <p className="text-xs text-slate-500">{u.email} · {(u.operational_profiles || []).join(", ") || "No profiles"}</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="h-8 border-rose-200 text-rose-700 hover:bg-rose-50" onClick={() => { setReviewUser(u); setRejectReason(""); }}>Review</Button>
                  <Button size="sm" className="h-8 bg-emerald-600 hover:bg-emerald-700" onClick={() => approve(u.id)} disabled={busy}><UserCheck className="mr-1 h-3.5 w-3.5" />Approve</Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {/* Pending Client Applications */}
      <SectionCard title="Pending Client Applications" actions={<span className="text-xs text-slate-500">{pendingClients.length} pending</span>}>
        {pendingClients.length === 0 ? (
          <p className="text-sm text-slate-500">No pending client applications.</p>
        ) : (
          <div className="space-y-2">
            {pendingClients.map((u) => (
              <div key={u.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-100 px-4 py-3">
                <div>
                  <p className="font-medium text-slate-900">{u.full_name || u.email}</p>
                  <p className="text-xs text-slate-500">{u.email} · {(u.operational_profiles || []).join(", ") || "No profiles"}</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="h-8 border-rose-200 text-rose-700 hover:bg-rose-50" onClick={() => { setReviewUser(u); setRejectReason(""); }}>Review</Button>
                  <Button size="sm" className="h-8 bg-emerald-600 hover:bg-emerald-700" onClick={() => approve(u.id)} disabled={busy}><UserCheck className="mr-1 h-3.5 w-3.5" />Approve</Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {/* Reject dialog */}
      <Dialog open={!!reviewUser} onOpenChange={() => setReviewUser(null)}>
        <DialogContent className="max-w-md">
          {reviewUser && (
            <>
              <DialogHeader><DialogTitle>Review Application — {reviewUser.full_name || reviewUser.email}</DialogTitle></DialogHeader>
              <div className="space-y-3 py-2">
                <div className="rounded-lg bg-slate-50 p-3 text-sm">
                  <p className="font-medium text-slate-800">{reviewUser.email}</p>
                  <p className="text-xs text-slate-500">Account type: {reviewUser.account_type}</p>
                  <p className="text-xs text-slate-500">Profiles: {(reviewUser.operational_profiles || []).join(", ") || "None"}</p>
                  <p className="text-xs text-slate-500">Status: {reviewUser.approval_status}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Rejection reason (optional)</label>
                  <Textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} rows={3} placeholder="Reason for rejection..." className="mt-1.5" />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => approve(reviewUser.id)} disabled={busy} className="border-emerald-200 text-emerald-700 hover:bg-emerald-50">
                  {busy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <UserCheck className="mr-1.5 h-4 w-4" />}
                  Approve
                </Button>
                <Button onClick={reject} disabled={busy} className="bg-rose-600 hover:bg-rose-700">
                  {busy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <UserX className="mr-1.5 h-4 w-4" />}
                  Reject
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function OverviewStat({ icon: Icon, label, value, accent = "emerald" }) {
  const accents = {
    emerald: "text-emerald-700 bg-emerald-50",
    amber: "text-amber-700 bg-amber-50",
    blue: "text-blue-700 bg-blue-50",
    slate: "text-slate-700 bg-slate-100",
  };
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex items-center gap-2">
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${accents[accent]}`}><Icon className="h-4 w-4" /></div>
        <div>
          <p className="text-lg font-semibold text-slate-900">{value}</p>
          <p className="text-[10px] uppercase tracking-wider text-slate-500">{label}</p>
        </div>
      </div>
    </div>
  );
}