import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { logAudit } from "@/lib/finance";
import { PageHeader, SectionCard, Field } from "@/components/ui-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Settings as SettingsIcon, Save, Bell } from "lucide-react";

const DEFAULT_REMINDERS = [
  { offset_days: -7, label: "7 days before due", enabled: true },
  { offset_days: -3, label: "3 days before due", enabled: true },
  { offset_days: 0, label: "On due date", enabled: true },
  { offset_days: 3, label: "3 days overdue", enabled: true },
  { offset_days: 7, label: "7 days overdue", enabled: true },
];

export default function Settings() {
  const [settings, setSettings] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const list = await base44.entities.Settings.list();
    if (list[0]) setSettings(list[0]);
    else setSettings({ organization_name: "Verdant Estates", currency: "KES", default_rent_due_day: 1, default_grace_period_days: 7, default_notice_period_days: 30, reminder_schedule: DEFAULT_REMINDERS, payment_methods: ["M-Pesa", "Bank Transfer", "Card", "Cash"], contact_phone: "", contact_email: "", address: "", late_payment_rules: "", notification_preferences: {} });
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    setBusy(true);
    const me = await base44.auth.me();
    if (settings.id) await base44.entities.Settings.update(settings.id, settings);
    else { const rec = await base44.entities.Settings.create(settings); setSettings(rec); }
    await logAudit({ user: me, action: "Settings Updated", entity: "Settings", entity_id: settings.id });
    setBusy(false);
  };

  const toggleReminder = (i) => {
    const rs = [...(settings.reminder_schedule || [])];
    rs[i] = { ...rs[i], enabled: !rs[i].enabled };
    setSettings({ ...settings, reminder_schedule: rs });
  };

  if (!settings) return <div className="flex h-96 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-700" /></div>;

  return (
    <div>
      <PageHeader title="Settings" description="Organization, financial defaults, reminders, and notification preferences." actions={<Button onClick={save} disabled={busy} className="bg-emerald-600 hover:bg-emerald-700"><Save className="mr-1.5 h-4 w-4" />{busy ? "Saving..." : "Save Settings"}</Button>} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <SectionCard title="Organization">
          <div className="space-y-3">
            <Field label="Organization name"><Input value={settings.organization_name} onChange={(e) => setSettings({ ...settings, organization_name: e.target.value })} /></Field>
            <Field label="Contact phone"><Input value={settings.contact_phone || ""} onChange={(e) => setSettings({ ...settings, contact_phone: e.target.value })} /></Field>
            <Field label="Contact email"><Input value={settings.contact_email || ""} onChange={(e) => setSettings({ ...settings, contact_email: e.target.value })} /></Field>
            <Field label="Address"><Textarea value={settings.address || ""} onChange={(e) => setSettings({ ...settings, address: e.target.value })} rows={2} /></Field>
          </div>
        </SectionCard>

        <SectionCard title="Financial Defaults">
          <div className="space-y-3">
            <Field label="Currency"><select value={settings.currency} onChange={(e) => setSettings({ ...settings, currency: e.target.value })} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">{["KES", "USD", "EUR", "GBP", "TZS", "UGX", "NGN"].map((c) => <option key={c}>{c}</option>)}</select></Field>
            <Field label="Default rent due day"><Input type="number" value={settings.default_rent_due_day} onChange={(e) => setSettings({ ...settings, default_rent_due_day: Number(e.target.value) })} /></Field>
            <Field label="Grace period (days)"><Input type="number" value={settings.default_grace_period_days} onChange={(e) => setSettings({ ...settings, default_grace_period_days: Number(e.target.value) })} /></Field>
            <Field label="Default notice period (days)"><Input type="number" value={settings.default_notice_period_days} onChange={(e) => setSettings({ ...settings, default_notice_period_days: Number(e.target.value) })} /></Field>
            <Field label="Late payment rules"><Textarea value={settings.late_payment_rules || ""} onChange={(e) => setSettings({ ...settings, late_payment_rules: e.target.value })} rows={2} /></Field>
          </div>
        </SectionCard>

        <SectionCard title="Rent Reminders" >
          <p className="mb-3 text-sm text-slate-500">Configure when reminders fire. Channels (Email/SMS/WhatsApp) run in sandbox until credentials are connected.</p>
          <div className="space-y-2">
            {(settings.reminder_schedule || []).map((r, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2">
                <div className="flex items-center gap-2"><Bell className="h-4 w-4 text-slate-400" /><span className="text-sm text-slate-700">{r.label}</span></div>
                <button onClick={() => toggleReminder(i)} className={`relative h-5 w-9 rounded-full transition ${r.enabled ? "bg-emerald-500" : "bg-slate-300"}`}><span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition ${r.enabled ? "left-4" : "left-0.5"}`} /></button>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Payment Methods">
          <div className="flex flex-wrap gap-2">
            {["M-Pesa", "Bank Transfer", "Card", "Cash", "Manual Adjustment", "Other"].map((m) => {
              const sel = (settings.payment_methods || []).includes(m);
              return <button key={m} onClick={() => setSettings({ ...settings, payment_methods: sel ? (settings.payment_methods || []).filter((x) => x !== m) : [...(settings.payment_methods || []), m] })} className={`rounded-full border px-3 py-1.5 text-sm ${sel ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-slate-200 text-slate-600"}`}>{m}</button>;
            })}
          </div>
          <div className="mt-4 rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800">Integration architecture is ready for M-Pesa, Stripe, Email, SMS and WhatsApp. Connect credentials in the Integrations dashboard to go live. Until then, all notifications and payments run in sandbox mode.</div>
        </SectionCard>
      </div>
    </div>
  );
}