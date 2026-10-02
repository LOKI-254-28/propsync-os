import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import PublicLayout from "@/components/public/PublicLayout";
import { Button } from '@/components/ui/button';
import { ExternalLink, MapPin } from 'lucide-react';
import OrcaAbout from '@/components/contact/OrcaAbout';
import DropUsALine from '@/components/contact/DropUsALine';
import PropertyMap from '@/components/booking/PropertyMap';
import ContactMessageForm from '@/components/contact/ContactMessageForm';

export default function Contact() {
  const [cfg, setCfg] = useState({});


  useEffect(() => {
    base44.entities.ContactPageConfig.list().then((l) => setCfg(l[0] || {})).catch(() => {});
  }, []);

  return (
    <PublicLayout>
      <div className="bg-contact-cream font-body">
        <OrcaAbout />
        <section id="contact-options" className="mx-auto max-w-6xl scroll-mt-24 px-5 pb-14 sm:px-8 sm:pb-20">
          <div className="grid items-start gap-6 md:grid-cols-2 lg:gap-10">
            <div className="min-w-0 space-y-7">
              <div>
                <h2 className="font-heading text-2xl font-semibold tracking-tight text-foreground">Let’s talk about your business</h2>
                <div className="mt-5 flex flex-wrap gap-3">
                  <DropUsALine email={cfg.email} whatsapp={cfg.whatsapp} />
                  {cfg.website_url && <Button variant="outline" asChild className="h-auto whitespace-normal px-4 py-3"><a href={cfg.website_url} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4" />Find out more about Orca Fuso</a></Button>}
                </div>
              </div>
              {cfg.address && <p className="flex items-start gap-2 text-sm text-muted-foreground"><MapPin className="h-5 w-5 shrink-0 text-contact-forest" />{cfg.address}</p>}
              {cfg.latitude != null && cfg.longitude != null && <div className="relative z-0 rounded-2xl border border-border bg-card p-4"><PropertyMap latitude={cfg.latitude} longitude={cfg.longitude} name="Orca Fuso office" /></div>}
            </div>
            <ContactMessageForm />
          </div>
        </section>
      </div>
    </PublicLayout>
  );
}