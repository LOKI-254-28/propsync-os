import React from "react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Home, Building2, Wrench, FlaskConical, ArrowLeft, Check, Leaf } from "lucide-react";

const ROLES = [
  {
    icon: Home,
    title: "Tenant",
    color: "amber",
    points: [
      "Browse available properties and units",
      "Submit rental applications online",
      "Pay rent and track payment history",
      "Report maintenance issues with photos",
      "Schedule and track inspections",
      "Communicate with your landlord",
    ],
  },
  {
    icon: Building2,
    title: "Landlord / Landowner",
    color: "emerald",
    points: [
      "List properties and manage units",
      "Screen tenant applications",
      "Generate rent charges and track payments",
      "Manage maintenance and assign vendors",
      "Issue notices and schedule inspections",
      "View portfolio financial reports",
    ],
  },
  {
    icon: Wrench,
    title: "Vendor",
    color: "blue",
    points: [
      "Receive maintenance work orders",
      "Track job status and update progress",
      "Record costs and completion notes",
      "Coordinate with landlords",
    ],
  },
  {
    icon: FlaskConical,
    title: "Test Profile",
    color: "slate",
    points: [
      "Explore the platform without an account",
      "Browse properties and try the dashboard",
      "No data is saved — it's a safe sandbox",
      "Register when you're ready to go live",
    ],
  },
];

const COLOR_MAP = {
  amber: { bg: "bg-amber-100", text: "text-amber-700" },
  emerald: { bg: "bg-emerald-100", text: "text-emerald-700" },
  blue: { bg: "bg-blue-100", text: "text-blue-700" },
  slate: { bg: "bg-slate-100", text: "text-slate-700" },
};

export default function HowItWorks() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-700 text-white"><Leaf className="h-4 w-4" /></div>
            <span className="font-heading text-lg font-semibold text-slate-900">Verdant Estates</span>
          </div>
          <Link to="/login" className="text-sm font-medium text-emerald-700 hover:underline">Login →</Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-12">
        <div className="text-center">
          <h1 className="font-heading text-3xl font-bold text-slate-900 sm:text-4xl">How PropWiz Works</h1>
          <p className="mt-3 text-lg text-slate-600">A property management platform for everyone. Choose your role to get started.</p>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2">
          {ROLES.map((role) => {
            const Icon = role.icon;
            return (
              <div key={role.title} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className={cn("flex h-11 w-11 items-center justify-center rounded-xl", COLOR_MAP[role.color].bg)}>
                    <Icon className={cn("h-5 w-5", COLOR_MAP[role.color].text)} />
                  </div>
                  <h2 className="font-heading text-xl font-semibold text-slate-900">{role.title}</h2>
                </div>
                <ul className="mt-4 space-y-2">
                  {role.points.map((p) => (
                    <li key={p} className="flex items-start gap-2 text-sm text-slate-600">
                      <Check className={cn("mt-0.5 h-4 w-4 shrink-0", COLOR_MAP[role.color].text)} />
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link to="/register" className="inline-flex h-11 items-center justify-center rounded-lg bg-emerald-600 px-6 text-sm font-medium text-white hover:bg-emerald-700">Create an account</Link>
          <Link to="/login" className="inline-flex h-11 items-center justify-center rounded-lg border border-slate-200 px-6 text-sm font-medium text-slate-700 hover:bg-slate-50">Log in</Link>
        </div>

        <div className="mt-6 text-center">
          <Link to="/login" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to login
          </Link>
        </div>
      </main>
    </div>
  );
}