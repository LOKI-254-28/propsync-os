const receiptNotes = 'This receipt acknowledges only the payment and allocations shown; it is not confirmation that all rent or other charges are settled. Any remaining balance is governed by the tenancy agreement and account ledger. A subsequently reversed or dishonoured payment may require correction of the ledger. This receipt does not amend the tenancy agreement or override either party\'s rights under applicable law. Retain it for your records and contact the issuer about discrepancies.';
export function receiptPdfCanvas(doc) {
  const c={doc,y:45},ink=[37,49,65],blue=[52,88,131],border=[213,220,229];
  const header=()=>{doc.setDrawColor(...border);doc.setLineWidth(.3);doc.rect(16,14,178,269);doc.setFillColor(...blue);doc.rect(18,16,174,24,'F');doc.setTextColor(255,255,255);doc.setFont('helvetica','bold');doc.setFontSize(19);doc.text('PropWiz',24,27);doc.setFontSize(12);doc.text('PAYMENT RECEIPT',186,27,{align:'right'});doc.setFont('helvetica','normal');doc.setFontSize(8);doc.text('Property management | Payment acknowledgement',24,35);doc.text('VERIFIED PAYMENT',186,35,{align:'right'});c.y=45;};
  c.next=()=>{doc.addPage();header();};
  c.ensure=h=>{if(c.y+h>236)c.next();};
  c.section=title=>{c.ensure(16);doc.setTextColor(...blue);doc.setFont('helvetica','bold');doc.setFontSize(9);doc.text(title.toUpperCase(),18,c.y+4);c.y+=8;};
  c.table=(headers,rows,widths,aligns=[])=>{
    const paint=(cells,h,head=false)=>{let x=18;cells.forEach((lines,i)=>{doc.setDrawColor(...border);doc.setFillColor(...(head?blue:[255,255,255]));doc.rect(x,c.y,widths[i],h,'FD');doc.setFont('helvetica',head?'bold':'normal');doc.setFontSize(head?8:9);doc.setTextColor(...(head?[255,255,255]:ink));const right=aligns[i]==='right';if(lines.length)doc.text(lines,right?x+widths[i]-3:x+3,c.y+5,{align:right?'right':'left',lineHeightFactor:1.25});x+=widths[i];});c.y+=h;};
    const heading=()=>paint(headers.map(String),8,true);
    if(headers.length){c.ensure(18);heading();}
    rows.forEach(row=>{
      doc.setFont('helvetica','normal');doc.setFontSize(9);
      const cells=row.map((value,i)=>doc.splitTextToSize(String(value??'Not recorded'),widths[i]-6));
      let offset=0;const count=Math.max(...cells.map(lines=>lines.length));
      while(offset<count){if(c.y+9>236){c.next();if(headers.length)heading();}const capacity=Math.max(1,Math.floor((236-c.y-5)/4));const take=Math.min(count-offset,capacity);paint(cells.map(lines=>lines.slice(offset,offset+take)),Math.max(9,take*4+5));offset+=take;if(offset<count){c.next();if(headers.length)heading();}}
    });c.y+=5;
  };
  c.finish=()=>{const pages=doc.getNumberOfPages();for(let page=1;page<=pages;page++){doc.setPage(page);doc.setDrawColor(...border);doc.line(18,242,192,242);doc.setFont('helvetica','bold');doc.setFontSize(7.5);doc.setTextColor(...blue);doc.text('RECEIPT NOTES',18,247);doc.setFont('helvetica','normal');doc.setTextColor(92,107,127);doc.setFontSize(7.2);doc.text(doc.splitTextToSize(receiptNotes,174),18,252,{lineHeightFactor:1.3});doc.setFontSize(7);doc.text('Computer-generated acknowledgement of verified payment.',18,279);doc.text(`Page ${page} of ${pages}`,192,279,{align:'right'});}};
  header();return c;
}