import React,{useState} from 'react';
import {Dialog,DialogContent,DialogHeader,DialogTitle} from '@/components/ui/dialog';
import NoticeSummary from '@/components/vacation/NoticeSummary';
import NoticeHistory from '@/components/vacation/NoticeHistory';
import NoticeResponse from '@/components/vacation/NoticeResponse';
import NoticeManagement from '@/components/vacation/NoticeManagement';
import useVacationAction from '@/hooks/useVacationAction';
export default function VacationNoticeDialog({notice,manager,inspections,onClose,onChanged}) {
  const {send,busy,error}=useVacationAction(onChanged);
  const [uploading,setUploading]=useState(false);
  return (
    <Dialog open onOpenChange={value=>{if(!value&&!busy&&!uploading)onClose();}}>
      <DialogContent className="max-h-[90dvh] max-w-3xl overflow-y-auto">
        <DialogHeader><DialogTitle>{notice.type} · {notice.tenant_name}</DialogTitle></DialogHeader>
        <NoticeSummary notice={notice}/>
        <NoticeHistory noticeId={notice.id}/>
        <NoticeResponse notice={notice} manager={manager} send={send} busy={busy} onUploading={setUploading}/>
        {manager && <NoticeManagement key={`${notice.id}:${notice.status}`} notice={notice} inspections={inspections} send={send} busy={busy || uploading} />}
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      </DialogContent>
    </Dialog>
  );
}