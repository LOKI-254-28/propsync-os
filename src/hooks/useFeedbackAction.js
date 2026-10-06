import {useRef,useState} from 'react';
import {useQueryClient} from '@tanstack/react-query';
import {base44} from '@/api/base44Client';
export default function useFeedbackAction(onSaved) {
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),lock=useRef(false),request=useRef(null),client=useQueryClient();
  const send=async body=>{
    if(lock.current)return null;
    const payload=JSON.stringify(body);
    if(request.current?.payload!==payload)request.current={payload,id:crypto.randomUUID()};
    lock.current=true;setBusy(true);setError('');
    try {const {data}=await base44.functions.invoke('feedbackOps',{...body,operation_id:request.current.id});await Promise.all([client.invalidateQueries({queryKey:['feedback-list']}),client.invalidateQueries({queryKey:['feedback-history',data.feedback.id]})]);await onSaved?.(data.feedback);request.current=null;return data.feedback;}
    catch(e){setError(e.response?.data?.error || e.message);return null;}
    finally{lock.current=false;setBusy(false);}
  };
  return {send,busy,error};
}