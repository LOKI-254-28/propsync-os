import {base44} from '@/api/base44Client';
export default async function loadAllRecords(entity,query={},sort='-created_date',request=read=>read()) {
  const items=[];let cursor;
  do {
    const page=await request(()=>base44.entities[entity].filter(query,{limit:200,cursor,sort}));
    items.push(...page.items);
    cursor=page.has_more?page.next_cursor:null;
  } while(cursor);
  return items;
}