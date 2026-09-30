import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { PageHeader, SectionCard, Field } from "@/components/ui-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Save, Loader2 } from "lucide-react";
import MapPicker from "@/components/MapPicker";

const EMPTY = { website_url: "", email: "", whatsapp: "", address: "", latitude: null, longitude: null };

export default function ContactPageSettings() {
  const [cfg, setCfg] = useState(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    base44.entities.ContactPageConfig.list().then((l) => setCfg(l[0] || EMPTY));
  }, []);

  const set = (k) => (e) => setCfg({ ...cfg, [k]: e.target.value });

  const save = async () => {
    setBusy(true);
    setSaved(false);
    const rec = cfg.id
      ? await base44.entities.ContactPageConfig.update(cfg.id, cfg)
      : await base44.entities.ContactPageConfig.create(cfg);
    setCfg(rec);
    setSaved(true);
    setBusy(false);
  };

  if (!cfg) return <div className="flex h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-emerald-700" /></div>;
  return (
    <div>
      <PageHeader title="Contact us page" description="Controls the public Contact us page." actions={<Button onClick={save} disabled={busy} className="bg-emerald-600 hover:bg-emerald-700"><Save className="mr-1.5 h-4 w-4" />{busy ? "Saving..." : saved ? "Saved" : "Save"}</Button>} />
      <div className="space-y-4">
        <SectionCard title="Links and contact">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Orca Fuso website link" hint="Used by the 'Find out more about Orca Fuso' button."><Input value={cfg.website_url || ""} onChange={set("website_url")} placeholder="https://..." /></Field>
            <Field label="Email address" hint="Where emails from the Contact page are sent."><Input type="email" value={cfg.email || ""} onChange={set("email")} /></Field>
            <Field label="WhatsApp number" hint="International format, e.g. 254712345678"><Input value={cfg.whatsapp || ""} onChange={set("whatsapp")} /></Field>
            <Field label="Office address"><Input value={cfg.address || ""} onChange={set("address")} /></Field>
          </div>
        </SectionCard>
        <SectionCard title="Office location">
          <MapPicker latitude={cfg.latitude} longitude={cfg.longitude} onChange={({ lat, lng }) => setCfg({ ...cfg, latitude: lat, longitude: lng })} />
        </SectionCard>
      </div>
    </div>
  );
}