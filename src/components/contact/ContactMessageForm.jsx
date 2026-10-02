import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Field } from '@/components/ui-bits';
import { Loader2, CheckCircle2, ArrowUpRight } from 'lucide-react';

export default function ContactMessageForm() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', message: '' });
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [sent, setSent] = useState(false);
  const set = key => event => setForm({ ...form, [key]: event.target.value });
  const submit = async event => {
    event.preventDefault(); setError(''); setBusy(true);
    try { await base44.functions.invoke('submitContact', form); setSent(true); }
    catch (err) { setError(err.response?.data?.error || 'Could not send your message. Please try again.'); }
    finally { setBusy(false); }
  };
  return (
    <div className="rounded-2xl border border-border bg-card p-6 text-card-foreground sm:p-8">
      <h2 className="font-heading text-2xl font-semibold tracking-tight">Send us a message</h2>
      {sent ? <div role="status" className="mt-6 flex items-start gap-3 rounded-xl bg-contact-forest/5 p-5 text-foreground"><CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-contact-forest" /><p>Thanks — we'll get back to you soon.</p></div> : (
        <form onSubmit={submit} className="mt-6 space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Name"><Input aria-label="Name" autoComplete="name" value={form.name} onChange={set('name')} /></Field>
            <Field label="Email"><Input aria-label="Email" type="email" autoComplete="email" value={form.email} onChange={set('email')} /></Field>
          </div>
          <Field label="Phone"><Input aria-label="Phone" type="tel" autoComplete="tel" value={form.phone} onChange={set('phone')} /></Field>
          <Field label="Message"><Textarea aria-label="Message" rows={5} value={form.message} onChange={set('message')} /></Field>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <Button type="submit" disabled={busy} className="h-11 bg-contact-forest px-5 text-contact-cream hover:bg-contact-forest/90">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUpRight className="h-4 w-4" />}Send message</Button>
        </form>
      )}
    </div>
  );
}