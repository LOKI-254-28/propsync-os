import React,{useState} from 'react';
import {useQuery} from '@tanstack/react-query';
import {base44} from '@/api/base44Client';
export default function StaffFeedbackScope({value=[],onChange}) {
  const [busy,setBusy]=useState(false),[error,setError]=useState('');
  const {data:properties=[],isLoading}=useQuery({queryKey:['staff-feedback-properties'],queryFn:()=>base44.entities.Property.list('-created_date',500)});
  const toggle=async id=>{setBusy(true);setError('');try{await onChange(value.includes(id)?value.filter(v=>v!==id):[...value,id]);}catch(e){setError(e.response?.data?.error || e.message);}finally{setBusy(false);}};
  return <div className="mt-3 space-y-2 rounded-lg border border-border p-3"><p className="text-sm font-medium">Feedback access: explicitly selected properties only</p><p className="text-xs text-muted-foreground">No selected properties means no delegated feedback access. Staff open Feedback in their portal.</p>{isLoading?<p className="text-xs">Loading properties…</p>:<div className="max-h-40 space-y-2 overflow-y-auto">{properties.map(p=><label key={p.id} className="flex items-center gap-2 text-xs"><input type="checkbox" disabled={busy} checked={value.includes(p.id)} onChange={()=>toggle(p.id)}/>{p.name}</label>)}</div>}{error&&<p role="alert" className="text-xs text-destructive">{error}</p>}</div>;
}