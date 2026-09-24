import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { TENANT_NAV } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Leaf, LogOut, Menu, UserX, Clock,
  LayoutDashboard, DoorOpen, FileText, ScrollText, Wallet, Wrench,
  ClipboardCheck, Bell, FolderOpen, MessageSquare, User, Circle,
} from "lucide-react";

const ICONS = {
  LayoutDashboard, DoorOpen, FileText, ScrollText, Wallet, Wrench,
  ClipboardCheck, Bell, FolderOpen, MessageSquare, LogOut: LogOut, User, Circle,
};

export default function TenantLayout({ children }) {
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [tenant, setTenant] = useState(null);
  const [notLinked, setNotLinked] = useState(false);
  const [pendingApproval, setPendingApproval] = useState(false);
  const [unread, setUnread] = useState(0);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    base44.auth.me().then(async (u) => {
      setUser(u);
      if (!u) return;
      if (u.account_type === "client" && u.approval_status === "pending") {
        setPendingApproval(true);
        return;
      }
      setPendingApproval(false);
      if (u.account_type === "client" || (!u.account_type && u.role !== "admin")) {
        try {
          const res = await base44.functions.invoke("linkTenant", {});
          if (res.data?.notFound) {
            setNotLinked(true);
            return;
          }
        } catch (e) {}
      }
      const t = await base44.entities.Tenant.filter({ user_id: u.id }).then((r) => r[0]);
      setTenant(t);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!user || notLinked) return;
    base44.entities.Notification.filter({ recipient_user_id: user.id }).then((n) => setUnread(n.filter((x) => !x.read).length)).catch(() => {});
  }, [user, location.pathname, notLinked]);

  const handleLogout = async () => {
    await base44.auth.logout();
    window.location.href = "/login";
  };

  if (pendingApproval) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="max-w-md rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100">
            <Clock className="h-7 w-7 text-amber-600" />
          </div>
          <h2 className="font-heading text-xl font-semibold text-slate-900">Awaiting approval</h2>
          <p className="mt-2 text-sm text-slate-600">
            Your application has been submitted. Your landlord will review it and approve your account. You'll get access to the tenant portal once approved. Please check back soon.
          </p>
          <Button onClick={handleLogout} variant="outline" className="mt-5">Sign out</Button>
        </div>
      </div>
    );
  }

  if (notLinked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="max-w-md rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100">
            <UserX className="h-7 w-7 text-amber-600" />
          </div>
          <h2 className="font-heading text-xl font-semibold text-slate-900">Your profile isn't ready yet</h2>
          <p className="mt-2 text-sm text-slate-600">
            Your landlord hasn't linked your account to a tenant profile. Once they do, you'll see your tenancy, rent, and documents here. Please contact your landlord to complete setup.
          </p>
          <Button onClick={handleLogout} variant="outline" className="mt-5">Sign out</Button>
        </div>
      </div>
    );
  }

  const NavItem = ({ item }) => {
    const Icon = ICONS[item.icon] || Circle;
    const active = location.pathname === item.path;
    const showBadge = item.label === "Notices" && unread > 0;
    return (
      <Link to={item.path} onClick={() => setMobileOpen(false)}
        className={cn("group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
          active ? "bg-emerald-600 text-white shadow-sm" : "text-emerald-50/80 hover:bg-emerald-700/60 hover:text-white")}>
        <Icon style={{ width: 18, height: 18 }} className={active ? "text-white" : "text-emerald-200/70 group-hover:text-white"} />
        <span className="flex-1">{item.label}</span>
        {showBadge && <span className="rounded-full bg-amber-400 px-1.5 py-0.5 text-[10px] font-bold text-emerald-900">{unread}</span>}
      </Link>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <aside className={cn("fixed inset-y-0 left-0 z-40 w-64 transform bg-gradient-to-b from-emerald-800 to-emerald-950 px-3 py-4 transition-transform lg:translate-x-0", mobileOpen ? "translate-x-0" : "-translate-x-full")}>
        <div className="mb-6 flex items-center gap-2.5 px-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-400 text-emerald-900"><Leaf className="h-5 w-5" /></div>
          <div>
            <p className="font-heading text-sm font-semibold text-white">Verdant Estates</p>
            <p className="text-[10px] uppercase tracking-wider text-emerald-200/70">Client Portal</p>
          </div>
        </div>
        <nav className="flex h-[calc(100vh-180px)] flex-col gap-0.5 overflow-y-auto pr-1">
          {TENANT_NAV.map((item) => <NavItem key={item.path} item={item} />)}
        </nav>
        <div className="absolute bottom-0 left-0 right-0 border-t border-emerald-700/50 px-3 py-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-600 text-xs font-semibold text-white">{tenant?.full_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || "T"}</div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-white">{tenant?.full_name || user?.email || "Tenant"}</p>
              <p className="text-[10px] text-emerald-200/70">Client</p>
            </div>
            <button onClick={handleLogout} className="rounded-md p-1.5 text-emerald-200/70 hover:bg-emerald-700 hover:text-white" title="Sign out"><LogOut className="h-4 w-4" /></button>
          </div>
        </div>
      </aside>
      {mobileOpen && <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={() => setMobileOpen(false)} />}
      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200 bg-white/80 px-4 py-3 backdrop-blur lg:px-8">
          <button className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden" onClick={() => setMobileOpen(true)}><Menu className="h-5 w-5" /></button>
          <div className="hidden text-sm text-slate-500 lg:block">Welcome back, {tenant?.full_name?.split(" ")[0] || "Tenant"}</div>
          <span className="hidden rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700 lg:inline-block">Client</span>
        </header>
        <main className="px-4 py-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}