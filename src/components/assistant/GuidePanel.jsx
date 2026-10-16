import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import GuideMessages from '@/components/assistant/GuideMessages';
import useGuideConversation from '@/hooks/useGuideConversation';
export default function GuidePanel({ enabled, saving, onToggle, tip, pathname, items, role }) {
  const chat = useGuideConversation(), end = useRef(null);
  const [text, setText] = useState('');
  useEffect(() => { end.current?.scrollIntoView({ block: 'nearest' }); }, [chat.messages, chat.busy]);
  async function submit(event) {
    event.preventDefault();
    const context = JSON.stringify({ pathname, role, navigation: items.map(({label, path}) => ({label, path})) });
    if (await chat.send(text.slice(0, 1500), context)) setText('');
  }
  return <>
    <p className="text-sm text-muted-foreground">AI guidance, not a person. Reads permitted account summaries only when needed; cannot change records.</p>
    <Button variant="outline" disabled={saving || chat.busy} onClick={onToggle}>{saving ? 'Saving…' : enabled ? 'Opt out of guidance' : 'Opt back in'}</Button>
    {enabled ? <>
      <p className="rounded-lg bg-accent p-3 text-sm text-accent-foreground">{tip}</p>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {!chat.messages.length && <p className="py-3 text-sm text-muted-foreground">Ask how to use this page, or ask about your account summary.</p>}
        <GuideMessages messages={chat.messages} paths={items.map(item => item.path)}/>
        {chat.busy && <p role="status" className="mt-3 text-sm text-muted-foreground">Guide is responding…</p>}
        <div ref={end}/>
      </div>
      {chat.error && <p role="alert" className="text-sm text-destructive">{chat.error}</p>}
      <form onSubmit={submit} className="space-y-2">
        <Textarea aria-label="Message the AI guide" placeholder="What would you like help with?" maxLength={1500} value={text} onChange={e => setText(e.target.value)} disabled={chat.busy} rows={2}/>
        <Button type="submit" className="w-full" disabled={chat.busy || !text.trim()}>Send</Button>
      </form>
    </> : <p className="text-sm text-muted-foreground">Guidance is paused. No new messages or account lookups will run. Opt back in here whenever you want.</p>}
  </>;
}