const categories=['Repairs','Maintenance','Utilities','Management','Security','Cleaning','Insurance','Taxes/Fees','Other'];
function fail(message,status=400){throw Object.assign(new Error(message),{status});}
export async function expenseRecord(sr,user,data) {
  if(!data||typeof data!=='object'||Array.isArray(data))fail('Enter expense details.');
  if(typeof data.property_id!=='string'||!data.property_id||data.property_id.length>100)fail('Select a property.');
  if(typeof data.amount!=='number'||!Number.isFinite(data.amount)||data.amount<=0||data.amount>1e12)fail('Enter a valid positive expense amount.');
  if(typeof data.date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(data.date)||!Number.isFinite(Date.parse(data.date))||new Date(data.date).toISOString().slice(0,10)!==data.date)fail('Enter a valid expense date.');
  if(data.category!=null&&!categories.includes(data.category))fail('Select a valid expense category.');
  const fields=['description','vendor','payment_reference','supporting_document_url','notes'];
  for(const field of fields)if(data[field]!=null&&(typeof data[field]!=='string'||data[field].length>5000))fail('Expense text must be no longer than 5,000 characters.');
  if(data.recurring!=null&&typeof data.recurring!=='boolean')fail('Invalid recurring expense choice.');
  if(data.unit_id!=null&&(typeof data.unit_id!=='string'||data.unit_id.length>100))fail('Select a valid unit.');
  const property=await sr.entities.Property.get(data.property_id);
  if(!property)fail('Property not found.',404);
  if(user.role!=='admin'&&property.owner_user_id!==user.id)fail('Property does not belong to your account.',403);
  const unit=data.unit_id?await sr.entities.Unit.get(data.unit_id):null;
  if(data.unit_id&&(!unit||unit.property_id!==property.id))fail('Choose a unit in the selected property.',403);
  return {...Object.fromEntries(fields.filter(key=>data[key]!=null).map(key=>[key,data[key]])),property_id:property.id,property_name:property.name,unit_id:unit?.id||'',unit_number:unit?.unit_number||'',owner_user_id:property.owner_user_id||user.id,amount:data.amount,date:data.date,category:data.category||'Maintenance',recurring:data.recurring||false};
}