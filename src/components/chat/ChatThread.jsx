import React, { useEffect, useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

// Live thread for one tenancy. role: "tenant" | "landlord".
export default function ChatThread({ tenancy, role, userId }) {
  const [msgs, setMsgs] = useState([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const end = useRef(null);

  const load = async () => {
    const list = await base44.entities.ChatMessage.filter({ tenancy_id: tenancy.id }, "created_date", 200);
    setMsgs(list);
    const unread = list.filter((m) => !m.read && m.sender_user_id !== userId);
    unread.forEach((m) => base44.entities.ChatMessage.update(m.id, { read: true }).catch(() => {}));
  };

  useEffect(() => {
    setMsgs([]);
    load();
    const unsub = base44.entities.ChatMessage.subscribe((e) => { if (e.data?.tenancy_id === tenancy.id) load(); });
    return unsub;
  }, [tenancy.id]);

  useEffect(() => { end.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs.length]);

  const send = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    setBusy(true);
    setErr("");
    try {
      await base44.functions.invoke("sendChatMessage", { tenancy_id: tenancy.id, text });
      setText("");
      await load();
    } catch (x) {
      setErr(x.response?.data?.error || "Could not send. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex h-[70vh] flex-col rounded-xl border border-slate-200 bg-white">
      <div className="border-b border-slate-100 px-4 py-3">
        <p className="font-medium text-slate-900">{role === "tenant" ? `Landlord · ${tenancy.property_name}` : `${tenancy.tenant_name} · ${tenancy.unit_number}`}</p>
        <p className="text-xs text-slate-500">{tenancy.property_name} · Unit {tenancy.unit_number}</p>
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto p-4">
        {msgs.length === 0 && <p className="py-10 text-center text-sm text-slate-400">No messages yet. Say hello.</p>}
        {msgs.map((m) => {
          const mine = m.sender_user_id === userId;
          return (
            <div key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
              <div className={cn("max-w-[75%] rounded-2xl px-3 py-2 text-sm", mine ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-800")}>
                <p className="whitespace-pre-wrap break-words">{m.text}</p>
                <p className={cn("mt-1 text-[10px]", mine ? "text-emerald-100" : "text-slate-400")}>{new Date(m.created_date).toLocaleString()}</p>
              </div>
            </div>
          );
        })}
        <div ref={end} />
      </div>
      {err && <p className="px-4 text-sm text-red-600">{err}</p>}
      <form onSubmit={send} className="flex gap-2 border-t border-slate-100 p-3">
        <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Type a message" />
        <Button type="submit" disabled={busy || !text.trim()} className="bg-emerald-600 hover:bg-emerald-700">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}</Button>
      </form>
    </div>
  );
}