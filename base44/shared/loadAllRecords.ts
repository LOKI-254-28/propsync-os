export default async function loadAllRecords(sr,entity,query) {
  const items=[];let cursor;
  do {
    const page=await sr.entities[entity].filter(query,{limit:200,cursor});
    items.push(...page.items);
    cursor=page.has_more?page.next_cursor:null;
  }while(cursor);
  return items;
}