import {useRef,useState} from 'react';
import {useQueryClient} from '@tanstack/react-query';
import {base44} from '@/api/base44Client';
export default function useMaintenanceAction(maintenanceId,onSaved) {
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),guard=useRef(false),request=useRef(null),client=useQueryClient();
  const send=async body=>{
    if(guard.current)return null;
    const key=JSON.stringify(body);if(request.current?.key!==key)request.current={key,id:crypto.randomUUID()};
    guard.current=true;setBusy(true);setError('');
    try{const {data}=await base44.functions.invoke('maintenanceOps',{...body,maintenance_id:maintenanceId,operation_id:request.current.id});await Promise.all([client.invalidateQueries({queryKey:['maintenance-ticket',maintenanceId]}),client.invalidateQueries({queryKey:['maintenance-history',maintenanceId]}),client.invalidateQueries({queryKey:['assigned-work']})]);await onSaved?.(data.ticket);request.current=null;return data.ticket;}
    catch(e){setError(e.response?.data?.error || e.message);return null;}finally{guard.current=false;setBusy(false);}
  };
  return {send,busy,error};
}