import {jsPDF} from 'jspdf';
import {receiptLines,receiptMoney} from '@/components/payment/receiptData';
import {amountInWords} from '@/components/payment/amountInWords';
export function downloadReceipt(payment,charges=[],print=false,details={}) {
  if(payment.status!=='Successful') return;
  const doc=new jsPDF();let y=24;
  const row=(label,value)=>{doc.setFontSize(10);const text=doc.splitTextToSize(`${label}: ${value||'Not recorded'}`,170);for(const line of text){if(y>270){doc.addPage();y=24;}doc.text(line,20,y);y+=6;}y+=3;};
  doc.setFontSize(20);doc.text('PropWiz - Payment Receipt',20,y);y+=14;
  row('Receipt No.',payment.receipt_number||`RCP-${payment.id.toUpperCase()}`);
  row('Payment reference',payment.payment_reference);
  for(const [label,party] of [['Issued by',details.issuer],['Received from',details.payer]])if(party){row(label,party.name);row(`${label} address`,party.address);if(party.phone)row('Phone',party.phone);if(party.email)row('Email',party.email);}
  if(details.property_address)row('Property address',details.property_address);
  row('Tenant',payment.tenant_name);row('Property',payment.property_name);row('Unit',payment.unit_number);
  row('Payment / approval date',payment.payment_date);row('Method',payment.method);
  row('Status','Approved / Paid');y+=4;
  receiptLines(payment,charges).forEach(line=>row(line.label,receiptMoney(line.amount)));
  y+=4;row('Total received',receiptMoney(payment.amount));
  row('Amount in words',amountInWords(payment.amount));
  row('Authorised by',details.authorised_by);row('Authorised signature','____________________________');
  row('Received by',payment.tenant_name||details.payer?.name);row('Recipient signature','____________________________');
  row('Note','Computer-generated acknowledgement of verified payment. Retain for your records.');
  const pages=doc.getNumberOfPages();for(let page=1;page<=pages;page++){doc.setPage(page);doc.setFontSize(8);doc.text(`Page ${page} of ${pages}`,170,288);}
  if(print){doc.autoPrint();window.open(doc.output('bloburl'),'_blank');}
  else doc.save(`${(payment.receipt_number||`RCP-${payment.id}`).replace(/[^a-zA-Z0-9_-]/g,'_')}.pdf`);
}