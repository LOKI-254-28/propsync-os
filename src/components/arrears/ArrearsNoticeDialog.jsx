import React,{useState} from 'react';
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogFooter} from '@/components/ui/dialog';
import {Button} from '@/components/ui/button';
import {Textarea} from '@/components/ui/textarea';
import {Field} from '@/components/ui-bits';
import {secureCreate} from '@/lib/secureCreate';
import {notify} from '@/lib/finance';
import ArrearsTenancySelect from '@/components/arrears/ArrearsTenancySelect';
export default function ArrearsNoticeDialog({target,onClose,onSaved}){
  const [id,setId]=useState(target.charges[0]?.tenancy_id||''),[content,setContent]=useState('This is a formal notice regarding outstanding rent on your account. Please arrange payment within 7 days or contact your landlord.'),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const submit=async e=>{e.preventDefault();setBusy(true);setError('');try{const notice=await secureCreate('Notice',{type:'Arrears Notice',tenancy_id:id,subject:'Arrears Notice',content,channel:'In-app'});await notify({related_entity:'Notice',related_id:notice.id});await onSaved();onClose();}catch(e){setError(e.message);}finally{setBusy(false);}};
  return <Dialog open onOpenChange={open=>!open&&!busy&&onClose()}><DialogContent className="max-h-[90vh] max-w-md overflow-y-auto"><DialogHeader><DialogTitle>Issue Arrears Notice</DialogTitle></DialogHeader><form onSubmit={submit} className="space-y-4"><p className="font-medium">{target.tenant_name}</p><ArrearsTenancySelect tenantId={target.tenant_id} value={id} onChange={setId} disabled={busy}/><Field label="Notice content"><Textarea required maxLength={5000} value={content} onChange={e=>setContent(e.target.value)} rows={5} disabled={busy}/></Field>{error&&<p role="alert" className="text-sm text-destructive">{error}</p>}<DialogFooter><Button type="button" variant="outline" onClick={onClose} disabled={busy}>Cancel</Button><Button disabled={busy||!id||!content.trim()}>{busy?'Issuing…':'Issue Notice'}</Button></DialogFooter></form></DialogContent></Dialog>;
}