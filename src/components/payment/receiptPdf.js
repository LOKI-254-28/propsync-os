import {jsPDF} from 'jspdf';
import {receiptLines,receiptMoney} from '@/components/payment/receiptData';
export function downloadReceipt(payment,charges=[],print=false) {
  if(payment.status!=='Successful') return;
  const doc=new jsPDF();let y=24;
  const row=(label,value)=>{if(y>270){doc.addPage();y=24;}doc.setFontSize(10);const text=doc.splitTextToSize(`${label}: ${value||'Not recorded'}`,170);doc.text(text,20,y);y+=text.length*6+3;};
  doc.setFontSize(20);doc.text('PropWiz - Payment Receipt',20,y);y+=14;
  row('Receipt No.',payment.receipt_number||`RCP-${payment.id.toUpperCase()}`);
  row('Payment reference',payment.payment_reference);
  row('Tenant',payment.tenant_name);row('Property',payment.property_name);row('Unit',payment.unit_number);
  row('Payment / approval date',payment.payment_date);row('Method',payment.method);
  row('Status','Approved / Paid');y+=4;
  receiptLines(payment,charges).forEach(line=>row(line.label,receiptMoney(line.amount)));
  y+=4;row('Total approved / paid',receiptMoney(payment.amount));
  if(print){doc.autoPrint();window.open(doc.output('bloburl'),'_blank');}
  else doc.save(`${(payment.receipt_number||`RCP-${payment.id}`).replace(/[^a-zA-Z0-9_-]/g,'_')}.pdf`);
}