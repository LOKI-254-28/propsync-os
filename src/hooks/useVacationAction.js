import {useRef,useState} from 'react';
import {useQueryClient} from '@tanstack/react-query';
import {base44} from '@/api/base44Client';
export default function useVacationAction(onChanged) {
  const [busy,setBusy]=useState(false),[error,setError]=useState('');
  const request=useRef(null),locked=useRef(false),client=useQueryClient();
  const send=async body=>{
    if(locked.current)return null;
    const payload=JSON.stringify(body);
    if(request.current?.payload!==payload)request.current={payload,id:crypto.randomUUID()};
    locked.current=true;setBusy(true);setError('');
    try {
      const {data}=await base44.functions.invoke('submitVacationNotice',{...body,operation_id:request.current.id});
      await client.invalidateQueries({queryKey:['vacation-history',data.notice.id]});
      window.dispatchEvent(new Event('documents-changed'));
      await onChanged?.(data.notice);request.current=null;return data.notice;
    } catch(e){setError(e.response?.data?.error || e.message);return null;}
    finally{locked.current=false;setBusy(false);}
  };
  return {send,busy,error};
}