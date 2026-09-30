import React from "react";
import { Link } from "react-router-dom";
import PublicLayout from "@/components/public/PublicLayout";
import { Search, CalendarClock, FileSignature, Wallet, KeyRound } from "lucide-react";

const STEPS = [
  { icon: Search, title: "Browse and select a unit", text: "Explore properties, photos, maps and reviews, then select the unit you like." },
  { icon: CalendarClock, title: "Visit or skip the visit", text: "Schedule a site visit with the landlord, or skip it and go straight to review." },
  { icon: FileSignature, title: "Sign the agreement", text: "The landlord sends the tenancy agreement. Download it, sign it and upload it back." },
  { icon: Wallet, title: "Pay your deposit and rent", text: "Add your next of kin, then pay by M-Pesa or bank transfer." },
  { icon: KeyRound, title: "Move in", text: "Once the landlord verifies payment, your tenancy starts and you manage rent, maintenance and notices from your portal." },
];

export default function HowItWorks() {
  return (
    <PublicLayout>
      <div className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="font-heading text-3xl font-semibold text-slate-900">How it works</h1>
        <ol className="mt-8 space-y-4">
          {STEPS.map((s, i) => (
            <li key={s.title} className="flex gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700"><s.icon className="h-5 w-5" /></div>
              <div><p className="font-medium text-slate-900">{i + 1}. {s.title}</p><p className="text-sm text-slate-600">{s.text}</p></div>
            </li>
          ))}
        </ol>
        <Link to="/listings" className="mt-8 inline-block rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700">Browse listings</Link>
      </div>
    </PublicLayout>
  );
}