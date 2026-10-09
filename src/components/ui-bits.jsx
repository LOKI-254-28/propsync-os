import React from "react";
import { cn } from "@/lib/utils";
import { STATUS_COLORS } from "@/lib/constants";
import { KES } from "@/lib/finance";

export function StatusBadge({ status, className }) {
  const color = STATUS_COLORS[status] || "slate";
  const map = {
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
    blue: "bg-blue-50 text-blue-700 border-blue-200",
    amber: "bg-amber-50 text-amber-700 border-amber-200",
    rose: "bg-rose-50 text-rose-700 border-rose-200",
    orange: "bg-orange-50 text-orange-700 border-orange-200",
    slate: "bg-slate-100 text-slate-600 border-slate-200",
  };
  return (
    <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border", map[color], className)}>
      {status}
    </span>
  );
}

export function Money({ amount, className }) {
  return <span className={className}>{KES(amount)}</span>;
}

export function StatCard({ label, value, sub, icon: Icon, accent = "emerald", trend }) {
  const accents = {
    emerald: "from-emerald-500/10 to-emerald-500/5 text-emerald-700",
    gold: "from-amber-500/10 to-amber-500/5 text-amber-700",
    rose: "from-rose-500/10 to-rose-500/5 text-rose-700",
    blue: "from-blue-500/10 to-blue-500/5 text-blue-700",
    slate: "from-slate-500/10 to-slate-500/5 text-slate-700",
  };
  return (
    <div className="account-stat rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="account-stat-label text-xs font-medium uppercase tracking-wider text-slate-500">{label}</p>
          <p className="account-stat-value mt-2 text-2xl font-semibold text-slate-900">{value}</p>
          {sub && <p className="mt-1 text-xs text-slate-500">{sub}</p>}
        </div>
        {Icon && (
          <div className={cn("account-stat-icon flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br", accents[accent])}>
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>
      {trend && <div className="mt-3 text-xs font-medium text-emerald-600">{trend}</div>}
    </div>
  );
}

export function PageHeader({ title, description, actions }) {
  return (
    <div className="account-page-header mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight text-slate-900">{title}</h1>
        {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
      </div>
      {actions && <div className="account-header-actions flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function SectionCard({ title, children, actions, className }) {
  return (
    <div className={cn("account-section rounded-xl border border-slate-200 bg-white shadow-sm", className)}>
      {title && (
        <div className="account-section-header flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
          <h3 className="font-medium text-slate-800">{title}</h3>
          {actions}
        </div>
      )}
      <div className="p-5">{children}</div>
    </div>
  );
}

export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="account-empty flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50/50 px-6 py-14 text-center">
      {Icon && <Icon className="mb-3 h-10 w-10 text-slate-400" />}
      <p className="font-medium text-slate-700">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-slate-500">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Field({ label, children, hint }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-slate-700">{label}</label>
      {children}
      {hint && <p className="text-xs text-slate-400">{hint}</p>}
    </div>
  );
}