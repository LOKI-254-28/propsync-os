import {jsPDF} from 'jspdf';
import {receiptLines,receiptMoney} from '@/components/payment/receiptData';
import {amountInWords} from '@/components/payment/amountInWords';
import {receiptPdfCanvas} from '@/components/payment/receiptPdfCanvas';
export function downloadReceipt(payment,charges=[],print=false,details={}) {
  if(payment.status!=='Successful') return;
  const doc=new jsPDF({unit:'mm',format:'a4'}),c=receiptPdfCanvas(doc);
  const number=payment.receipt_number||`RCP-${payment.id.toUpperCase()}`;
  doc.setProperties({title:`Payment receipt ${number}`,author:details.issuer?.name||'PropWiz',subject:'Verified rental payment acknowledgement'});
  c.section('Receipt & property details');
  c.table([],[[ 'Receipt no.',number,'Payment date',payment.payment_date||'Not recorded'],['Method',payment.method||'Not recorded','Reference',payment.payment_reference||'Not recorded'],['Property',payment.property_name||'Not recorded','Unit',payment.unit_number||'Not recorded']],[29,58,29,58]);
  if(details.property_address)c.table([],[['Property address',details.property_address]],[36,138]);
  const party=(value,fallback)=>[value?.name||fallback||'Not recorded',value?.address,value?.phone?`Tel: ${value.phone}`:'',value?.email].filter(Boolean).join('\n');
  c.table(['ISSUED BY / LANDLORD','RECEIVED FROM / TENANT'],[[party(details.issuer),party(details.payer,payment.tenant_name)]],[87,87]);
  c.section('Payment allocation');
  c.table(['NO.','DESCRIPTION / BILLING PERIOD','AMOUNT (KES)'],receiptLines(payment,charges).map((line,i)=>[String(i+1),line.label,receiptMoney(line.amount)]),[12,120,42],['left','left','right']);
  c.ensure(18);doc.setFillColor(243,245,247);doc.rect(18,c.y,174,14,'F');doc.setTextColor(52,88,131);doc.setFont('helvetica','bold');doc.setFontSize(10);doc.text('TOTAL RECEIVED',22,c.y+9);doc.setFontSize(15);doc.text(receiptMoney(payment.amount),188,c.y+9,{align:'right'});c.y+=19;
  c.table([],[['Amount in words',amountInWords(payment.amount)]],[36,138]);
  c.section('Acknowledgement');
  c.table(['AUTHORISED BY','RECEIVED BY'],[[details.authorised_by||'Not recorded',payment.tenant_name||details.payer?.name||'Not recorded'],['Signature: ____________________','Signature: ____________________']],[87,87]);
  c.finish();
  if(print){doc.autoPrint();window.open(doc.output('bloburl'),'_blank');}
  else doc.save(`${(payment.receipt_number||`RCP-${payment.id}`).replace(/[^a-zA-Z0-9_-]/g,'_')}.pdf`);
}