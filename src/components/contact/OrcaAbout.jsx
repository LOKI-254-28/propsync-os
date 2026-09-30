import React from "react";
import { ClipboardCheck, Network, LineChart, Megaphone, Receipt, Lightbulb } from "lucide-react";

const SERVICES = [
  { icon: ClipboardCheck, title: "Systems and process audits", text: "We audit your systems and processes, and advise and structure systems for corporate or organizational restructure." },
  { icon: Network, title: "New business formation", text: "We set up businesses with top notch structures, systems and policies for the long-term survival of your business." },
  { icon: LineChart, title: "Market research and feasibility", text: "We research the market and advise on the feasibility of an intended business or business strategy." },
  { icon: Megaphone, title: "Marketing and media", text: "Marketing, branding, sales and new media / social media consultancy and management." },
  { icon: Receipt, title: "Tax advice", text: "Practical tax advice for your business." },
  { icon: Lightbulb, title: "Ideas on a massive scale", text: "We also produce ideas on a massive scale. Invest in us." },
];

export default function OrcaAbout() {
  return (
    <div>
      <p className="text-sm font-medium uppercase tracking-wider text-emerald-700">PropWiz is a product of Orca Fuso Consultancy</p>
      <h1 className="mt-2 font-heading text-3xl font-semibold text-slate-900">Contact us</h1>
      <p className="mt-4 text-slate-700">
        Orca Fuso Consult is a business set up, strategic management and idea cultivation and nurturing centre that breathes super life to your ideas and business.
        We basically provide all functions to nurture a business from its inception to its formation and lifetime as a juggernaut.
      </p>
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {SERVICES.map((s) => (
          <div key={s.title} className="rounded-xl border border-slate-200 bg-white p-4">
            <s.icon className="h-5 w-5 text-emerald-600" />
            <p className="mt-2 font-medium text-slate-900">{s.title}</p>
            <p className="text-sm text-slate-600">{s.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}