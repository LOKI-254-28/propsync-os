import React,{useState,useEffect} from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import FileUploadButton from '@/components/FileUploadButton';
import { applicationAction } from '@/lib/applicationActions';
export default function InspectionResponseForm({app,inspection,onUpdated,onBusyChange}) {
  const [decision,setDecision]=useState('Approved'),[comment,setComment]=useState(''),[files,setFiles]=useState([]),[uploading,setUploading]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const [requestId]=useState(()=>crypto.randomUUID());
  useEffect(()=>{onBusyChange?.(busy||uploading);},[busy,uploading,onBusyChange]);
  useEffect(()=>()=>onBusyChange?.(false),[onBusyChange]);
  const respond=async()=>{
    if(busy||uploading)return;setBusy(true);setError('');
    try{await applicationAction(app.id,'inspection_respond',{inspection_id:inspection.id,decision,comment,supporting_documents:files,request_id:requestId});onUpdated();}
    catch(e){setError(e.response?.data?.error || e.message);}finally{setBusy(false);}
  };
  return <div className="space-y-3 border-t border-border pt-3"><p className="text-sm font-medium">Confirm the move-in condition record</p><select aria-label="Inspection decision" disabled={busy||uploading} value={decision} onChange={e=>setDecision(e.target.value)} className="rounded-md border border-input bg-background p-2 text-sm"><option value="Approved">Approve inspection</option><option value="Rejected">Reject and request corrections</option></select><Textarea aria-label="Inspection response comment" disabled={busy||uploading} value={comment} maxLength={2000} onChange={e=>setComment(e.target.value)} placeholder={decision==='Rejected'?'Explain what needs correcting (required)':'Your comment (optional)'}/><FileUploadButton multiple maxFiles={6-files.length} disabled={busy||files.length>=6} documentContext={{entity:'Inspection',record_id:inspection.id,category:'Other'}} onBusyChange={setUploading} onUploaded={file=>setFiles(current=>[...current,file.file_uri])} label="Attach supporting material"/>{files.length>0&&<p className="text-xs text-muted-foreground">{files.length} supporting file(s) attached</p>}{error&&<p role="alert" className="text-sm text-destructive">{error}</p>}<Button disabled={busy||uploading||(decision==='Rejected'&&!comment.trim())} onClick={respond}>{busy?'Saving…':'Submit inspection decision'}</Button></div>;
}