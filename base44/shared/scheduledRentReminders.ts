import {nairobiToday} from './nairobiDates.ts';
import {rentReminderContext} from './rentReminderContext.ts';
import {queueRentReminder} from './queueRentReminder.ts';
import {registryError} from './documentRegistry.ts';
import {paymentContext} from './paymentContext.ts';
export async function scheduledRentReminders(sr,user,body){
  if(user.role!=='admin')throw registryError('Admin only.',403);
  const [year,month]=nairobiToday().slice(0,7).split('-').map(Number),period=body.billingPeriod||`${month===12?year+1:year}-${String(month===12?1:month+1).padStart(2,'0')}`;
  if(typeof period!=='string'||!/^\d{4}-(0[1-9]|1[0-2])$/.test(period))throw registryError('Choose a valid billing month.');
  let cursor,created=0,notices=0,queued=0,duplicates=0,skipped=0;const errors=[];
  do{
    const page=await sr.entities.Tenancy.filter({status:{$in:['Active','Expiring Soon','Notice Given']}},{limit:50,cursor});
    for(const tenancy of page.items){
      try{
        const linked=await paymentContext(sr,tenancy.id);
        const existing=await sr.entities.RentCharge.count({tenancy_id:tenancy.id,billing_period:period,status:{$ne:'Void'},charge_type:{$in:['Rent',null]}});
        if(!existing){const amount=Number(tenancy.monthly_rent||0)+Number(tenancy.service_charge||0);if(amount>0){await sr.entities.RentCharge.create({tenancy_id:tenancy.id,tenant_id:tenancy.tenant_id,tenant_user_id:linked.tenantUserId,tenant_name:tenancy.tenant_name,property_id:tenancy.property_id,property_name:tenancy.property_name,unit_id:tenancy.unit_id,unit_number:tenancy.unit_number,billing_period:period,due_date:`${period}-01`,charge_type:'Rent',amount,amount_paid:0,outstanding:amount,status:'Unpaid',owner_user_id:tenancy.owner_user_id});created++;}}
        const context=await rentReminderContext(sr,user,{tenancy_id:tenancy.id,upcoming:period});
        if(!context.tenantUserId||context.amount<=0){skipped++;continue;}
        const result=await queueRentReminder(sr,user,context,{email:!!context.email,scheduledPeriod:period});
        if(result.duplicate)duplicates++;else{notices++;if(context.email)queued++;}
      }catch(error){errors.push({tenancy_id:tenancy.id,error:error.message});}
    }
    cursor=page.has_more?page.next_cursor:null;
  }while(cursor);
  return {ok:errors.length===0,billingPeriod:period,charges_created:created,notices,email_queued:queued,duplicates,skipped,errors};
}