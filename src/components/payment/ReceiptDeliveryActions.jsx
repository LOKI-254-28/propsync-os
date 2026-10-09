import React,{useState} from 'react';
import {Mail,MessageCircle} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {base44} from '@/api/base44Client';
import {receiptMoney} from '@/components/payment/receiptData';
export default function ReceiptDeliveryActions({details}) {
  const [busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState('');
  const payment=details?.payment;
  const email=async()=>{
    setBusy(true);setMessage('');setError('');
    try{const {data}=await base44.functions.invoke('documentOps',{action:'email_receipt',payment_id:payment.id});setMessage(data.message);}
    catch(e){setError(e.response?.data?.error||'The receipt could not be emailed. Please try again.');}
    finally{setBusy(false);}
  };
  const path=payment?`/receipt/${encodeURIComponent(payment.id)}`:'';
  let phone=(details?.recipient_phone||'').replace(/[^0-9]/g,'');
  if(/^0[17]\d{8}$/.test(phone))phone=`254${phone.slice(1)}`;
  if(!/^[1-9]\d{7,14}$/.test(phone))phone='';
  const text=payment?`Payment receipt ${payment.receipt_number||payment.id}: ${receiptMoney(payment.amount)}. View or download securely (sign in required): ${window.location.origin}${path}`:'';
  const whatsapp=`https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
  return <div className="space-y-2 border-t border-border pt-3">
    <div className="flex flex-wrap gap-2"><Button variant="outline" disabled={!payment||!details.recipient_email||busy} onClick={email}><Mail className="h-4 w-4"/>{busy?'Sending…':'Email Receipt'}</Button><Button variant="outline" disabled={!payment} asChild={!!payment}>{payment?<a href={whatsapp} target="_blank" rel="noopener noreferrer"><MessageCircle className="h-4 w-4"/>Share on WhatsApp</a>:<span>Share on WhatsApp</span>}</Button></div>
    <p className="text-xs text-muted-foreground">Email sends the PDF to the tenant’s registered address. WhatsApp opens a secure receipt link for you to send.</p>
    {details&&!details.recipient_email&&<p className="text-xs text-muted-foreground">Email requires a linked tenant account.</p>}
    {message&&<p role="status" className="text-sm text-primary">{message}</p>}{error&&<p role="alert" className="text-sm text-destructive">{error}</p>}
  </div>;
}