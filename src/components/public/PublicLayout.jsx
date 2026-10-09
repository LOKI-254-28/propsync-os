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
    <div className={`public-site font-body ${home ? "urban-home" : "flex min-h-screen flex-col bg-background text-foreground"}`}>
      <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur">
        <div className="page-container flex flex-wrap items-center justify-between gap-3 py-3">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              {home ? <Home className="h-5 w-5" strokeWidth={1.8} /> : <Building2 className="h-5 w-5" />}
            </div>
            <span className="font-heading text-lg font-semibold text-foreground">PropWiz</span>
          </Link>
          <nav className="flex w-full flex-wrap items-center justify-between gap-3 text-sm sm:w-auto sm:justify-end">
            <Link to="/" className="text-muted-foreground hover:text-primary">Home</Link>
            <Link to="/listings" className="text-muted-foreground hover:text-primary">Browse</Link>
            <Link to="/the-propwiz-experience" className="text-muted-foreground hover:text-contact-forest">The PropWiz Experience</Link>
            <Link to="/contact" className="text-muted-foreground hover:text-primary">Contact</Link>
            {isAuthenticated ? (
              <Link to={roleHome} className="rounded-md bg-primary px-3 py-1.5 font-medium text-primary-foreground hover:bg-primary/90">
                Go to dashboard
              </Link>
            ) : (
              <>
                <Link to="/login" className="text-muted-foreground hover:text-primary">Log in</Link>
                <Link to="/register" className="rounded-md bg-primary px-3 py-1.5 font-medium text-primary-foreground hover:bg-primary/90">
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