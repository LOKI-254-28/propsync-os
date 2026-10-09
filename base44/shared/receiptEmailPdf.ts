import {jsPDF} from 'npm:jspdf@4.2.1';
import {receiptAmountWords} from './receiptAmountWords.ts';
import {receiptPdfCanvas} from './receiptPdfCanvas.ts';
export const receiptMoney=value=>new Intl.NumberFormat('en-KE',{style:'currency',currency:'KES',minimumFractionDigits:2,maximumFractionDigits:2}).format(Number(value||0));
export function receiptEmailPdf(details) {
  const {payment,charges=[]}=details,doc=new jsPDF({unit:'mm',format:'a4'}),c=receiptPdfCanvas(doc);
  const number=payment.receipt_number||`RCP-${payment.id.toUpperCase()}`;
  doc.setProperties({title:`Payment receipt ${number}`,author:details.issuer?.name||'PropWiz',subject:'Verified rental payment acknowledgement'});
  c.section('Receipt & property details');
  c.table([],[[ 'Receipt no.',number,'Payment date',payment.payment_date||'Not recorded'],['Method',payment.method||'Not recorded','Reference',payment.payment_reference||'Not recorded'],['Property',payment.property_name||'Not recorded','Unit',payment.unit_number||'Not recorded']],[29,58,29,58]);
  if(details.property_address)c.table([],[['Property address',details.property_address]],[36,138]);
  const party=(value,fallback)=>[value?.name||fallback||'Not recorded',value?.address,value?.phone?`Tel: ${value.phone}`:'',value?.email].filter(Boolean).join('\n');
  c.table(['ISSUED BY / LANDLORD','RECEIVED FROM / TENANT'],[[party(details.issuer),party(details.payer,payment.tenant_name)]],[87,87]);
  const lines=[];let allocated=0;
  for(const allocation of payment.allocations||[]){const charge=charges.find(c=>c.id===allocation.charge_id);lines.push({label:`${charge?.bill_name||charge?.charge_type||'Rent & Service Charge'} (${allocation.billing_period||charge?.billing_period||''})`,amount:Number(allocation.amount)});allocated+=Number(allocation.amount);}
  if(allocated<payment.amount)lines.push({label:payment.description||(!allocated?'Payment received':'Unallocated payment credit'),amount:Number(payment.amount)-allocated});
  c.section('Payment allocation');
  c.table(['NO.','DESCRIPTION / BILLING PERIOD','AMOUNT (KES)'],lines.map((line,i)=>[String(i+1),line.label,receiptMoney(line.amount)]),[12,120,42],['left','left','right']);
  c.ensure(18);doc.setFillColor(243,245,247);doc.rect(18,c.y,174,14,'F');doc.setTextColor(52,88,131);doc.setFont('helvetica','bold');doc.setFontSize(10);doc.text('TOTAL RECEIVED',22,c.y+9);doc.setFontSize(15);doc.text(receiptMoney(payment.amount),188,c.y+9,{align:'right'});c.y+=19;
  c.table([],[['Amount in words',receiptAmountWords(payment.amount)]],[36,138]);
  c.section('Acknowledgement');
  c.table(['AUTHORISED BY','RECEIVED BY'],[[details.authorised_by||'Not recorded',details.payer?.name||payment.tenant_name||'Not recorded'],['Signature: ____________________','Signature: ____________________']],[87,87]);
  c.finish();
  return {filename:`${(payment.receipt_number||`RCP-${payment.id}`).replace(/[^a-zA-Z0-9_-]/g,'_')}.pdf`,content:doc.output('datauristring').split(',')[1]};
}