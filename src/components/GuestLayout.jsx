import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { GUEST_NAV } from "@/lib/constants";
import { cn } from "@/lib/utils";
import {
  Leaf, LogOut, Menu,
  LayoutDashboard, Search, FileText, User, Bell, Circle,
} from "lucide-react";
import { normalizeUser } from "@/lib/normalizeUser";

const ICONS = { LayoutDashboard, Search, FileText, User, Bell };

export default function GuestLayout({ children }) {
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [unread, setUnread] = useState(0);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    base44.auth.me().then((raw) => setUser(normalizeUser(raw))).catch(() => {});
  }, []);

  useEffect(() => {
    if (!user) return;
    base44.entities.Notification.filter({ recipient_user_id: user.id }).then((n) => setUnread(n.filter((x) => !x.read).length)).catch(() => {});
  }, [user, location.pathname]);

  const handleLogout = async () => {
    await base44.auth.logout();
    window.location.href = "/login";
  };

  const NavItem = ({ item }) => {
    const Icon = ICONS[item.icon] || Circle;
    const active = location.pathname === item.path;
    const showBadge = item.label === "Notifications" && unread > 0;
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
            <p className="text-[10px] uppercase tracking-wider text-emerald-200/70">Guest Portal</p>
          </div>
        </div>
        <nav className="flex h-[calc(100vh-180px)] flex-col gap-0.5 overflow-y-auto pr-1">
          {GUEST_NAV.map((item) => <NavItem key={item.path} item={item} />)}
        </nav>
        <div className="absolute bottom-0 left-0 right-0 border-t border-emerald-700/50 px-3 py-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-600 text-xs font-semibold text-white">{user?.full_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || "G"}</div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-white">{user?.full_name || user?.email || "Guest"}</p>
              <p className="text-[10px] text-emerald-200/70">Guest</p>
            </div>
            <button onClick={handleLogout} className="rounded-md p-1.5 text-emerald-200/70 hover:bg-emerald-700 hover:text-white" title="Sign out"><LogOut className="h-4 w-4" /></button>
          </div>
        </div>
      </aside>
      {mobileOpen && <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={() => setMobileOpen(false)} />}
      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200 bg-white/80 px-4 py-3 backdrop-blur lg:px-8">
          <button className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden" onClick={() => setMobileOpen(true)}><Menu className="h-5 w-5" /></button>
          <div className="hidden text-sm text-slate-500 lg:block">Welcome, {user?.full_name?.split(" ")[0] || "Guest"}</div>
          <span className="hidden rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700 lg:inline-block">Guest</span>
        </header>
        <main className="px-4 py-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}