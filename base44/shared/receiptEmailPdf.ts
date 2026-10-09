import {jsPDF} from 'npm:jspdf@4.2.1';
import {receiptAmountWords} from './receiptAmountWords.ts';
export const receiptMoney=value=>new Intl.NumberFormat('en-KE',{style:'currency',currency:'KES',minimumFractionDigits:2,maximumFractionDigits:2}).format(Number(value||0));
export function receiptEmailPdf(details) {
  const {payment,charges}=details,doc=new jsPDF();let y=24;
  const row=(label,value)=>{doc.setFontSize(10);const text=doc.splitTextToSize(`${label}: ${String(value||'Not recorded').slice(0,2000)}`,170);for(const line of text){if(y>270){doc.addPage();y=24;}doc.text(line,20,y);y+=6;}y+=3;};
  doc.setFontSize(20);doc.text('PropWiz - Payment Receipt',20,y);y+=14;
  row('Receipt No.',payment.receipt_number||`RCP-${payment.id.toUpperCase()}`);row('Payment reference',payment.payment_reference);
  for(const [label,party] of [['Issued by',details.issuer],['Received from',details.payer]]){row(label,party.name);row(`${label} address`,party.address);row('Phone',party.phone);row('Email',party.email);}
  row('Property',payment.property_name);row('Property address',details.property_address);row('Unit',payment.unit_number);row('Payment / approval date',payment.payment_date);row('Method',payment.method);row('Status','Approved / Paid');
  let allocated=0;
  for(const allocation of payment.allocations||[]){const charge=charges.find(c=>c.id===allocation.charge_id);row(`${charge?.bill_name||charge?.charge_type||'Rent & Service Charge'} (${allocation.billing_period||charge?.billing_period||''})`,receiptMoney(allocation.amount));allocated+=Number(allocation.amount);}
  if(allocated<payment.amount)row(payment.description||(!allocated?'Payment received':'Unallocated payment credit'),receiptMoney(payment.amount-allocated));
  row('Total received',receiptMoney(payment.amount));row('Amount in words',receiptAmountWords(payment.amount));
  row('Authorised by',details.authorised_by);row('Authorised signature','____________________________');row('Received by',details.payer.name);row('Recipient signature','____________________________');
  row('Note','Computer-generated acknowledgement of verified payment. Retain for your records.');
  const pages=doc.getNumberOfPages();for(let page=1;page<=pages;page++){doc.setPage(page);doc.setFontSize(8);doc.text(`Page ${page} of ${pages}`,170,288);}
  return {filename:`${(payment.receipt_number||`RCP-${payment.id}`).replace(/[^a-zA-Z0-9_-]/g,'_')}.pdf`,content:doc.output('datauristring').split(',')[1]};
}