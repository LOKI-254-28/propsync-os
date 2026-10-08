import React from "react";
import { ClipboardCheck, Network, LineChart, Megaphone, Receipt, Lightbulb, ArrowUpRight } from "lucide-react";
import { Button } from '@/components/ui/button';

const SERVICES = [
  { icon: ClipboardCheck, title: 'Systems and process audits', text: 'Find what works, identify what needs to change, and build clearer systems and processes.' },
  { icon: Network, title: 'New business formation', text: 'Start with the structures, systems and policies your business needs to grow.' },
  { icon: LineChart, title: 'Market research and feasibility', text: 'Understand your market and assess an idea or strategy before taking the next step.' },
  { icon: Megaphone, title: 'Marketing and media', text: 'Connect branding, sales and social media with your business goals.' },
  { icon: Receipt, title: 'Tax advice', text: 'Get practical tax guidance for your business.' },
  { icon: Lightbulb, title: 'Idea development', text: 'Give your ideas direction, structure and a practical path forward.' },
];

export default function OrcaAbout() {
  return (
    <>
      <section className="bg-contact-forest text-contact-cream">
        <div className="page-container py-12 sm:py-16">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-contact-soft/25 pb-6">
            <p className="font-heading text-xl font-semibold tracking-tight">Orca Fuso <span className="ml-2 text-sm font-normal text-contact-soft">Consultancy</span></p>
            <p className="text-xs text-contact-soft">PropWiz is a product of Orca Fuso Consultancy</p>
          </div>
          <p className="mt-10 text-xs font-semibold uppercase tracking-widest text-contact-gold">Contact us</p>
          <h1 className="mt-4 max-w-3xl font-display text-4xl font-semibold leading-tight tracking-tight sm:text-5xl lg:text-6xl">Turn your next big idea into a stronger business.</h1>
          <p className="mt-6 max-w-2xl text-base leading-relaxed text-contact-soft sm:text-lg">Orca Fuso helps you build the systems, strategy and structure to move forward—from business formation and market research to branding and practical tax advice.</p>
          <p className="mt-4 max-w-2xl text-base text-contact-cream">Tell us what you’re building, and let’s discuss your next step.</p>
          <Button asChild className="mt-8 h-auto whitespace-normal bg-contact-gold px-6 py-3 text-contact-forest hover:bg-contact-gold/90"><a href="#contact-options">Let’s talk about your business <ArrowUpRight className="h-4 w-4" /></a></Button>
        </div>
      </section>
      <section className="page-container py-12 sm:py-14">
        <h2 className="font-heading text-2xl font-semibold tracking-tight text-foreground">How we help your business grow</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SERVICES.map(s => <div key={s.title} className="rounded-xl border border-border bg-card p-6 text-card-foreground">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-contact-forest/5"><s.icon className="h-5 w-5 text-contact-forest" /></div>
            <h3 className="mt-4 font-heading text-base font-semibold">{s.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.text}</p>
          </div>)}
        </div>
      </section>
    </>
  );
}