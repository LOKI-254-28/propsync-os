import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { PageHeader, SectionCard, EmptyState } from "@/components/ui-bits";
import { Bell, Check } from "lucide-react";
import {useQueryClient} from '@tanstack/react-query';
import {useAuth} from '@/lib/AuthContext';

export default function Notifications() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,setError]=useState('');
  const client=useQueryClient(),{user}=useAuth();

  const load = async () => {
    setLoading(true);
    try {
      const me = await base44.auth.me();
      await base44.functions.invoke('getSectionAlerts',{visited_path:'/notifications'});
      client.invalidateQueries({queryKey:['section-alerts',me.id]});
      const n = await base44.entities.Notification.filter({ recipient_user_id: me.id });
      n.sort((a, b) => new Date(b.date) - new Date(a.date));
      setItems(n);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const markRead = async id => {
    setError('');
    try {const {data}=await base44.functions.invoke('getSectionAlerts',{notification_id:id});client.setQueryData(['section-alerts',user.id],data);await load();}
    catch(e){setError(e.response?.data?.error||e.message);}
  };
  const markAll = async () => {
    setError('');
    try {await base44.functions.invoke('getSectionAlerts',{visited_path:'/notifications'});await load();}
    catch(e){setError(e.response?.data?.error||e.message);}
  };

  if (loading) return <div className="flex h-96 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-700" /></div>;

  return (
    <div>
      <PageHeader title="Notifications" description="Your activity and alert notifications."
        actions={items.some((n) => !n.read) && <button onClick={markAll} className="text-sm font-medium text-emerald-700 hover:underline">Mark all read</button>} />
      {error&&<p role="alert" className="mb-3 text-sm text-destructive">{error}</p>}
      {items.length === 0 ? <EmptyState icon={Bell} title="No notifications" /> : (
        <SectionCard>
          <div className="space-y-2">
            {items.map((n) => (
              <div key={n.id} className={`flex items-start justify-between rounded-lg border px-4 py-3 ${n.read ? "border-slate-100 bg-white" : "border-emerald-200 bg-emerald-50/40"}`}>
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 h-2 w-2 rounded-full ${n.read ? "bg-slate-300" : "bg-emerald-500"}`} />
                  <div><p className="font-medium text-slate-900">{n.title}</p><p className="text-sm text-slate-600">{n.message}</p><p className="mt-0.5 text-xs text-slate-400">{new Date(n.date).toLocaleString('en-KE',{timeZone:'Africa/Nairobi'})}</p></div>
                </div>
                {!n.read && <button onClick={() => markRead(n.id)} className="text-emerald-700 hover:text-emerald-800"><Check className="h-4 w-4" /></button>}
              </div>
            ))}
          </div>
        </SectionCard>
      )}
    </div>
  );
}