import {nairobiToday} from './nairobiDates.ts';
import {registryError} from './documentRegistry.ts';
export async function allocateRecordedPayment(sr,payment) {
  let remaining=Number(payment.amount),cursor;const allocations=[];
  do {
    const page=await sr.entities.RentCharge.filter({tenancy_id:payment.tenancy_id,owner_user_id:payment.owner_user_id,status:{$nin:['Void','Paid']},outstanding:{$gt:0}},{sort:'due_date',limit:100,cursor});
    for(const charge of page.items){
      if(remaining<=0)break;
      if(allocations.length>=100)throw registryError('This payment covers too many charges. Record smaller payments.',409);
      const amount=Math.min(remaining,Number(charge.outstanding));
      allocations.push({charge_id:charge.id,billing_period:charge.billing_period,amount,charge});remaining-=amount;
    }
    cursor=page.has_more?page.next_cursor:null;
  }while(cursor&&remaining>0);
  for(const allocation of allocations){
    const {charge,amount}=allocation,paid=Number(charge.amount_paid||0)+amount,outstanding=Math.max(0,Number(charge.amount)-paid);
    await sr.entities.RentCharge.update(charge.id,{amount_paid:paid,outstanding,status:outstanding<=0?'Paid':paid>0?'Partial':charge.due_date<nairobiToday()?'Overdue':'Unpaid'});
  }
  const clean=allocations.map(({charge,...allocation})=>allocation);
  const updated=await sr.entities.Payment.update(payment.id,{status:'Successful',allocations:clean,receipt_number:payment.receipt_number||`RCP-${payment.id.toUpperCase()}`});
  return {payment:updated,allocations:clean,unallocated:remaining};
}