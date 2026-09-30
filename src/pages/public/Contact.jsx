import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import PublicLayout from "@/components/public/PublicLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/ui-bits";
import { Loader2, CheckCircle2, ExternalLink, MapPin } from "lucide-react";
import OrcaAbout from "@/components/contact/OrcaAbout";
import DropUsALine from "@/components/contact/DropUsALine";
import PropertyMap from "@/components/booking/PropertyMap";

export default function Contact() {
  const [cfg, setCfg] = useState({});
  const [f, setF] = useState({ name: "", email: "", phone: "", message: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [sent, setSent] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  useEffect(() => {
    base44.entities.ContactPageConfig.list().then((l) => setCfg(l[0] || {})).catch(() => {});
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      await base44.functions.invoke("submitContact", f);
      setSent(true);
    } catch (x) {
      setErr(x.response?.data?.error || "Could not send your message. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <PublicLayout>
      <div className="mx-auto max-w-3xl px-4 py-12">
        <OrcaAbout />

        <div className="mt-6 flex flex-wrap gap-3">
          {cfg.website_url && (
            <a href={cfg.website_url} target="_blank" rel="noreferrer">
              <Button variant="outline"><ExternalLink className="mr-1.5 h-4 w-4" />Find out more about Orca Fuso</Button>
            </a>
          )}
          <DropUsALine email={cfg.email} whatsapp={cfg.whatsapp} />
        </div>

        {cfg.latitude != null && cfg.longitude != null && (
          <div className="mt-10">
            {cfg.address && <p className="mb-2 flex items-center gap-1.5 text-sm text-slate-600"><MapPin className="h-4 w-4 text-emerald-600" />{cfg.address}</p>}
            <PropertyMap latitude={cfg.latitude} longitude={cfg.longitude} name="Orca Fuso office" />
          </div>
        )}

        <h2 className="mt-12 font-heading text-xl font-semibold text-slate-900">Send us a message</h2>
        {sent ? (
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-50 p-4 text-emerald-800"><CheckCircle2 className="h-5 w-5" />Thanks — we'll get back to you soon.</div>
        ) : (
          <form onSubmit={submit} className="mt-4 space-y-3">
            <Field label="Name"><Input value={f.name} onChange={set("name")} /></Field>
            <Field label="Email"><Input type="email" value={f.email} onChange={set("email")} /></Field>
            <Field label="Phone"><Input value={f.phone} onChange={set("phone")} /></Field>
            <Field label="Message"><Textarea rows={4} value={f.message} onChange={set("message")} /></Field>
            {err && <p className="text-sm text-red-600">{err}</p>}
            <Button type="submit" disabled={busy} className="bg-emerald-600 hover:bg-emerald-700">{busy && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}Send message</Button>
          </form>
        )}
      </div>
    </PublicLayout>
  );
}