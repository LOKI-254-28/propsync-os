import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { MessageCircle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import GuidePanel from '@/components/assistant/GuidePanel';
import guideTips from '@/components/assistant/guideTips';
export default function GuideAssistant({ items, role }) {
  const { user } = useAuth();
  return user ? <GuideWidget key={user.id} user={user} items={items} role={role}/> : null;
}
function GuideWidget({ user, items, role }) {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const [enabled, setEnabled] = useState(user.assistant_guidance_enabled !== false);
  const [saving, setSaving] = useState(false), [error, setError] = useState('');
  async function toggle() {
    setSaving(true); setError('');
    try {
      await base44.auth.updateMe({ assistant_guidance_enabled: !enabled });
      setEnabled(!enabled);
      window.dispatchEvent(new Event('profile-changed'));
    } catch { setError('Could not save your guidance preference. Please try again.'); }
    finally { setSaving(false); }
  }
  return <div className="fixed bottom-4 right-4 z-40 max-w-[calc(100vw-2rem)]">
    {enabled && !open && <div className="mb-2 max-w-72 rounded-xl border border-border bg-card p-3 text-sm text-card-foreground shadow-lg">
      <p className="mb-1 font-medium">PropWiz Guide</p><p>{guideTips(pathname)}</p>
      <button disabled={saving} onClick={toggle} className="mt-2 text-xs text-muted-foreground underline">{saving ? 'Saving…' : 'Pause guidance'}</button>
    </div>}
    {!open && error && <p role="alert" className="rounded-lg bg-card p-2 text-sm text-destructive">{error}</p>}
    <Button onClick={() => setOpen(true)} aria-label="Open PropWiz AI guide"><MessageCircle/> {enabled ? 'Ask guide' : 'Guide paused · Opt in'}</Button>
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent aria-describedby={undefined} className="account-theme flex h-[100dvh] w-full flex-col gap-3 bg-background text-foreground sm:max-w-md">
        <SheetTitle>PropWiz Guide</SheetTitle>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <GuidePanel enabled={enabled} saving={saving} onToggle={toggle} tip={guideTips(pathname)} pathname={pathname} items={items} role={role}/>
      </SheetContent>
    </Sheet>
  </div>;
}