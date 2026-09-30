import React, { useState } from "react";
import { Link } from "react-router-dom";
import PublicLayout from "@/components/public/PublicLayout";
import { cn } from "@/lib/utils";
import {
  Search, CalendarClock, FileSignature, Wallet, KeyRound, Building2, Users, UserCheck,
  BarChart3, Wrench, ShieldCheck, Bell, Clock, TrendingUp, Check,
} from "lucide-react";

const TENANT_STEPS = [
  { icon: Search, title: "Browse and select a unit", text: "Explore properties with photos, maps and reviews, then select the unit you like." },
  { icon: CalendarClock, title: "Visit or skip the visit", text: "Schedule a site visit with the landlord, or skip it and go straight to review." },
  { icon: FileSignature, title: "Sign the agreement", text: "The landlord sends the tenancy agreement. Download it, sign it and upload it back." },
  { icon: Wallet, title: "Pay your deposit and rent", text: "Add your next of kin, then pay by M-Pesa or bank transfer." },
  { icon: KeyRound, title: "Move in and manage", text: "Once payment is verified your tenancy starts. Pay rent, report repairs and read notices from your portal." },
];

const LANDLORD_STEPS = [
  { icon: Building2, title: "Add your properties and units", text: "Create properties with photos, map location and amenities, then add units individually or in bulk." },
  { icon: Users, title: "Receive bookings", text: "Tenants select your units online and book them. Vacant units and units with a confirmed exit are bookable." },
  { icon: CalendarClock, title: "Confirm visits and decide", text: "Accept or reschedule site visits, then Proceed with the tenant or Terminate the application." },
  { icon: FileSignature, title: "Issue the agreement", text: "Upload the tenancy agreement, receive the signed copy back, and request the deposit and first rent." },
  { icon: Wallet, title: "Verify payment and start the tenancy", text: "Confirm the M-Pesa or bank payment. The tenancy, rent charges and ledger are created for you." },
  { icon: Wrench, title: "Run the property day to day", text: "Track rent and arrears, handle maintenance with contractors, schedule inspections, issue notices and record expenses." },
];

const BENEFITS = [
  { icon: Clock, title: "Save hours every month", text: "Rent charges are generated automatically and payments are allocated to the right month." },
  { icon: TrendingUp, title: "Know where you stand", text: "Dashboards and reports come from your real payment and expense records, not estimates." },
  { icon: UserCheck, title: "Fewer bad tenants, fewer vacancies", text: "Applications, ID details, next of kin and signed agreements are captured before anyone moves in." },
  { icon: Bell, title: "Nothing slips through", text: "Rent reminders, arrears alerts and notifications keep you and your tenants on the same page." },
  { icon: ShieldCheck, title: "Your data stays yours", text: "Each landlord only sees their own properties, tenants and money. Documents are stored privately." },
  { icon: BarChart3, title: "Grow with confidence", text: "Compare properties, watch occupancy and see profit per property as your portfolio grows." },
];

function Steps({ steps }) {
  return (
    <ol className="space-y-3">
      {steps.map((s, i) => (
        <li key={s.title} className="flex gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700"><s.icon className="h-5 w-5" /></div>
          <div><p className="font-medium text-slate-900">{i + 1}. {s.title}</p><p className="text-sm text-slate-600">{s.text}</p></div>
        </li>
      ))}
    </ol>
  );
}

export default function HowItWorks() {
  const [tab, setTab] = useState("tenant");
  return (
    <PublicLayout>
      <div className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="font-heading text-3xl font-semibold text-slate-900">How it works</h1>
        <p className="mt-2 text-slate-600">One system for finding a home and for running rental properties.</p>
        <div className="mt-6 inline-flex rounded-lg bg-slate-100 p-1">
          {[["tenant", "I'm a tenant"], ["landlord", "I'm a landlord"]].map(([k, l]) => (
            <button key={k} type="button" onClick={() => setTab(k)} className={cn("rounded-md px-4 py-1.5 text-sm font-medium", tab === k ? "bg-white text-emerald-700 shadow-sm" : "text-slate-600")}>{l}</button>
          ))}
        </div>
        <div className="mt-6"><Steps steps={tab === "tenant" ? TENANT_STEPS : LANDLORD_STEPS} /></div>

        <h2 className="mt-12 font-heading text-2xl font-semibold text-slate-900">{tab === "tenant" ? "Why tenants like it" : "What landlords gain"}</h2>
        {tab === "tenant" ? (
          <ul className="mt-4 space-y-2 text-sm text-slate-700">
            {["See real photos, maps, ratings and live availability before you commit", "Book online and skip the back-and-forth", "Pay by M-Pesa or bank and get it recorded instantly", "Report repairs and track progress in one place", "Keep your agreement, receipts and notices safe in your portal"].map((t) => (
              <li key={t} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />{t}</li>
            ))}
          </ul>
        ) : (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {BENEFITS.map((b) => (
              <div key={b.title} className="rounded-xl border border-slate-200 bg-white p-4">
                <b.icon className="h-5 w-5 text-emerald-600" />
                <p className="mt-2 font-medium text-slate-900">{b.title}</p>
                <p className="text-sm text-slate-600">{b.text}</p>
              </div>
            ))}
          </div>
        )}
        <div className="mt-10 flex gap-3">
          <Link to="/listings" className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700">Browse listings</Link>
          <Link to="/register" className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Create an account</Link>
        </div>
      </div>
    </PublicLayout>
  );
}