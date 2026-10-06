import React,{useState} from 'react';
import {Textarea} from '@/components/ui/textarea';
import {Button} from '@/components/ui/button';
import NoticeAttachments from '@/components/vacation/NoticeAttachments';
export default function NoticeResponse({notice,manager,send,busy,onUploading}) {
  const [message,setMessage]=useState(''),[files,setFiles]=useState([]),[uploading,setUploading]=useState(false);
  const submit=async action=>{if(await send({action,notice_id:notice.id,message,attachments:files})){setMessage('');setFiles([]);}};
  return <section className="space-y-3"><h3 className="font-heading font-semibold">Respond to this notice</h3><Textarea aria-label="Notice response" rows={3} maxLength={3000} disabled={busy||uploading} value={message} onChange={e=>setMessage(e.target.value)}/><NoticeAttachments files={files} onChange={setFiles} tenancyId={notice.tenancy_id} noticeId={notice.id} disabled={busy||uploading} onBusyChange={value=>{setUploading(value);onUploading(value);}}/><div className="flex flex-wrap gap-2"><Button disabled={busy||uploading||(!message.trim()&&!files.length)} onClick={()=>submit('reply')}>Send Response</Button>{!manager&&notice.initiated_by==='landlord'&&!notice.tenant_acknowledged&&<Button variant="outline" disabled={busy||uploading} onClick={()=>submit('acknowledge')}>Acknowledge Notice</Button>}</div></section>;
}