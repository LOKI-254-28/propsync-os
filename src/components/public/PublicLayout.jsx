import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { Building2, Home } from "lucide-react";
import PublicFooter from '@/components/public/PublicFooter';
import '@/components/public/PublicFooter.css';

export default function PublicLayout({ children, home = false }) {
  const { isAuthenticated, user } = useAuth();
  const isAdmin = user?.role === "admin";
  const roleHome = isAdmin ? "/admin"
    : user?.account_type === "landowner" ? "/dashboard"
    : "/portal";

  return (
    <div className={home ? "urban-home" : "flex min-h-screen flex-col bg-white"}>
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white">
              {home ? <Home className="h-5 w-5" strokeWidth={1.8} /> : <Building2 className="h-5 w-5" />}
            </div>
            <span className="font-heading text-lg font-semibold text-slate-900">PropWiz</span>
          </Link>
          <nav className="flex w-full flex-wrap items-center justify-between gap-3 text-sm sm:w-auto sm:justify-end">
            <Link to="/listings" className="text-slate-600 hover:text-emerald-700">Browse</Link>
            <Link to="/the-propwiz-experience" className="text-muted-foreground hover:text-contact-forest">The PropWiz Experience</Link>
            <Link to="/contact" className="text-slate-600 hover:text-emerald-700">Contact</Link>
            {isAuthenticated ? (
              <Link to={roleHome} className="rounded-md bg-emerald-600 px-3 py-1.5 font-medium text-white hover:bg-emerald-700">
                Go to dashboard
              </Link>
            ) : (
              <>
                <Link to="/login" className="text-slate-600 hover:text-emerald-700">Log in</Link>
                <Link to="/register" className="rounded-md bg-emerald-600 px-3 py-1.5 font-medium text-white hover:bg-emerald-700">
                  Get started
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <PublicFooter />
    </div>
  );
}