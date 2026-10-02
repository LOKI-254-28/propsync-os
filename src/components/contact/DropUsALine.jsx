import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field } from "@/components/ui-bits";
import { Mail, MessageCircle } from "lucide-react";

// Lets a visitor write a note and send it by email or WhatsApp to the admin-configured contacts.
export default function DropUsALine({ email, whatsapp }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [msg, setMsg] = useState("");
  const text = `Hello Orca Fuso, this is ${name || "a visitor"}.\n\n${msg}`;
  const digits = (whatsapp || "").replace(/\D/g, "");

  const sendEmail = () => { window.location.href = `mailto:${email}?subject=${encodeURIComponent("Enquiry from PropWiz")}&body=${encodeURIComponent(text)}`; };
  const sendWhatsApp = () => window.open(`https://wa.me/${digits}?text=${encodeURIComponent(text)}`, "_blank", "noreferrer");

  return (
    <>
      <Button onClick={() => setOpen(true)} className="h-auto whitespace-normal bg-contact-forest px-4 py-3 text-contact-cream hover:bg-contact-forest/90"><Mail className="mr-1.5 h-4 w-4" />Email or WhatsApp us</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90dvh] w-[calc(100%-2rem)] max-w-md overflow-y-auto">
          <DialogHeader><DialogTitle>Drop us a line</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Field label="Your name"><Input value={name} onChange={(e) => setName(e.target.value)} /></Field>
            <Field label="Message"><Textarea rows={4} value={msg} onChange={(e) => setMsg(e.target.value)} /></Field>
            <div className="flex flex-wrap gap-2">
              <Button disabled={!email || !msg.trim()} onClick={sendEmail} className="bg-contact-forest text-contact-cream hover:bg-contact-forest/90"><Mail className="mr-1.5 h-4 w-4" />Send by email</Button>
              <Button disabled={!digits || !msg.trim()} onClick={sendWhatsApp} variant="outline"><MessageCircle className="mr-1.5 h-4 w-4" />Send on WhatsApp</Button>
            </div>
            {(!email || !digits) && <p className="text-xs text-slate-400">{!email && "Email is not set up yet. "}{!digits && "WhatsApp is not set up yet."}</p>}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}