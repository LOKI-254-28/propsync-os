import React,{useState,useEffect} from 'react';
import { Button } from '@/components/ui/button';
import FileUploadButton from '@/components/FileUploadButton';
import InspectionChecklist from '@/components/inspections/InspectionChecklist';
import { applicationAction } from '@/lib/applicationActions';
export default function MoveInInspectionForm({app,onUpdated,onCancel,onBusyChange}) {
  const [checklist,setChecklist]=useState(()=>['Walls and ceilings','Floors','Doors and windows','Plumbing and water','Electrical fittings','Kitchen and bathroom','Keys and locks'].map(area=>({area,condition:'Good',notes:''})));
  const [report,setReport]=useState(''),[images,setImages]=useState([]),[uploads,setUploads]=useState({report:false,images:false}),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const [requestId]=useState(()=>crypto.randomUUID());
  const uploading=uploads.report||uploads.images;
  useEffect(()=>{onBusyChange?.(busy||uploading);},[busy,uploading,onBusyChange]);
  useEffect(()=>()=>onBusyChange?.(false),[onBusyChange]);
  const submit=async()=>{
    if(busy||uploading||!report||!images.length)return;setBusy(true);setError('');
    try{await applicationAction(app.id,'inspection_submit',{report_uri:report,images,checklist,request_id:requestId});onUpdated();}
    catch(e){setError(e.response?.data?.error || e.message);}finally{setBusy(false);}
  };
  return <div className="space-y-4"><InspectionChecklist rows={checklist} onChange={setChecklist} disabled={busy||uploading}/><div><p className="mb-2 text-sm font-medium">Inspection report / checklist document</p><FileUploadButton disabled={busy||uploading} documentContext={{entity:'Application',record_id:app.id,category:'Inspection Report'}} onBusyChange={value=>setUploads(current=>({...current,report:value}))} onUploaded={file=>setReport(file.file_uri)} label="Upload inspection record"/></div><div><p className="mb-2 text-sm font-medium">Condition photographs (required, up to six)</p><FileUploadButton multiple imageOnly maxFiles={6-images.length} disabled={busy||uploading||images.length>=6} documentContext={{entity:'Application',record_id:app.id,category:'Inspection Photo'}} onBusyChange={value=>setUploads(current=>({...current,images:value}))} onUploaded={file=>setImages(current=>[...current,file.file_uri])} label="Upload condition images"/><p className="mt-1 text-xs text-muted-foreground">{images.length} photograph(s) attached. PDF/JPG/PNG documents and JPG/PNG/WebP photographs, up to 10 MB each.</p></div>{error&&<p role="alert" className="text-sm text-destructive">{error}</p>}<div className="flex flex-wrap gap-2"><Button disabled={busy||uploading||!report||!images.length} onClick={submit}>{busy?'Sharing inspection…':'Share with tenant for approval'}</Button><Button variant="ghost" disabled={busy||uploading} onClick={onCancel}>Cancel</Button></div></div>;
}